from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from flask_login import current_user
from app.models import db, Post, YourCart, UserActivity
from app.auth.verification_utils import verified_required
from app.listings.listing_utils import (
    visible_posts_query,
    post_to_json,
    get_wishlist_ids,
)
from datetime import datetime
import json
import os

listings_bp = Blueprint("listings", __name__)

UPLOAD_FOLDER = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../static/uploads")
)
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _save_upload(file_storage):
    if not file_storage or not allowed_file(file_storage.filename):
        return None
    filename = secure_filename(file_storage.filename)
    path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(path):
        base, ext = os.path.splitext(filename)
        filename = f"{base}_{os.urandom(4).hex()}{ext}"
        path = os.path.join(UPLOAD_FOLDER, filename)
    file_storage.save(path)
    return filename


MAX_LISTING_PHOTOS = 5
_UPLOAD_KEYS = ("image", "image2", "image3", "image4", "image5")


def _save_uploads_from_request():
    names = []
    for key in _UPLOAD_KEYS:
        f = request.files.get(key)
        if f:
            saved = _save_upload(f)
            if saved:
                names.append(saved)
    return names[:MAX_LISTING_PHOTOS]


def _apply_images_to_post(post, filenames):
    names = [n for n in (filenames or []) if n][:MAX_LISTING_PHOTOS]
    if not names:
        post.image = None
        post.set_extra_images([])
        return
    post.image = names[0]
    post.set_extra_images(names[1:])


@listings_bp.route("/api/listings", methods=["GET"])
@verified_required
def get_all_listings():
    sort = (request.args.get("sort") or "newest").lower()
    min_price = request.args.get("min_price", type=int)
    max_price = request.args.get("max_price", type=int)
    cat = (request.args.get("category") or "").strip()
    pickup = (request.args.get("pickup_location") or "").strip()

    q = visible_posts_query(current_user.id)
    if cat:
        q = q.filter(Post.category == cat)
    if pickup:
        q = q.filter(Post.pickup_location.ilike(f"%{pickup}%"))
    if min_price is not None:
        q = q.filter(Post.price >= min_price)
    if max_price is not None:
        q = q.filter(Post.price <= max_price)

    if sort == "price_low":
        q = q.order_by(Post.price.asc())
    elif sort == "price_high":
        q = q.order_by(Post.price.desc())
    elif sort == "popular":
        q = q.order_by(Post.view_count.desc(), Post.timestamp.desc())
    else:
        q = q.order_by(Post.timestamp.desc())

    posts = q.all()
    wl_ids = get_wishlist_ids(current_user.id)
    return jsonify([post_to_json(p, current_user.id, wl_ids) for p in posts]), 200


@listings_bp.route("/api/listings", methods=["POST"])
@verified_required
def create_listing():
    title = request.form.get("title")
    description = request.form.get("description")
    category = request.form.get("category")
    price = request.form.get("price")
    image_file = request.files.get("image")

    if not all([title, description, category, price]):
        return jsonify({"message": "Missing required fields"}), 400

    uploaded = _save_uploads_from_request()

    new_post = Post(
        title=title,
        description=description,
        category=category,
        price=int(price),
        image=None,
        timestamp=datetime.utcnow(),
        user_id=current_user.id,
        condition=request.form.get("condition") or "good",
        negotiable=request.form.get("negotiable") in ("1", "true", "on", "yes"),
        pickup_location=request.form.get("pickup_location") or None,
    )
    if uploaded:
        _apply_images_to_post(new_post, uploaded)

    db.session.add(new_post)
    db.session.commit()
    return jsonify({"message": "Post created", "id": new_post.id}), 201


@listings_bp.route("/api/youritems", methods=["GET"])
@verified_required
def get_your_items():
    posts = (
        Post.query.filter_by(user_id=current_user.id)
        .order_by(Post.timestamp.desc())
        .all()
    )
    wl_ids = get_wishlist_ids(current_user.id)
    return jsonify([post_to_json(p, current_user.id, wl_ids) for p in posts]), 200


