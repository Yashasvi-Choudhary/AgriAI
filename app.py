from flask import Flask, jsonify, render_template, session, redirect, request, flash, url_for
import requests
from database import create_tables
from routes.auth_routes import auth_bp

from utils.translator import get_translations

import sqlite3

# ─────────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────────
app = Flask(__name__)

app.secret_key = "super_secret_key_123"

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
    }

    page = page_map.get(path, "dashboard")
    t = get_translations(lang, page)

    return dict(
        current_user=session.get("user"),
        t=t,
        lang=lang
    )


# ─────────────────────────────────────────────
# BLUEPRINTS
# ─────────────────────────────────────────────
app.register_blueprint(auth_bp, url_prefix='/auth')


create_tables()


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
        INSERT INTO farm_conditions (user_id, latitude, longitude)
        VALUES (?, ?, ?)
    """, (user_id, lat, lon))

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