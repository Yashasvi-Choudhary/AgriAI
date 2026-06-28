import uuid
import datetime
import math
import json
from werkzeug.security import generate_password_hash, check_password_hash
from utils.geolocation import geocode_location

from flask import Flask, jsonify, render_template, session, redirect, request, flash, url_for, send_from_directory
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from database import create_tables, migrate_fertilizer_history
from routes.auth_routes import auth_bp

from routes.community_routes import community
from routes.crop_routes import crop as crop_bp, generate_crop_response
from fertilizer_history_routes import fertilizer_history_bp

from utils.translator import get_translations

import sqlite3
import pandas as pd
import joblib
import os
import sys
import importlib.util

# Fix: Import load_dotenv for environment variable loading
from dotenv import load_dotenv

# ─────────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────────
app = Flask(__name__)

from flask_mail import Mail, Message
from config import *

# ✅ YAHI ADD KARNA HAI
app.config['MAIL_SERVER'] = MAIL_SERVER
app.config['MAIL_PORT'] = MAIL_PORT
app.config['MAIL_USE_TLS'] = MAIL_USE_TLS
app.config['MAIL_USERNAME'] = MAIL_USERNAME
app.config['MAIL_PASSWORD'] = MAIL_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = MAIL_USERNAME


mail = Mail(app)

# Use environment variable for deployment safety
app.secret_key = SECRET_KEY

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Upload configuration
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
load_dotenv(os.path.join(BASE_DIR, ".env"))
MARKET_API_KEY = os.getenv("MARKET_API_KEY")
sys.path.insert(0, BASE_DIR)

utils_path = os.path.join(BASE_DIR, "fertilizer_utils.py")
spec = importlib.util.spec_from_file_location("fertilizer_utils", utils_path)
fertilizer_utils = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fertilizer_utils)

utils_yield_path = os.path.join(BASE_DIR, "utils_yield.py")
spec_yield = importlib.util.spec_from_file_location("utils_yield", utils_yield_path)
utils_yield = importlib.util.module_from_spec(spec_yield)
spec_yield.loader.exec_module(utils_yield)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Upload configuration
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
load_dotenv(os.path.join(BASE_DIR, ".env"))
MARKET_API_KEY = os.getenv("MARKET_API_KEY")
sys.path.insert(0, BASE_DIR)

utils_path = os.path.join(BASE_DIR, "fertilizer_utils.py")
spec = importlib.util.spec_from_file_location("fertilizer_utils", utils_path)
fertilizer_utils = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fertilizer_utils)

utils_yield_path = os.path.join(BASE_DIR, "utils_yield.py")
spec_yield = importlib.util.spec_from_file_location("utils_yield", utils_yield_path)
utils_yield = importlib.util.module_from_spec(spec_yield)
spec_yield.loader.exec_module(utils_yield)

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 86400

# ✅ LOAD ML MODEL
CROP_MODEL_PATH = os.path.join(BASE_DIR, "model", "crop_model.pkl")
_crop_model = None

def load_crop_model_app():
    global _crop_model
    if _crop_model is not None:
        return _crop_model

    if not os.path.isfile(CROP_MODEL_PATH):
        try:
            from train_crop_model import train_model
            train_model()
        except Exception as exc:
            app.logger.error("Unable to retrain crop model: %s", exc)

    if not os.path.isfile(CROP_MODEL_PATH):
        _crop_model = None
        return None

    try:
        _crop_model = joblib.load(CROP_MODEL_PATH)
        if hasattr(_crop_model, "feature_names_in_"):
            stored_features = [str(f) for f in _crop_model.feature_names_in_]
            expected = [
                "nitrogen",
                "phosphorus",
                "potassium",
                "temperature",
                "humidity",
                "ph",
                "rainfall",
            ]
            if stored_features != expected:
                app.logger.warning(
                    "Legacy crop model feature mismatch: %s, expected: %s. Retraining model.",
                    stored_features,
                    expected,
                )
                _crop_model = None
                from train_crop_model import train_model
                train_model()
                _crop_model = joblib.load(CROP_MODEL_PATH)
    except Exception as exc:
        app.logger.error("Failed to load crop model from %s: %s", CROP_MODEL_PATH, exc)
        _crop_model = None
    return _crop_model


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
    "about": "about",
    "crop-recommendation": "crop-recommendation",
    "crop-yield-prediction": "crop-yield-prediction",
    "fertilizer-guide": "fertilizer-guide",
    "profit-analyzer": "profit",
    "market-price": "market",
    "profit-analyzer": "profit",
    "government-schemes": "government-schemes",
    "community": "community",
    "assistant": "assistant",
    "profile": "profile",
    "profit": "profit",
}

    page = page_map.get(path, "dashboard")
    t = get_translations(lang, page) or {}

    user = session.get("user")
    
    # Debug logging
    from flask import current_app
    current_app.logger.warning(f"CONTEXT PATH={request.path}, STRIPPED={path}, PAGE={page}, USER={bool(user)}, TRANS={len(t)}")

    return dict(
        current_user=user or None,
        t=t or {},
        lang=lang or "en"
    )


# ─────────────────────────────────────────────
# BLUEPRINTS
# ─────────────────────────────────────────────

# Register blueprints

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(community, url_prefix='/community')
app.register_blueprint(fertilizer_history_bp, url_prefix='/api')


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

