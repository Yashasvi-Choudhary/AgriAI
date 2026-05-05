import uuid
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from utils.geolocation import geocode_location

from flask import Flask, jsonify, render_template, session, redirect, request, flash, url_for
import requests
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