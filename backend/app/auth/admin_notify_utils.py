"""Admin → student dashboard notifications."""

from datetime import datetime

from flask import jsonify

from app.models import db, User, AdminNotification


def process_admin_notify(user_id, data):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    if getattr(user, "is_admin", False):
        return jsonify({"message": "Cannot notify administrator accounts"}), 400

    if data.get("clear"):
        AdminNotification.query.filter_by(user_id=user.id).delete(
            synchronize_session=False
        )
        user.is_suspended = False
        db.session.commit()
        return jsonify({"message": "All notifications cleared; account reactivated"})

    message = (data.get("message") or "").strip()
    category = (data.get("category") or "info").strip().lower()
    suspend = bool(data.get("suspend"))

    if category not in ("info", "warning", "restriction"):
        return jsonify(
            {"message": "category must be info, warning, or restriction"}
        ), 400

    if not message:
        return jsonify({"message": "message is required"}), 400

    note = AdminNotification(
        user_id=user.id,
        message=message[:2000],
        category=category,
        applies_suspend=suspend,
        created_at=datetime.utcnow(),
    )
    db.session.add(note)

    if suspend:
        user.is_suspended = True
    elif data.get("unsuspend"):
        user.is_suspended = False

    db.session.commit()
    return jsonify(
        {
            "message": "Notification sent to user dashboard",
            "notification_id": note.id,
            "is_suspended": bool(user.is_suspended),
        }
    ), 201
