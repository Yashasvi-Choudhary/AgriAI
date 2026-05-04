from flask import Blueprint, request, jsonify, session
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import uuid

auth_bp = Blueprint('auth', __name__)

DB_NAME = "database.db"


def get_db():
    conn = sqlite3.connect(DB_NAME, timeout=10, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")
    return conn


# 🔹 REGISTER API
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}

    fullname = data.get('fullname')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if not all([fullname, email, phone, password]):
        return jsonify({"success": False, "message": "All fields required"}), 400

    hashed_password = generate_password_hash(password)

    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO users (name, email, phone, password)
            VALUES (?, ?, ?, ?)
        """, (fullname, email, phone, hashed_password))

        conn.commit()
        return jsonify({"success": True, "message": "Registration successful"}), 200

    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Email already exists"}), 409
    except sqlite3.OperationalError as err:
        print('Database operational error:', err)
        return jsonify({"success": False, "message": "Database busy, please try again."}), 503
    except Exception as err:
        print('Register error:', err)
        return jsonify({"success": False, "message": "Server error"}), 500
    finally:
        if conn:
            conn.close()


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
        return jsonify({"success": False, "message": "invalid_credentials"})

    if check_password_hash(user[4], password):
        session.permanent = True 
        session['user'] = {
            'id': user[0],
            'name': user[1],
            'email': user[2]
        }  

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user[0],
                "name": user[1],
                "email": user[2]
            }
        })
    else:
        return jsonify({"success": False, "message": "invalid_credentials"})


# 🔹 FORGOT PASSWORD
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
        return jsonify({"success": False, "message": "Email not registered"})

    token = str(uuid.uuid4())

    cursor.execute(
        "UPDATE users SET reset_token = ? WHERE email = ?",
        (token, email)
    )

    conn.commit()
    conn.close()

    print(f"Reset link: http://127.0.0.1:5000/reset-password?token={token}")

    return jsonify({"success": True, "message": "Reset link sent"})


# 🔹 RESET PASSWORD
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()

    token = data.get('token')
    new_password = data.get('password')

    if not token or not new_password:
        return jsonify({"success": False, "message": "Invalid request"})

    hashed_password = generate_password_hash(new_password)

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE reset_token = ?", (token,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({"success": False, "message": "Invalid token"})

    cursor.execute("""
        UPDATE users 
        SET password = ?, reset_token = NULL
        WHERE reset_token = ?
    """, (hashed_password, token))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Password reset successful"})



@auth_bp.route('/api/user')
def get_user():
    if "user" not in session:
        return jsonify({"success": False}), 401

    conn = get_db()
    cur = conn.cursor()

    # ✅ FIX: access the id from the session dict correctly
    cur.execute("SELECT id, name, email FROM users WHERE id=?", (session["user"]["id"],))
    user = cur.fetchone()
    conn.close()

    if not user:
        return jsonify({"success": False}), 401

    return jsonify({
        "success": True,
        "id": user[0],      # ✅ now returned so JS can use it
        "name": user[1],
        "email": user[2]
    })