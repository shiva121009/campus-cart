from flask import Blueprint, request, jsonify
from app.research.engine import compare_models

research_bp = Blueprint('research', __name__)

@research_bp.route('/research/compare')
def research_api():
    query = request.args.get('query', '')
    if not query:
        return jsonify({"error": "No query provided"})
    
    results = compare_models(query)
    return jsonify(results)