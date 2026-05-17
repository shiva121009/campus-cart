import secrets
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from flask_login import current_user
from sqlalchemy import func, or_

from app.models import (
    db,
    Post,
    User,
    Wishlist,
    ListingReport,
    ListingMessage,
    SellerRating,
    SavedSearch,
    BlockedUser,
    YourCart,
    CheckoutMessage,
)
from app.auth.verification_utils import verified_required, user_to_public_dict
from app.listings.listing_utils import (
    visible_posts_query,
    post_to_json,
    get_wishlist_ids,
    seller_rating_summary,
)

ux_bp = Blueprint("ux", __name__)


@ux_bp.route("/api/wishlist", methods=["GET"])
@verified_required
def get_wishlist():
    items = Wishlist.query.filter_by(user_id=current_user.id).order_by(
        Wishlist.created_at.desc()
    ).all()
    wl_ids = get_wishlist_ids(current_user.id)
    result = []
    for w in items:
        if not w.post or getattr(w.post, "is_sold", False):
            continue
        result.append(post_to_json(w.post, current_user.id, wl_ids))
    return jsonify(result), 200


@ux_bp.route("/api/wishlist/toggle", methods=["POST"])
@verified_required
def toggle_wishlist():
    data = request.get_json() or {}
    post_id = data.get("post_id")
    if not post_id:
        return jsonify({"message": "post_id required"}), 400
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"message": "Listing not found"}), 404
    existing = Wishlist.query.filter_by(
        user_id=current_user.id, post_id=post_id
    ).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"in_wishlist": False, "message": "Removed from wishlist"}), 200
    item = Wishlist(user_id=current_user.id, post_id=post_id)
    db.session.add(item)
    db.session.commit()
    return jsonify({"in_wishlist": True, "message": "Added to wishlist"}), 200


@ux_bp.route("/api/listings/<int:listing_id>/report", methods=["POST"])
@verified_required
def report_listing(listing_id):
    post = Post.query.get_or_404(listing_id)
    data = request.get_json() or {}
    reason = (data.get("reason") or "").strip()
    if len(reason) < 5:
        return jsonify({"message": "Please describe the issue (min 5 characters)"}), 400
    dup = ListingReport.query.filter_by(
        post_id=listing_id, reporter_id=current_user.id, status="pending"
    ).first()
    if dup:
        return jsonify({"message": "You already reported this listing"}), 409
    report = ListingReport(
        post_id=listing_id,
        reporter_id=current_user.id,
        reason=reason,
    )
    db.session.add(report)
    db.session.commit()
    return jsonify({"message": "Report submitted. Our team will review it."}), 201


@ux_bp.route("/api/listings/<int:listing_id>/similar", methods=["GET"])
@verified_required
def similar_listings(listing_id):
    post = Post.query.get_or_404(listing_id)
    wl_ids = get_wishlist_ids(current_user.id)
    others = (
        visible_posts_query(current_user.id)
        .filter(Post.id != listing_id, Post.category == post.category)
        .order_by(Post.timestamp.desc())
        .limit(8)
        .all()
    )
    return jsonify([post_to_json(p, current_user.id, wl_ids) for p in others]), 200


@ux_bp.route("/api/listings/<int:listing_id>/sold", methods=["POST"])
@verified_required
def mark_sold(listing_id):
    post = Post.query.filter_by(id=listing_id, user_id=current_user.id).first()
    if not post:
        return jsonify({"message": "Listing not found"}), 404
    post.is_sold = True
    db.session.commit()
    return jsonify({"message": "Marked as sold", "is_sold": True}), 200


@ux_bp.route("/api/sellers/<int:seller_id>", methods=["GET"])
@verified_required
def seller_profile(seller_id):
    seller = User.query.get_or_404(seller_id)
    if BlockedUser.query.filter_by(
        blocker_id=current_user.id, blocked_id=seller_id
    ).first():
        return jsonify({"message": "Seller unavailable"}), 404
    wl_ids = get_wishlist_ids(current_user.id)
    listings = (
        visible_posts_query(current_user.id)
        .filter_by(user_id=seller_id)
        .order_by(Post.timestamp.desc())
        .all()
    )
    ratings = SellerRating.query.filter_by(seller_id=seller_id).order_by(
        SellerRating.created_at.desc()
    ).limit(10).all()
    return jsonify(
        {
            "seller": user_to_public_dict(seller),
            "rating": seller_rating_summary(seller_id),
            "listings": [post_to_json(p, current_user.id, wl_ids) for p in listings],
            "reviews": [
                {
                    "stars": r.stars,
                    "comment": r.comment or "",
                    "created_at": r.created_at.isoformat(),
                }
                for r in ratings
            ],
        }
    ), 200


@ux_bp.route("/api/sellers/<int:seller_id>/rate", methods=["POST"])
@verified_required
def rate_seller(seller_id):
    if seller_id == current_user.id:
        return jsonify({"message": "You cannot rate yourself"}), 400
    data = request.get_json() or {}
    post_id = data.get("post_id")
    stars = int(data.get("stars") or 0)
    comment = (data.get("comment") or "").strip()[:500]
    if stars < 1 or stars > 5:
        return jsonify({"message": "Rating must be 1–5 stars"}), 400
    if not post_id:
        return jsonify({"message": "post_id required"}), 400
    post = Post.query.get(post_id)
    if not post or post.user_id != seller_id:
        return jsonify({"message": "Invalid listing for this seller"}), 400
    existing = SellerRating.query.filter_by(
        buyer_id=current_user.id, post_id=post_id
    ).first()
    if existing:
        existing.stars = stars
        existing.comment = comment
    else:
        db.session.add(
            SellerRating(
                seller_id=seller_id,
                buyer_id=current_user.id,
                post_id=post_id,
                stars=stars,
                comment=comment,
            )
        )
    db.session.commit()
    return jsonify(
        {"message": "Rating saved", "rating": seller_rating_summary(seller_id)}
    ), 200


