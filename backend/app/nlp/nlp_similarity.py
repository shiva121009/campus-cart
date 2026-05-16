from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def nlp_similarity(user_terms, post_text):
    if not user_terms:
        return 0.0

    corpus = [
        post_text.lower(),
        " ".join(user_terms).lower()
    ]

    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf = vectorizer.fit_transform(corpus)

    similarity = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
    return float(similarity)
