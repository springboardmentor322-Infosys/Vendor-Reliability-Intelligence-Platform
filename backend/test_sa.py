from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

url = "postgresql+psycopg://admin:adminpassword@127.0.0.1:5432/vendor_db"
engine = create_engine(url, poolclass=NullPool)
print("Connecting...")
with engine.connect() as conn:
    print("Executing...")
    res = conn.execute(text("SELECT 1"))
    print(res.scalar())
print("Done")