@ux_bp.route("/api/users/<int:user_id>/block", methods=["POST"])
@verified_required
def block_user(user_id):
    if user_id == current_user.id:
        return jsonify({"message": "Cannot block yourself"}), 400
    if not User.query.get(user_id):
        return jsonify({"message": "User not found"}), 404
    if BlockedUser.query.filter_by(
        blocker_id=current_user.id, blocked_id=user_id
    ).first():
        return jsonify({"message": "Already blocked"}), 200
    db.session.add(BlockedUser(blocker_id=current_user.id, blocked_id=user_id))
    db.session.commit()
    return jsonify({"message": "User blocked"}), 200


@ux_bp.route("/api/listings/<int:listing_id>/messages", methods=["GET", "POST"])
@verified_required
def listing_messages(listing_id):
    post = Post.query.get_or_404(listing_id)
    if request.method == "GET":
        msgs = (
            ListingMessage.query.filter_by(post_id=listing_id)
            .order_by(ListingMessage.created_at.asc())
            .all()
        )
        senders = {m.sender_id for m in msgs}
        is_seller = post.user_id == current_user.id
        is_participant = current_user.id in senders
        if not is_seller and not is_participant:
            return jsonify({"message": "No messages yet"}), 403
        return jsonify(
            [
                {
                    "id": m.id,
                    "body": m.body,
                    "sender_id": m.sender_id,
                    "sender_name": m.sender.name if m.sender else "",
                    "created_at": m.created_at.isoformat(),
                    "is_mine": m.sender_id == current_user.id,
                }
                for m in msgs
            ]
        ), 200

    data = request.get_json() or {}
    body = (data.get("body") or "").strip()
    if len(body) < 1:
        return jsonify({"message": "Message cannot be empty"}), 400
    if post.user_id == current_user.id:
        return jsonify({"message": "Cannot message your own listing"}), 400
    if getattr(post, "is_sold", False):
        return jsonify({"message": "This item is sold"}), 400
    msg = ListingMessage(
        post_id=listing_id, sender_id=current_user.id, body=body
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify({"message": "Sent", "id": msg.id}), 201


@ux_bp.route("/api/saved-searches", methods=["GET", "POST"])
@verified_required
def saved_searches():
    if request.method == "GET":
        rows = SavedSearch.query.filter_by(user_id=current_user.id).order_by(
            SavedSearch.created_at.desc()
        ).all()
        return jsonify(
            [
                {
                    "id": r.id,
                    "query": r.query,
                    "category": r.category or "",
                    "max_price": r.max_price,
                    "created_at": r.created_at.isoformat(),
                }
                for r in rows
            ]
        ), 200

    data = request.get_json() or {}
    query = (data.get("query") or "").strip()
    if not query:
        return jsonify({"message": "Search query required"}), 400
    row = SavedSearch(
        user_id=current_user.id,
        query=query,
        category=(data.get("category") or "").strip() or None,
        max_price=data.get("max_price"),
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Search saved", "id": row.id}), 201


@ux_bp.route("/api/saved-searches/<int:search_id>", methods=["DELETE"])
@verified_required
def delete_saved_search(search_id):
    row = SavedSearch.query.filter_by(
        id=search_id, user_id=current_user.id
    ).first_or_404()
    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


@ux_bp.route("/api/search/autocomplete", methods=["GET"])
@verified_required
def search_autocomplete():
    q = (request.args.get("q") or "").strip().lower()
    if len(q) < 2:
        return jsonify([]), 200
    posts = (
        visible_posts_query(current_user.id)
        .filter(
            or_(
                func.lower(Post.title).contains(q),
                func.lower(Post.description).contains(q),
            )
        )
        .limit(8)
        .all()
    )
    return jsonify([{"id": p.id, "title": p.title, "category": p.category} for p in posts]), 200


@ux_bp.route("/api/home/summary", methods=["GET"])
@verified_required
def home_summary():
    post_ids = [
        p.id for p in Post.query.filter_by(user_id=current_user.id).all()
    ]
    seller_messages = 0
    if post_ids:
        seller_messages = CheckoutMessage.query.filter(
            CheckoutMessage.post_id.in_(post_ids)
        ).count()

    return jsonify(
        {
            "cart_count": YourCart.query.filter_by(user_id=current_user.id).count(),
            "orders_count": CheckoutMessage.query.filter_by(
                user_id=current_user.id
            ).count(),
            "orders_waiting": CheckoutMessage.query.filter_by(
                user_id=current_user.id, status="waiting"
            ).count(),
            "listings_count": Post.query.filter_by(
                user_id=current_user.id, is_sold=False
            ).count(),
            "wishlist_count": Wishlist.query.filter_by(
                user_id=current_user.id
            ).count(),
            "seller_messages_count": seller_messages,
        }
    ), 200


@ux_bp.route("/api/trending", methods=["GET"])
@verified_required
def trending_listings():
    wl_ids = get_wishlist_ids(current_user.id)
    posts = (
        visible_posts_query(current_user.id)
        .order_by(Post.view_count.desc(), Post.timestamp.desc())
        .limit(12)
        .all()
    )
    return jsonify([post_to_json(p, current_user.id, wl_ids) for p in posts]), 200
