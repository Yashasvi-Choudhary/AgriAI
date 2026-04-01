from flask import Flask, render_template, request, jsonify
from routes.auth_routes import auth_bp

app = Flask(__name__)

app.register_blueprint(auth_bp, url_prefix='/api')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('auth/login.html')

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')

        print("Email received:", email)  # for testing

        # For now just simulate success
        return jsonify({
            'success': True,
            'message': 'Reset link sent'
        })

    return render_template('auth/forgot_password.html')

@app.route('/reset-password')
def reset_password():
    return render_template('auth/reset_password.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()
        # Here you would handle registration logic, e.g., save to database
        # For now, just return success
        return jsonify({'success': True, 'message': 'Registration successful'})
    return render_template('auth/register.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard/dashboard.html') 

if __name__ == '__main__':
    app.run(debug=True)