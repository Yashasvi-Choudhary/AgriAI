# Disease detection routes
from flask import Blueprint, request, redirect
import sqlite3

disease = Blueprint('disease', __name__)

def connect_db():
    return sqlite3.connect("database.db")


@disease.route('/disease', methods=['POST'])
def add_disease():
    plant = request.form['plant']
    disease_name = request.form['disease']
    conf = request.form['confidence']

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO disease_detections 
    (user_id, plant_name, disease_name, confidence)
    VALUES (?, ?, ?, ?)
    """, (1, plant, disease_name, conf))

    conn.commit()
    conn.close()

    return redirect('/dashboard')