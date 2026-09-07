import asyncio
import os
import httpx
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Fast API running on 8000
# First generate auditor token

async def test_rbac():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        # Login
        data = {"username": "auditor@example.com", "password": "password123"}
        response = await client.post("/auth/login", data=data)
        token = response.json().get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        tests = [
            ("POST procurement creation", client.post("/procurement/requests", json={"title":"Test"}, headers=headers)),
            ("PATCH invoice approve", client.patch("/procurement/invoices/1/status", params={"status":"Approved"}, headers=headers)),
            ("PATCH contract", client.patch("/contracts/1", json={"status":"Active"}, headers=headers)),
            ("user-management", client.post("/auth/users/create", json={"email":"test@example.com"}, headers=headers))
        ]
        
        print("RBAC TESTS:")
        for name, req in tests:
            res = await req
            print(f"{name} -> Expected 403, Got {res.status_code}")
            
asyncio.run(test_rbac())
