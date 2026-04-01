# Yield prediction routes
from flask import Blueprint, request, redirect
import sqlite3

yield_route = Blueprint('yield_route', __name__)

def connect_db():
    return sqlite3.connect("database.db")


@yield_route.route('/yield', methods=['POST'])
def add_yield():
    crop = request.form['crop']
    yield_value = request.form['yield']

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO yield_predictions 
    (user_id, crop_type, predicted_yield)
    VALUES (?, ?, ?)
    """, (1, crop, yield_value))

    conn.commit()
    conn.close()

    return redirect('/dashboard')