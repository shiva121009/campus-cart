from flask import Blueprint, request, jsonify
from flask_login import current_user
from app.models import db, CheckoutMessage, User, Post, YourCart
from app.auth.verification_utils import verified_required

checkout_bp = Blueprint("checkout", __name__)

    
@checkout_bp.route("/api/checkout", methods=["POST"])
@verified_required
def save_checkout():
    data = request.json
    print("Received checkout data:", data)  # Debug print

    try:
        msg = CheckoutMessage(
            post_id=data["post_id"],
            user_id=current_user.id,
            name=data["name"],
            phone=data["phone"],
            address=data["address"],
            message=data.get("message", ""),
            email=current_user.email,
            seen=False
        )
        db.session.add(msg)

        # ✅ Fix: prevent autoflush error by wrapping the query
        with db.session.no_autoflush:
            cart_item = YourCart.query.filter_by(user_id=current_user.id, post_id=data["post_id"]).first()
            if cart_item:
                db.session.delete(cart_item)

        db.session.commit()
        return jsonify({"message": "Message sent to seller and item removed from cart."}), 201

    except Exception as e:
        db.session.rollback()
        print("Checkout Error:", str(e))  # Debug print
        return jsonify({"error": str(e)}), 500

    
@checkout_bp.route("/api/yourorders", methods=["GET"])
@verified_required
def get_user_orders():
    messages = CheckoutMessage.query.filter_by(user_id=current_user.id).order_by(CheckoutMessage.timestamp.desc()).all()

    orders = []
    for msg in messages:
        post = Post.query.get(msg.post_id)
        if post:
            order_data = {
                "id": msg.id,
                "post_id": post.id,
                "post_title": post.title,
                "post_price": post.price,
                "post_image": post.image,
                "name": msg.name,
                "phone": msg.phone,
                "address": msg.address,
                "message": msg.message,
                "timestamp": msg.timestamp.strftime("%Y-%m-%d %H:%M"),
                "status": msg.status, # Add status to the response
                "seller_info": None   # Initialize seller_info
            }
            
            # If the order is confirmed, add the seller's details
            if msg.status == 'confirmed':
                seller = User.query.get(post.user_id)
                if seller:
                    order_data["seller_info"] = {
                        "name": seller.name,
                        "email": seller.email,
                        "phone": seller.phone 
                    }
            orders.append(order_data)

    return jsonify(orders), 200

@checkout_bp.route("/api/unseen-messages", methods=["GET"])
@verified_required
def get_unseen_messages_count():
    post_ids = [p.id for p in Post.query.filter_by(user_id=current_user.id)]
    count = CheckoutMessage.query.filter(
        CheckoutMessage.post_id.in_(post_ids),
        CheckoutMessage.seen == False
    ).count()
    return jsonify({"count": count})


@checkout_bp.route("/api/messages-for-youritems", methods=["GET"])
@verified_required
def get_messages_for_items():
    posts = Post.query.filter_by(user_id=current_user.id).all()
    data = []
    for post in posts:
        messages = CheckoutMessage.query.filter_by(post_id=post.id).all()
        data.append({
            "post_id": post.id,
            "messages": [{
                "id": m.id,
                "name": m.name,
                "phone": m.phone,
                "address": m.address,
                "message": m.message,
                "timestamp": m.timestamp.strftime("%Y-%m-%d %H:%M")
            } for m in messages]
        })
    return jsonify(data)

@checkout_bp.route("/api/messages/mark-seen", methods=["POST"])
@verified_required
def mark_messages_as_seen():
    from app.models import CheckoutMessage, Post

    # Get all posts listed by this user
    post_ids = [p.id for p in Post.query.filter_by(user_id=current_user.id)]

    # Update all unseen messages
    CheckoutMessage.query.filter(
        CheckoutMessage.post_id.in_(post_ids),
        CheckoutMessage.seen == False
    ).update({CheckoutMessage.seen: True}, synchronize_session=False)

    db.session.commit()
    return jsonify({"message": "Messages marked as seen"})

@checkout_bp.route("/api/messages-for-youritems/<int:post_id>", methods=["GET"])
@verified_required
def get_messages_for_single_item(post_id):
    post = Post.query.filter_by(id=post_id, user_id=current_user.id).first()
    if not post:
        return jsonify({"error": "Item not found or unauthorized"}), 404

    messages = CheckoutMessage.query.filter_by(post_id=post_id).order_by(
        CheckoutMessage.timestamp.desc()
    ).all()

    return jsonify([
        {
            "id": msg.id,
            "name": msg.name,
            "phone": msg.phone,
            "address": msg.address,
            "message": msg.message,
            "timestamp": msg.timestamp.strftime("%Y-%m-%d %H:%M"),
            "seen": msg.seen,
            "status": msg.status  # <-- THIS IS THE LINE THAT WAS MISSING
        }
        for msg in messages
    ])

@checkout_bp.route("/api/orders/<int:message_id>/update_status", methods=["POST"])
@verified_required
def update_order_status(message_id):
    data = request.json
    new_status = data.get("status")

    if not new_status in ["confirmed", "canceled"]:
        return jsonify({"error": "Invalid status"}), 400

    msg = CheckoutMessage.query.get_or_404(message_id)
    post = Post.query.get_or_404(msg.post_id)

    # Security Check: Make sure the current user is the seller
    if post.user_id != current_user.id:
        return jsonify({"error": "Unauthorized action"}), 403

    msg.status = new_status
    db.session.commit()

    return jsonify({"message": f"Order status updated to {new_status}"}), 200
