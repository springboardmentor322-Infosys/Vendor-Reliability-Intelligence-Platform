"""
One-off migration for the document-upload and automated contract-expiry
features. Adds the new columns/table to your EXISTING PostgreSQL database
without touching any data already in it. Safe to re-run.

    python migrate_add_documents.py

(Postgres-specific syntax - this assumes you've already switched over from
SQLite, per the earlier database.py change.)
"""
from sqlalchemy import text
from database import engine

STATEMENTS = [
    "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS document_path VARCHAR",
    "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS expiry_notified BOOLEAN DEFAULT FALSE",
    """
    CREATE TABLE IF NOT EXISTS vendor_documents (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES vendors(id),
        document_type VARCHAR,
        file_name VARCHAR,
        file_path VARCHAR,
        expiry_date TIMESTAMP,
        uploaded_at TIMESTAMP
    )
    """,
]

with engine.connect() as conn:
    for stmt in STATEMENTS:
        conn.execute(text(stmt))
        conn.commit()

print("Migration complete — document upload and expiry-tracking columns/tables are ready.")
