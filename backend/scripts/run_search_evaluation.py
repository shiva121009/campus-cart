"""
Phase 3 — compare TF-IDF vs hybrid search for the major project report.

Usage (from backend folder):
    python scripts/run_search_evaluation.py
    python scripts/run_search_evaluation.py --csv data/search_eval.csv
    python scripts/run_search_evaluation.py --json-only
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

DATA_DIR = BACKEND_ROOT / "data"
DEFAULT_CSV = DATA_DIR / "search_eval.csv"
RESULTS_JSON = DATA_DIR / "search_eval_results.json"
RESULTS_MD = DATA_DIR / "search_eval_results.md"


def _print_table(report: dict) -> None:
    summary = report["summary"]
    print("\n=== CampusCart Search Evaluation (Phase 3) ===\n")
    print(f"Listings in database: {summary['listings_in_db']}")
    print(f"Queries evaluated:    {summary['queries_evaluated']}")
    print(f"Queries skipped:      {summary['queries_skipped']}")
    bert_ok = summary.get("bert_loaded_for_hybrid", False)
    print(f"BERT loaded (hybrid): {'yes' if bert_ok else 'no (hybrid fell back to TF-IDF)'}")
    print(f"Metrics: Precision@{summary['precision_at_k']}, Recall@{summary['recall_at_k']}, MRR\n")

    header = f"{'Model':<12} {'P@5':>8} {'R@10':>8} {'MRR':>8}"
    print(header)
    print("-" * len(header))
    t = summary["tfidf"]
    h = summary["hybrid"]
    print(f"{'TF-IDF':<12} {t['avg_precision_at_5']:>8.4f} {t['avg_recall_at_10']:>8.4f} {t['avg_mrr']:>8.4f}")
    print(f"{'Hybrid':<12} {h['avg_precision_at_5']:>8.4f} {h['avg_recall_at_10']:>8.4f} {h['avg_mrr']:>8.4f}")

    if summary["queries_evaluated"]:
        p_gain = h["avg_precision_at_5"] - t["avg_precision_at_5"]
        r_gain = h["avg_recall_at_10"] - t["avg_recall_at_10"]
        print(f"\nHybrid vs TF-IDF: P@5 {p_gain:+.4f}, R@10 {r_gain:+.4f}")

    print("\n--- Per query (top 5 titles) ---\n")
    for row in report["per_query"]:
        print(f"Query: {row['query']!r} ({row['relevant_count']} relevant)")
        print(f"  TF-IDF top5: {', '.join(row['tfidf_top5_titles'][:3]) or '(none)'}...")
        print(f"  Hybrid top5: {', '.join(row['hybrid_top5_titles'][:3]) or '(none)'}...")
        print(
            f"  P@5  TF-IDF={row['tfidf_precision_at_5']:.2f}  Hybrid={row['hybrid_precision_at_5']:.2f}"
        )
        print()

    if report.get("skipped"):
        print("--- Skipped (no DB match for labels) ---")
        for s in report["skipped"]:
            print(f"  {s['query']!r}: {s['patterns']}")


def _write_markdown(report: dict, path: Path) -> None:
    s = report["summary"]
    t, h = s["tfidf"], s["hybrid"]
    lines = [
        "# Search evaluation results",
        "",
        f"- Listings in DB: **{s['listings_in_db']}**",
        f"- Queries evaluated: **{s['queries_evaluated']}**",
        f"- Skipped: **{s['queries_skipped']}**",
        "",
        "## Average metrics",
        "",
        "| Model | Precision@5 | Recall@10 | MRR |",
        "|-------|-------------|-----------|-----|",
        f"| TF-IDF (baseline) | {t['avg_precision_at_5']:.4f} | {t['avg_recall_at_10']:.4f} | {t['avg_mrr']:.4f} |",
        f"| Hybrid (BM25 + BERT + RRF) | {h['avg_precision_at_5']:.4f} | {h['avg_recall_at_10']:.4f} | {h['avg_mrr']:.4f} |",
        "",
        "## Interpretation (for report)",
        "",
        "- **Precision@5**: Of the top 5 results, how many were labeled relevant.",
        "- **Recall@10**: Of all relevant items, how many appeared in the top 10.",
        "- **MRR**: How high the first relevant result ranks (higher is better).",
        "",
        "Hybrid search combines keyword matching (BM25) and semantic similarity (Sentence-BERT).",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Phase 3 search evaluation")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Labeled queries CSV")
    parser.add_argument("--json-only", action="store_true", help="Minimal console output")
    args = parser.parse_args()

    from run import create_app
    from app.evaluation.search_eval import run_search_evaluation

    app = create_app()
    with app.app_context():
        report = run_search_evaluation(args.csv)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    _write_markdown(report, RESULTS_MD)

    if not args.json_only:
        _print_table(report)
        print(f"Saved: {RESULTS_JSON}")
        print(f"Saved: {RESULTS_MD}\n")

    return 0 if report["summary"]["queries_evaluated"] > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
