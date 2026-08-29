from database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE disputes ADD COLUMN evidence_url VARCHAR(255);"))
            conn.commit()
            print("Column evidence_url added to disputes.")
        except Exception as e:
            print("Error adding column:", e)

if __name__ == '__main__':
    run()
