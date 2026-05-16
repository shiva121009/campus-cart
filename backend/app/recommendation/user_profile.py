from app.models import db, UserActivity, Post
from sqlalchemy import func

def build_user_profile(user_id):
    profile = {
        "search_terms": [],
        "categories": set(),
        "viewed_posts": [],
        "cart_posts": []
    }

    activities = UserActivity.query.filter_by(user_id=user_id).all()

    for a in activities:
        if a.action.startswith("search:"):
            term = a.action.split("search:")[1]
            profile["search_terms"].append(term)

        if a.action == "view" and a.post_id:
            profile["viewed_posts"].append(a.post_id)

        if a.action == "cart" and a.post_id:
            profile["cart_posts"].append(a.post_id)

    if profile["viewed_posts"] or profile["cart_posts"]:
        posts = Post.query.filter(Post.id.in_(
            profile["viewed_posts"] + profile["cart_posts"]
        )).all()

        for p in posts:
            profile["categories"].add(p.category)

    profile["categories"] = list(profile["categories"])
    return profile
