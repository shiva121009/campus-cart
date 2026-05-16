import os
from datetime import datetime

from flask import Blueprint, jsonify, request, send_from_directory, current_app
from flask_login import login_required, login_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func

from app.models import db, User, Post, CheckoutMessage, YourCart, UserActivity, AdminNotification
from app.auth.verification_utils import get_id_upload_folder, user_to_public_dict
from app.auth.admin_notify_utils import process_admin_notify

admin_bp = Blueprint("admin", __name__)


def _check_admin_secret(provided):
    expected = (current_app.config.get("ADMIN_SECRET") or "").strip()
    if not expected:
        return False, "Admin registration is disabled (no ADMIN_SECRET set)"
    if (provided or "").strip() != expected:
        return False, "Invalid admin secret key"
    return True, None


@admin_bp.route("/api/admin/register", methods=["POST", "OPTIONS"])
def admin_register():
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").lower().strip()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""
    confirm = data.get("confirmPassword") or ""
    admin_secret = data.get("admin_secret") or ""

    ok, err = _check_admin_secret(admin_secret)
    if not ok:
        return jsonify({"message": err}), 403

    if not all([name, email, phone, password, confirm]):
        return jsonify({"message": "Missing required fields"}), 400

    if password != confirm:
        return jsonify({"message": "Passwords do not match"}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    new_user = User(
        name=name,
        email=email,
        password=generate_password_hash(password),
        phone=phone,
        student_id="ADMIN",
        id_card_image=None,
        verification_status="approved",
        verified_at=datetime.utcnow(),
        is_admin=True,
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify(
        {
            "message": "Admin account created. You can log in now.",
            "user": user_to_public_dict(new_user),
        }
    ), 201


@admin_bp.route("/api/admin/login", methods=["POST", "OPTIONS"])
def admin_login():
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json() or {}
    email = (data.get("email") or "").lower().strip()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid admin credentials"}), 401

    if not getattr(user, "is_admin", False):
        return jsonify(
            {"message": "This account is not an admin. Use student login instead."}
        ), 403

    login_user(user)
    return jsonify(
        {"message": "Admin login successful", "user": user_to_public_dict(user)}
    ), 200


def admin_required(fn):
    from functools import wraps

    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return fn(*args, **kwargs)
        if not current_user.is_authenticated:
            return jsonify({"message": "Unauthorized"}), 401
        if not getattr(current_user, "is_admin", False):
            return jsonify({"message": "Admin access required"}), 403
        return fn(*args, **kwargs)

    return wrapper


@admin_bp.route("/api/admin/stats", methods=["GET"])
@admin_required
def admin_stats():
    return jsonify(
        {
            "users_total": User.query.count(),
            "users_pending": User.query.filter(
                User.verification_status == "pending",
                User.is_admin.is_(False),
                User.id_card_image.isnot(None),
            ).count(),
            "users_approved": User.query.filter_by(verification_status="approved").count(),
            "listings_total": Post.query.count(),
            "orders_total": CheckoutMessage.query.count(),
            "orders_waiting": CheckoutMessage.query.filter_by(status="waiting").count(),
        }
    )


@admin_bp.route("/api/admin/pending-users", methods=["GET"])
@admin_required
def list_pending_users():
    users = (
        User.query.filter(
            User.verification_status == "pending",
            User.is_admin.is_(False),
            User.id_card_image.isnot(None),
        )
        .order_by(User.id.desc())
        .all()
    )
    return jsonify(
        [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "phone": u.phone,
                "student_id": u.student_id,
                "id_card_image": u.id_card_image,
                "verification_status": u.verification_status,
                "is_admin": bool(u.is_admin),
            }
            for u in users
        ]
    )


@admin_bp.route("/api/admin/users", methods=["GET"])
@admin_required
def list_all_users():
    users = User.query.order_by(User.id.desc()).all()
    return jsonify(
        [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "phone": u.phone,
                "student_id": u.student_id,
                "verification_status": u.verification_status or "pending",
                "is_admin": bool(u.is_admin),
                "listings_count": Post.query.filter_by(user_id=u.id).count(),
                "is_suspended": bool(getattr(u, "is_suspended", False)),
                "unread_notifications": AdminNotification.query.filter_by(
                    user_id=u.id
                )
                .filter(AdminNotification.read_at.is_(None))
                .count(),
            }
            for u in users
        ]
    )


@admin_bp.route("/api/admin/users/<int:user_id>/notify", methods=["POST", "OPTIONS"])
@admin_required
def admin_notify_user(user_id):
    if request.method == "OPTIONS":
        return "", 204
    return process_admin_notify(user_id, request.get_json() or {})


@admin_bp.route("/api/admin/users/<int:user_id>/verify", methods=["POST"])
@admin_required
def verify_user(user_id):
    data = request.get_json() or {}
    action = data.get("action")
    reason = (data.get("reason") or "").strip()

    if action not in ("approve", "reject"):
        return jsonify({"message": "action must be approve or reject"}), 400

    user = User.query.get_or_404(user_id)

    if getattr(user, "is_admin", False):
        return jsonify({"message": "Cannot verify admin accounts here"}), 400

    if action == "approve" and not user.id_card_image:
        return jsonify({"message": "Student has no ID card on file"}), 400

    if action == "approve":
        user.verification_status = "approved"
        user.verified_at = datetime.utcnow()
        user.rejection_reason = None
    else:
        user.verification_status = "rejected"
        user.verified_at = None
        user.rejection_reason = reason or "ID verification failed"

    db.session.commit()
    return jsonify(
        {"message": f"User {action}d", "verification_status": user.verification_status}
    )


