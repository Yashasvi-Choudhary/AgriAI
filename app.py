from flask import Flask, jsonify, render_template, session, redirect, request, flash, url_for
import requests
from database import create_tables, migrate_fertilizer_history
from routes.auth_routes import auth_bp

from utils.translator import get_translations

import sqlite3
import os
import sys
import importlib.util

# ─────────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────────
app = Flask(__name__)

app.secret_key = "super_secret_key_123"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

utils_path = os.path.join(BASE_DIR, "fertilizer_utils.py")
spec = importlib.util.spec_from_file_location("fertilizer_utils", utils_path)
fertilizer_utils = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fertilizer_utils)

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 86400




# ─────────────────────────────────────────────
# GLOBAL TRANSLATION CONTEXT
# ─────────────────────────────────────────────
@app.context_processor
def inject_globals():
    lang = (
        request.cookies.get("lang")
        or session.get("lang")
        or request.accept_languages.best_match(["hi", "en"])
        or "en"
    )

    path = request.path.strip("/")
    page_map = {
    "": "dashboard",
    "dashboard": "dashboard",
    "crop-recommendation": "crop-recommendation",
    "crop-yield-prediction": "crop-yield-prediction",
    "plant-disease-detection": "plant-disease-detection",
    "fertilizer-guide": "fertilizer-guide",
    "profile": "profile",   # ✅ ADD THIS
}

    page = page_map.get(path, "dashboard")
    t = get_translations(lang, page) or {}

    user = session.get("user")

    return dict(
    current_user=user or None,
    t=t or {},
    lang=lang or "en"
)


# ─────────────────────────────────────────────
# BLUEPRINTS
# ─────────────────────────────────────────────
app.register_blueprint(auth_bp, url_prefix='/auth')

create_tables()
migrate_fertilizer_history()

MODEL_PATH = os.path.join(BASE_DIR, "model", "fertilizer_model.pkl")
_model = None

def load_fertilizer_model():
    global _model
    if _model is None:
        try:
            import joblib
            _model = joblib.load(MODEL_PATH)
        except Exception:
            _model = None
    return _model


# ─────────────────────────────────────────────
# BASIC ROUTES
# ─────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/login')
def login():
    return render_template('auth/login.html')


@app.route('/register')
def register():
    return render_template('auth/register.html')


@app.route('/forgot-password')
def forgot_password_page():
    return render_template('auth/forgot_password.html')


@app.route('/reset-password')
def reset_password_page():
    return render_template('auth/reset_password.html')


# ─────────────────────────────────────────────
# DASHBOARD (SESSION CHECK)
# ─────────────────────────────────────────────
@app.route('/dashboard')
def dashboard():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/dashboard.html')


# ─────────────────────────────────────────────
# PROFILE (SESSION ONLY FIXED)
# ─────────────────────────────────────────────
@app.route("/profile", methods=["GET", "POST"])
def profile():
    if "user" not in session:
        return redirect("/login")

    user = session["user"]

    if request.method == "GET":
        return render_template("layout/profile.html", user=user)

    is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest"

    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip()
    phone = request.form.get("phone", "").strip()
    location = request.form.get("location", "").strip()

    errors = []

    if not name:
        errors.append("Full name is required.")

    if not email:
        errors.append("Email is required.")
    elif "@" not in email:
        errors.append("Invalid email format.")

    # SQLite check (no ORM)
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    existing = cursor.fetchone()

    if existing and existing[0] != user["id"]:
        errors.append("Email already in use.")

    if errors:
        conn.close()
        msg = errors[0]

        if is_ajax:
            return jsonify({"success": False, "message": msg}), 400

        flash(msg, "error")
        return redirect(url_for("profile"))

    # update DB
    cursor.execute("""
        UPDATE users
        SET name=?, email=?, phone=?, location=?
        WHERE id=?
    """, (name, email, phone, location, user["id"]))

    conn.commit()
    conn.close()

    # update session too
    session["user"]["name"] = name
    session["user"]["email"] = email

    if is_ajax:
        return jsonify({"success": True, "message": "Profile updated"}), 200

    flash("Profile updated successfully", "success")
    return redirect(url_for("profile"))


# ─────────────────────────────────────────────
# FEATURE ROUTES
# ─────────────────────────────────────────────
@app.route('/crop-recommendation')
def crop_recommendation():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/crop-recommendation.html')


@app.route('/crop-yield-prediction')
def yield_prediction():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/crop-yield-prediction.html')


@app.route('/plant-disease-detection')
def plant_disease_detection():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/plant-disease-detection.html')


@app.route('/fertilizer-guide')
def fertilizer_guide():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/fertilizer-guide.html')


# Note: QA-only helper was removed.


