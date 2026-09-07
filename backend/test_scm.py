import asyncio
from app.core.database import SessionLocal
from app.modules.analytics.router import get_scm_dashboard
from app.modules.auth.models import User
import sys
import logging

logging.basicConfig(level=logging.INFO)

async def test_dashboard():
    db = SessionLocal()
    try:
        user = User(email="test@example.com")
        res = await get_scm_dashboard(db=db, current_user=user)
        print("SUCCESS!")
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(test_dashboard())
