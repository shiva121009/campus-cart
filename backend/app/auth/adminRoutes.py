import os
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, send_from_directory, current_app
from flask_login import login_required, login_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func, or_

from app.models import (
    db,
    User,
    Post,
    CheckoutMessage,
    YourCart,
    UserActivity,
    AdminNotification,
    ListingReport,
)
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
            "users_suspended": User.query.filter_by(is_suspended=True).count(),
            "listings_total": Post.query.count(),
            "listings_sold": Post.query.filter_by(is_sold=True).count(),
            "orders_total": CheckoutMessage.query.count(),
            "orders_waiting": CheckoutMessage.query.filter_by(status="waiting").count(),
            "reports_pending": ListingReport.query.filter_by(status="pending").count(),
        }
    )


def _order_admin_json(m):
    post = Post.query.get(m.post_id)
    seller = User.query.get(post.user_id) if post else None
    buyer = User.query.get(m.user_id)
    return {
        "id": m.id,
        "post_id": m.post_id,
        "post_title": post.title if post else "Deleted",
        "post_price": post.price if post else 0,
        "buyer_name": m.name,
        "buyer_phone": m.phone,
        "buyer_email": m.email or (buyer.email if buyer else ""),
        "address": m.address,
        "message": m.message or "",
        "status": m.status,
        "timestamp": m.timestamp.strftime("%d %b %Y, %H:%M") if m.timestamp else "",
        "seller_name": seller.name if seller else "",
        "seller_email": seller.email if seller else "",
    }


def _chart_last_7_days():
    labels = []
    listings = []
    orders = []
    verifications = []
    today = datetime.utcnow().date()
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        start = datetime.combine(day, datetime.min.time())
        end = start + timedelta(days=1)
        labels.append(day.strftime("%a %d"))
        listings.append(
            Post.query.filter(Post.timestamp >= start, Post.timestamp < end).count()
        )
        orders.append(
            CheckoutMessage.query.filter(
                CheckoutMessage.timestamp >= start, CheckoutMessage.timestamp < end
            ).count()
        )
        verifications.append(
            User.query.filter(
                User.verified_at.isnot(None),
                User.verified_at >= start,
                User.verified_at < end,
            ).count()
        )
    return {"labels": labels, "listings": listings, "orders": orders, "verifications": verifications}