@app.route('/predict', methods=['POST'])
def predict_fertilizer():
    payload = request.get_json(silent=True)
    validated = fertilizer_utils.validate_input(payload)

    if not validated:
        return jsonify({"status": "error", "message": "Missing or invalid input data"}), 400

    model = load_fertilizer_model()
    if model is None:
        return jsonify({"status": "error", "message": "Model not available"}), 500

    features = fertilizer_utils.prepare_model_input(validated)
    try:
        prediction = model.predict(features)[0]
    except Exception:
        return jsonify({"status": "error", "message": "Missing or invalid input data"}), 400

    result = fertilizer_utils.build_response(prediction, validated)

    # Ensure the history table schema is up to date before saving
    migrate_fertilizer_history()

    # Save fertilizer history for logged-in users
    if "user" in session and session["user"]:
        try:
            user_id = session["user"]["id"]
            crop_type = payload.get("crop_type", "").strip()
            soil_type = payload.get("soil_type", "").strip()
            fertilizer_data = result["data"]["fertilizer_recommendation"]
            fertilizer_en = fertilizer_data["english"]
            fertilizer_hi = fertilizer_data["hindi"]

            app.logger.info(f"Saving fertilizer history for user {user_id}: crop={crop_type}, soil={soil_type}")
            
            conn = sqlite3.connect("database.db")
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO fertilizer_history (
                user_id,
                crop_type,
                soil_type,
                temperature,
                humidity,
                moisture,
                nitrogen,
                phosphorus,
                potassium,
                fertilizer_name_en,
                fertilizer_name_hi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                crop_type,
                soil_type,
                validated.get("temperature"),
                validated.get("humidity"),
                validated.get("moisture"),
                validated.get("nitrogen"),
                validated.get("phosphorus"),
                validated.get("potassium"),
                fertilizer_en.get("fertilizer_name"),
                fertilizer_hi.get("fertilizer_name"),
            ))
            conn.commit()
            conn.close()
            app.logger.info("Fertilizer history saved successfully")
        except Exception as ex:
            app.logger.error(f"Failed to save fertilizer history: {ex}", exc_info=True)

    return jsonify(result)


@app.route('/api/fertilizer/history', methods=['GET'])
def get_fertilizer_history():
    try:
        if "user" not in session or not session.get("user"):
            app.logger.warning("History request: User not in session")
            return jsonify({"success": False, "message": "Not logged in", "history": []}), 401

        user_id = session["user"].get("id")
        if not user_id:
            app.logger.warning("History request: user_id missing from session")
            return jsonify({"success": False, "message": "Invalid user", "history": []}), 401

        app.logger.info(f"Fetching history for user_id: {user_id}")
        migrate_fertilizer_history()

        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='fertilizer_history'")
        if not cursor.fetchone():
            app.logger.warning("fertilizer_history table does not exist")
            conn.close()
            return jsonify({"success": False, "message": "Table not found", "history": []}), 500

        cursor.execute("PRAGMA table_info(fertilizer_history)")
        columns = [row[1] for row in cursor.fetchall()]
        if not columns:
            conn.close()
            return jsonify({"success": False, "message": "Could not read table schema", "history": []}), 500

        select_cols = ", ".join(columns)
        cursor.execute(f"SELECT {select_cols} FROM fertilizer_history WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        rows = cursor.fetchall()
        conn.close()

        history = []
        for row in rows:
            record = {columns[idx]: row[idx] for idx in range(len(columns))}
            history.append({
                "id": record.get("id"),
                "crop_type": record.get("crop_type"),
                "soil_type": record.get("soil_type"),
                "nitrogen": record.get("nitrogen"),
                "phosphorus": record.get("phosphorus"),
                "potassium": record.get("potassium"),
                "fertilizer_name_en": record.get("fertilizer_name_en", ""),
                "fertilizer_name_hi": record.get("fertilizer_name_hi", ""),
                "created_at": record.get("created_at"),
            })

        app.logger.info(f"Returning {len(history)} history records for user {user_id}")
        return jsonify({"success": True, "history": history})
    
    except Exception as ex:
        app.logger.error(f"Error fetching fertilizer history: {ex}")
        return jsonify({"success": False, "message": str(ex), "history": []}), 500


@app.route('/api/fertilizer/history/<int:record_id>', methods=['DELETE'])
def delete_fertilizer_history(record_id):
    if "user" not in session:
        return jsonify({"success": False, "message": "Not logged in"}), 401

    user_id = session["user"]["id"]
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id FROM fertilizer_history WHERE id = ?",
        (record_id,),
    )
    row = cursor.fetchone()
    if not row or row[0] != user_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    cursor.execute(
        "DELETE FROM fertilizer_history WHERE id = ?",
        (record_id,),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True})


# ─────────────────────────────────────────────
# SAVE LOCATION (FROM FRONTEND)
# ─────────────────────────────────────────────
@app.route("/api/save-location", methods=["POST"])
def save_location():
    if "user" not in session:
        return jsonify({"success": False, "message": "Not logged in"}), 401

    data = request.get_json()

    lat = data.get("lat")
    lon = data.get("lon")
    city = data.get("city")

    user_id = session["user"]["id"]

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # Just store location (basic entry)
    cursor.execute("""
    INSERT INTO farm_conditions (user_id, latitude, longitude, location_name)
    VALUES (?, ?, ?, ?)
""", (user_id, lat, lon, city))

    conn.commit()
    conn.close()

    return jsonify({"success": True})



# ─────────────────────────────────────────────
# WEATHER API
# ─────────────────────────────────────────────
@app.route("/api/weather", methods=["POST"])
def get_weather():
    data = request.get_json()
    lat = data.get("lat")
    lon = data.get("lon")

    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&hourly=relativehumidity_2m,precipitation_probability"

    res = requests.get(url).json()

    return jsonify({
        "temperature": res["current_weather"]["temperature"],
        "windspeed": res["current_weather"]["windspeed"],
        "humidity": res["hourly"]["relativehumidity_2m"][0],
        "rainfall": res["hourly"]["precipitation_probability"][0]
    })






# ─────────────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────────────
@app.route('/logout')
def logout():
    session.pop("user", None)
    return redirect('/login')


# ─────────────────────────────────────────────
# RUN SERVER
# ─────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True)