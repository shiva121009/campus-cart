"""
Phase 3 — offline search evaluation (TF-IDF vs hybrid).

Loads labeled queries from data/search_eval.csv and computes IR metrics.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass, asdict
from pathlib import Path

from app.evaluation.metrics import mean_reciprocal_rank, precision_at_k, recall_at_k
from app.models import Post
from app.nlp.hybrid_search import hybrid_search
from app.nlp.semantic_search import semantic_search

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DEFAULT_CSV = DATA_DIR / "search_eval.csv"
PRECISION_K = 5
RECALL_K = 10


@dataclass
class QueryEvalResult:
    query: str
    relevant_count: int
    tfidf_precision_at_5: float
    tfidf_recall_at_10: float
    tfidf_mrr: float
    hybrid_precision_at_5: float
    hybrid_recall_at_10: float
    hybrid_mrr: float
    tfidf_top5_titles: list[str]
    hybrid_top5_titles: list[str]


def _resolve_relevant_posts(all_posts: list[Post], title_patterns: list[str]) -> list[Post]:
    """Match relevant listings by case-insensitive substring on title."""
    patterns = [p.strip().lower() for p in title_patterns if p.strip()]
    if not patterns:
        return []

    matched = []
    seen = set()
    for post in all_posts:
        title_lower = (post.title or "").lower()
        for pat in patterns:
            if pat in title_lower or title_lower in pat:
                if post.id not in seen:
                    seen.add(post.id)
                    matched.append(post)
                break
    return matched


def load_eval_queries(csv_path: Path | None = None) -> list[dict]:
    path = csv_path or DEFAULT_CSV
    if not path.exists():
        raise FileNotFoundError(f"Evaluation CSV not found: {path}")

    rows = []
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            query = (row.get("query") or "").strip()
            if not query:
                continue
            raw = row.get("relevant_titles") or ""
            titles = [t.strip() for t in raw.split("|") if t.strip()]
            rows.append(
                {
                    "query": query,
                    "relevant_titles": titles,
                    "notes": (row.get("notes") or "").strip(),
                }
            )
    return rows


def evaluate_single_query(
    query: str,
    relevant_posts: list[Post],
    all_posts: list[Post] | None = None,
) -> QueryEvalResult:
    if all_posts is None:
        all_posts = Post.query.all()

    # min_score=0 for evaluation so rare-word queries are not truncated
    tfidf_ranked = semantic_search(query, top_n=500, min_score=0.0)
    hybrid_ranked = hybrid_search(query, top_n=500, posts=all_posts)

    return QueryEvalResult(
        query=query,
        relevant_count=len(relevant_posts),
        tfidf_precision_at_5=precision_at_k(tfidf_ranked, relevant_posts, PRECISION_K),
        tfidf_recall_at_10=recall_at_k(tfidf_ranked, relevant_posts, RECALL_K),
        tfidf_mrr=mean_reciprocal_rank(tfidf_ranked, relevant_posts),
        hybrid_precision_at_5=precision_at_k(hybrid_ranked, relevant_posts, PRECISION_K),
        hybrid_recall_at_10=recall_at_k(hybrid_ranked, relevant_posts, RECALL_K),
        hybrid_mrr=mean_reciprocal_rank(hybrid_ranked, relevant_posts),
        tfidf_top5_titles=[p.title for p in tfidf_ranked[:5]],
        hybrid_top5_titles=[p.title for p in hybrid_ranked[:5]],
    )


def run_search_evaluation(csv_path: Path | None = None) -> dict:
    """Run full evaluation; returns summary + per-query results."""
    queries = load_eval_queries(csv_path)
    all_posts = Post.query.all()
    title_to_post = {p.title: p for p in all_posts}

    per_query: list[QueryEvalResult] = []
    skipped = []

    for item in queries:
        relevant = _resolve_relevant_posts(all_posts, item["relevant_titles"])
        if not relevant:
            skipped.append(
                {
                    "query": item["query"],
                    "patterns": item["relevant_titles"],
                    "reason": "no matching listings in database",
                }
            )
            continue
        per_query.append(
            evaluate_single_query(item["query"], relevant, all_posts=all_posts)
        )

    def _avg(attr: str, prefix: str) -> float:
        if not per_query:
            return 0.0
        return sum(getattr(r, f"{prefix}_{attr}") for r in per_query) / len(per_query)

    from app.nlp.hybrid_search import load_embedding_model

    bert_loaded = load_embedding_model() is not None

    summary = {
        "bert_loaded_for_hybrid": bert_loaded,
        "queries_evaluated": len(per_query),
        "queries_skipped": len(skipped),
        "precision_at_k": PRECISION_K,
        "recall_at_k": RECALL_K,
        "tfidf": {
            "avg_precision_at_5": round(_avg("precision_at_5", "tfidf"), 4),
            "avg_recall_at_10": round(_avg("recall_at_10", "tfidf"), 4),
            "avg_mrr": round(_avg("mrr", "tfidf"), 4),
        },
        "hybrid": {
            "avg_precision_at_5": round(_avg("precision_at_5", "hybrid"), 4),
            "avg_recall_at_10": round(_avg("recall_at_10", "hybrid"), 4),
            "avg_mrr": round(_avg("mrr", "hybrid"), 4),
        },
        "listings_in_db": len(all_posts),
        "known_titles_sample": list(title_to_post.keys())[:5],
    }

    return {
        "summary": summary,
        "per_query": [asdict(r) for r in per_query],
        "skipped": skipped,
    }
