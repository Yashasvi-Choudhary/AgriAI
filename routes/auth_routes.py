from flask import Blueprint, render_template, request, redirect
import sqlite3

auth = Blueprint('auth', __name__)

def connect_db():
    return sqlite3.connect("database.db")

# ===== REGISTER =====
@auth.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        conn = connect_db()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (username, email, password)
        )

        conn.commit()
        conn.close()

        return redirect('/login')

    return render_template('auth/register.html')


# ===== LOGIN =====
@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        conn = connect_db()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM users WHERE email=? AND password=?",
            (email, password)
        )

        user = cursor.fetchone()
        conn.close()

        if user:
            return "Login Successful 🎉"
        else:
            return "Invalid Email or Password ❌"

    return render_template('auth/login.html')