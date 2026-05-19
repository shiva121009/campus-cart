"""Embedding-based similar listings (Phase 2)."""

from __future__ import annotations

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models import Post
from app.nlp.hybrid_search import load_embedding_model, post_document_text


def get_similar_posts(
    reference: Post,
    candidates: list[Post],
    top_n: int = 8,
    min_score: float = 0.25,
) -> list[Post]:
    """
    Rank candidates by semantic similarity to reference listing.
    Falls back to same-category + TF-IDF if BERT is unavailable.
    """
    if not reference or not candidates:
        return []

    candidates = [p for p in candidates if p.id != reference.id]
    if not candidates:
        return []

    model = load_embedding_model()
    if model is not None:
        ref_emb = model.encode([post_document_text(reference)], show_progress_bar=False)
        texts = [post_document_text(p) for p in candidates]
        doc_emb = model.encode(texts, show_progress_bar=False)
        sims = cosine_similarity(ref_emb, doc_emb).flatten()
        ranked = sorted(zip(candidates, sims), key=lambda x: x[1], reverse=True)
        out = [p for p, s in ranked if s >= min_score][:top_n]
        if out:
            return out

    return _similar_tfidf_fallback(reference, candidates, top_n)


def _similar_tfidf_fallback(
    reference: Post, candidates: list[Post], top_n: int
) -> list[Post]:
    same_cat = [p for p in candidates if p.category == reference.category]
    pool = same_cat if same_cat else candidates

    ref_text = post_document_text(reference)
    corpus = [post_document_text(p) for p in pool]
    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform(corpus + [ref_text])
    sims = cosine_similarity(matrix[-1], matrix[:-1]).flatten()
    ranked = sorted(zip(pool, sims), key=lambda x: x[1], reverse=True)
    return [p for p, _ in ranked[:top_n]]
