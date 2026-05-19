"""
Phase 0 — verify ML dependencies and search pipelines.

Run from backend folder:
    python scripts/test_search.py
    python scripts/test_search.py --query "laptop"
    python scripts/test_search.py --research-only
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def check_imports() -> dict[str, bool]:
    results: dict[str, bool] = {}

    try:
        import sklearn  # noqa: F401

        results["scikit-learn"] = True
    except ImportError:
        results["scikit-learn"] = False

    try:
        from rank_bm25 import BM25Okapi  # noqa: F401

        results["rank-bm25"] = True
    except ImportError:
        results["rank-bm25"] = False

    try:
        import pandas  # noqa: F401

        results["pandas"] = True
    except ImportError:
        results["pandas"] = False

    try:
        import spacy  # noqa: F401

        results["spacy"] = True
    except ImportError:
        results["spacy"] = False

    try:
        from sentence_transformers import SentenceTransformer  # noqa: F401

        results["sentence-transformers"] = True
    except ImportError:
        results["sentence-transformers"] = False

    import importlib.util

    results["spacy en_core_web_md"] = (
        importlib.util.find_spec("en_core_web_md") is not None
    )

    results["torch"] = False
    try:
        import torch

        _ = torch.tensor([1.0])
        results["torch"] = True
    except Exception:
        pass

    return results


def print_import_report(results: dict[str, bool]) -> bool:
    print("\n=== Phase 0: dependency check ===\n")
    optional = {"spacy en_core_web_md", "torch"}
    for name, ok in results.items():
        mark = "OK" if ok else "MISSING"
        print(f"  [{mark:7}] {name}")
        if not ok and name == "spacy en_core_web_md":
            print("         Run: python -m spacy download en_core_web_md")
        if not ok and name == "torch":
            print(
                "         PyTorch DLL error on Windows? See backend/docs/PHASE0_ML_SETUP.md"
            )
    print()
    return bool(results.get("scikit-learn") and results.get("rank-bm25"))


def _print_search_results(label: str, posts: list, query: str, top_n: int = 5) -> None:
    print(f"=== {label} ===\n")
    if not posts:
        print(f"  No results for: {query!r}\n")
        return
    for i, p in enumerate(posts[:top_n], 1):
        print(f"  {i}. {p.title} (Rs {p.price}) - {p.category}")
    print()


def run_tfidf_search(query: str, top_n: int = 5) -> None:
    from run import create_app
    from app.nlp.semantic_search import semantic_search

    app = create_app()
    with app.app_context():
        from app.models import Post

        count = Post.query.count()
        print(f"Database: {count} listings\n")
        if count == 0:
            print("  No listings. Run: python seed_dummy_listings.py\n")
            return

        posts = semantic_search(query, top_n=top_n)
        _print_search_results("TF-IDF (legacy fallback)", posts, query, top_n)


def run_hybrid_search(query: str, top_n: int = 5) -> None:
    from run import create_app
    from app.nlp.hybrid_search import get_search_mode, hybrid_search

    app = create_app()
    with app.app_context():
        from app.models import Post

        if Post.query.count() == 0:
            print("  No listings. Run: python seed_dummy_listings.py\n")
            return

        mode = get_search_mode()
        print(f"SEARCH_MODE={mode}\n")
        posts = hybrid_search(query, top_n=top_n)
        _print_search_results("Hybrid search (production /api/search)", posts, query, top_n)


def run_research_compare(query: str) -> None:
    from run import create_app
    from app.research.engine import compare_models

    app = create_app()
    with app.app_context():
        from app.models import Post

        if Post.query.count() == 0:
            print("=== Research compare — skipped (empty DB) ===\n")
            return

        print(f"=== Research compare (/research/compare) — query: {query!r} ===\n")
        data = compare_models(query)

        if data.get("error"):
            print(f"  Error: {data['error']}\n")
            return

        if data.get("research_models_error"):
            print(f"  Note: {data['research_models_error']}\n")

        for key in ("tfidf", "bm25", "bert", "hybrid"):
            rows = data.get(key) or []
            print(f"  --- {key.upper()} (top {len(rows)}) ---")
            for row in rows[:5]:
                title = row.get("title", "?")
                score = row.get("score", 0)
                print(f"      {title[:60]:<60}  score={score:.4f}")
            print()


def main() -> int:
    parser = argparse.ArgumentParser(description="CampusCart Phase 0 ML verification")
    parser.add_argument(
        "--query",
        default="laptop",
        help="Test query for search pipelines (default: laptop)",
    )
    parser.add_argument(
        "--research-only",
        action="store_true",
        help="Skip TF-IDF; only run research compare_models",
    )
    parser.add_argument(
        "--skip-research",
        action="store_true",
        help="Skip research compare (faster; no BERT download)",
    )
    args = parser.parse_args()

    imports_ok = print_import_report(check_imports())
    if not imports_ok:
        print("Install missing packages:")
        print("  pip install -r requirements-ml.txt")
        print("  python -m spacy download en_core_web_md\n")
        return 1

    if not args.research_only:
        try:
            run_hybrid_search(args.query)
        except Exception as e:
            print(f"Hybrid search failed: {e}\n")
            return 1
        try:
            run_tfidf_search(args.query)
        except Exception as e:
            print(f"TF-IDF search failed: {e}\n")

    if not args.skip_research:
        try:
            run_research_compare(args.query)
        except Exception as e:
            print(f"Research compare failed: {e}\n")
            print("TF-IDF/BM25 may still work. Fix PyTorch/spaCy for full hybrid stack.\n")
            return 1

    if not check_imports().get("torch"):
        print(
            "Phase 0 (partial): TF-IDF/BM25 ready. Install/fix PyTorch for BERT hybrid.\n"
            "See backend/docs/PHASE0_ML_SETUP.md\n"
        )
        return 0
    print("Phase 1 active: /api/search uses hybrid_search (BM25 + BERT + RRF).\n")
    print("Set SEARCH_MODE=tfidf to use legacy TF-IDF only.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