MODEL_YIELD_PATH = os.path.join(BASE_DIR, "model", "yield_model.pkl")
_yield_model = None

def load_yield_model():
    global _yield_model
    if _yield_model is None:
        try:
            import joblib
            _yield_model = joblib.load(MODEL_YIELD_PATH)
        except Exception:
            _yield_model = None
    return _yield_model


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

# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────
@app.route('/dashboard')
def dashboard():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/dashboard.html')


@app.route('/about')
def about_page():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/about.html')


@app.route('/profit')
def profit_page():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/profit_analyzer.html')


# ─────────────────────────────────────────────
# PROFILE
# ─────────────────────────────────────────────
@app.route('/profile')
def profile():
    if "user" not in session:
        return redirect('/login')
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name, email, phone, location FROM users WHERE id=?", (session["user"]["id"],))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return redirect('/login')
    
    return render_template('layout/profile.html', user=user)

@app.route('/update-profile', methods=['POST'])
def update_profile():
    if "user" not in session:
        return jsonify({"success": False, "message": "Not logged in"}), 401
    
    data = request.get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    location = data.get('location', '').strip()
    
    errors = {}
    if not name:
        errors['name'] = 'Username is required'
    if phone and not phone.isdigit():
        errors['phone'] = 'Phone must be numeric'
    if location and len(location) < 3:
        errors['location'] = 'Location must be at least 3 characters'
    
    if errors:
        return jsonify({"success": False, "errors": errors})
    
    lat, lon = geocode_location(location) if location else (None, None)
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET name=?, phone=?, location=? WHERE id=?", (name, phone, location, session["user"]["id"]))
    conn.commit()
    conn.close()
    
    # Update session
    session["user"]["name"] = name
    
    return jsonify({"success": True, "message": "Profile updated successfully", "lat": lat, "lon": lon})
@app.route('/change-password', methods=['POST'])
def change_password():
    if "user" not in session:
        return jsonify({"success": False, "message": "Not logged in"}), 401
    
    data = request.get_json()
    current = data.get('current_password')
    new = data.get('new_password')
    confirm = data.get('confirm_password')
    
    errors = {}
    if not current or not new or not confirm:
        errors['general'] = 'All password fields are required'
    elif len(new) < 6:
        errors['new_password'] = 'Password must be at least 6 characters long'
    elif new != confirm:
        errors['confirm_password'] = 'Passwords do not match'
    else:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute("SELECT password FROM users WHERE id=?", (session["user"]["id"],))
        user = cursor.fetchone()
        conn.close()
        if not user or not check_password_hash(user[0], current):
            errors['current_password'] = 'Current password is incorrect'
    
    if errors:
        return jsonify({"success": False, "errors": errors})
    
    hashed = generate_password_hash(new)
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password=? WHERE id=?", (hashed, session["user"]["id"]))
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Password changed successfully"})

# ─────────────────────────────────────────────
# FEATURE PAGES
# ─────────────────────────────────────────────




@app.route('/crop-recommendation', methods=['GET', 'POST'])
def crop_recommendation():
    if "user" not in session:
        return redirect('/login')

    if request.method == "POST":
        try:
            data = {
                "nitrogen": float(request.form.get("nitrogen", 0)),
                "phosphorus": float(request.form.get("phosphorus", 0)),
                "potassium": float(request.form.get("potassium", 0)),
                "temperature": float(request.form.get("temperature", 0)),
                "humidity": float(request.form.get("humidity", 0)),
                "ph": float(request.form.get("ph_level", 0)),
                "rainfall": float(request.form.get("rainfall", 0)),
            }

            import pandas as pd

            df = pd.DataFrame([
                [
                    data['nitrogen'],
                    data['phosphorus'],
                    data['potassium'],
                    data['temperature'],
                    data['humidity'],
                    data['ph'],
                    data['rainfall'],
                ]
            ], columns=["nitrogen", "phosphorus", "potassium", "temperature", "humidity", "ph", "rainfall"])

            model = load_crop_model_app()
            if model is None:
                return render_template(
                    'dashboard/crop-recommendation.html',
                    error="Model not available"
                )

            prediction = model.predict(df)[0]
            confidence = max(model.predict_proba(df)[0])

            result = generate_crop_response(prediction, confidence, data)

            return render_template(
                'dashboard/crop-recommendation.html',
                result=result
            )

        except Exception:
            return render_template(
                'dashboard/crop-recommendation.html',
                error="Prediction failed"
            )

    return render_template('dashboard/crop-recommendation.html')


@app.route('/crop-yield-prediction')
def yield_prediction():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/crop-yield-prediction.html')


@app.route('/fertilizer-guide')
def fertilizer_guide():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/fertilizer-guide.html')


@app.route('/profit-analyzer')
def profit_analyzer():
    if "user" not in session:
        return redirect('/login')

    user_id = session["user"]["id"]
    history = []

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, crop_name, expected_revenue, estimated_profit, created_at
        FROM profit_analysis
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()

    for row in rows:
        history.append({
            "id": row[0],
            "crop_name": row[1] or "",
            "expected_revenue": row[2] or 0,
            "estimated_profit": row[3] or 0,
            "created_at": row[4] or ""
        })

    return render_template('dashboard/profit_analyzer.html', history=history)


