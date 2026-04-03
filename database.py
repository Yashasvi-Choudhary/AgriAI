import sqlite3

def connect_db():
    return sqlite3.connect("database.db")

def create_tables():
    conn = connect_db()
    cursor = conn.cursor()

    # USERS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        created_at TEXT
    )
    """)

    # FARM CONDITIONS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farm_conditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        soil_type TEXT,
        temperature REAL,
        humidity REAL,
        rainfall REAL,
        soil_moisture REAL,
        ph REAL,
        nitrogen REAL,
        phosphorus REAL,
        potassium REAL,
        latitude REAL,
        longitude REAL,
        created_at TEXT
    )
    """)

    # CROP
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crop_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recommended_crop TEXT,
        confidence REAL
    )
    """)

    # FERTILIZER
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fertilizer_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recommended_fertilizer TEXT,
        dosage TEXT,
        confidence REAL,
        created_at TEXT
    )
    """)

    # YIELD
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS yield_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        crop_type TEXT,
        predicted_yield REAL
    )
    """)

    # COMMUNITY POSTS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS community_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        description TEXT,
        created_at TEXT
    )
    """)

    # COMMENTS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS community_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        user_id INTEGER,
        comment TEXT,
        created_at TEXT
    )
    """)

    # DISEASE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS disease_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        plant_name TEXT,
        disease_name TEXT,
        confidence REAL
    )
    """)

    # PROFIT
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profit_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        crop_type TEXT,
        land_area REAL,
        total_expense REAL,
        predicted_profit REAL
    )
    """)

    conn.commit()
    conn.close()

create_tables()
print("Database Ready ✅")