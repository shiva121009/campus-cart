from flask import Blueprint, request, jsonify
from flask_login import current_user

from app.auth.verification_utils import verified_required
from app.models import db, UserActivity, Post, BlockedUser
from app.nlp.hybrid_search import search_listings as ml_search
from app.listings.listing_utils import post_to_json, get_wishlist_ids, visible_posts_query

search = Blueprint("searchitems", __name__)


@search.route("/api/search", methods=["GET"])
@verified_required
def search_listings():
    search_term = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()
    min_price = request.args.get("min_price", type=int)
    max_price = request.args.get("max_price", type=int)
    sort = (request.args.get("sort") or "relevance").lower()

    if search_term:
        db.session.add(
            UserActivity(
                user_id=current_user.id,
                post_id=0,
                action=f"search:{search_term.lower()}",
            )
        )
        db.session.commit()
        posts = ml_search(search_term.lower(), top_n=500)
        blocked = {
            b.blocked_id
            for b in BlockedUser.query.filter_by(blocker_id=current_user.id).all()
        }
        posts = [
            p
            for p in posts
            if not getattr(p, "is_sold", False) and p.user_id not in blocked
        ]
    else:
        posts = visible_posts_query(current_user.id).order_by(
            Post.timestamp.desc()
        ).all()

    if category:
        posts = [p for p in posts if (p.category or "").lower() == category.lower()]
    if min_price is not None:
        posts = [p for p in posts if p.price >= min_price]
    if max_price is not None:
        posts = [p for p in posts if p.price <= max_price]

    if sort == "price_low":
        posts = sorted(posts, key=lambda p: p.price)
    elif sort == "price_high":
        posts = sorted(posts, key=lambda p: p.price, reverse=True)
    elif sort == "newest":
        posts = sorted(posts, key=lambda p: p.timestamp or 0, reverse=True)

    wl_ids = get_wishlist_ids(current_user.id)
    return jsonify([post_to_json(p, current_user.id, wl_ids) for p in posts]), 200