@app.route('/api/profit-analysis', methods=['POST'])
def api_profit_analysis():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401

    payload = request.get_json(silent=True) or {}

    crop_name = str(payload.get('crop_name', '')).strip()
    soil_type = str(payload.get('soil_type', '')).strip()
    user_id = session["user"]["id"]

    def parse_float(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    land_area = parse_float(payload.get('land_area'))
    production_cost = parse_float(payload.get('production_cost'))
    fertilizer_cost = parse_float(payload.get('fertilizer_cost'))
    labor_cost = parse_float(payload.get('labor_cost'))
    irrigation_cost = parse_float(payload.get('irrigation_cost'))
    transport_cost = parse_float(payload.get('transport_cost'))
    other_expenses = parse_float(payload.get('other_expenses'))
    expected_yield = parse_float(payload.get('expected_yield'))
    market_price = parse_float(payload.get('market_price'))
    latitude = payload.get('latitude')
    longitude = payload.get('longitude')

    errors = {}
    if not crop_name:
        errors['crop_name'] = 'Crop type is required'
    if land_area is None or land_area < 0:
        errors['land_area'] = 'Land area must be a valid number'
    if production_cost is None or production_cost < 0:
        errors['production_cost'] = 'Production cost must be a valid number'
    if fertilizer_cost is None or fertilizer_cost < 0:
        errors['fertilizer_cost'] = 'Fertilizer cost must be a valid number'
    if labor_cost is None or labor_cost < 0:
        errors['labor_cost'] = 'Labor cost must be a valid number'
    if irrigation_cost is None or irrigation_cost < 0:
        errors['irrigation_cost'] = 'Irrigation cost must be a valid number'
    if expected_yield is None or expected_yield < 0:
        errors['expected_yield'] = 'Expected yield must be a valid number'
    if market_price is None or market_price < 0:
        errors['market_price'] = 'Market price must be a valid number'
    if transport_cost is None:
        transport_cost = 0.0
    if other_expenses is None:
        other_expenses = 0.0

    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    total_investment = (
        production_cost
        + fertilizer_cost
        + labor_cost
        + irrigation_cost
        + transport_cost
        + other_expenses
    )
    expected_revenue = expected_yield * market_price
    estimated_profit = expected_revenue - total_investment
    profit_percentage = 0.0 if total_investment == 0 else (estimated_profit / total_investment) * 100

    if estimated_profit > 0:
        profit_status_en = 'Profitable'
        profit_status_hi = 'लाभ'
        analysis_en = 'Your farming plan is profitable based on current inputs.'
        analysis_hi = 'वर्तमान इनपुट के आधार पर आपकी खेती लाभकारी है।'
    elif estimated_profit < 0:
        profit_status_en = 'Loss'
        profit_status_hi = 'नुकसान'
        analysis_en = 'Costs exceed expected revenue. Review your expenses and pricing.'
        analysis_hi = 'लागत अनुमानित राजस्व से अधिक है। अपने खर्चों और कीमत की समीक्षा करें।'
    else:
        profit_status_en = 'Break-even'
        profit_status_hi = 'समान'
        analysis_en = 'Your projected profit is neutral. Adjust inputs to improve returns.'
        analysis_hi = 'आपका अपेक्षित लाभ शून्य है। रिटर्न बढ़ाने के लिए इनपुट समायोजित करें।'

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO profit_analysis (
            user_id,
            crop_name,
            soil_type,
            land_area,
            production_cost,
            fertilizer_cost,
            labor_cost,
            irrigation_cost,
            transport_cost,
            other_expenses,
            expected_yield,
            market_price,
            total_investment,
            expected_revenue,
            estimated_profit,
            profit_percentage,
            latitude,
            longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            crop_name,
            soil_type,
            land_area,
            production_cost,
            fertilizer_cost,
            labor_cost,
            irrigation_cost,
            transport_cost,
            other_expenses,
            expected_yield,
            market_price,
            total_investment,
            expected_revenue,
            estimated_profit,
            profit_percentage,
            latitude,
            longitude,
        ),
    )
    conn.commit()

    cursor.execute(
        "SELECT id, crop_name, expected_revenue, estimated_profit, created_at FROM profit_analysis WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        (user_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    history = []
    for row in rows:
        history.append({
            "id": row[0],
            "crop_name": row[1] or "",
            "expected_revenue": row[2] or 0,
            "estimated_profit": row[3] or 0,
            "created_at": row[4] or ""
        })

    return jsonify({
        "status": "success",
        "data": {
            "profit_analysis": {
                "english": {
                    "total_investment": f"₹{total_investment:.2f}",
                    "expected_revenue": f"₹{expected_revenue:.2f}",
                    "estimated_profit": f"₹{estimated_profit:.2f}",
                    "profit_percentage": f"{profit_percentage:.2f}%",
                    "profit_status": profit_status_en,
                    "analysis": analysis_en,
                },
                "hindi": {
                    "total_investment": f"₹{total_investment:.2f}",
                    "expected_revenue": f"₹{expected_revenue:.2f}",
                    "estimated_profit": f"₹{estimated_profit:.2f}",
                    "profit_percentage": f"{profit_percentage:.2f}%",
                    "profit_status": profit_status_hi,
                    "analysis": analysis_hi,
                },
            },
            "history": history,
        },
    })


@app.route('/api/profit-history', methods=['GET'])
def get_profit_history():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401

    user_id = session["user"]["id"]
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, crop_name, expected_revenue, estimated_profit, created_at
        FROM profit_analysis
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    history = []
    for row in rows:
        history.append({
            "id": row[0],
            "crop_name": row[1] or "",
            "expected_revenue": row[2] or 0,
            "estimated_profit": row[3] or 0,
            "created_at": row[4] or ""
        })

    return jsonify({"status": "success", "data": {"history": history}})


@app.route('/api/delete-profit-history', methods=['POST'])
def delete_profit_history():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401

    data = request.get_json(silent=True) or {}
    history_id = data.get('id')
    user_id = session["user"]["id"]

    if not history_id:
        return jsonify({"status": "error", "message": "ID required"}), 400

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM profit_analysis WHERE id = ?", (history_id,))
    result = cursor.fetchone()
    if not result or result[0] != user_id:
        conn.close()
        return jsonify({"status": "error", "message": "Not authorized"}), 403

    cursor.execute("DELETE FROM profit_analysis WHERE id = ?", (history_id,))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Deleted successfully"})


# ─────────────────────────────────────────────
# ✅ CROP PREDICTION API (MAIN FEATURE ADDED)
# ─────────────────────────────────────────────
@app.route('/api/predict-crop', methods=['POST'])
def predict_crop():
    try:
        data = request.get_json()

        required = ["nitrogen", "phosphorus", "potassium", "temperature", "humidity", "ph", "rainfall"]

        if not data or not all(k in data for k in required):
            return jsonify({
                "status": "error",
                "message": "Missing or invalid input data"
            })

        df = pd.DataFrame([[
            float(data['nitrogen']),
            float(data['phosphorus']),
            float(data['potassium']),
            float(data['temperature']),
            float(data['humidity']),
            float(data['ph']),
            float(data['rainfall'])
        ]], columns=required)

        model = load_crop_model_app()
        if model is None:
            return jsonify({"status": "error", "message": "Model not available"}), 500

        prediction = model.predict(df)[0]
        confidence = max(model.predict_proba(df)[0])

        result = generate_crop_response(prediction, confidence, data)

        return jsonify(result)

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Something went wrong"
        })


