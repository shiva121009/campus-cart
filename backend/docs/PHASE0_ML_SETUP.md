# Phase 0 — ML setup (CampusCart)

## Quick install

From the `backend` folder:

```powershell
pip install -r requirements-ml.txt
pip install "en-core-web-md @ https://github.com/explosion/spacy-models/releases/download/en_core_web_md-3.8.0/en_core_web_md-3.8.0-py3-none-any.whl"
python scripts/test_search.py --query "calculator"
```

If `python -m spacy download en_core_web_md` fails with a PyTorch DLL error, use the `pip install` line above instead (no spaCy CLI needed).

Or run the installer script:

```powershell
.\scripts\install_ml.ps1
```

## Verify

| Check | Command |
|--------|---------|
| Dependencies + TF-IDF search | `python scripts/test_search.py` |
| Skip slow BERT test | `python scripts/test_search.py --skip-research` |
| Research API (server running) | Open `http://127.0.0.1:5000/research/compare?query=laptop` |
| Health JSON | `http://127.0.0.1:5000/api/health` → see `"ml"` block |

## Packages installed

- **scikit-learn** — TF-IDF, cosine similarity (current production search)
- **rank-bm25** — keyword ranking (research + Phase 1 hybrid)
- **sentence-transformers** — Sentence-BERT embeddings (`all-MiniLM-L6-v2`)
- **spacy** + **en_core_web_md** — optional Word2Vec leg in research compare

## Windows: PyTorch DLL error (`c10.dll`)

If you see:

```text
OSError: [WinError 1114] ... c10.dll
```

Try in order:

1. Install [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) (x64).
2. Reinstall CPU-only PyTorch:
   ```powershell
   pip uninstall torch -y
   pip install torch --index-url https://download.pytorch.org/whl/cpu
   ```
3. Use Python **3.11 or 3.12** if 3.13 wheels are unstable on your machine.

TF-IDF and BM25 still work without PyTorch. Hybrid search (Phase 1) needs BERT, which needs a working `torch`.

## Empty database

If the test script says no listings:

```powershell
python seed_dummy_listings.py
```

## Next step

Phase 1: add `app/nlp/hybrid_search.py` and wire it into `app/search/search.py`.
