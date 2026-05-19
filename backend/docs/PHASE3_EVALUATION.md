# Phase 3 — Search evaluation (major project)

## Purpose

Compare **TF-IDF** (baseline) vs **Hybrid** (BM25 + Sentence-BERT + RRF) using standard information retrieval metrics for your report/viva.

## Files

| File | Role |
|------|------|
| `data/search_eval.csv` | Labeled test queries (`query`, `relevant_titles` pipe-separated) |
| `app/evaluation/search_eval.py` | Evaluation engine |
| `scripts/run_search_evaluation.py` | CLI to run and export results |
| `data/search_eval_results.json` | Machine-readable output (generated) |
| `data/search_eval_results.md` | Table for copy-paste into report (generated) |

## Run

```powershell
cd backend
python scripts/run_search_evaluation.py
```

First run may be slow while BERT loads (~30–90s).

If the script prints `BERT loaded: no`, hybrid uses the TF-IDF fallback — fix PyTorch (see `PHASE0_ML_SETUP.md`) and re-run so hybrid metrics reflect BM25 + BERT.

## Metrics

| Metric | Meaning |
|--------|---------|
| **Precision@5** | Relevant items in top 5 ÷ 5 |
| **Recall@10** | Relevant items found in top 10 ÷ all relevant |
| **MRR** | 1 ÷ rank of first relevant hit |

## Customize labels

Edit `data/search_eval.csv`. Use listing **titles** from your database (substring match). Example:

```csv
query,relevant_titles,notes
calculator,Scientific Calculator (Casio),viva demo
```

Re-run the script after seeding listings: `python seed_dummy_listings.py`

## Report paragraph (template)

> We evaluated search on N labeled queries. Hybrid retrieval (BM25 + Sentence-BERT with RRF) achieved Precision@5 of X and Recall@10 of Y, compared to TF-IDF baseline Precision@5 of A and Recall@10 of B. This shows improved relevance for natural-language campus marketplace queries.

Replace X, Y, A, B with values from `search_eval_results.md`.
