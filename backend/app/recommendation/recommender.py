from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Post


def get_recommendations(item_id, top_n=3):
    # Fetch all items
    items = Post.query.all()

    if not items:
        return []

    # Find reference item
    ref_item = next((i for i in items if i.id == item_id), None)
    if not ref_item:
        return []

    # Prepare corpus
    corpus = []
    ids = []

    for item in items:
        if item.id != item_id and item.category == ref_item.category:
            text = f"{item.title} {item.description}"
            corpus.append(text)
            ids.append(item.id)

    if not corpus:
        return []

    # Vectorize text
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(corpus + [f"{ref_item.title} {ref_item.description}"])

    # Compute similarity
    similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()

    # Rank items
    ranked = sorted(
        zip(ids, similarities),
        key=lambda x: x[1],
        reverse=True
    )

    recommended_ids = [rid for rid, score in ranked[:top_n]]

    # Fetch items from DB
    recommendations = Post.query.filter(Post.id.in_(recommended_ids)).all()

    return recommendations