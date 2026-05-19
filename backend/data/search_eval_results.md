# Search evaluation results

- Listings in DB: **20**
- Queries evaluated: **10**
- Skipped: **0**

## Average metrics

| Model | Precision@5 | Recall@10 | MRR |
|-------|-------------|-----------|-----|
| TF-IDF (baseline) | 0.6750 | 0.7333 | 0.7500 |
| Hybrid (BM25 + BERT + RRF) | 0.6750 | 0.7333 | 0.7500 |

## Interpretation (for report)

- **Precision@5**: Of the top 5 results, how many were labeled relevant.
- **Recall@10**: Of all relevant items, how many appeared in the top 10.
- **MRR**: How high the first relevant result ranks (higher is better).

Hybrid search combines keyword matching (BM25) and semantic similarity (Sentence-BERT).
