# Profit analyzer routes
from flask import Blueprint, request, redirect
import sqlite3

profit = Blueprint('profit', __name__)

def connect_db():
    return sqlite3.connect("database.db")


@profit.route('/profit', methods=['POST'])
def add_profit():
    crop = request.form['crop']
    area = request.form['area']
    expense = request.form['expense']
    profit_value = request.form['profit']

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO profit_analysis 
    (user_id, crop_type, land_area, total_expense, predicted_profit)
    VALUES (?, ?, ?, ?, ?)
    """, (1, crop, area, expense, profit_value))

    conn.commit()
    conn.close()

    return redirect('/dashboard')