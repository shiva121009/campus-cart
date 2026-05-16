from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from flask_login import current_user
from app.auth.verification_utils import verified_required
from app.models import db, Post, YourCart, UserActivity
from datetime import datetime
import os
from sqlalchemy import or_
from app.nlp.semantic_search import semantic_search

search = Blueprint("searchitems",__name__)

@search.route("/api/search", methods=["GET"])
@verified_required
def search_listings():
    search_term = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()

    if search_term:
        activity = UserActivity(
            user_id=current_user.id,
            post_id=0,
            action=f"search:{search_term.lower()}",
        )
        db.session.add(activity)
        db.session.commit()

    if search_term:
        posts = semantic_search(search_term.lower(), top_n=500)
    else:
        posts = Post.query.order_by(Post.timestamp.desc()).all()

    if category:
        posts = [p for p in posts if (p.category or "").lower() == category.lower()]

    results = [
        {
            "id": post.id,
            "title": post.title,
            "description": post.description,
            "category": post.category,
            "price": post.price,
            "status": "available",
            "image": post.image,
        }
        for post in posts
    ]

    return jsonify(results), 200