@app.route('/market-price')
def market_price():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/market_price.html')


@app.route('/government-schemes')
def government_schemes():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/government_schemes.html')


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


@app.route('/predict-yield', methods=['POST'])
def predict_yield():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Authentication required"}), 401

    payload = request.get_json(silent=True)
    validated = utils_yield.validate_input(payload)

    if not validated:
        return jsonify({"status": "error", "message": "Missing or invalid input data"}), 400

    model = load_yield_model()
    if model is None:
        return jsonify({"status": "error", "message": "Model not available"}), 500

    features = utils_yield.prepare_model_input(validated)
    try:
        prediction = model.predict(features)[0]
    except Exception:
        return jsonify({"status": "error", "message": "Prediction failed"}), 500

    predicted_yield = float(prediction)
    productivity = "medium"
    if predicted_yield > 2000:
        productivity = "high"
    elif predicted_yield < 1000:
        productivity = "low"

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO yield_predictions (user_id, crop_type, predicted_yield, area, productivity) VALUES (?, ?, ?, ?, ?)",
        (session["user"]["id"], validated["crop"], predicted_yield, validated["area"], productivity),
    )
    conn.commit()
    history_id = cursor.lastrowid
    conn.close()

    result = utils_yield.build_response(prediction)
    result["data"]["history_id"] = history_id
    return jsonify(result)


@app.route('/api/yield-history', methods=['GET'])
def get_yield_history():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Authentication required"}), 401

    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    rows = cursor.execute(
        "SELECT id, crop_type, predicted_yield, area, productivity, created_at FROM yield_predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
        (session["user"]["id"],),
    ).fetchall()
    conn.close()

    history = [dict(row) for row in rows]
    return jsonify({"status": "success", "data": history})


@app.route('/api/yield-history/<int:history_id>', methods=['DELETE'])
def delete_yield_history(history_id):
    if "user" not in session:
        return jsonify({"status": "error", "message": "Authentication required"}), 401

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM yield_predictions WHERE id = ? AND user_id = ?",
        (history_id, session["user"]["id"]),
    )
    deleted = cursor.rowcount
    conn.commit()
    conn.close()

    if deleted == 0:
        return jsonify({"status": "error", "message": "History item not found"}), 404

    return jsonify({"status": "success", "message": "History deleted"})


# ─────────────────────────────────────────────
# MARKET PRICE API
# ─────────────────────────────────────────────

crop_translations = {
    "wheat": {"english": "Wheat", "hindi": "गेहूं"},
    "rice": {"english": "Rice", "hindi": "चावल"},
    "maize": {"english": "Maize", "hindi": "मक्का"},
    "barley": {"english": "Barley", "hindi": "जौ"},
    "soybean": {"english": "Soybean", "hindi": "सोयाबीन"},
    "cotton": {"english": "Cotton", "hindi": "कपास"},
    "sugarcane": {"english": "Sugarcane", "hindi": "गन्ना"},
    "potato": {"english": "Potato", "hindi": "आलू"},
    "tomato": {"english": "Tomato", "hindi": "टमाटर"},
    "onion": {"english": "Onion", "hindi": "प्याज"}
}

