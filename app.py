import uuid
import datetime
import math
from werkzeug.security import generate_password_hash, check_password_hash
from utils.geolocation import geocode_location

from flask import Flask, jsonify, render_template, session, redirect, request, flash, url_for
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
from dotenv import load_dotenv
from database import create_tables
from routes.auth_routes import auth_bp

from utils.translator import get_translations

import sqlite3
import os
import sys
import importlib.util

import uuid
from werkzeug.security import generate_password_hash


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

# ye already hai → same rehne do
app.secret_key = "super_secret_key_123"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
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
    "market-price": "market",
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
# DASHBOARD (SESSION CHECK)
# ─────────────────────────────────────────────
@app.route('/dashboard')
def dashboard():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/dashboard.html')


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
    
    return render_template('profile.html', user=user)

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


@app.route('/market-price')
def market_price():
    if "user" not in session:
        return redirect('/login')
    return render_template('dashboard/market_price.html')


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
    return jsonify(result)


@app.route('/predict-yield', methods=['POST'])
def predict_yield():
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

    result = utils_yield.build_response(prediction)
    return jsonify(result)


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

    # ✅ email handle (form + json dono)
    email = request.form.get('email') or (request.json.get('email') if request.is_json else None)
    print("📧 Email received:", email)

    if not email:
        return jsonify({"success": False, "message": "Email missing"})

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if not user:
        return jsonify({"success": False, "message": "Email not found"})

    # ✅ token generate
    token = str(uuid.uuid4())
    expiry = datetime.datetime.now() + datetime.timedelta(hours=1)

    cursor.execute(
        "UPDATE users SET reset_token=?, token_expiry=? WHERE email=?",
        (token, expiry, email)
    )

    conn.commit()
    conn.close()

    # ✅ reset link
    reset_link = f"http://127.0.0.1:5000/reset-password/{token}"
    print("🔗 Reset link:", reset_link)

    # ✅ EMAIL SEND (IMPORTANT FIX)
    msg = Message(
        subject="Password Reset",
        sender=MAIL_USERNAME,   # ⭐ MUST
        recipients=[email]
    )
    msg.body = f"Click this link to reset your password:\n{reset_link}"

    try:
        mail.send(msg)
        print("✅ Email sent successfully")
    except Exception as e:
        print("❌ Email error:", e)
        return jsonify({"success": False, "message": "Email sending failed"})

    return jsonify({"success": True})

# ─────────────────────────────────────────────
# reset password
# ─────────────────────────────────────────────

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    # ✅ token verify
    cursor.execute(
        "SELECT * FROM users WHERE reset_token=? AND token_expiry > ?",
        (token, datetime.datetime.now())
    )
    user = cursor.fetchone()

    if not user:
        return "❌ Token expired or invalid"

    # ✅ POST → password update
    if request.method == 'POST':

        password = request.form.get('password') or (request.json.get('password') if request.is_json else None)

        if not password:
            return jsonify({"success": False, "message": "Password missing"})

        hashed = generate_password_hash(password)

        cursor.execute(
            "UPDATE users SET password=?, reset_token=NULL, token_expiry=NULL WHERE reset_token=?",
            (hashed, token)
        )

        conn.commit()
        conn.close()

        print("✅ Password updated")

        return jsonify({"success": True})

    # ✅ GET → page open
    return render_template('auth/reset_password.html', token=token)

# ─────────────────────────────────────────────
# RUN SERVER
# ─────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True)