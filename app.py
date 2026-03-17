from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('auth/login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()
        # Here you would handle registration logic, e.g., save to database
        # For now, just return success
        return jsonify({'success': True, 'message': 'Registration successful'})
    return render_template('auth/register.html')

if __name__ == '__main__':
    app.run(debug=True)