from app.models import Post
from app.nlp.nlp_similarity import nlp_similarity

def score_posts(user_profile):
    scores = {}

    search_terms = user_profile.get("search_terms", [])
    categories = user_profile.get("categories", [])
    viewed_posts = set(user_profile.get("viewed_posts", []))
    cart_posts = set(user_profile.get("cart_posts", []))

    all_posts = Post.query.all()

    for post in all_posts:
        score = 0
        text = f"{post.title} {post.description}".lower()

        for term in search_terms:
            if term.lower() in text:
                score += 1

        if post.category in categories:
            score += 2

        if post.id in viewed_posts:
            score -= 5   # penalize

        if post.id in cart_posts:
            score += 3
        
        # 🔥 5️⃣ NLP SIMILARITY (NEW)
        post_text = f"{post.title} {post.description} {post.category}"
        nlp_score = nlp_similarity(search_terms, post_text)

        score += 0.4 * nlp_score   # hybrid weight

        if score > 0:
            scores[post.id] = score

    return scores
