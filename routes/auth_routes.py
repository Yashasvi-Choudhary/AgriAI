from flask import Blueprint, request, jsonify
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import uuid

auth_bp = Blueprint('auth', __name__)

DB_NAME = "labhansh.db"


# 🔹 Helper: DB connection
def get_db():
    return sqlite3.connect(DB_NAME)


# 🔹 REGISTER API
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    # ⚠️ frontend keys match karo
    name = data.get('fullname')   # IMPORTANT CHANGE
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if not name or not email or not phone or not password:
        return jsonify({"success": False, "message": "All fields required"})

    hashed_password = generate_password_hash(password)

    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO users (name, email, phone, password)
            VALUES (?, ?, ?, ?)
        """, (name, email, phone, hashed_password))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Registration successful"
        })

    except sqlite3.IntegrityError:
        return jsonify({
            "success": False,
            "message": "Email already exists"
        })


# 🔹 LOGIN API
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    conn.close()

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        })

    stored_password = user[4]

    if check_password_hash(stored_password, password):
        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "name": user[1],
                "email": user[2]
            }
        })
    else:
        return jsonify({
            "success": False,
            "message": "Wrong password"
        })


# 🔹 FORGOT PASSWORD API
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Email not registered"
        })

    # 🔥 generate reset token
    token = str(uuid.uuid4())

    cursor.execute("""
        UPDATE users SET reset_token = ? WHERE email = ?
    """, (token, email))

    conn.commit()
    conn.close()

    # 👉 Real app me email bhejna hota hai
    print(f"Reset link: http://localhost:5000/reset-password?token={token}")

    return jsonify({
        "success": True,
        "message": "Reset link sent"
    })


# 🔹 RESET PASSWORD API
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()

    token = data.get('token')
    new_password = data.get('password')

    if not token or not new_password:
        return jsonify({
            "success": False,
            "message": "Invalid request"
        })

    hashed_password = generate_password_hash(new_password)

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM users WHERE reset_token = ?
    """, (token,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Invalid or expired token"
        })

    cursor.execute("""
        UPDATE users 
        SET password = ?, reset_token = NULL
        WHERE reset_token = ?
    """, (hashed_password, token))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Password reset successful"
    })