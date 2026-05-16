from flask import Blueprint, jsonify
from flask_login import current_user
from app.auth.verification_utils import verified_required

from app.recommendation.user_profile import build_user_profile
from app.recommendation.scoring import score_posts
from app.recommendation.ranker import rank_posts
from app.evaluation.metrics import precision_at_k, recall_at_k
from app.models import Post


recommend_bp = Blueprint("recommend", __name__)

@recommend_bp.route("/api/recommendations", methods=["GET"])
@verified_required
def get_recommendations():
    if not current_user.is_authenticated:
        return jsonify({"message": "Unauthorized"}), 401
    
    user_id = current_user.id

    # Step 2a: profile
    profile = build_user_profile(user_id)

    # Step 2b: scoring
    scores = score_posts(profile)

    # Step 2c: ranking
    ranked_post_ids = rank_posts(scores)

    if not ranked_post_ids:
        return jsonify([]), 200

    posts = Post.query.filter(Post.id.in_(ranked_post_ids), Post.user_id != current_user.id).all()

    post_map = {p.id: p for p in posts}
    ordered_posts = [post_map[pid] for pid in ranked_post_ids if pid in post_map]

    # -------- OFFLINE EVALUATION METRICS --------

    # Assume relevance based on user's preferred categories
    preferred_categories = profile.get("categories", [])

    # Fallback: infer category from recent search intent (generic)
    if not preferred_categories:
        search_terms = profile.get("search_terms", [])

        keyword_category_map = {
            "football": "sports",
            "sports": "sports",
            "shoe": "sports",
            "gym": "sports",
            "workout": "sports",

            "table": "furniture",
            "chair": "furniture",
            "bed": "furniture",
            "lamp": "furniture",

            "charger": "electronics",
            "kettle": "electronics",
            "speaker": "electronics",
            "pen drive": "electronics",

            "book": "stationary",
            "calculator": "stationary",
            "notes": "stationary"
        }

        for term in search_terms:
            term = term.lower()
            if term in keyword_category_map:
                preferred_categories = [keyword_category_map[term]]
                break

    relevant_posts = []
    if preferred_categories:
        relevant_posts = Post.query.filter(
            Post.category.in_(preferred_categories),
            Post.user_id != current_user.id
        ).all()


    k = 5
    precision = precision_at_k(ordered_posts, relevant_posts, k)
    recall = recall_at_k(ordered_posts, relevant_posts, k)

    print(f"[EVAL] Precision@{k}: {precision}")
    print(f"[EVAL] Recall@{k}: {recall}")


    return jsonify([
        {
            "id": p.id,
            "title": p.title,
            "price": p.price,
            "category": p.category,
            "image": p.image
        }
        for p in ordered_posts
    ])
