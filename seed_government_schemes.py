#!/usr/bin/env python3
"""
Seeder script to populate government_schemes table from JSON data
Usage: python seed_government_schemes.py
"""

import json
import sqlite3
from datetime import datetime

def seed_government_schemes():
    """Load government schemes from JSON and populate the database"""
    
    # Read JSON file
    try:
        with open('data/govt-schemes.json', 'r', encoding='utf-8') as f:
            schemes = json.load(f)
        print(f"✓ Loaded {len(schemes)} schemes from govt-schemes.json")
    except FileNotFoundError:
        print("✗ Error: data/govt-schemes.json not found")
        return
    except json.JSONDecodeError:
        print("✗ Error: Invalid JSON format in govt-schemes.json")
        return
    
    # Connect to database
    try:
        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='government_schemes'")
        if not cursor.fetchone():
            print("✗ Error: government_schemes table does not exist")
            print("   Run: python database.py to create tables first")
            conn.close()
            return
        
        # Clear existing data (optional - comment out to append)
        cursor.execute("DELETE FROM government_schemes")
        print("✓ Cleared existing schemes")
        
        # Insert schemes
        inserted_count = 0
        for scheme in schemes:
            try:
                cursor.execute("""
                INSERT INTO government_schemes 
                (title, description, benefit, category, state, crop_type, website_link, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    scheme.get('title', ''),
                    scheme.get('description', ''),
                    scheme.get('benefit', ''),
                    scheme.get('eligibility', ''),  # Map eligibility to category
                    scheme.get('state', 'All'),
                    scheme.get('crop_type', 'All'),
                    scheme.get('website_link', ''),
                    scheme.get('created_at', datetime.now().strftime('%Y-%m-%d'))
                ))
                inserted_count += 1
            except Exception as e:
                print(f"  ⚠ Failed to insert scheme: {scheme.get('title', 'Unknown')}")
                print(f"    Error: {str(e)}")
        
        conn.commit()
        conn.close()
        
        print(f"✓ Successfully inserted {inserted_count}/{len(schemes)} schemes")
        print("✓ Government schemes database seeded successfully!")
        
    except sqlite3.Error as e:
        print(f"✗ Database error: {str(e)}")

if __name__ == "__main__":
    seed_government_schemes()