@app.route('/api/get-market-price', methods=['POST'])
def get_market_price():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401

    data = request.get_json()
    crop_name = data.get('crop_name', '').strip()
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    location_name = data.get('location_name', '').strip()
    user_id = session["user"]["id"]

    if not crop_name:
        return jsonify({"status": "error", "message": "Crop name required"}), 400

    if not location_name or latitude is None or longitude is None:
        return jsonify({"status": "error", "message": "Location data required"}), 400

    market_data = fetch_crop_market_price(crop_name, location_name, latitude, longitude)

    if market_data is None:
        return jsonify({"status": "error", "message": "Unable to fetch market data. Please try another crop or location."}), 502

    if market_data.get("status") == "no_match":
        return jsonify({"status": "error", "message": "No market data found for this location."}), 404

    current_price = market_data.get('current_price', 'N/A')
    min_price = market_data.get('min_price', 'N/A')
    max_price = market_data.get('max_price', 'N/A')
    market_name = market_data.get('market_name', location_name or 'Local Market')
    is_nearby = market_data.get('is_nearby', False)

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO market_price_history
    (user_id, crop_name, location_name, latitude, longitude, current_price, min_price, max_price, market_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, crop_name, location_name, latitude, longitude, current_price, min_price, max_price, market_name))
    conn.commit()
    conn.close()

    analysis = generate_price_analysis(current_price, min_price, max_price)

    crop_display = crop_translations.get(crop_name.lower(), {"english": crop_name.capitalize(), "hindi": crop_name.capitalize()})

    result = {
        "status": "success",
        "data": {
            "market_price": {
                "english": {
                    "crop_name": crop_display["english"],
                    "location": location_name,
                    "market": market_name,
                    "market_label": "Nearby Market" if is_nearby else None,
                    "is_nearby": is_nearby,
                    "current_price": f"₹{current_price}/quintal",
                    "min_price": f"₹{min_price}/quintal",
                    "max_price": f"₹{max_price}/quintal",
                    "analysis": analysis["english"]
                },
                "hindi": {
                    "crop_name": crop_display["hindi"],
                    "location": location_name,
                    "market": market_name,
                    "market_label": "Nearby Market" if is_nearby else None,
                    "is_nearby": is_nearby,
                    "current_price": f"₹{current_price}/क्विंटल",
                    "min_price": f"₹{min_price}/क्विंटल",
                    "max_price": f"₹{max_price}/क्विंटल",
                    "analysis": analysis["hindi"]
                }
            }
        }
    }

    return jsonify(result)


