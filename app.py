from flask import Flask, render_template, request, jsonify
from database import create_tables
import sqlite3
import uuid
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# Create DB tables
create_tables()

# ------------------ ROUTES ------------------ #

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register')
def register():
    return render_template('auth/register.html')


@app.route('/login')
def login():
    return render_template('auth/login.html')

# 🔹 REGISTER
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()

        fullname = data.get('fullname')
        email = data.get('email')
        phone = data.get('phone')
        password = data.get('password')
        confirm_password = data.get('confirm_password')

        if not all([fullname, email, phone, password, confirm_password]):
            return jsonify({"success": False, "message": "All fields required"})

        if password != confirm_password:
            return jsonify({"success": False, "message": "Passwords do not match"})

        hashed_password = generate_password_hash(password)

        try:
            conn = sqlite3.connect('labhansh.db')
            cursor = conn.cursor()

            cursor.execute(
                "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
                (fullname, email, phone, hashed_password)
            )

            conn.commit()
            conn.close()

            return jsonify({"success": True, "message": "Registration successful"})

        except sqlite3.IntegrityError:
            return jsonify({"success": False, "message": "Email already exists"})

    return render_template('auth/register.html')


# 🔹 LOGIN
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()

        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"success": False, "message": "All fields required"})

        conn = sqlite3.connect('labhansh.db')
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()

        conn.close()

        if user:
            stored_password = user[4]

            if check_password_hash(stored_password, password):
                return jsonify({"success": True, "message": "Login successful"})
            else:
                return jsonify({"success": False, "message": "Wrong password"})
        else:
            return jsonify({"success": False, "message": "User not found"})

    return render_template('auth/login.html')


# 🔹 FORGOT PASSWORD
@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')

        conn = sqlite3.connect('labhansh.db')
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()

        if user:
            token = str(uuid.uuid4())

            cursor.execute(
                "UPDATE users SET reset_token = ? WHERE email = ?",
                (token, email)
            )
            conn.commit()
            conn.close()

            # ⚠️ For now just print (later email send kar sakte ho)
            print(f"Reset link: http://127.0.0.1:5000/reset-password?token={token}")

            return jsonify({"success": True})
        else:
            conn.close()
            return jsonify({"success": False, "message": "Email not found"})

    return render_template('auth/forgot_password.html')


# 🔹 RESET PASSWORD
@app.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    if request.method == 'POST':
        data = request.get_json()

        token = data.get('token')
        new_password = data.get('password')

        if not token or not new_password:
            return jsonify({"success": False})

        hashed_password = generate_password_hash(new_password)

        conn = sqlite3.connect('labhansh.db')
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM users WHERE reset_token = ?",
            (token,)
        )
        user = cursor.fetchone()

        if user:
            cursor.execute(
                "UPDATE users SET password = ?, reset_token = NULL WHERE reset_token = ?",
                (hashed_password, token)
            )
            conn.commit()
            conn.close()

            return jsonify({"success": True})
        else:
            conn.close()
            return jsonify({"success": False})

    return render_template('auth/reset_password.html')


# 🔹 DASHBOARD
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard/dashboard.html')


@app.route("/crop-recommendation")
def crop_recommendation():
    return render_template("dashboard/crop-recommendation.html")

if __name__ == '__main__':
    app.run(debug=True)

