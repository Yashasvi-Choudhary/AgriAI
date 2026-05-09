# Community routes
from flask import Blueprint, render_template, request, redirect, session
import sqlite3

community = Blueprint('community', __name__)

def connect_db():
    return sqlite3.connect("database.db")


# ========================
# COMMUNITY PAGE
# ========================
@community.route('/')
def community_page():
    if 'user' not in session:
        return redirect('/login')
    return render_template('dashboard/community.html')


# ========================
# 📝 CREATE POST
# ========================
@community.route('/create_post', methods=['GET', 'POST'])
def create_post():
    if request.method == 'POST':
        title = request.form['title']
        desc = request.form['description']

        conn = connect_db()
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO community_posts (user_id, title, description)
        VALUES (?, ?, ?)
        """, (1, title, desc))

        conn.commit()
        conn.close()

        return redirect('/community')

    return render_template('dashboard/community.html')


# ========================
# 💬 ADD COMMENT
# ========================
@community.route('/add_comment/<int:post_id>', methods=['POST'])
def add_comment(post_id):
    comment = request.form['comment']

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO community_comments (post_id, user_id, comment)
    VALUES (?, ?, ?)
    """, (post_id, 1, comment))

    conn.commit()
    conn.close()

    return redirect('/community')