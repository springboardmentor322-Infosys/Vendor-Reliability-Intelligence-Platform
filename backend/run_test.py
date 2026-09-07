import asyncio
import httpx

async def test_dash():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        # Login
        data = {"username": "auditor@example.com", "password": "password123"}
        response = await client.post("/auth/login", data=data)
        token = response.json().get("access_token")
        print("TOKEN:", bool(token))
        
        headers = {"Authorization": f"Bearer {token}"}
        res = await client.get("/analytics/dashboard/auditor", headers=headers)
        print("DASHBOARD STATUS:", res.status_code)
        if res.status_code != 200:
            print(res.text)
        else:
            print("SUCCESS")
            
asyncio.run(test_dash())
