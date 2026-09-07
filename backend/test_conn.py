import asyncio
import os
import asyncpg
import redis.asyncio as redis

async def test_all():
    db_url = "postgresql://admin:adminpassword@127.0.0.1:5432/vendor_db"
    redis_url = "redis://127.0.0.1:6379/0"
    
    # DB Test
    try:
        conn = await asyncpg.connect(db_url)
        print("PostgreSQL connection: OK")
        await conn.close()
    except Exception as e:
        print(f"PostgreSQL connection: FAIL - {e}")
        
    # Redis Test
    try:
        r = await redis.from_url(redis_url)
        await r.ping()
        print("Redis connection: OK")
        await r.aclose()
    except Exception as e:
        print(f"Redis connection: FAIL - {e}")

    # Import Test
    try:
        from app.main import app
        print("Application import: OK")
    except Exception as e:
        print(f"Application import: FAIL - {e}")

if __name__ == "__main__":
    asyncio.run(test_all())