@listings_bp.route("/api/listings/<int:listing_id>", methods=["GET"])
@verified_required
def get_listing(listing_id):
    post = Post.query.filter_by(id=listing_id).first()
    if not post:
        return jsonify({"message": "Listing not found"}), 404

    post.view_count = (post.view_count or 0) + 1
    activity = UserActivity(
        user_id=current_user.id, post_id=post.id, action="view"
    )
    db.session.add(activity)
    db.session.commit()

    wl_ids = get_wishlist_ids(current_user.id)
    data = post_to_json(post, current_user.id, wl_ids)
    data["is_owner"] = post.user_id == current_user.id
    data["seller_rating"] = None
    from app.listings.listing_utils import seller_rating_summary

    data["seller_rating"] = seller_rating_summary(post.user_id)
    return jsonify(data), 200


@listings_bp.route("/api/listings/<int:listing_id>", methods=["PUT"])
@verified_required
def update_listing(listing_id):
    post = Post.query.filter_by(id=listing_id, user_id=current_user.id).first()
    if not post:
        return jsonify({"message": "Listing not found"}), 404

    post.title = request.form.get("title") or post.title
    post.description = request.form.get("description") or post.description
    post.category = request.form.get("category") or post.category
    if request.form.get("price"):
        post.price = int(request.form.get("price"))
    if request.form.get("condition"):
        post.condition = request.form.get("condition")
    if request.form.get("pickup_location") is not None:
        post.pickup_location = request.form.get("pickup_location")
    post.negotiable = request.form.get("negotiable") in ("1", "true", "on", "yes")

    retain_raw = request.form.get("retain_images")
    new_uploads = _save_uploads_from_request()
    if retain_raw is not None:
        try:
            kept = json.loads(retain_raw)
            kept = [k for k in kept if isinstance(k, str) and k][:MAX_LISTING_PHOTOS]
        except (json.JSONDecodeError, TypeError):
            kept = []
        combined = (kept + new_uploads)[:MAX_LISTING_PHOTOS]
        _apply_images_to_post(post, combined)
    elif new_uploads:
        existing = [post.image] if post.image else []
        existing.extend(post.get_extra_images())
        _apply_images_to_post(post, (existing + new_uploads)[:MAX_LISTING_PHOTOS])

    db.session.commit()
    return jsonify({"message": "Listing updated"}), 200


@listings_bp.route("/api/listings/<int:listing_id>", methods=["DELETE"])
@verified_required
def delete_listing(listing_id):
    post = Post.query.filter_by(id=listing_id, user_id=current_user.id).first()
    if not post:
        return jsonify({"message": "Listing not found"}), 404
    db.session.delete(post)
    db.session.commit()
    return jsonify({"message": "Listing deleted"}), 200


@listings_bp.route("/api/yourcart", methods=["GET"])
@verified_required
def get_your_cart():
    cart_items = YourCart.query.filter_by(user_id=current_user.id).all()
    wl_ids = get_wishlist_ids(current_user.id)
    result = []
    for item in cart_items:
        if not item.post or getattr(item.post, "is_sold", False):
            continue
        result.append(post_to_json(item.post, current_user.id, wl_ids))
    return jsonify(result), 200


@listings_bp.route("/api/yourcart/add", methods=["POST"])
@verified_required
def add_to_your_cart():
    post_id = request.json.get("post_id")
    if not post_id:
        return jsonify({"message": "post_id is required"}), 400
    post = Post.query.get(post_id)
    if not post or getattr(post, "is_sold", False):
        return jsonify({"message": "Item unavailable"}), 400

    existing = YourCart.query.filter_by(
        user_id=current_user.id, post_id=post_id
    ).first()
    if existing:
        return jsonify({"message": "Item already in cart"}), 200

    db.session.add(YourCart(user_id=current_user.id, post_id=post_id))
    db.session.add(
        UserActivity(user_id=current_user.id, post_id=post_id, action="cart")
    )
    db.session.commit()
    return jsonify({"message": "Item added to cart"}), 201


@listings_bp.route("/api/yourcart/remove", methods=["POST"])
@verified_required
def remove_from_your_cart():
    post_id = request.json.get("post_id")
    item = YourCart.query.filter_by(
        user_id=current_user.id, post_id=post_id
    ).first()
    if not item:
        return jsonify({"message": "Item not found in cart"}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item removed from cart"}), 200
