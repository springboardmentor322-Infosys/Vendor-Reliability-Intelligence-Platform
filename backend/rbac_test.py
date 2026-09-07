import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.modules.auth.models import User, Role
from app.core.security import create_access_token
from datetime import timedelta
import urllib.request
import json
import sys

async def get_token():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).join(Role).where(Role.name == 'Auditor').options(selectinload(User.role)))
        user = result.scalars().first()
        
        token = create_access_token(
            data={"sub": user.email, "role": user.role.name},
            expires_delta=timedelta(minutes=30)
        )
        return token, user.email, user.role.name

token, email, role = asyncio.run(get_token())
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"Logged in as: {email} (Role: {role})")

def fetch(url, method="GET", data=None):
    req = urllib.request.Request(url, headers=headers, method=method)
    if data is not None:
        req.data = json.dumps(data).encode('utf-8')
    try:
        res = urllib.request.urlopen(req)
        return res.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return str(e)

print(f"GET /auth/me: {fetch('http://127.0.0.1:8000/auth/me', 'GET')}")
print(f"POST /procurement/requests (Create PR): {fetch('http://127.0.0.1:8000/procurement/requests', 'POST', {'department': 'Test', 'items': []})}")
print(f"PATCH /procurement/requests/1/status (Approve PR): {fetch('http://127.0.0.1:8000/procurement/requests/1/status', 'PATCH', {'status': 'Approved'})}")
print(f"GET /procurement/requests (Read PRs): {fetch('http://127.0.0.1:8000/procurement/requests', 'GET')}")
