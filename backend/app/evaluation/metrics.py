def precision_at_k(recommended_posts, relevant_posts, k):
    """Precision@K = relevant items in top-K / K."""
    if not recommended_posts or k <= 0:
        return 0.0

    recommended_k = recommended_posts[:k]
    relevant_ids = {p.id for p in relevant_posts}

    relevant_shown = sum(1 for p in recommended_k if p.id in relevant_ids)
    return relevant_shown / len(recommended_k)


def recall_at_k(recommended_posts, relevant_posts, k):
    """Recall@K = relevant items in top-K / total relevant."""
    if not relevant_posts or k <= 0:
        return 0.0

    recommended_k = recommended_posts[:k]
    relevant_ids = {p.id for p in relevant_posts}

    relevant_shown = sum(1 for p in recommended_k if p.id in relevant_ids)
    return relevant_shown / len(relevant_ids)


def mean_reciprocal_rank(recommended_posts, relevant_posts):
    """MRR: 1/rank of first relevant item, or 0 if none."""
    if not recommended_posts or not relevant_posts:
        return 0.0

    relevant_ids = {p.id for p in relevant_posts}
    for rank, post in enumerate(recommended_posts, start=1):
        if post.id in relevant_ids:
            return 1.0 / rank
    return 0.0
