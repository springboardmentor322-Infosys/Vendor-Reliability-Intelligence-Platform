import asyncio
from sqlalchemy.future import select
from sqlalchemy import update
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import AsyncSessionLocal
from app.modules.contracts.models import Contract
import json

async def fix_flags():
    async with AsyncSessionLocal() as session:
        # Get all contracts
        res = await session.execute(select(Contract))
        contracts = res.scalars().all()
        for c in contracts:
            if c.compliance_flags == '"[]"':
                c.compliance_flags = []
            elif isinstance(c.compliance_flags, str):
                try:
                    c.compliance_flags = json.loads(c.compliance_flags)
                except:
                    c.compliance_flags = []
        await session.commit()
        print("Fixed flags")

if __name__ == "__main__":
    asyncio.run(fix_flags())
