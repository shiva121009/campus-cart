def precision_at_k(recommended_posts, relevant_posts, k):
    """
    Precision@K = relevant items shown / total items shown
    """
    if not recommended_posts:
        return 0.0

    recommended_k = recommended_posts[:k]
    relevant_ids = set(p.id for p in relevant_posts)

    relevant_shown = sum(1 for p in recommended_k if p.id in relevant_ids)

    return relevant_shown / len(recommended_k)


def recall_at_k(recommended_posts, relevant_posts, k):
    """
    Recall@K = relevant items shown / total relevant items
    """
    if not relevant_posts:
        return 0.0

    recommended_k = recommended_posts[:k]
    relevant_ids = set(p.id for p in relevant_posts)

    relevant_shown = sum(1 for p in recommended_k if p.id in relevant_ids)

    return relevant_shown / len(relevant_ids)