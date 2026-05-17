import os
from functools import wraps

from werkzeug.utils import secure_filename
from flask import current_app, jsonify
from flask_login import login_required, current_user
from sqlalchemy import inspect, text, func

from app.models import db, User, AdminNotification

ID_UPLOAD_FOLDER_NAME = "student_ids"
AVATAR_UPLOAD_FOLDER_NAME = "avatars"
ALLOWED_ID_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_ID_SIZE_BYTES = 5 * 1024 * 1024


def get_avatar_upload_folder():
    base = os.path.abspath(
        os.path.join(
            current_app.root_path,
            "static",
            "uploads",
            AVATAR_UPLOAD_FOLDER_NAME,
        )
    )
    os.makedirs(base, exist_ok=True)
    return base


def save_avatar_file(file_storage):
    if not file_storage or not file_storage.filename:
        return None, "Choose a profile photo"

    if not allowed_id_file(file_storage.filename):
        return None, "Avatar must be PNG, JPG, or WEBP"

    file_storage.seek(0, os.SEEK_END)
    size = file_storage.tell()
    file_storage.seek(0)
    if size > 2 * 1024 * 1024:
        return None, "Avatar must be smaller than 2 MB"

    filename = secure_filename(file_storage.filename)
    folder = get_avatar_upload_folder()
    path = os.path.join(folder, filename)
    if os.path.exists(path):
        base, ext = os.path.splitext(filename)
        filename = f"{base}_{os.urandom(4).hex()}{ext}"
        path = os.path.join(folder, filename)

    file_storage.save(path)
    return filename, None


def get_id_upload_folder():
    base = os.path.abspath(
        os.path.join(
            current_app.root_path, "static", "uploads", ID_UPLOAD_FOLDER_NAME
        )
    )
    os.makedirs(base, exist_ok=True)
    return base


def allowed_id_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_ID_EXTENSIONS


def save_student_id_file(file_storage):
    if not file_storage or not file_storage.filename:
        return None, "Student ID image is required"

    if not allowed_id_file(file_storage.filename):
        return None, "ID card must be PNG, JPG, or WEBP"

    file_storage.seek(0, os.SEEK_END)
    size = file_storage.tell()
    file_storage.seek(0)
    if size > MAX_ID_SIZE_BYTES:
        return None, "ID card must be smaller than 5 MB"

    filename = secure_filename(file_storage.filename)
    folder = get_id_upload_folder()
    path = os.path.join(folder, filename)

    if os.path.exists(path):
        base, ext = os.path.splitext(filename)
        filename = f"{base}_{os.urandom(4).hex()}{ext}"
        path = os.path.join(folder, filename)

    file_storage.save(path)
    return filename, None


def user_to_public_dict(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone or "",
        "student_id": getattr(user, "student_id", None),
        "verification_status": getattr(user, "verification_status", None) or "approved",
        "rejection_reason": getattr(user, "rejection_reason", None),
        "is_admin": bool(getattr(user, "is_admin", False)),
        "bio": getattr(user, "bio", None) or "",
        "course": getattr(user, "course", None) or "",
        "year_of_study": getattr(user, "year_of_study", None) or "",
        "hostel_or_location": getattr(user, "hostel_or_location", None) or "",
        "avatar": getattr(user, "avatar", None) or "",
        "interests": getattr(user, "interests", None) or "",
        "is_suspended": bool(getattr(user, "is_suspended", False)),
        "notifications_enabled": bool(
            getattr(user, "notifications_enabled", True)
        ),
    }


def profile_completeness(user):
    checks = [
        bool(user.name),
        bool(user.phone),
        bool(getattr(user, "bio", None)),
        bool(getattr(user, "course", None)),
        bool(getattr(user, "year_of_study", None)),
        bool(getattr(user, "hostel_or_location", None)),
        bool(getattr(user, "avatar", None)),
        bool(getattr(user, "interests", None)),
    ]
    filled = sum(1 for c in checks if c)
    return int((filled / len(checks)) * 100)


def build_profile_response(user):
    from app.models import Post, YourCart, CheckoutMessage

    data = user_to_public_dict(user)
    data["completeness"] = profile_completeness(user)
    data["member_since"] = (
        user.verified_at.strftime("%d %b %Y") if user.verified_at else None
    )
    data["stats"] = {
        "listings_count": Post.query.filter_by(user_id=user.id).count(),
        "orders_count": CheckoutMessage.query.filter_by(user_id=user.id).count(),
        "cart_count": YourCart.query.filter_by(user_id=user.id).count(),
    }
    return data


