# Phase 1 — Hybrid search (production)

## What changed

- **New:** `app/nlp/hybrid_search.py` — BM25 + Sentence-BERT (`all-MiniLM-L6-v2`) + reciprocal rank fusion (RRF)
- **Updated:** `app/search/search.py` — `GET /api/search` now uses hybrid search
- **Fallback:** If BERT/PyTorch fails, automatically uses TF-IDF (`semantic_search.py`)

## Modes

| `SEARCH_MODE` | Behavior |
|---------------|----------|
| `hybrid` (default) | BM25 + BERT + RRF |
| `tfidf` | Legacy TF-IDF only |

Windows PowerShell (before starting server):

```powershell
$env:SEARCH_MODE = "hybrid"
python run.py
```

## Test

```powershell
cd backend
python scripts/test_search.py --query "laptop"
python scripts/test_search.py --skip-research --query "calculator"
```

First hybrid query may take 30–90s while the BERT model downloads.

## API

No frontend changes required — Home search already calls `/api/search?q=...`.

Health check: `GET /api/health` → `"ml"."search_mode": "hybrid"`.
