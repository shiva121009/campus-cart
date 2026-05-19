"""
Production hybrid search: BM25 + Sentence-BERT (all-MiniLM-L6-v2) fused with RRF.

Set SEARCH_MODE=tfidf to force legacy TF-IDF only.
Set SEARCH_MODE=hybrid (default) for BM25 + BERT; falls back to TF-IDF if BERT cannot load.
"""

from __future__ import annotations

import os

from rank_bm25 import BM25Okapi
from sklearn.metrics.pairwise import cosine_similarity

from app.models import Post
from app.nlp.semantic_search import semantic_search

RRF_K = 60
BERT_MODEL_NAME = "all-MiniLM-L6-v2"

_bert_model = None
_bert_load_failed = False


def get_search_mode() -> str:
    return (os.environ.get("SEARCH_MODE") or "hybrid").strip().lower()


def reciprocal_rank_fusion(rankings: list[list[int]], k: int = RRF_K) -> dict[int, float]:
    scores: dict[int, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return scores


def _load_bert():
    global _bert_model, _bert_load_failed
    if _bert_load_failed:
        return None
    if _bert_model is not None:
        return _bert_model
    try:
        from sentence_transformers import SentenceTransformer

        _bert_model = SentenceTransformer(BERT_MODEL_NAME)
        return _bert_model
    except (OSError, ImportError, RuntimeError):
        _bert_load_failed = True
        return None


def _post_text(post: Post) -> str:
    return f"{post.title} {post.description} {post.category}".strip().lower()


def post_document_text(post: Post) -> str:
    """Public helper for similar items and recommendations."""
    return _post_text(post)


def load_embedding_model():
    """Shared Sentence-BERT model (same singleton as hybrid search)."""
    return _load_bert()


def hybrid_search(query: str, top_n: int = 500, posts: list[Post] | None = None) -> list[Post]:
    """
    Rank listings for a query. Returns Post objects in relevance order.
  """
    q = (query or "").strip().lower()
    if not q:
        return []

    if get_search_mode() == "tfidf":
        return semantic_search(q, top_n=top_n)

    if posts is None:
        posts = Post.query.all()
    if not posts:
        return []

    model = _load_bert()
    if model is None:
        return semantic_search(q, top_n=top_n)

    post_ids = [p.id for p in posts]
    id_to_post = {p.id: p for p in posts}
    corpus_tokens = [_post_text(p).split() for p in posts]
    texts = [_post_text(p) for p in posts]

    bm25 = BM25Okapi(corpus_tokens)
    bm25_scores = bm25.get_scores(q.split())
    bm25_rank = [
        post_ids[i]
        for i in sorted(range(len(post_ids)), key=lambda i: bm25_scores[i], reverse=True)
    ]

    query_emb = model.encode([q], show_progress_bar=False)
    doc_emb = model.encode(texts, show_progress_bar=False)
    sbert_scores = cosine_similarity(query_emb, doc_emb).flatten()
    sbert_rank = [
        post_ids[i]
        for i in sorted(range(len(post_ids)), key=lambda i: sbert_scores[i], reverse=True)
    ]

    rrf_scores = reciprocal_rank_fusion([bm25_rank, sbert_rank], k=RRF_K)
    ranked_ids = sorted(rrf_scores.keys(), key=lambda pid: rrf_scores[pid], reverse=True)[
        :top_n
    ]

    return [id_to_post[pid] for pid in ranked_ids if pid in id_to_post]


def search_listings(query: str, top_n: int = 500) -> list[Post]:
    """Entry point used by the search API (hybrid with TF-IDF fallback)."""
    return hybrid_search(query, top_n=top_n)
