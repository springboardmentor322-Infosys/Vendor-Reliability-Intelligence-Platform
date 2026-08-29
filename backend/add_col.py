from database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE procurement_requests ADD COLUMN vendor_id INTEGER;"))
            conn.execute(text("ALTER TABLE procurement_requests ADD CONSTRAINT fk_pr_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id);"))
            conn.commit()
            print("Column added.")
        except Exception as e:
            print("Error adding column:", e)

if __name__ == '__main__':
    run()
