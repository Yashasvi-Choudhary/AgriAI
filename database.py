import os
import sqlite3

def connect_db():
    db_path = os.path.join(os.path.dirname(__file__), "database.db")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")  # Enable foreign keys
    return conn

def column_exists(conn, table_name, column_name):
    """Check if a column exists in a table."""
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def migrate_fertilizer_history():
    """Migrate fertilizer_history table to add missing columns if needed."""
    conn = connect_db()
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='fertilizer_history'
        """)
        
        if cursor.fetchone():
            # Table exists. Ensure it only contains the minimal set of columns
            # we want to keep in history. If legacy columns (advice/reason/
            # recommended_quantity) exist, rebuild the table without them.
            cursor.execute("PRAGMA table_info(fertilizer_history)")
            existing = [row[1] for row in cursor.fetchall()]

            # Desired columns to keep in history
            desired = [
                'id', 'user_id', 'crop_type', 'soil_type', 'temperature',
                'humidity', 'moisture', 'nitrogen', 'phosphorus', 'potassium',
                'fertilizer_name_en', 'fertilizer_name_hi', 'created_at'
            ]

            # Columns we consider extraneous and want removed from history
            extraneous_prefixes = [
                'recommended_quantity', 'reason', 'advice'
            ]

            has_extraneous = any(
                any(col.startswith(prefix) for prefix in extraneous_prefixes)
                for col in existing
            )

            if has_extraneous:
                print("Rebuilding fertilizer_history without extraneous columns...")
                cols_to_select = [c for c in existing if c in desired]
                select_clause = ", ".join(cols_to_select)

                # Create a new table with the desired schema
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS fertilizer_history_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        crop_type TEXT,
                        soil_type TEXT,
                        temperature REAL,
                        humidity REAL,
                        moisture REAL,
                        nitrogen REAL,
                        phosphorus REAL,
                        potassium REAL,
                        fertilizer_name_en TEXT,
                        fertilizer_name_hi TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Copy available columns from old table into new table
                if select_clause:
                    cursor.execute(f"INSERT INTO fertilizer_history_new ({select_clause}) SELECT {select_clause} FROM fertilizer_history")

                # Replace old table
                cursor.execute("DROP TABLE fertilizer_history")
                cursor.execute("ALTER TABLE fertilizer_history_new RENAME TO fertilizer_history")
                conn.commit()
                print("fertilizer_history table rebuilt without extraneous columns")
        
        conn.close()
    except Exception as ex:
        print(f"Migration error: {ex}")
        conn.close()

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
    location TEXT,

    reset_token TEXT,
    token_expiry TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

    # Add location column if it doesn't exist (for existing databases)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN location TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

    try:
        cursor.execute("ALTER TABLE farm_conditions ADD COLUMN location_name TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

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
        location_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # ---------------- CROP ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crop_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        soil_type TEXT,
        nitrogen REAL,
        phosphorus REAL,
        potassium REAL,
        ph REAL,
        temperature REAL,
        humidity REAL,
        rainfall REAL,
        latitude REAL,
        longitude REAL,
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

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fertilizer_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        crop_type TEXT,
        soil_type TEXT,
        temperature REAL,
        humidity REAL,
        moisture REAL,
        nitrogen REAL,
        phosphorus REAL,
        potassium REAL,
        fertilizer_name_en TEXT,
        fertilizer_name_hi TEXT,
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
        area REAL,
        productivity TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    try:
        cursor.execute("ALTER TABLE yield_predictions ADD COLUMN area REAL")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE yield_predictions ADD COLUMN productivity TEXT")
    except sqlite3.OperationalError:
        pass

    # ---------------- COMMUNITY POSTS ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS community_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        crop_type TEXT,
        location TEXT,
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # Add missing columns to community_posts if they don't exist
    try:
        cursor.execute("ALTER TABLE community_posts ADD COLUMN image_url TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

    try:
        cursor.execute("ALTER TABLE community_posts ADD COLUMN crop_type TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

    try:
        cursor.execute("ALTER TABLE community_posts ADD COLUMN location TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

    try:
        cursor.execute("ALTER TABLE community_posts ADD COLUMN likes_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists

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

    # ---------------- LIKES ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS community_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        user_id INTEGER,
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
        eligibility TEXT,
        min_land REAL,
        max_land REAL,
        income_limit REAL,
        website_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # ---------------- PROFIT ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profit_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        crop_name TEXT,
        crop_type TEXT,
        soil_type TEXT,
        land_area REAL,
        production_cost REAL,
        fertilizer_cost REAL,
        labor_cost REAL,
        irrigation_cost REAL,
        transport_cost REAL,
        other_expenses REAL,
        expected_yield REAL,
        market_price REAL,
        total_investment REAL,
        expected_revenue REAL,
        estimated_profit REAL,
        profit_percentage REAL,
        latitude REAL,
        longitude REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    profit_columns = [
        "crop_name TEXT",
        "crop_type TEXT",
        "soil_type TEXT",
        "land_area REAL",
        "production_cost REAL",
        "fertilizer_cost REAL",
        "labor_cost REAL",
        "irrigation_cost REAL",
        "transport_cost REAL",
        "other_expenses REAL",
        "expected_yield REAL",
        "market_price REAL",
        "total_investment REAL",
        "expected_revenue REAL",
        "estimated_profit REAL",
        "profit_percentage REAL",
        "latitude REAL",
        "longitude REAL",
    ]
    existing_columns = [row[1] for row in cursor.execute("PRAGMA table_info(profit_analysis)").fetchall()]
    for column_definition in profit_columns:
        column_name = column_definition.split()[0]
        if column_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE profit_analysis ADD COLUMN {column_definition}")
            except sqlite3.OperationalError:
                pass

    # ---------------- MARKET PRICE HISTORY ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS market_price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        crop_name TEXT,
        location_name TEXT,
        latitude REAL,
        longitude REAL,
        current_price TEXT,
        min_price TEXT,
        max_price TEXT,
        market_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # ---------------- AI CHAT HISTORY ----------------
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_query TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        language VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    conn.commit()
    conn.close()

    print("  Database Ready with Improvements!")

if __name__ == "__main__":
    create_tables()