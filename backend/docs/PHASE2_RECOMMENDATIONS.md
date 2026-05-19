# Phase 2 — Similar items & personalized Home

## Backend

| Feature | Endpoint | Implementation |
|---------|----------|----------------|
| Similar listings | `GET /api/listings/:id/similar` | `app/nlp/similar_items.py` (BERT embeddings, TF-IDF fallback) |
| For you row | `GET /api/recommendations` | Embedding + behavior scoring in `scoring.py` |
| Wishlist signals | `POST /api/wishlist/toggle` | Logs `UserActivity` action `wishlist` |

## Frontend

- **Home** — carousel **“Recommended for you”** (loads `/api/recommendations`)
- **View** — similar items use semantic similarity (no frontend change)

## Test

```powershell
cd backend
python -c "
from run import create_app
from app.models import Post
from app.nlp.similar_items import get_similar_posts
app = create_app()
with app.app_context():
    p = Post.query.first()
    cands = Post.query.filter(Post.id != p.id).limit(20).all()
    sim = get_similar_posts(p, cands, top_n=5)
    print('Ref:', p.title)
    for s in sim:
        print(' -', s.title)
"
```

Browse a few listings and search on Home, then refresh — the **For you** row should update.

## Cold start

Users with no activity see **trending** listings from `/api/recommendations` (by view count).
