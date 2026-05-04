import datetime
import uuid
from werkzeug.security import generate_password_hash
from flask_mail import Mail, Message
from config import MAIL_SERVER, MAIL_PORT, MAIL_USE_TLS, MAIL_USE_SSL, MAIL_USERNAME, MAIL_PASSWORD, MAIL_DEFAULT_SENDER, MAIL_FALLBACK

from flask import Flask, jsonify, render_template, session, redirect, request, flash, url_for
import requests
from database import create_tables
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

# Mail configuration pulled from config
app.config['MAIL_SERVER'] = MAIL_SERVER
app.config['MAIL_PORT'] = MAIL_PORT
app.config['MAIL_USE_TLS'] = MAIL_USE_TLS
app.config['MAIL_USE_SSL'] = MAIL_USE_SSL
app.config['MAIL_USERNAME'] = MAIL_USERNAME
app.config['MAIL_PASSWORD'] = MAIL_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = MAIL_DEFAULT_SENDER

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
    if request.method == 'GET':
        return render_template('auth/forgot_password.html')

    payload = request.get_json(silent=True) or {}
    email = request.form.get('email') or payload.get('email')

    if not email:
        return jsonify({"success": False, "message": "Email missing"}), 400

    conn = sqlite3.connect('database.db', timeout=10, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("PRAGMA busy_timeout = 10000")
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({"success": False, "message": "Email not registered"}), 404

    token = str(uuid.uuid4())
    expiry = (datetime.datetime.utcnow() + datetime.timedelta(hours=1)).isoformat()

    cursor.execute(
        "UPDATE users SET reset_token=?, token_expiry=? WHERE email=?",
        (token, expiry, email)
    )

    conn.commit()
    conn.close()

    reset_link = f"http://127.0.0.1:5000/reset-password/{token}"

    msg = Message(
        subject="Password Reset Request",
        sender=MAIL_DEFAULT_SENDER,
        recipients=[email]
    )
    msg.body = f"Click the link below to reset your password:\n{reset_link}"

    try:
        mail.send(msg)
    except Exception as e:
        app.logger.error("Forgot password email send failed: %s", e, exc_info=True)
        if MAIL_FALLBACK or MAIL_USERNAME == "your_email@gmail.com" or MAIL_PASSWORD == "your_app_password":
            app.logger.warning("Using fallback reset link because SMTP credentials are not configured.")
            return jsonify({
                "success": True,
                "message": "Reset link generated successfully.",
                "reset_link": reset_link,
                "warning": "Email not sent because SMTP is not configured. Use the reset link from the response."
            }), 200
        return jsonify({"success": False, "message": "Email sending failed. Check SMTP credentials and Gmail app password."}), 500

    return jsonify({"success": True, "message": "Reset link sent"}), 200


# ─────────────────────────────────────────────
# reset password
# ─────────────────────────────────────────────
@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    conn = sqlite3.connect('database.db', timeout=10, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("PRAGMA busy_timeout = 10000")
    cursor.execute("PRAGMA foreign_keys = ON")

    cursor.execute(
        "SELECT id FROM users WHERE reset_token=? AND token_expiry > ?",
        (token, datetime.datetime.utcnow().isoformat())
    )
    user = cursor.fetchone()

    if request.method == 'GET':
        conn.close()
        return render_template('auth/reset_password.html', token=token if user else None, invalid=not bool(user))

    payload = request.get_json(silent=True) or {}
    password = request.form.get('password') or payload.get('password')

    if not password:
        conn.close()
        return jsonify({"success": False, "message": "Password missing"}), 400

    if not user:
        conn.close()
        return jsonify({"success": False, "message": "Invalid or expired token"}), 400

    hashed = generate_password_hash(password)

    cursor.execute(
        "UPDATE users SET password=?, reset_token=NULL, token_expiry=NULL WHERE reset_token=?",
        (hashed, token)
    )

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Password reset successful"}), 200
# ─────────────────────────────────────────────
# RUN SERVER
# ─────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True)