def is_user_suspended(user):
    return bool(getattr(user, "is_suspended", False)) and not bool(
        getattr(user, "is_admin", False)
    )


def is_user_verified(user):
    if is_user_suspended(user):
        return False
    status = getattr(user, "verification_status", None) or "approved"
    return status == "approved" or bool(getattr(user, "is_admin", False))


def verified_required(fn):
    """Require login + approved verification (admins always pass)."""

    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if is_user_suspended(current_user):
            latest = (
                AdminNotification.query.filter_by(user_id=current_user.id)
                .order_by(AdminNotification.created_at.desc())
                .first()
            )
            msg = (
                latest.message
                if latest
                else "Your account has been suspended by an administrator."
            )
            return jsonify({"message": msg, "is_suspended": True}), 403

        if not is_user_verified(current_user):
            status = getattr(current_user, "verification_status", None) or "pending"
            return jsonify(
                {
                    "message": "Account not verified",
                    "verification_status": status,
                    "rejection_reason": getattr(current_user, "rejection_reason", None),
                }
            ), 403
        return fn(*args, **kwargs)

    return wrapper


def migrate_user_verification_columns(app):
    with app.app_context():
        inspector = inspect(db.engine)
        if "Users" not in inspector.get_table_names():
            db.create_all()
            return

        existing = {c["name"] for c in inspector.get_columns("Users")}
        statements = []

        if "student_id" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN student_id VARCHAR(50)")
        if "id_card_image" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN id_card_image VARCHAR(300)")
        if "verification_status" not in existing:
            statements.append(
                "ALTER TABLE Users ADD COLUMN verification_status VARCHAR(20) DEFAULT 'approved'"
            )
        if "verified_at" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN verified_at DATETIME")
        if "rejection_reason" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN rejection_reason VARCHAR(255)")
        if "is_admin" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
        if "bio" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN bio TEXT")
        if "course" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN course VARCHAR(100)")
        if "year_of_study" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN year_of_study VARCHAR(30)")
        if "hostel_or_location" not in existing:
            statements.append(
                "ALTER TABLE Users ADD COLUMN hostel_or_location VARCHAR(120)"
            )
        if "avatar" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN avatar VARCHAR(300)")
        if "interests" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN interests VARCHAR(255)")
        if "is_suspended" not in existing:
            statements.append(
                "ALTER TABLE Users ADD COLUMN is_suspended BOOLEAN DEFAULT 0"
            )
        if "notifications_enabled" not in existing:
            statements.append(
                "ALTER TABLE Users ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1"
            )
        if "reset_token" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN reset_token VARCHAR(64)")
        if "reset_token_expires" not in existing:
            statements.append("ALTER TABLE Users ADD COLUMN reset_token_expires DATETIME")

        for sql in statements:
            db.session.execute(text(sql))
        db.session.commit()

        db.session.execute(
            text(
                """
                UPDATE Users
                SET verification_status = 'approved'
                WHERE verification_status IS NULL
                   OR verification_status = ''
                   OR id_card_image IS NULL
                """
            )
        )
        db.session.commit()

        admin_email = (app.config.get("ADMIN_EMAIL") or "").strip().lower()
        if admin_email:
            admin_user = User.query.filter(
                func.lower(User.email) == admin_email
            ).first()
            if admin_user:
                admin_user.is_admin = True
                admin_user.verification_status = "approved"
                db.session.commit()

        if "admin_notifications" not in inspector.get_table_names():
            db.create_all()

        migrate_listing_enhancements(app)


def migrate_listing_enhancements(app):
    with app.app_context():
        inspector = inspect(db.engine)
        if "AllPost" in inspector.get_table_names():
            existing = {c["name"] for c in inspector.get_columns("AllPost")}
            post_cols = [
                ("condition", "VARCHAR(20) DEFAULT 'good'"),
                ("negotiable", "BOOLEAN DEFAULT 0"),
                ("pickup_location", "VARCHAR(120)"),
                ("is_sold", "BOOLEAN DEFAULT 0"),
                ("view_count", "INTEGER DEFAULT 0"),
                ("extra_images", "TEXT"),
            ]
            for col, typedef in post_cols:
                if col not in existing:
                    db.session.execute(
                        text(f"ALTER TABLE AllPost ADD COLUMN {col} {typedef}")
                    )
            db.session.commit()

        db.create_all()
