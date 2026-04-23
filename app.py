from flask import Flask, render_template, session, redirect
from database import create_tables
from routes.auth_routes import auth_bp

app = Flask(__name__)
app.secret_key = "super_secret_key_123"
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 86400

@app.context_processor
def inject_user():
    user = session.get('user')
    return dict(current_user=user)

# ✅ Register Blueprint
app.register_blueprint(auth_bp, url_prefix='/auth')

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


@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/login')


if __name__ == '__main__':
    app.run(debug=True)