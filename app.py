from flask import Flask, render_template, request, jsonify

# IMPORT ALL ROUTES
from routes.auth_routes import auth
from routes.community_routes import community
from routes.crop_routes import crop
from routes.fertilizer_routes import fertilizer
from routes.disease_routes import disease
from routes.profit_routes import profit
from routes.yield_routes import yield_route

app = Flask(__name__)

# REGISTER BLUEPRINTS
app.register_blueprint(auth)
app.register_blueprint(community)
app.register_blueprint(crop)
app.register_blueprint(fertilizer)
app.register_blueprint(disease)
app.register_blueprint(profit)
app.register_blueprint(yield_route)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')

        return jsonify({
            'success': True,
            'message': 'Reset link sent'
        })

    return render_template('auth/forgot_password.html')


@app.route('/reset-password')
def reset_password():
    return render_template('auth/reset_password.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard/dashboard.html')


if __name__ == '__main__':
    app.run(debug=True)