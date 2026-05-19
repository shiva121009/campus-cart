from app.models import UserActivity, Post, Wishlist


def build_user_profile(user_id):
    profile = {
        "search_terms": [],
        "categories": set(),
        "viewed_posts": [],
        "cart_posts": [],
        "wishlist_posts": [],
    }

    activities = UserActivity.query.filter_by(user_id=user_id).all()

    for a in activities:
        if a.action.startswith("search:"):
            term = a.action.split("search:", 1)[1]
            if term:
                profile["search_terms"].append(term)

        if a.action == "view" and a.post_id:
            profile["viewed_posts"].append(a.post_id)

        if a.action == "cart" and a.post_id:
            profile["cart_posts"].append(a.post_id)

        if a.action == "wishlist" and a.post_id:
            profile["wishlist_posts"].append(a.post_id)

    for w in Wishlist.query.filter_by(user_id=user_id).all():
        profile["wishlist_posts"].append(w.post_id)

    profile["wishlist_posts"] = list(dict.fromkeys(profile["wishlist_posts"]))
    profile["viewed_posts"] = list(dict.fromkeys(profile["viewed_posts"]))
    profile["cart_posts"] = list(dict.fromkeys(profile["cart_posts"]))

    interest_ids = (
        profile["viewed_posts"]
        + profile["cart_posts"]
        + profile["wishlist_posts"]
    )
    if interest_ids:
        posts = Post.query.filter(Post.id.in_(interest_ids)).all()
        for p in posts:
            if p.category:
                profile["categories"].add(p.category)

    profile["categories"] = list(profile["categories"])
    return profile
