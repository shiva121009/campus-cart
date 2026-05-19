from flask import Flask, jsonify, request, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_login import LoginManager
from app.models import db, User, Post, YourCart

ALLOWED_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
)


def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='/static')

    # Apply CORS to all routes (covers /api/admin/* and nested paths).
    CORS(
        app,
        origins=list(ALLOWED_ORIGINS),
        supports_credentials=True,
        allow_headers=["Content-Type"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # Basic config
    app.config['SECRET_KEY'] = 'campus_connect'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///CampusConnect_Database.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # Local HTTP (Vite on :5173, API on :5000): Lax + non-secure cookies work for localhost.
    # For HTTPS production, set SESSION_COOKIE_SECURE=True and consider SameSite="None".
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = False
    # Optional: auto-promote this email to admin on server start
    app.config["ADMIN_EMAIL"] = "admin@campuscart.com"
    # Secret required for /admin/register (change in production)
    app.config["ADMIN_SECRET"] = "campuscart-admin-2026"


    @app.before_request
    def handle_cors_preflight():
        if request.method != "OPTIONS":
            return None
        origin = request.headers.get("Origin")
        if origin not in ALLOWED_ORIGINS:
            return None
        response = make_response("", 204)
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = (
            "GET,POST,PUT,DELETE,OPTIONS"
        )
        return response

    @app.after_request
    def apply_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = (
                "GET,POST,PUT,DELETE,OPTIONS"
            )
        return response

    # Initialize SQLAlchemy
    db.init_app(app)

    # Flask-Login setup
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "login"

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"message": "Unauthorized"}), 401

    # Register blueprints
    from app.auth.authRoutes import auth_bp
    from app.listings.listRoutes import listings_bp
    from app.listings.image_utils import imagedisplay
    from app.search.search import search
    from app.checkout.buyerinfo import checkout_bp  
    from app.recommendation.recommendRoutes import recommend_bp
    from app.research.routes import research_bp
    from app.auth.adminRoutes import admin_bp
    from app.listings.ux_routes import ux_bp

    app.register_blueprint(recommend_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(listings_bp)
    app.register_blueprint(imagedisplay)
    app.register_blueprint(search)
    app.register_blueprint(checkout_bp)
    app.register_blueprint(research_bp)
    app.register_blueprint(ux_bp)

    def _ml_import_status():
        """Lightweight Phase 0 check — imports only, does not load BERT weights."""
        status = {}
        for key, module in (
            ("sklearn", "sklearn"),
            ("bm25", "rank_bm25"),
            ("spacy", "spacy"),
            ("sentence_transformers", "sentence_transformers"),
        ):
            try:
                __import__(module)
                status[key] = True
            except ImportError:
                status[key] = False
        status["spacy_en_core_web_md"] = False
        import importlib.util

        status["spacy_en_core_web_md"] = (
            importlib.util.find_spec("en_core_web_md") is not None
        )
        status["torch"] = False
        try:
            import torch

            torch.tensor([1.0])
            status["torch"] = True
        except Exception:
            pass
        status["phase0_ready"] = (
            status.get("sklearn")
            and status.get("bm25")
            and status.get("torch")
            and status.get("sentence_transformers")
        )
        try:
            from app.nlp.hybrid_search import get_search_mode

            status["search_mode"] = get_search_mode()
        except ImportError:
            status["search_mode"] = "unknown"
        return status

    @app.route("/api/health", methods=["GET"])
    def api_health():
        """Quick check that this server build includes admin notify."""
        rules = {r.rule for r in app.url_map.iter_rules()}
        return jsonify(
            {
                "ok": True,
                "admin_notify": "/api/admin/users/<int:user_id>/notify" in rules,
                "admin_broadcast": "/api/admin/broadcast" in rules,
                "admin_broadcast_preview": "/api/admin/broadcast/preview" in rules,
                "admin_dashboard": "/api/admin/dashboard" in rules,
                "api_trending": "/api/trending" in rules,
                "research_compare": "/research/compare" in rules,
                "ml": _ml_import_status(),
            }
        )

    return app


if __name__ == "__main__":
    app = create_app()

    # Ensure all DB tables exist
    with app.app_context():
        from app.models import (  # noqa: F401 — register models
            AdminNotification,
            Wishlist,
            ListingReport,
            ListingMessage,
            SellerRating,
            SavedSearch,
            BlockedUser,
        )

        db.create_all()
        from app.auth.verification_utils import migrate_user_verification_columns

        migrate_user_verification_columns(app)
        print(
            "CampusCart API ready — broadcast: GET/POST /api/admin/broadcast"
        )


    # use_reloader=False: one process, no "Restarting with stat" / duplicate debugger child.
    # The Werkzeug "development server" line is expected; use gunicorn/waitress in production.
    app.run(debug=True, use_reloader=False, host="127.0.0.1", port=5000)


