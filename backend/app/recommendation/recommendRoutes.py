import os

from flask import Blueprint, jsonify
from flask_login import current_user

from app.auth.verification_utils import verified_required
from app.listings.listing_utils import get_wishlist_ids, post_to_json, visible_posts_query
from app.models import Post
from app.recommendation.ranker import rank_posts
from app.recommendation.scoring import score_posts
from app.recommendation.user_profile import build_user_profile

recommend_bp = Blueprint("recommend", __name__)

RECOMMEND_LIMIT = 12


@recommend_bp.route("/api/recommendations", methods=["GET"])
@verified_required
def get_recommendations():
    user_id = current_user.id
    profile = build_user_profile(user_id)
    scores = score_posts(profile, user_id=user_id, limit=RECOMMEND_LIMIT)
    ranked_post_ids = rank_posts(scores, limit=RECOMMEND_LIMIT)

    if not ranked_post_ids:
        wl_ids = get_wishlist_ids(user_id)
        trending = (
            visible_posts_query(user_id)
            .filter(Post.user_id != user_id)
            .order_by(Post.view_count.desc(), Post.timestamp.desc())
            .limit(RECOMMEND_LIMIT)
            .all()
        )
        return jsonify([post_to_json(p, user_id, wl_ids) for p in trending]), 200

    posts = Post.query.filter(Post.id.in_(ranked_post_ids)).all()
    post_map = {p.id: p for p in posts}
    ordered = [post_map[pid] for pid in ranked_post_ids if pid in post_map]

    wl_ids = get_wishlist_ids(user_id)
    payload = [post_to_json(p, user_id, wl_ids) for p in ordered]

    if os.environ.get("RECOMMEND_DEBUG") == "1":
        from app.evaluation.metrics import precision_at_k, recall_at_k

        preferred = profile.get("categories") or []
        relevant = []
        if preferred:
            relevant = (
                visible_posts_query(user_id)
                .filter(Post.category.in_(preferred), Post.user_id != user_id)
                .all()
            )
        k = 5
        print(f"[EVAL] Precision@{k}: {precision_at_k(ordered, relevant, k)}")
        print(f"[EVAL] Recall@{k}: {recall_at_k(ordered, relevant, k)}")

    return jsonify(payload), 200