@admin_bp.route("/api/admin/dashboard", methods=["GET"])
@admin_required
def admin_dashboard():
    pending_q = User.query.filter(
        User.verification_status == "pending",
        User.is_admin.is_(False),
        User.id_card_image.isnot(None),
    )
    pending_users = pending_q.order_by(User.id.desc()).limit(10).all()

    waiting_orders = (
        CheckoutMessage.query.filter_by(status="waiting")
        .order_by(CheckoutMessage.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_orders = (
        CheckoutMessage.query.order_by(CheckoutMessage.timestamp.desc()).limit(6).all()
    )

    pending_reports_q = ListingReport.query.filter_by(status="pending").order_by(
        ListingReport.created_at.desc()
    )
    pending_reports = pending_reports_q.limit(10).all()

    reports_out = []
    for r in pending_reports:
        post = Post.query.get(r.post_id)
        reporter = User.query.get(r.reporter_id)
        reports_out.append(
            {
                "id": r.id,
                "post_id": r.post_id,
                "post_title": post.title if post else "Deleted",
                "reporter_name": reporter.name if reporter else "",
                "reason": r.reason or "",
                "created_at": r.created_at.strftime("%d %b %Y") if r.created_at else "",
            }
        )

    inbox = []
    for u in pending_users:
        inbox.append(
            {
                "type": "verification",
                "id": u.id,
                "title": u.name,
                "subtitle": u.email,
                "meta": u.student_id or "—",
                "user_id": u.id,
            }
        )
    for m in waiting_orders:
        o = _order_admin_json(m)
        inbox.append(
            {
                "type": "order",
                "id": m.id,
                "title": o["post_title"],
                "subtitle": o["buyer_name"],
                "meta": f"₹{o['post_price']}",
                "order": o,
            }
        )
    for r in reports_out:
        inbox.append(
            {
                "type": "report",
                "id": r["id"],
                "title": r["post_title"],
                "subtitle": r["reporter_name"],
                "meta": (r["reason"] or "")[:80],
                "post_id": r["post_id"],
            }
        )

    return jsonify(
        {
            "stats": {
                "users_total": User.query.count(),
                "users_pending": pending_q.count(),
                "users_approved": User.query.filter_by(
                    verification_status="approved"
                ).count(),
                "users_suspended": User.query.filter_by(is_suspended=True).count(),
                "listings_total": Post.query.count(),
                "listings_sold": Post.query.filter_by(is_sold=True).count(),
                "listings_available": Post.query.filter_by(is_sold=False).count(),
                "orders_total": CheckoutMessage.query.count(),
                "orders_waiting": CheckoutMessage.query.filter_by(
                    status="waiting"
                ).count(),
                "orders_confirmed": CheckoutMessage.query.filter_by(
                    status="confirmed"
                ).count(),
                "reports_pending": ListingReport.query.filter_by(
                    status="pending"
                ).count(),
            },
            "inbox": inbox,
            "chart": _chart_last_7_days(),
            "pending_verifications": [
                {
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "student_id": u.student_id,
                }
                for u in pending_users
            ],
            "waiting_orders": [_order_admin_json(m) for m in waiting_orders],
            "recent_orders": [_order_admin_json(m) for m in recent_orders],
            "pending_reports": reports_out,
        }
    )


@admin_bp.route("/api/admin/search", methods=["GET"])
@admin_required
def admin_search():
    q = (request.args.get("q") or "").strip().lower()
    if len(q) < 2:
        return jsonify({"users": [], "listings": [], "orders": []}), 200

    users = (
        User.query.filter(
            or_(
                func.lower(User.name).contains(q),
                func.lower(User.email).contains(q),
                func.lower(User.student_id).contains(q),
            )
        )
        .limit(8)
        .all()
    )
    posts = (
        Post.query.filter(
            or_(
                func.lower(Post.title).contains(q),
                func.lower(Post.description).contains(q),
            )
        )
        .limit(8)
        .all()
    )
    orders = (
        CheckoutMessage.query.filter(
            or_(
                func.lower(CheckoutMessage.name).contains(q),
                func.lower(CheckoutMessage.email).contains(q),
            )
        )
        .order_by(CheckoutMessage.timestamp.desc())
        .limit(8)
        .all()
    )

    return jsonify(
        {
            "users": [
                {
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "verification_status": u.verification_status,
                }
                for u in users
            ],
            "listings": [
                {
                    "id": p.id,
                    "title": p.title,
                    "price": p.price,
                    "category": p.category,
                }
                for p in posts
            ],
            "orders": [
                {
                    "id": m.id,
                    "post_title": Post.query.get(m.post_id).title
                    if Post.query.get(m.post_id)
                    else "Deleted",
                    "buyer_name": m.name,
                    "status": m.status,
                }
                for m in orders
            ],
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


@admin_bp.route("/api/admin/reports", methods=["GET"])
@admin_required
def list_reports():
    reports = ListingReport.query.order_by(ListingReport.created_at.desc()).all()
    result = []
    for r in reports:
        post = Post.query.get(r.post_id)
        reporter = User.query.get(r.reporter_id)
        result.append(
            {
                "id": r.id,
                "post_id": r.post_id,
                "post_title": post.title if post else "Deleted",
                "reporter_name": reporter.name if reporter else "",
                "reason": r.reason,
                "status": r.status,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M"),
            }
        )
    return jsonify(result)


@admin_bp.route("/api/admin/reports/<int:report_id>/status", methods=["POST"])
@admin_required
def update_report_status(report_id):
    data = request.get_json() or {}
    status = (data.get("status") or "").strip()
    if status not in ("pending", "reviewed", "dismissed"):
        return jsonify({"message": "Invalid status"}), 400
    report = ListingReport.query.get_or_404(report_id)
    report.status = status
    db.session.commit()
    return jsonify({"message": "Updated", "status": status})


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
