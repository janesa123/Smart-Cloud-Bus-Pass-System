import sqlite3
from pathlib import Path

from flask import current_app, g


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL CHECK(length(full_name) BETWEEN 2 AND 100),
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bus_passes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pass_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    passenger_name TEXT NOT NULL,
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    pass_type TEXT NOT NULL CHECK(pass_type IN ('Daily', 'Weekly', 'Monthly')),
    issue_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Expired', 'Cancelled')),
    qr_code_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bus_passes_user_id ON bus_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_bus_passes_status ON bus_passes(status);
"""


def get_db():
    if "db" not in g:
        database_path = Path(current_app.config["DATABASE"])
        database_path.parent.mkdir(parents=True, exist_ok=True)
        g.db = sqlite3.connect(database_path)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_error=None):
    database = g.pop("db", None)
    if database is not None:
        database.close()


def init_db():
    database = get_db()
    database.executescript(SCHEMA)
    database.commit()


def sync_expired_passes():
    database = get_db()
    database.execute(
        """
        UPDATE bus_passes
        SET status = 'Expired'
        WHERE status = 'Active' AND date(expiry_date) < date('now', 'localtime')
        """
    )
    database.commit()


def init_app(app):
    app.teardown_appcontext(close_db)
    with app.app_context():
        init_db()
