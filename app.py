import uuid
import datetime
from werkzeug.security import generate_password_hash
from flask_mail import Mail, Message
from config import *

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
        recipients=["your_email@gmail.com"]
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
    if request.method == 'GET':
        return render_template('auth/forgot_password.html')

    if request.is_json:
        payload = request.get_json(silent=True) or {}
        email = (payload.get('email') or '').strip().lower()
    else:
        email = (request.form.get('email') or '').strip().lower()

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

    print("Reset link:", reset_link)

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
            print("✅ Email sent")
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
@app.route('/reset-password', methods=['GET', 'POST'])
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
# RUN SERVER
# ─────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True)