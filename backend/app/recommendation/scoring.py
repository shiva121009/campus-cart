from app.models import Post
from app.nlp.hybrid_search import load_embedding_model, post_document_text
from app.nlp.nlp_similarity import nlp_similarity


def _interest_document(profile, posts_by_id: dict[int, Post]) -> str:
    parts = list(profile.get("search_terms") or [])
    for key in ("viewed_posts", "cart_posts", "wishlist_posts"):
        for pid in profile.get(key) or []:
            post = posts_by_id.get(pid)
            if post:
                parts.append(post_document_text(post))
    return " ".join(parts).strip()


def score_posts(user_profile, user_id=None, limit: int = 12):
    """
    Hybrid recommendation scores: behavior + category + embedding similarity + trending.
    Returns {post_id: score}.
    """
    search_terms = user_profile.get("search_terms", [])
    categories = set(user_profile.get("categories") or [])
    viewed_posts = set(user_profile.get("viewed_posts", []))
    cart_posts = set(user_profile.get("cart_posts", []))
    wishlist_posts = set(user_profile.get("wishlist_posts", []))

    all_posts = [
        p
        for p in Post.query.all()
        if not getattr(p, "is_sold", False)
        and (user_id is None or p.user_id != user_id)
    ]
    if not all_posts:
        return {}

    posts_by_id = {p.id: p for p in all_posts}
    interest_doc = _interest_document(user_profile, posts_by_id)

    from sklearn.metrics.pairwise import cosine_similarity

    model = load_embedding_model()
    interest_emb = None
    post_emb_sims = {}
    if model is not None and interest_doc:
        interest_emb = model.encode([interest_doc], show_progress_bar=False)
        texts = [post_document_text(p) for p in all_posts]
        doc_emb = model.encode(texts, show_progress_bar=False)
        sims = cosine_similarity(interest_emb, doc_emb).flatten()
        post_emb_sims = {p.id: float(sims[i]) for i, p in enumerate(all_posts)}

    max_views = max((getattr(p, "view_count", 0) or 0) for p in all_posts) or 1

    scores = {}
    for post in all_posts:
        score = 0.0
        text = post_document_text(post)

        for term in search_terms:
            if term.lower() in text:
                score += 1.0

        if post.category in categories:
            score += 2.0

        if post.id in wishlist_posts:
            score += 4.0

        if post.id in cart_posts:
            score += 3.0

        if post.id in viewed_posts:
            score -= 2.0

        if interest_doc:
            score += 0.4 * nlp_similarity(search_terms, text)
            emb_sim = post_emb_sims.get(post.id, 0.0)
            score += 3.0 * max(emb_sim, 0.0)

        views = getattr(post, "view_count", 0) or 0
        score += 0.5 * (views / max_views)

        if score > 0:
            scores[post.id] = score

    if not scores and all_posts:
        for post in sorted(
            all_posts,
            key=lambda p: (getattr(p, "view_count", 0) or 0, p.timestamp or 0),
            reverse=True,
        )[:limit]:
            scores[post.id] = float(getattr(post, "view_count", 0) or 0)

    return scores
