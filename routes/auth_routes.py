from flask import Blueprint, request, jsonify
import sqlite3

auth_bp = Blueprint('auth', __name__)

# DB connection
def get_db():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn


# ================= REGISTER =================
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json

    name = data.get('name')
    phone = data.get('phone')
    password = data.get('password')

    conn = get_db()
    cursor = conn.cursor()

    # check user already exists
    cursor.execute("SELECT * FROM users WHERE phone=?", (phone,))
    existing_user = cursor.fetchone()

    if existing_user:
        return jsonify({"message": "User already exists"}), 400

    # insert new user
    cursor.execute(
        "INSERT INTO users (name, phone, password) VALUES (?, ?, ?)",
        (name, phone, password)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Registration successful"})


# ================= LOGIN =================
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json

    phone = data.get('phone')
    password = data.get('password')

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM users WHERE phone=? AND password=?",
        (phone, password)
    )

    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({"message": "Login successful"})
    else:
        return jsonify({"message": "Invalid phone or password"}), 401# Authentication routes
