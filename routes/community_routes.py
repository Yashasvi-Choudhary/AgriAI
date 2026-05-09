# Community routes
from flask import Blueprint, render_template, request, redirect, jsonify, session, flash, url_for
import sqlite3
import os
from werkzeug.utils import secure_filename
from datetime import datetime

community = Blueprint('community', __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'community')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def connect_db():
    return sqlite3.connect("database.db")

# ========================
# 🏠 COMMUNITY PAGE
# ========================
@community.route('/')
def community_page():
    if 'user' not in session:
        return redirect(url_for('auth.login'))
    return render_template('dashboard/community.html')

# ========================
# 📝 CREATE POST API
# ========================
@community.route('/api/create-post', methods=['POST'])
def create_post_api():
    if 'user' not in session or not session.get('user') or not session['user'].get('id'):
        return jsonify({'error': 'Not logged in'}), 401

    try:
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        crop_type = request.form.get('crop_type', '').strip()
        location = request.form.get('location', '').strip()

        if not title or not description:
            return jsonify({'error': 'Title and description are required'}), 400

        user_id = session['user']['id']
        image_url = None

        # Handle image upload
        if 'image' in request.files:
            file = request.files['image']
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"{timestamp}_{filename}"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                file.save(filepath)
                image_url = f"/uploads/community/{filename}"

        conn = connect_db()
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO community_posts (user_id, title, description, image_url, crop_type, location)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, title, description, image_url, crop_type, location))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Post created successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================
# 📄 GET ALL POSTS API
# ========================
@community.route('/api/posts', methods=['GET'])
def get_posts_api():
    try:
        conn = connect_db()
        cursor = conn.cursor()

        cursor.execute("""
        SELECT
            p.id, p.title, p.description, p.image_url, p.crop_type, p.location,
            p.likes_count, p.created_at,
            u.name as user_name, u.location as user_location
        FROM community_posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        """)

        posts = []
        for row in cursor.fetchall():
            post = {
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'image_url': row[3],
                'crop_type': row[4],
                'location': row[5],
                'likes_count': row[6],
                'created_at': row[7],
                'user_name': row[8],
                'user_location': row[9],
                'comments': []
            }

            # Get comments for this post
            cursor.execute("""
            SELECT c.comment, c.created_at, u.name
            FROM community_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
            """, (post['id'],))

            post['comments'] = [
                {'comment': row[0], 'created_at': row[1], 'user_name': row[2]}
                for row in cursor.fetchall()
            ]

            posts.append(post)

        conn.close()
        return jsonify({'posts': posts})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================
# 💬 ADD COMMENT API
# ========================
@community.route('/api/comment', methods=['POST'])
def add_comment_api():
    if 'user' not in session or not session.get('user') or not session['user'].get('id'):
        return jsonify({'error': 'Not logged in'}), 401

    try:
        data = request.get_json()
        post_id = data.get('post_id')
        comment = data.get('comment', '').strip()

        if not post_id or not comment:
            return jsonify({'error': 'Post ID and comment are required'}), 400

        user_id = session['user']['id']

        conn = connect_db()
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO community_comments (post_id, user_id, comment)
        VALUES (?, ?, ?)
        """, (post_id, user_id, comment))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Comment added successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================
# ❤️ LIKE POST API
# ========================
@community.route('/api/like', methods=['POST'])
def like_post_api():
    if 'user' not in session or not session.get('user') or not session['user'].get('id'):
        return jsonify({'error': 'Not logged in'}), 401

    try:
        data = request.get_json()
        post_id = data.get('post_id')

        if not post_id:
            return jsonify({'error': 'Post ID is required'}), 400

        user_id = session['user']['id']

        conn = connect_db()
        cursor = conn.cursor()

        # Check if already liked
        cursor.execute("""
        SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?
        """, (post_id, user_id))

        existing_like = cursor.fetchone()

        if existing_like:
            # Unlike
            cursor.execute("""
            DELETE FROM community_likes WHERE post_id = ? AND user_id = ?
            """, (post_id, user_id))

            cursor.execute("""
            UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = ?
            """, (post_id,))

            liked = False
        else:
            # Like
            cursor.execute("""
            INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)
            """, (post_id, user_id))

            cursor.execute("""
            UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?
            """, (post_id,))

            liked = True

        # Get updated like count
        cursor.execute("SELECT likes_count FROM community_posts WHERE id = ?", (post_id,))
        likes_count = cursor.fetchone()[0]

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'liked': liked,
            'likes_count': likes_count
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================
# 📊 COMMUNITY STATS API
# ========================
@community.route('/api/stats', methods=['GET'])
def get_community_stats_api():
    try:
        conn = connect_db()
        cursor = conn.cursor()

        # Total posts
        cursor.execute("SELECT COUNT(*) FROM community_posts")
        total_posts = cursor.fetchone()[0]

        # Active farmers (users who have posted in the last 30 days)
        cursor.execute("""
        SELECT COUNT(DISTINCT user_id) FROM community_posts
        WHERE created_at >= datetime('now', '-30 days')
        """)
        active_farmers = cursor.fetchone()[0]

        # Posts today
        cursor.execute("""
        SELECT COUNT(*) FROM community_posts
        WHERE date(created_at) = date('now')
        """)
        today_posts = cursor.fetchone()[0]

        conn.close()

        return jsonify({
            'success': True,
            'stats': {
                'total_posts': total_posts,
                'active_farmers': active_farmers,
                'today_posts': today_posts
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500