from flask import Blueprint, request, jsonify, session
from werkzeug.security import (
    generate_password_hash,
    check_password_hash,
)
from flask_login import login_user, logout_user, login_required, current_user

from datetime import datetime

from app.models import db, User, AdminNotification
from app.auth.verification_utils import (
    save_student_id_file,
    save_avatar_file,
    user_to_public_dict,
    build_profile_response,
    verified_required,
    is_user_verified,
    is_user_suspended,
)
from app.auth.admin_notify_utils import process_admin_notify

auth_bp = Blueprint("auth", __name__)


def has_required_fields(data, required_fields):
    return all(field in data and data[field] for field in required_fields)


@auth_bp.route("/api/register", methods=["POST", "OPTIONS"])
def api_register():
    if request.method == "OPTIONS":
        return "", 204

    if not request.content_type or "multipart/form-data" not in request.content_type:
        return jsonify(
            {"message": "Registration requires form data with ID card image."}
        ), 415

    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").lower().strip()
    phone = request.form.get("phone", "").strip()
    password = request.form.get("password", "")
    confirm = request.form.get("confirmPassword", "")
    student_id = request.form.get("student_id", "").strip()
    id_file = request.files.get("id_card")

    if not all([name, email, phone, password, confirm, student_id]):
        return jsonify({"message": "Missing required fields"}), 400

    if password != confirm:
        return jsonify({"message": "Passwords do not match"}), 400

    if len(student_id) < 4:
        return jsonify({"message": "Enter a valid university roll number"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    filename, err = save_student_id_file(id_file)
    if err:
        return jsonify({"message": err}), 400

    new_user = User(
        name=name,
        email=email,
        password=generate_password_hash(password),
        phone=phone,
        student_id=student_id,
        id_card_image=filename,
        verification_status="pending",
        is_admin=False,
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify(
        {
            "message": "Registration submitted. Your student ID is under review.",
            "verification_status": "pending",
        }
    ), 201


@auth_bp.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    if not has_required_fields(data, ("email", "password")):
        return jsonify({"message": "Missing required fields"}), 400

    email = data["email"].lower().strip()
    password = data["password"]
    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid credentials, please try again."}), 401

    if getattr(user, "is_admin", False):
        return jsonify(
            {
                "message": "Use admin login at /admin/login for administrator accounts.",
                "is_admin": True,
            }
        ), 403

    status = user.verification_status or "pending"

    if status == "pending":
        return jsonify(
            {
                "message": "Account pending ID verification. Wait for admin approval.",
                "verification_status": "pending",
            }
        ), 403

    if status == "rejected":
        return jsonify(
            {
                "message": user.rejection_reason
                or "Verification rejected. Contact admin.",
                "verification_status": "rejected",
                "rejection_reason": user.rejection_reason,
            }
        ), 403

    if is_user_suspended(user):
        from app.models import AdminNotification

        latest = (
            AdminNotification.query.filter_by(user_id=user.id)
            .order_by(AdminNotification.created_at.desc())
            .first()
        )
        return jsonify(
            {
                "message": (
                    latest.message
                    if latest
                    else "Your account has been suspended. Contact campus admin."
                ),
                "is_suspended": True,
            }
        ), 403

    login_user(user)
    return jsonify(
        {"message": "Login successful", "user": user_to_public_dict(user)}
    ), 200


@auth_bp.route("/api/logout", methods=["POST"])
@login_required
def api_logout():
    logout_user()
    return jsonify({"message": "Logout successful"}), 200


@auth_bp.route("/api/home", methods=["GET"])
@verified_required
def api_home():
    return jsonify(
        {"message": "User authenticated", "user": user_to_public_dict(current_user)}
    ), 200


@auth_bp.route("/api/me")
def me():
    if current_user.is_authenticated:
        data = user_to_public_dict(current_user)
        data["verified"] = is_user_verified(current_user)
        return jsonify(data)
    return jsonify({"message": "Not logged in"}), 401


@auth_bp.route("/api/profile", methods=["GET", "PUT", "OPTIONS"])
@verified_required
def user_profile():
    if request.method == "OPTIONS":
        return "", 204

    if request.method == "GET":
        return jsonify(build_profile_response(current_user)), 200

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    bio = (data.get("bio") or "").strip()
    course = (data.get("course") or "").strip()
    year_of_study = (data.get("year_of_study") or "").strip()
    hostel_or_location = (data.get("hostel_or_location") or "").strip()
    interests = (data.get("interests") or "").strip()[:255]

    if not name:
        return jsonify({"message": "Name is required"}), 400
    if not phone:
        return jsonify({"message": "Phone number is required"}), 400
    if len(bio) > 500:
        return jsonify({"message": "Bio must be 500 characters or less"}), 400

    current_user.name = name
    current_user.phone = phone
    current_user.bio = bio or None
    current_user.course = course or None
    current_user.year_of_study = year_of_study or None
    current_user.hostel_or_location = hostel_or_location or None
    current_user.interests = interests or None

    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    confirm_password = data.get("confirm_password") or ""

    if new_password or current_password:
        if not current_password:
            return jsonify({"message": "Enter current password to change it"}), 400
        if not check_password_hash(current_user.password, current_password):
            return jsonify({"message": "Current password is incorrect"}), 400
        if len(new_password) < 6:
            return jsonify({"message": "New password must be at least 6 characters"}), 400
        if new_password != confirm_password:
            return jsonify({"message": "New passwords do not match"}), 400
        current_user.password = generate_password_hash(new_password)

    db.session.commit()
    return jsonify(
        {
            "message": "Profile updated successfully",
            "profile": build_profile_response(current_user),
        }
    ), 200


@auth_bp.route("/api/profile/avatar", methods=["POST", "OPTIONS"])
def upload_profile_avatar():
    if request.method == "OPTIONS":
        return "", 204

    if not current_user.is_authenticated:
        return jsonify({"message": "Unauthorized"}), 401
    if not is_user_verified(current_user):
        return jsonify({"message": "Account not verified"}), 403

    avatar_file = request.files.get("avatar")
    filename, err = save_avatar_file(avatar_file)
    if err:
        return jsonify({"message": err}), 400

    current_user.avatar = filename
    db.session.commit()
    return jsonify(
        {
            "message": "Profile photo updated",
            "profile": build_profile_response(current_user),
        }
    ), 200


def _notification_json(n):
    return {
        "id": n.id,
        "message": n.message,
        "category": n.category or "info",
        "created_at": n.created_at.isoformat() + "Z" if n.created_at else None,
        "read": n.read_at is not None,
        "applies_suspend": bool(n.applies_suspend),
    }


@auth_bp.route("/api/notifications", methods=["GET", "OPTIONS"])
@verified_required
def list_notifications():
    if request.method == "OPTIONS":
        return "", 204
    rows = (
        AdminNotification.query.filter_by(user_id=current_user.id)
        .order_by(AdminNotification.created_at.desc())
        .limit(50)
        .all()
    )
    unread = sum(1 for n in rows if not n.read_at)
    return jsonify(
        {
            "notifications_enabled": bool(
                getattr(current_user, "notifications_enabled", True)
            ),
            "unread_count": unread,
            "notifications": [_notification_json(n) for n in rows],
        }
    )


@auth_bp.route("/api/notifications/preferences", methods=["PUT", "OPTIONS"])
@verified_required
def update_notification_preferences():
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json() or {}
    if "enabled" not in data:
        return jsonify({"message": "enabled field required"}), 400
    current_user.notifications_enabled = bool(data["enabled"])
    db.session.commit()
    return jsonify(
        {
            "message": "Preferences updated",
            "notifications_enabled": current_user.notifications_enabled,
        }
    )


@auth_bp.route(
    "/api/notifications/<int:notification_id>/read", methods=["POST", "OPTIONS"]
)
@verified_required
def mark_notification_read(notification_id):
    if request.method == "OPTIONS":
        return "", 204
    note = AdminNotification.query.filter_by(
        id=notification_id, user_id=current_user.id
    ).first_or_404()
    if not note.read_at:
        note.read_at = datetime.utcnow()
        db.session.commit()
    return jsonify(
        {"message": "Marked as read", "notification": _notification_json(note)}
    )


def _require_admin_json():
    if not current_user.is_authenticated:
        return jsonify({"message": "Unauthorized"}), 401
    if not getattr(current_user, "is_admin", False):
        return jsonify({"message": "Admin access required"}), 403
    return None


@auth_bp.route("/api/admin/users/<int:user_id>/notify", methods=["POST", "OPTIONS"])
def admin_notify_user_auth(user_id):
    if request.method == "OPTIONS":
        return "", 204
    denied = _require_admin_json()
    if denied:
        return denied
    return process_admin_notify(user_id, request.get_json() or {})


@auth_bp.route("/api/admin/notify/<int:user_id>", methods=["POST", "OPTIONS"])
def admin_notify_user_alt(user_id):
    """Alternate URL in case of stale admin blueprint registration."""
    if request.method == "OPTIONS":
        return "", 204
    denied = _require_admin_json()
    if denied:
        return denied
    return process_admin_notify(user_id, request.get_json() or {})


@auth_bp.route("/api/notifications/read-all", methods=["POST", "OPTIONS"])
@verified_required
def mark_all_notifications_read():
    if request.method == "OPTIONS":
        return "", 204
    now = datetime.utcnow()
    (
        AdminNotification.query.filter_by(user_id=current_user.id)
        .filter(AdminNotification.read_at.is_(None))
        .update({"read_at": now}, synchronize_session=False)
    )
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"})


@auth_bp.before_app_request
def session_timeout():
    session.permanent = False
