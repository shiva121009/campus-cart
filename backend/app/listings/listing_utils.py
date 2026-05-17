from sqlalchemy import or_

from app.models import Post, User, Wishlist, BlockedUser, SellerRating


def _blocked_seller_ids(viewer_id):
    if not viewer_id:
        return set()
    rows = BlockedUser.query.filter_by(blocker_id=viewer_id).all()
    return {r.blocked_id for r in rows}


def visible_posts_query(viewer_id=None, include_sold=False):
    q = Post.query
    if not include_sold:
        q = q.filter(
            or_(Post.is_sold.is_(False), Post.is_sold.is_(None))
        )
    blocked = _blocked_seller_ids(viewer_id)
    if blocked:
        q = q.filter(~Post.user_id.in_(blocked))
    return q


def seller_rating_summary(seller_id):
    ratings = SellerRating.query.filter_by(seller_id=seller_id).all()
    if not ratings:
        return {"avg": 0, "count": 0}
    avg = sum(r.stars for r in ratings) / len(ratings)
    return {"avg": round(avg, 1), "count": len(ratings)}


def post_to_json(post, viewer_id=None, wishlist_ids=None):
    seller = User.query.get(post.user_id)
    extra = post.get_extra_images() if hasattr(post, "get_extra_images") else []
    data = {
        "id": post.id,
        "title": post.title,
        "description": post.description,
        "category": post.category,
        "price": post.price,
        "image": post.image,
        "extra_images": extra,
        "status": "sold" if getattr(post, "is_sold", False) else "available",
        "is_sold": bool(getattr(post, "is_sold", False)),
        "condition": getattr(post, "condition", None) or "good",
        "negotiable": bool(getattr(post, "negotiable", False)),
        "pickup_location": getattr(post, "pickup_location", None) or "",
        "view_count": getattr(post, "view_count", 0) or 0,
        "timestamp": post.timestamp.isoformat() if post.timestamp else None,
        "seller_id": post.user_id,
        "seller_name": seller.name if seller else "Unknown",
        "seller_verified": (
            getattr(seller, "verification_status", None) == "approved"
            if seller
            else False
        ),
    }
    if viewer_id is not None and wishlist_ids is not None:
        data["in_wishlist"] = post.id in wishlist_ids
    elif viewer_id is not None:
        data["in_wishlist"] = (
            Wishlist.query.filter_by(user_id=viewer_id, post_id=post.id).first()
            is not None
        )
    return data


def get_wishlist_ids(user_id):
    if not user_id:
        return set()
    return {w.post_id for w in Wishlist.query.filter_by(user_id=user_id).all()}
