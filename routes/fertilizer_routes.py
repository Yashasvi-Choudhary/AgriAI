# Fertilizer recommendation routes
from flask import Blueprint, request, redirect
import sqlite3

fertilizer = Blueprint('fertilizer', __name__)

def connect_db():
    return sqlite3.connect("database.db")


# ========================
# 🧪 FERTILIZER
# ========================
@fertilizer.route('/fertilizer', methods=['POST'])
def add_fertilizer():
    fert = request.form['fertilizer']
    dose = request.form['dosage']
    conf = request.form['confidence']

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO fertilizer_recommendations 
    (user_id, recommended_fertilizer, dosage, confidence)
    VALUES (?, ?, ?, ?)
    """, (1, fert, dose, conf))

    conn.commit()
    conn.close()

    return redirect('/dashboard')