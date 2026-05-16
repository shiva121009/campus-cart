import sqlite3
import pandas as pd
import numpy as np
import os
import time

from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer, CrossEncoder
from sklearn.metrics.pairwise import cosine_similarity

# ============================================
# GRADED GROUND TRUTH
# ============================================
GROUND_TRUTH = {
    "make hot tea": {
        "Electric Kettle": 3,
        "Steel Electric Kettle": 2,
        "Travel Kettle": 1
    },
    "device for math": {
        "Scientific Calculator FX-991": 3,
        "Casio Calculator": 2
    },
    "gym weights": {
        "Dumbbell Pair (5kg each)": 3,
        "Adjustable Dumbbells": 2
    },
    "study light": {
        "LED Study Lamp": 3,
        "Table Lamp": 1
    },
    "laptop charger": {
        "Dell 65 Watt Charger": 3,
        "Universal Laptop Charger": 1
    }
}

K = 5
RRF_K = 60

# ============================================
# LOAD DATA
# ============================================
def load_data():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, "instance", "CampusConnect_Database.db")
    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query(
        "SELECT id, title, description, category FROM AllPost",
        conn
    )
    conn.close()
    df["text"] = df["title"] + " " + df["description"] + " " + df["category"]
    return df


df = load_data()

tokenized_corpus = [doc.lower().split() for doc in df["text"]]
bm25_model = BM25Okapi(tokenized_corpus)

bi_encoder = SentenceTransformer("all-MiniLM-L6-v2")
db_embeddings = bi_encoder.encode(df["text"].tolist())

cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

# ============================================
# METRICS
# ============================================
def precision_at_k(ranked, relevance, k):
    return sum(1 for t in ranked[:k] if t in relevance) / k

def recall_at_k(ranked, relevance, k):
    return sum(1 for t in ranked[:k] if t in relevance) / len(relevance)

def mean_reciprocal_rank(ranked, relevance):
    for i, t in enumerate(ranked, start=1):
        if t in relevance:
            return 1 / i
    return 0.0

def ndcg_at_k(ranked, relevance, k):
    dcg = 0.0
    for i, t in enumerate(ranked[:k], start=1):
        rel = relevance.get(t, 0)
        if rel > 0:
            dcg += (2**rel - 1) / np.log2(i + 1)

    ideal = sorted(relevance.values(), reverse=True)
    idcg = sum(
        (2**rel - 1) / np.log2(i + 2)
        for i, rel in enumerate(ideal[:k])
    )
    return dcg / idcg if idcg > 0 else 0.0

# ============================================
# MODEL RUNNERS
# ============================================
def run_bm25(query):
    start = time.time()
    scores = bm25_model.get_scores(query.lower().split())
    return scores, (time.time() - start) * 1000

def run_sbert(query):
    start = time.time()
    q_emb = bi_encoder.encode([query])
    scores = cosine_similarity(q_emb, db_embeddings).flatten()
    return scores, (time.time() - start) * 1000

def run_hybrid_rrf(query):
    start = time.time()

    bm25_scores = bm25_model.get_scores(query.lower().split())
    bm25_rank = np.argsort(bm25_scores)[::-1]

    q_emb = bi_encoder.encode([query])
    sbert_scores = cosine_similarity(q_emb, db_embeddings).flatten()
    sbert_rank = np.argsort(sbert_scores)[::-1]

    rrf = {}
    for ranking in [bm25_rank, sbert_rank]:
        for rank, idx in enumerate(ranking):
            rrf[idx] = rrf.get(idx, 0) + 1 / (RRF_K + rank + 1)

    hybrid_scores = np.array([rrf[i] for i in range(len(df))])
    return hybrid_scores, (time.time() - start) * 1000

def run_cross_encoder(query):
    start = time.time()
    pairs = [[query, text] for text in df["text"]]
    scores = cross_encoder.predict(pairs)
    return scores, (time.time() - start) * 1000

# ============================================
# EVALUATION
# ============================================
if __name__ == "__main__":

    print("\n🚀 FINAL RRF HYBRID EVALUATION\n")

    metrics = {
        "BM25": [],
        "SBERT": [],
        "Hybrid": [],
        "Cross-Encoder": []
    }

    for query, relevance in GROUND_TRUTH.items():

        # BM25
        scores, t = run_bm25(query)
        ranked = df.iloc[np.argsort(scores)[::-1]]["title"].tolist()
        metrics["BM25"].append((
            int(ranked[0] in relevance),
            precision_at_k(ranked, relevance, K),
            recall_at_k(ranked, relevance, K),
            mean_reciprocal_rank(ranked, relevance),
            ndcg_at_k(ranked, relevance, K),
            t
        ))

        # SBERT
        scores, t = run_sbert(query)
        ranked = df.iloc[np.argsort(scores)[::-1]]["title"].tolist()
        metrics["SBERT"].append((
            int(ranked[0] in relevance),
            precision_at_k(ranked, relevance, K),
            recall_at_k(ranked, relevance, K),
            mean_reciprocal_rank(ranked, relevance),
            ndcg_at_k(ranked, relevance, K),
            t
        ))

        # HYBRID (RRF)
        scores, t = run_hybrid_rrf(query)
        ranked = df.iloc[np.argsort(scores)[::-1]]["title"].tolist()
        metrics["Hybrid"].append((
            int(ranked[0] in relevance),
            precision_at_k(ranked, relevance, K),
            recall_at_k(ranked, relevance, K),
            mean_reciprocal_rank(ranked, relevance),
            ndcg_at_k(ranked, relevance, K),
            t
        ))

        # Cross-Encoder
        scores, t = run_cross_encoder(query)
        ranked = df.iloc[np.argsort(scores)[::-1]]["title"].tolist()
        metrics["Cross-Encoder"].append((
            int(ranked[0] in relevance),
            precision_at_k(ranked, relevance, K),
            recall_at_k(ranked, relevance, K),
            mean_reciprocal_rank(ranked, relevance),
            ndcg_at_k(ranked, relevance, K),
            t
        ))

    print("=" * 140)
    print(f"{'Model':<16} | Acc@1 | P@5 | R@5 | MRR | NDCG@5 | Avg Latency (ms)")
    print("-" * 140)

    for model, vals in metrics.items():
        vals = np.array(vals)
        print(
            f"{model:<16} | "
            f"{vals[:,0].mean():.2f}  | "
            f"{vals[:,1].mean():.2f} | "
            f"{vals[:,2].mean():.2f} | "
            f"{vals[:,3].mean():.2f} | "
            f"{vals[:,4].mean():.2f} | "
            f"{vals[:,5].mean():.2f}"
        )

    print("=" * 140)
