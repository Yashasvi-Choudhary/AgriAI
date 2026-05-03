import sqlite3

def connect_db():
    conn = sqlite3.connect("database.db")
    conn.execute("PRAGMA foreign_keys = ON")  # Enable foreign keys
    return conn

def create_tables():
    conn = connect_db()
    cursor = conn.cursor()

    # ---------------- USERS ----------------
    cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,

    reset_token TEXT,
    token_expiry TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

    # ---------------- FARM CONDITIONS ----------------
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # ---------------- CROP ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crop_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recommended_crop TEXT,
        confidence REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # ---------------- FERTILIZER ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fertilizer_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recommended_fertilizer TEXT,
        dosage TEXT,
        confidence REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # ---------------- YIELD ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS yield_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        crop_type TEXT,
        predicted_yield REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # ---------------- COMMUNITY POSTS ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS community_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # ---------------- COMMENTS ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS community_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        user_id INTEGER,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(post_id) REFERENCES community_posts(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # ---------------- DISEASE ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS disease_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        plant_name TEXT,
        disease_name TEXT,
        image_path TEXT,
        confidence REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

  # ---------------- GOVERNMENT SCHEMES ----------------
    cursor.execute("""
CREATE TABLE IF NOT EXISTS government_schemes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    benefit TEXT,
    category TEXT,
    state TEXT,
    crop_type TEXT,
    min_land REAL,
    max_land REAL,
    income_limit REAL,
    website_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

    # ---------------- PROFIT ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profit_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        crop_type TEXT,
        land_area REAL,
        total_expense REAL,
        predicted_yield REAL,
        predicted_price REAL,
        predicted_revenue REAL,
        predicted_profit REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    conn.commit()
    conn.close()

    print("  Database Ready with Improvements!")

if __name__ == "__main__":
    create_tables()