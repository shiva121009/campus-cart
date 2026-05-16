from app.models import Post

def rank_posts(scores, limit=None):
    """
    scores = {post_id: score}
    """
    ranked_ids = sorted(
        scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    if limit is None:
        return [pid for pid, _ in ranked_ids]
    return [pid for pid, _ in ranked_ids[:limit]]