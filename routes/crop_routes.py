# Crop recommendation routes
from flask import Blueprint, request, redirect
import sqlite3

crop = Blueprint('crop', __name__)

def connect_db():
    return sqlite3.connect("database.db")


# ========================
# 🌾 CROP RECOMMENDATION
# ========================
@crop.route('/crop', methods=['POST'])
def add_crop():
    crop_name = request.form['crop']
    confidence = request.form['confidence']

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO crop_recommendations (user_id, recommended_crop, confidence)
    VALUES (?, ?, ?)
    """, (1, crop_name, confidence))

    conn.commit()
    conn.close()

    return redirect('/dashboard')