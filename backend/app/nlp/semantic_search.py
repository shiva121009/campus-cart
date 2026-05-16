from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Post


def semantic_search(query, top_n=500):
    posts = Post.query.all()
    if not posts or not query:
        return []

    corpus = []
    post_ids = []

    for post in posts:
        text = f"{post.title} {post.description} {post.category} {post.category}"
        corpus.append(text.lower())
        post_ids.append(post.id)

    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform(corpus + [query.lower()])

    similarities = cosine_similarity(
        tfidf_matrix[-1], tfidf_matrix[:-1]
    ).flatten()

    ranked = sorted(
        zip(post_ids, similarities),
        key=lambda x: x[1],
        reverse=True
    )

    ranked_ids = [pid for pid, score in ranked if score > 0.05][:top_n]

    if not ranked_ids:
        return []

    return Post.query.filter(Post.id.in_(ranked_ids)).all()