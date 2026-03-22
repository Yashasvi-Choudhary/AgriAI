import sqlite3

def connect_db():
    return sqlite3.connect("database.db")

def create_table():
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT,
        password TEXT
    )
    """)

    conn.commit()
    conn.close()

create_table()

print("Database created successfully ✅")