from flask import Flask, render_template, session, redirect , request
from database import create_tables
from routes.auth_routes import auth_bp
from routes.fertilizer_guide import fertilizer_bp 
from utils.translator import get_translations

app = Flask(__name__)
app.secret_key = "super_secret_key_123"
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 86400

# ─────────────────────────────────────────────────────────────
# GLOBAL CONTEXT PROCESSOR
# Runs on every request. Injects `t` (translations dict) and
# `lang` into every template automatically.
# Flask-Babel / cookie / session / Accept-Language fallback.
# ─────────────────────────────────────────────────────────────
@app.context_processor
def inject_globals():
    # Priority: cookie → session → browser Accept-Language → "en"
    lang = (
        request.cookies.get("lang")
        or session.get("lang")
        or request.accept_languages.best_match(["hi", "en"])
        or "en"
    )
 
    # Map URL path → translation page key
    path = request.path.strip("/")
    page_map = {
        "":                          "dashboard",   # root /
        "dashboard":                 "dashboard",
        "crop-recommendation":       "crop-recommendation",
        "crop-yield-prediction":     "crop-yield-prediction",
        "plant-disease-detection":   "plant-disease-detection",
        "fertilizer-guide":          "fertilizer-guide",
    }
    # Default to "dashboard" for unmapped paths (auth pages, etc.)
    page = page_map.get(path, "dashboard")
 
    t = get_translations(lang, page)
    user = session.get("user")
 
    return dict(
        current_user=user,
        t=t,      # ← translations dict → window.__i18n in base.html
        lang=lang # ← current lang → window.__lang in base.html
    )
 
 
# ─────────────────────────────────────────────────────────────
# BLUEPRINTS
# ─────────────────────────────────────────────────────────────
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(fertilizer_bp) 

# ✅ Create DB tables
create_tables()


# ------------------ PAGE ROUTES ------------------ #

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


@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect('/login')

    return render_template('dashboard/dashboard.html')


@app.route('/crop-recommendation')
def crop_recommendation():
    if 'user' not in session:
        return redirect('/login')

    return render_template('dashboard/crop-recommendation.html')


@app.route('/crop-yield-prediction')
def yield_prediction():
    if 'user' not in session:
        return redirect('/login')

    return render_template('dashboard/crop-yield-prediction.html')

@app.route('/plant-disease-detection')  
def plant_disease_detection():
    if 'user' not in session:
        return redirect('/login')
    return render_template('dashboard/plant-disease-detection.html')

@app.route('/fertilizer-guide')
def fertilizer_guide():
    if 'user' not in session:
        return redirect('/login')
    return render_template('dashboard/fertilizer-guide.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/login')


if __name__ == '__main__':
    app.run(debug=True)