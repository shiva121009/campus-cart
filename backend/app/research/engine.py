import pandas as pd
import numpy as np
from rank_bm25 import BM25Okapi
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Post

# Heavy stack (PyTorch via thinc / sentence-transformers) is loaded only on first use
# so `python run.py` works when torch DLLs fail on Windows until research routes run.

TOP_K = 5
RRF_K = 60  # Standard value used in TREC / MS MARCO

_bert_model = None
_nlp = None


def _load_research_models():
    global _bert_model, _nlp
    if _bert_model is not None and _nlp is not None:
        return _bert_model, _nlp
    import spacy
    from sentence_transformers import SentenceTransformer

    print("--- Loading Research Models ---")
    _bert_model = SentenceTransformer("all-MiniLM-L6-v2")
    _nlp = spacy.load("en_core_web_md")
    print("--- Models Ready ---")
    return _bert_model, _nlp


from app.nlp.hybrid_search import reciprocal_rank_fusion


def compare_models(user_query):
    posts = Post.query.all()
    if not posts:
        return {"error": "Database is empty."}

    # ============================================
    # DATA PREPARATION
    # ============================================
    data = []
    corpus_tokens = []

    for p in posts:
        text = f"{p.title} {p.description} {p.category}"
        data.append(
            {
                "id": p.id,
                "title": p.title,
                "text": text,
                "image": p.image,
            }
        )
        corpus_tokens.append(text.lower().split())

    df = pd.DataFrame(data)
    results = {}

    # ============================================
    # TF-IDF
    # ============================================
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(df["text"].tolist() + [user_query])
    scores = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()

    df["score_tfidf"] = scores
    results["tfidf"] = (
        df.sort_values("score_tfidf", ascending=False)
        .head(TOP_K)[["title", "score_tfidf", "image"]]
        .rename(columns={"score_tfidf": "score"})
        .to_dict(orient="records")
    )

    # ============================================
    # BM25
    # ============================================
    bm25 = BM25Okapi(corpus_tokens)
    bm25_scores = bm25.get_scores(user_query.lower().split())

    df["score_bm25"] = bm25_scores
    results["bm25"] = (
        df.sort_values("score_bm25", ascending=False)
        .head(TOP_K)[["title", "score_bm25", "image"]]
        .rename(columns={"score_bm25": "score"})
        .to_dict(orient="records")
    )

    # ============================================
    # Word2Vec (spaCy) + SBERT + hybrid (need PyTorch stack)
    # ============================================
    try:
        bert_model, nlp = _load_research_models()
    except (OSError, ImportError, RuntimeError) as e:
        results["research_models_error"] = (
            "spaCy / sentence-transformers (PyTorch) could not load: "
            f"{type(e).__name__}: {e}. "
            "TF-IDF and BM25 above still work. On Windows, try reinstalling PyTorch, "
            "installing the MSVC runtime, or using Python 3.11/3.12 if 3.13 wheels are unstable."
        )
        return results

    query_vec = nlp(user_query).vector
    w2v_scores = []

    for text in df["text"]:
        doc_vec = nlp(text).vector
        denom = np.linalg.norm(query_vec) * np.linalg.norm(doc_vec)
        w2v_scores.append(np.dot(query_vec, doc_vec) / denom if denom > 0 else 0.0)

    df["score_w2v"] = w2v_scores
    results["w2v"] = (
        df.sort_values("score_w2v", ascending=False)
        .head(TOP_K)[["title", "score_w2v", "image"]]
        .rename(columns={"score_w2v": "score"})
        .to_dict(orient="records")
    )

    query_emb = bert_model.encode([user_query])
    doc_emb = bert_model.encode(df["text"].tolist())

    sbert_scores = cosine_similarity(query_emb, doc_emb).flatten()
    df["score_bert"] = sbert_scores

    results["bert"] = (
        df.sort_values("score_bert", ascending=False)
        .head(TOP_K)[["title", "score_bert", "image"]]
        .rename(columns={"score_bert": "score"})
        .to_dict(orient="records")
    )

    bm25_rank = df.sort_values("score_bm25", ascending=False)["id"].tolist()
    sbert_rank = df.sort_values("score_bert", ascending=False)["id"].tolist()

    rrf_scores = reciprocal_rank_fusion([bm25_rank, sbert_rank], k=RRF_K)

    df["score_hybrid"] = df["id"].apply(lambda x: rrf_scores.get(x, 0))

    results["hybrid"] = (
        df.sort_values("score_hybrid", ascending=False)
        .head(TOP_K)[["title", "score_hybrid", "image"]]
        .rename(columns={"score_hybrid": "score"})
        .to_dict(orient="records")
    )

    return results
