"""
Flask API for the Expression Compiler Visualizer.
Run from this directory: python app.py
"""

from __future__ import annotations

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

from compiler_pipeline import compile_expression

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/compile", methods=["POST"])
def compile_route():
    payload = request.get_json(silent=True) or {}
    expr = payload.get("expression", "")
    if not isinstance(expr, str):
        expr = str(expr)
    out = compile_expression(expr)
    return jsonify(out)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
