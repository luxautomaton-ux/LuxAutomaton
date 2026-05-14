import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.expanduser("~/.lux_automaton.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Settings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Jobs table for tracking background tasks
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target TEXT,
        action TEXT,
        status TEXT,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
    )
    ''')
    
    # Set default settings
    defaults = {
        "lux_ai_path": "auto",
        "default_model": "qwen2.5:7b",
        "local_mode": "true",
        "theme": "dark"
    }
    
    for key, value in defaults.items():
        cursor.execute('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', (key, value))
        
    conn.commit()
    conn.close()

def get_setting(key, default=None):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        conn.close()
        return row['value'] if row else default
    except Exception:
        return default

def set_setting(key, value):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', (key, value))
    conn.commit()
    conn.close()

def log_job(target, action, status="started", result=None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO jobs (target, action, status, result) VALUES (?, ?, ?, ?)', 
                   (target, action, status, json.dumps(result) if result else None))
    job_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return job_id

def update_job(job_id, status, result=None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE jobs SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', 
                   (status, json.dumps(result) if result else None, job_id))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
