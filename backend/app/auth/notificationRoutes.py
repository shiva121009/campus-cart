from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.models import db, AdminNotification
from app.auth.verification_utils import verified_required, is_user_suspended

notification_bp = Blueprint("notifications", __name__)


def _notification_json(n):
    return {
        "id": n.id,
        "message": n.message,
        "category": n.category or "info",
        "created_at": n.created_at.isoformat() + "Z" if n.created_at else None,
        "read": n.read_at is not None,
        "applies_suspend": bool(n.applies_suspend),
    }


@notification_bp.route("/api/notifications", methods=["GET"])
@verified_required
def list_notifications():
    if is_user_suspended(current_user):
        return jsonify(
            {
                "message": "Account suspended",
                "is_suspended": True,
                "notifications": [],
            }
        ), 403

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


@notification_bp.route("/api/notifications/preferences", methods=["PUT"])
@verified_required
def update_notification_preferences():
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


@notification_bp.route("/api/notifications/<int:notification_id>/read", methods=["POST"])
@verified_required
def mark_notification_read(notification_id):
    note = AdminNotification.query.filter_by(
        id=notification_id, user_id=current_user.id
    ).first_or_404()
    if not note.read_at:
        note.read_at = datetime.utcnow()
        db.session.commit()
    return jsonify({"message": "Marked as read", "notification": _notification_json(note)})


@notification_bp.route("/api/notifications/read-all", methods=["POST"])
@verified_required
def mark_all_notifications_read():
    now = datetime.utcnow()
    (
        AdminNotification.query.filter_by(user_id=current_user.id)
        .filter(AdminNotification.read_at.is_(None))
        .update({"read_at": now}, synchronize_session=False)
    )
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"})
