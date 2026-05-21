import sqlite3

def connect_db():
    conn = sqlite3.connect("database.db")
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
        website_link TEXT,
        state TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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