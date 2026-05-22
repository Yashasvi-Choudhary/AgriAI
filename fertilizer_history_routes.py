"""
fertilizer_history_routes.py
----------------------------
Blueprint for Fertilizer History API endpoints.

HOW TO REGISTER in app.py:
    from fertilizer_history_routes import fertilizer_history_bp
    app.register_blueprint(fertilizer_history_bp)

IMPORTANT — session must be configured correctly in app.py:
    app.secret_key = "your-secret-key"          # required for session
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_HTTPONLY"] = True

The user_id key in session must match what your login route stores.
Check your login route — it likely does one of:
    session["user_id"] = user.id      ← this file uses "user_id"
    session["id"]      = user.id      ← change _get_user_id() below if so
    session["userId"]  = user.id      ← change _get_user_id() below if so
"""

from flask import Blueprint, request, jsonify, session
from database import connect_db
import logging

fertilizer_history_bp = Blueprint("fertilizer_history", __name__)
logger = logging.getLogger(__name__)


def _get_user_id():
    """
    Return the logged-in user's id from the Flask session.
    Tries the three most common key names used in Flask projects.
    Update the list below if your login route uses a different key.
    """
    for key in ("user_id", "id", "userId", "user"):
        val = session.get(key)
        if val is not None:
            return val
    return None


def _json_401():
    return jsonify({"status": "error", "message": "Not logged in"}), 401


# ── SAVE ─────────────────────────────────────────────────────────────────────
@fertilizer_history_bp.route("/fertilizer/history/save", methods=["POST"])
def save_fertilizer_history():
    user_id = _get_user_id()
    if not user_id:
        logger.warning("save_fertilizer_history: no user_id in session. session keys: %s", list(session.keys()))
        return _json_401()

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON body"}), 400

    required = [
        "crop_type", "soil_type",
        "nitrogen", "phosphorus", "potassium",
        "fertilizer_name_en", "fertilizer_name_hi",
    ]
    for field in required:
        if field not in data:
            return jsonify({"status": "error", "message": "Missing field: " + field}), 400

    try:
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO fertilizer_history
                (user_id, crop_type, soil_type,
                 nitrogen, phosphorus, potassium,
                 temperature, humidity, moisture,
                 fertilizer_name_en, fertilizer_name_hi,
                 recommended_quantity_en, recommended_quantity_hi,
                 reason_en, reason_hi)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            data["crop_type"],
            data["soil_type"],
            data["nitrogen"],
            data["phosphorus"],
            data["potassium"],
            data.get("temperature"),
            data.get("humidity"),
            data.get("moisture"),
            data["fertilizer_name_en"],
            data["fertilizer_name_hi"],
            data.get("recommended_quantity_en", ""),
            data.get("recommended_quantity_hi", ""),
            data.get("reason_en", ""),
            data.get("reason_hi", ""),
        ))
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "id": new_id}), 201

    except Exception as exc:
        logger.exception("save_fertilizer_history error")
        return jsonify({"status": "error", "message": str(exc)}), 500


# ── FETCH ─────────────────────────────────────────────────────────────────────
@fertilizer_history_bp.route("/fertilizer/history", methods=["GET"])
def get_fertilizer_history():
    user_id = _get_user_id()
    if not user_id:
        logger.warning("get_fertilizer_history: no user_id in session. session keys: %s", list(session.keys()))
        return _json_401()

    try:
        conn = connect_db()

        def row_factory(cursor, row):
            return {desc[0]: row[idx] for idx, desc in enumerate(cursor.description)}

        conn.row_factory = row_factory
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, crop_type, soil_type,
                   nitrogen, phosphorus, potassium,
                   temperature, humidity, moisture,
                   fertilizer_name_en, fertilizer_name_hi,
                   recommended_quantity_en, recommended_quantity_hi,
                   reason_en, reason_hi,
                   created_at
            FROM fertilizer_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        """, (user_id,))
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"status": "success", "history": rows}), 200

    except Exception as exc:
        logger.exception("get_fertilizer_history error")
        return jsonify({"status": "error", "message": str(exc)}), 500


# ── DELETE ────────────────────────────────────────────────────────────────────
@fertilizer_history_bp.route("/fertilizer/history/<int:entry_id>", methods=["DELETE"])
def delete_fertilizer_history(entry_id):
    user_id = _get_user_id()
    if not user_id:
        return _json_401()

    try:
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM fertilizer_history WHERE id = ? AND user_id = ?",
            (entry_id, user_id)
        )
        deleted = cursor.rowcount
        conn.commit()
        conn.close()

        if deleted == 0:
            return jsonify({"status": "error", "message": "Entry not found or unauthorized"}), 404

        return jsonify({"status": "success", "message": "Deleted"}), 200

    except Exception as exc:
        logger.exception("delete_fertilizer_history error")
        return jsonify({"status": "error", "message": str(exc)}), 500


# ── DEBUG ENDPOINT (remove after confirming session works) ───────────────────
@fertilizer_history_bp.route("/fertilizer/history/debug", methods=["GET"])
def debug_session():
    """
    Visit /fertilizer/history/debug while logged in.
    It will show you what keys are in your session so you can confirm
    _get_user_id() is reading the right one.
    Remove this route once everything works.
    """
    return jsonify({
        "session_keys": list(session.keys()),
        "user_id_resolved": _get_user_id(),
    })