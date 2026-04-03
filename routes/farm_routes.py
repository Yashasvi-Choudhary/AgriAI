# FARM CONDITIONS
from flask import Blueprint, request, redirect
import sqlite3

farm = Blueprint('farm', __name__)

def connect_db():
    return sqlite3.connect("database.db")


# ========================
# 🌦️ FARM CONDITIONS
# ========================
@farm.route('/farm', methods=['POST'])
def add_farm():
    soil = request.form['soil']
    temp = request.form['temperature']
    hum = request.form['humidity']

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO farm_conditions 
    (user_id, soil_type, temperature, humidity)
    VALUES (?, ?, ?, ?)
    """, (1, soil, temp, hum))

    conn.commit()
    conn.close()

    return redirect('/dashboard')