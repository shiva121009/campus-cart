"""Admin → student dashboard notifications."""

from datetime import datetime

from flask import jsonify

from app.models import db, User, AdminNotification

BROADCAST_AUDIENCES = ("all_students", "approved", "pending", "rejected")


def _broadcast_audience_query(audience):
    q = User.query.filter(User.is_admin.is_(False))
    audience = (audience or "all_students").strip().lower()
    if audience == "approved":
        q = q.filter(User.verification_status == "approved")
    elif audience == "pending":
        q = q.filter(User.verification_status == "pending")
    elif audience == "rejected":
        q = q.filter(User.verification_status == "rejected")
    return q, audience


def broadcast_recipient_count(audience):
    q, _ = _broadcast_audience_query(audience)
    return q.count()


def process_admin_broadcast(data):
    if data.get("clear"):
        return jsonify({"message": "clear is not supported for broadcast"}), 400

    if data.get("suspend"):
        return jsonify(
            {"message": "Account suspension is not available for broadcast messages"}
        ), 400

    message = (data.get("message") or "").strip()
    category = (data.get("category") or "info").strip().lower()
    audience = (data.get("audience") or "all_students").strip().lower()

    if category not in ("info", "warning"):
        return jsonify(
            {"message": "Broadcast category must be info or warning"}
        ), 400

    if audience not in BROADCAST_AUDIENCES:
        return jsonify(
            {
                "message": "audience must be all_students, approved, pending, or rejected"
            }
        ), 400

    if not message:
        return jsonify({"message": "message is required"}), 400

    q, audience = _broadcast_audience_query(audience)
    users = q.all()
    if not users:
        return jsonify({"message": "No users match this audience"}), 400

    now = datetime.utcnow()
    trimmed = message[:2000]
    notes = [
        AdminNotification(
            user_id=user.id,
            message=trimmed,
            category=category,
            applies_suspend=False,
            created_at=now,
        )
        for user in users
    ]
    db.session.add_all(notes)
    db.session.commit()

    return jsonify(
        {
            "message": f"Broadcast sent to {len(users)} user(s)",
            "recipients_count": len(users),
            "audience": audience,
            "category": category,
        }
    ), 201


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