def _delete_user_and_related(user):
    """Remove user data: listings, cart, orders, activity, ID file."""
    post_ids = [p.id for p in Post.query.filter_by(user_id=user.id).all()]

    if post_ids:
        YourCart.query.filter(YourCart.post_id.in_(post_ids)).delete(
            synchronize_session=False
        )
        CheckoutMessage.query.filter(
            CheckoutMessage.post_id.in_(post_ids)
        ).delete(synchronize_session=False)
        UserActivity.query.filter(UserActivity.post_id.in_(post_ids)).delete(
            synchronize_session=False
        )

    YourCart.query.filter_by(user_id=user.id).delete(synchronize_session=False)
    CheckoutMessage.query.filter_by(user_id=user.id).delete(synchronize_session=False)
    UserActivity.query.filter_by(user_id=user.id).delete(synchronize_session=False)

    for post in Post.query.filter_by(user_id=user.id).all():
        if post.image:
            upload_dir = os.path.abspath(
                os.path.join(current_app.root_path, "static", "uploads")
            )
            img_path = os.path.join(upload_dir, post.image)
            if os.path.isfile(img_path):
                try:
                    os.remove(img_path)
                except OSError:
                    pass
        db.session.delete(post)

    if user.id_card_image:
        id_path = os.path.join(get_id_upload_folder(), user.id_card_image)
        if os.path.isfile(id_path):
            try:
                os.remove(id_path)
            except OSError:
                pass

    db.session.delete(user)
    db.session.commit()


@admin_bp.route("/api/admin/users/<int:user_id>", methods=["DELETE", "OPTIONS"])
def delete_user(user_id):
    if request.method == "OPTIONS":
        return "", 204

    if not current_user.is_authenticated or not getattr(current_user, "is_admin", False):
        return jsonify({"message": "Admin access required"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    if user.id == current_user.id:
        return jsonify({"message": "You cannot delete your own account"}), 400

    if getattr(user, "is_admin", False):
        return jsonify({"message": "Cannot delete administrator accounts"}), 400

    try:
        _delete_user_and_related(user)
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to delete user: {str(e)}"}), 500

    return jsonify({"message": "User and related data deleted"}), 200


@admin_bp.route("/api/admin/student-id/<int:user_id>", methods=["GET"])
@admin_required
def get_student_id_image(user_id):
    user = User.query.get_or_404(user_id)
    if not user.id_card_image:
        return jsonify({"message": "No ID on file"}), 404
    return send_from_directory(get_id_upload_folder(), user.id_card_image)


@admin_bp.route("/api/admin/listings", methods=["GET"])
@admin_required
def list_all_listings():
    posts = Post.query.order_by(Post.timestamp.desc()).all()
    result = []
    for p in posts:
        seller = User.query.get(p.user_id)
        result.append(
            {
                "id": p.id,
                "title": p.title,
                "category": p.category,
                "price": p.price,
                "image": p.image,
                "timestamp": p.timestamp.strftime("%Y-%m-%d %H:%M"),
                "seller_name": seller.name if seller else "Unknown",
                "seller_email": seller.email if seller else "",
            }
        )
    return jsonify(result)


@admin_bp.route("/api/admin/listings/<int:post_id>", methods=["DELETE"])
@admin_required
def delete_listing(post_id):
    post = Post.query.get_or_404(post_id)
    db.session.delete(post)
    db.session.commit()
    return jsonify({"message": "Listing deleted"}), 200


@admin_bp.route("/api/admin/orders", methods=["GET"])
@admin_required
def list_all_orders():
    messages = CheckoutMessage.query.order_by(CheckoutMessage.timestamp.desc()).all()
    result = []
    for m in messages:
        post = Post.query.get(m.post_id)
        buyer = User.query.get(m.user_id)
        seller = User.query.get(post.user_id) if post else None
        result.append(
            {
                "id": m.id,
                "post_id": m.post_id,
                "post_title": post.title if post else "Deleted",
                "post_price": post.price if post else 0,
                "buyer_name": m.name,
                "buyer_email": m.email or (buyer.email if buyer else ""),
                "buyer_phone": m.phone,
                "address": m.address,
                "message": m.message,
                "status": m.status,
                "timestamp": m.timestamp.strftime("%Y-%m-%d %H:%M"),
                "seller_name": seller.name if seller else "",
            }
        )
    return jsonify(result)


@admin_bp.route("/api/admin/orders/<int:message_id>/status", methods=["POST"])
@admin_required
def admin_update_order_status(message_id):
    data = request.get_json() or {}
    new_status = data.get("status")
    if new_status not in ("waiting", "confirmed", "canceled"):
        return jsonify({"message": "Invalid status"}), 400
    msg = CheckoutMessage.query.get_or_404(message_id)
    msg.status = new_status
    db.session.commit()
    return jsonify({"message": "Status updated", "status": new_status})