@app.route('/api/get-market-history', methods=['GET'])
def get_market_history():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401

    user_id = session["user"]["id"]
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, crop_name, location_name, current_price, market_name
    FROM market_price_history
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 20
    """, (user_id,))

    rows = cursor.fetchall()
    conn.close()

    history = []
    for row in rows:
        history.append({
            "id": row[0],
            "crop_name": row[1],
            "location_name": row[2],
            "current_price": row[3],
            "market_name": row[4]
        })

    return jsonify({"status": "success", "data": history})


@app.route('/delete-market-history', methods=['POST'])
def delete_market_history():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401

    data = request.get_json()
    history_id = data.get('id')
    user_id = session["user"]["id"]

    if not history_id:
        return jsonify({"status": "error", "message": "ID required"}), 400

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # Verify ownership
    cursor.execute("SELECT user_id FROM market_price_history WHERE id = ?", (history_id,))
    result = cursor.fetchone()

    if not result or result[0] != user_id:
        conn.close()
        return jsonify({"status": "error", "message": "Not authorized"}), 403

    cursor.execute("DELETE FROM market_price_history WHERE id = ?", (history_id,))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Deleted successfully"})


# ─────────────────────────────────────────────
# MARKET PRICE HELPER FUNCTIONS
# ─────────────────────────────────────────────
INDIAN_STATES = {
    "andhra pradesh",
    "arunachal pradesh",
    "assam",
    "bihar",
    "chhattisgarh",
    "goa",
    "gujarat",
    "haryana",
    "himachal pradesh",
    "jharkhand",
    "karnataka",
    "kerala",
    "madhya pradesh",
    "maharashtra",
    "manipur",
    "meghalaya",
    "mizoram",
    "nagaland",
    "odisha",
    "punjab",
    "rajasthan",
    "sikkim",
    "tamil nadu",
    "telangana",
    "tripura",
    "uttar pradesh",
    "uttarakhand",
    "west bengal",
    "jammu and kashmir",
    "andaman and nicobar islands",
    "chandigarh",
    "dadra and nagar haveli and daman and diu",
    "delhi",
    "lakshadweep",
    "puducherry",
    "ladakh",
}


def normalize_market_text(value):
    if value is None:
        return ""
    return str(value).strip().lower()


def parse_float(value):
    if value is None:
        return None

    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def infer_state_filter(location):
    normalized_location = normalize_market_text(location)
    if not normalized_location:
        return None
    if normalized_location in INDIAN_STATES:
        return normalized_location
    return None


def get_record_coordinates(record):
    lat = parse_float(record.get("latitude") or record.get("lat"))
    lon = parse_float(record.get("longitude") or record.get("lon"))
    if lat is None or lon is None:
        return None, None
    return lat, lon


def haversine_km(lat1, lon1, lat2, lon2):
    radius = 6371
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def reverse_geocode_state(lat, lon):
    if lat is None or lon is None:
        return None

    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10"
    headers = {"User-Agent": "AgriAI Market Price Client"}

    try:
        response = requests.get(url, headers=headers, timeout=8)
        response.raise_for_status()
        payload = response.json()
        state = normalize_market_text(payload.get("address", {}).get("state"))
        if state:
            return state
    except requests.exceptions.RequestException as exc:
        print(f"[MarketPrice] Reverse geocode error: {exc}")

    return None


def choose_best_by_coordinates(records, user_lat, user_lon):
    candidates = []

    for record in records:
        lat, lon = get_record_coordinates(record)
        if lat is None or lon is None:
            continue
        distance = haversine_km(user_lat, user_lon, lat, lon)
        candidates.append((distance, record))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]


def score_record_match(record, normalized_location):
    market = normalize_market_text(record.get("market") or record.get("market_name"))
    market_name = normalize_market_text(record.get("market_name"))
    district = normalize_market_text(record.get("district"))
    state = normalize_market_text(record.get("state"))

    if market == normalized_location or market_name == normalized_location:
        return 100, "exact_market"
    if district == normalized_location:
        return 90, "exact_district"
    if state == normalized_location:
        return 80, "exact_state"

    score = 0

    if market and normalized_location and normalized_location in market:
        score = max(score, 74)
    if market and normalized_location and market in normalized_location:
        score = max(score, 70)
    if market_name and normalized_location and normalized_location in market_name:
        score = max(score, 72)
    if market_name and normalized_location and market_name in normalized_location:
        score = max(score, 68)
    if district and normalized_location and normalized_location in district:
        score = max(score, 64)
    if district and normalized_location and district in normalized_location:
        score = max(score, 60)
    if state and normalized_location and normalized_location in state:
        score = max(score, 56)
    if state and normalized_location and state in normalized_location:
        score = max(score, 52)

    if score > 0:
        return score, "partial_match"

    return 0, "none"


def choose_best_market_record(records, location, user_lat=None, user_lon=None, state_hint=None):
    normalized_location = normalize_market_text(location)
    state_filter = infer_state_filter(location)
    exact_market_records = []
    exact_district_records = []
    exact_state_records = []
    partial_records = []

    for record in records:
        if state_filter:
            record_state = normalize_market_text(record.get("state"))
            if record_state != state_filter:
                continue

        score, match_type = score_record_match(record, normalized_location)

        if match_type == "exact_market":
            exact_market_records.append(record)
        elif match_type == "exact_district":
            exact_district_records.append(record)
        elif match_type == "exact_state":
            exact_state_records.append(record)
        elif match_type == "partial_match":
            partial_records.append((score, record))

    print(f"[MarketPrice] API response count: {len(records)}")
    print(
        f"[MarketPrice] Match counts for '{location}' -> exact_market={len(exact_market_records)}, exact_district={len(exact_district_records)}, exact_state={len(exact_state_records)}, partial={len(partial_records)}"
    )

    chosen_record = None
    chosen_level = None
    is_nearby = False

    if exact_market_records:
        chosen_record = choose_best_by_coordinates(exact_market_records, user_lat, user_lon) or exact_market_records[0]
        chosen_level = "exact_market"
    elif exact_district_records:
        chosen_record = choose_best_by_coordinates(exact_district_records, user_lat, user_lon) or exact_district_records[0]
        chosen_level = "exact_district"
        is_nearby = True
    elif exact_state_records:
        chosen_record = choose_best_by_coordinates(exact_state_records, user_lat, user_lon) or exact_state_records[0]
        chosen_level = "exact_state"
        is_nearby = True
    elif partial_records:
        partial_records.sort(key=lambda item: item[0], reverse=True)
        chosen_record = choose_best_by_coordinates([record for _, record in partial_records], user_lat, user_lon) or partial_records[0][1]
        chosen_level = "partial_match"
        is_nearby = True

    if not chosen_record and state_hint:
        state_records = [record for record in records if normalize_market_text(record.get("state")) == state_hint]
        print(f"[MarketPrice] state_hint={state_hint}, state_records={len(state_records)}")
        if state_records:
            chosen_record = choose_best_by_coordinates(state_records, user_lat, user_lon) or state_records[0]
            chosen_level = "state_hint_fallback"
            is_nearby = True

    if not chosen_record and user_lat is not None and user_lon is not None:
        chosen_record = choose_best_by_coordinates(records, user_lat, user_lon)
        if chosen_record:
            chosen_level = "nearest_fallback"
            is_nearby = True

    if not chosen_record:
        print(f"[MarketPrice] No matching mandi found for location: {location}")
        return {"status": "no_match"}

    selected_state = normalize_market_text(chosen_record.get("state")) or "N/A"
    selected_market = normalize_market_text(chosen_record.get("market") or chosen_record.get("market_name")) or "N/A"
    print(f"[MarketPrice] Selected record state={selected_state}, market={selected_market}, match_level={chosen_level}, nearby={is_nearby}")

    return {
        "status": "success",
        "record": chosen_record,
        "match_level": chosen_level,
        "is_nearby": is_nearby,
    }


def normalize_price_field(record, fields):
    for field in fields:
        value = record.get(field)
        if value is None:
            continue
        normalized = str(value).strip()
        if normalized and normalized not in ["NA", "na", "--"]:
            return normalized
    return None


def fetch_crop_market_price(crop_name, location, lat, lon):
    if not MARKET_API_KEY:
        print("[MarketPrice] Missing MARKET_API_KEY")
        return None

    url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    params = {
        "api-key": MARKET_API_KEY,
        "format": "json",
        "filters[commodity]": crop_name,
        "limit": 100,
        "offset": 0,
    }

    state_filter = infer_state_filter(location)
    if state_filter:
        params["filters[state]"] = state_filter

    headers = {"User-Agent": "AgriAI Market Price Client"}

    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        raise_on_status=False,
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))

    print(f"[MarketPrice] Request URL: {url}")
    print(f"[MarketPrice] Request params: {params}")

    try:
        response = session.get(url, params=params, headers=headers, timeout=(5, 20))
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        print(f"[MarketPrice] API error: {exc}")
        if hasattr(exc, "response") and exc.response is not None:
            print(
                "[MarketPrice] Response status:",
                exc.response.status_code,
                exc.response.text[:300],
            )
        return None

    try:
        payload = response.json()
    except ValueError as exc:
        print(f"[MarketPrice] JSON decode failed: {exc}")
        return None

    records = payload.get("records") or []
    print(f"[MarketPrice] API response count: {len(records)}")

    if not records:
        print("[MarketPrice] No records returned for", crop_name, "at", location)
        return None

    state_hint = reverse_geocode_state(lat, lon)
    match_info = choose_best_market_record(records, location, lat, lon, state_hint)
    if match_info.get("status") == "no_match":
        return match_info

    record = match_info.get("record")
    current_price = normalize_price_field(record, ["modal_price", "modal", "price"])
    min_price = normalize_price_field(record, ["min_price", "minimum_price"])
    max_price = normalize_price_field(record, ["max_price", "maximum_price"])
    market_name = normalize_price_field(record, ["market", "market_name"]) or location

    if not current_price and not min_price and not max_price:
        print("[MarketPrice] No valid price values in record", record)
        return None

    return {
        "status": "success",
        "current_price": current_price or "N/A",
        "min_price": min_price or current_price or "N/A",
        "max_price": max_price or current_price or "N/A",
        "market_name": market_name,
        "is_nearby": match_info.get("is_nearby", False),
    }


def generate_price_analysis(current, min_price, max_price):
    """
    Generate price analysis text
    """
    try:
        curr_val = float(str(current).replace('₹', '').split('/')[0])
        min_val = float(str(min_price).replace('₹', '').split('/')[0])
        max_val = float(str(max_price).replace('₹', '').split('/')[0])
    except:
        curr_val = min_val = max_val = 0

    if curr_val >= max_val * 0.9:
        en_analysis = "Price is near maximum. Consider selling if possible."
        hi_analysis = "कीमत अधिकतम के निकट है। यदि संभव हो तो बेचने पर विचार करें।"
    elif curr_val <= min_val * 1.1:
        en_analysis = "Price is near minimum. Wait for better rates if possible."
        hi_analysis = "कीमत न्यूनतम के निकट है। यदि संभव हो तो बेहतर दरों के लिए प्रतीक्षा करें।"
    else:
        en_analysis = "Price is in average range. Monitor market trends."
        hi_analysis = "कीमत औसत सीमा में है। बाजार के रुझानों पर नज़र रखें।"

    return {"english": en_analysis, "hindi": hi_analysis}


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

    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&hourly=relativehumidity_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto"

    res = requests.get(url).json()

    daily = res.get("daily", {}) or {}
    dates = daily.get("time", []) or []
    forecast = []
    for i, (day_date, day_max, day_min, code) in enumerate(zip(dates, daily.get("temperature_2m_max", []), daily.get("temperature_2m_min", []), daily.get("weathercode", []))):
        label = "Today" if i == 0 else datetime.datetime.strptime(day_date, "%Y-%m-%d").strftime("%b %d")
        forecast.append({
            "date": day_date,
            "label": label,
            "day": "Today" if i == 0 else day_date,
            "max": round(day_max, 1),
            "min": round(day_min, 1),
            "condition": describe_weather_code(code),
        })

    return jsonify({
        "temperature": res["current_weather"]["temperature"],
        "windspeed": res["current_weather"]["windspeed"],
        "humidity": res["hourly"]["relativehumidity_2m"][0],
        "rainfall": res["hourly"]["precipitation_probability"][0],
        "description": res["current_weather"].get("weathercode") and describe_weather_code(res["current_weather"]["weathercode"]) or "Clear",
        "forecast": forecast,
    })


def describe_weather_code(code):
    mapping = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Rain showers",
        81: "Rain showers",
        82: "Violent rain showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Thunderstorm with hail",
    }
    return mapping.get(int(code), "Clear")

# ─────────────────────────────────────────────
# SERVE UPLOADED FILES
# ─────────────────────────────────────────────
@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ─────────────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────────────
@app.route('/logout')
def logout():
    session.pop("user", None)
    return redirect('/login')

# ─────────────────────────────────────────────
# TEST EMAIL (DEBUG)
# ─────────────────────────────────────────────
@app.route('/test-email')
def test_email():
    msg = Message(
        subject="Test Email",
        recipients=["YOUR_EMAIL@gmail.com"]   # 👉 yaha apna email daalo
    )
    msg.body = "Email working hai"

    try:
        mail.send(msg)
        return "✅ Email sent"
    except Exception as e:
        return f"❌ Error: {e}"

# ─────────────────────────────────────────────
# forgot password
# ─────────────────────────────────────────────
@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    print("🔥 Forgot password API hit")

    if request.method == 'GET':
        return render_template('auth/forgot_password.html')

    if request.is_json:
        payload = request.get_json(silent=True) or {}
        email = (payload.get('email') or '').strip().lower()
    else:
        email = (request.form.get('email') or '').strip().lower()

    print("📧 Email received:", email)

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({"success": False, "message": "Email not found"}), 404

    token = str(uuid.uuid4())
    expiry = datetime.datetime.now() + datetime.timedelta(hours=1)

    cursor.execute(
        "UPDATE users SET reset_token=?, token_expiry=? WHERE LOWER(email)=?",
        (token, expiry, email)
    )

    conn.commit()
    conn.close()

    reset_link = f"{request.host_url.rstrip('/')}/reset-password?token={token}"
    print("🔗 Reset link:", reset_link)

    msg = Message(
        subject="Password Reset",
        recipients=[email]
    )
    msg.body = f"Hello,\n\nUse this link to reset your password:\n{reset_link}\n\nIf you didn't request this, you can ignore this email."

    email_sent = False
    try:
        if MAIL_USERNAME and MAIL_PASSWORD:
            mail.send(msg)
            email_sent = True
            print("✅ Email sent successfully")
        else:
            print("⚠️ Mail credentials not configured. Reset link generated:", reset_link)
    except Exception as e:
        print("❌ Email error:", e)

    return jsonify({
        "success": True,
        "message": "If an account exists for this email, a reset link has been sent." if email_sent else "A reset link was generated for this account. Open the link shown in the console or use the link below.",
        "reset_link": reset_link,
        "email_sent": email_sent
    })

# ─────────────────────────────────────────────
# reset password
# ─────────────────────────────────────────────
@app.route('/reset-password', defaults={'token': None}, methods=['GET', 'POST'])
@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token=None):
    token_value = request.args.get('token') or token or ''

    if request.method == 'GET':
        if not token_value:
            return render_template('auth/reset_password.html', token='', invalid=True)

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM users WHERE reset_token=? AND token_expiry > ?",
            (token_value, datetime.datetime.now())
        )
        user = cursor.fetchone()
        conn.close()

        if not user:
            return render_template('auth/reset_password.html', token=token_value, invalid=True)

        return render_template('auth/reset_password.html', token=token_value, invalid=False)

    if request.is_json:
        payload = request.get_json(silent=True) or {}
        token_value = (payload.get('token') or token_value).strip()
        password = (payload.get('password') or '').strip()
    else:
        token_value = (request.form.get('token') or token_value).strip()
        password = (request.form.get('password') or '').strip()

    if not token_value or not password:
        return jsonify({"success": False, "message": "Invalid request"}), 400

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM users WHERE reset_token=? AND token_expiry > ?",
        (token_value, datetime.datetime.now())
    )
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({"success": False, "message": "Token expired or invalid"}), 400

    hashed = generate_password_hash(password)

    cursor.execute(
        "UPDATE users SET password=?, reset_token=NULL, token_expiry=NULL WHERE reset_token=?",
        (hashed, token_value)
    )

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Password reset successful"})


# ─────────────────────────────────────────────
# GOVERNMENT SCHEMES API
# ─────────────────────────────────────────────
@app.route('/api/schemes', methods=['GET'])
def get_schemes():
    """
    Get government schemes with optional filtering
    Query Parameters:
    - state: Filter by state (or 'All' for national schemes)
    - crop_type: Filter by crop type (or 'All' for all crops)
    
    Filtering Logic:
    - If state = 'MP' → returns schemes with state='MP' OR state='All'
    - If crop_type = 'Wheat' → returns schemes with crop_type='Wheat' OR crop_type='All'
    """
    try:
        state = request.args.get('state', '').strip()
        crop_type = request.args.get('crop_type', '').strip()
        
        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()
        
        # Build query with filtering logic
        query = "SELECT id, title, description, benefit, state, crop_type, eligibility, website_link, created_at FROM government_schemes WHERE 1=1"
        params = []
        
        # Filter by state (include 'All' schemes)
        if state and state != 'All':
            query += " AND (state = ? OR state = 'All')"
            params.append(state)
        
        # Filter by crop type (include 'All' schemes) - need to handle JSON field
        if crop_type and crop_type != 'All':
            # For JSON fields, we need to check both languages
            query += " AND (json_extract(crop_type, '$.en') = ? OR json_extract(crop_type, '$.hi') = ? OR state = 'All')"
            params.extend([crop_type, crop_type])
        
        # Order by state-specific schemes first, then national schemes
        query += " ORDER BY CASE WHEN state = 'All' THEN 1 ELSE 0 END, title"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        schemes = []
        for row in rows:
            schemes.append({
                "id": row[0],
                "title": json.loads(row[1]) if row[1] else {"en": "", "hi": ""},
                "description": json.loads(row[2]) if row[2] else {"en": "", "hi": ""},
                "benefit": json.loads(row[3]) if row[3] else {"en": "", "hi": ""},
                "state": row[4],
                "crop_type": json.loads(row[5]) if row[5] else {"en": "", "hi": ""},
                "eligibility": json.loads(row[6]) if row[6] else {"en": "", "hi": ""},
                "website_link": row[7],
                "created_at": row[8]
            })
        
        return jsonify({
            "status": "success",
            "count": len(schemes),
            "schemes": schemes
        })
        
    except Exception as e:
        print(f"❌ Error fetching schemes: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Error fetching schemes"
        }), 500


# ─────────────────────────────────────────────
# RUN SERVER
# ─────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True)