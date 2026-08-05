import asyncio
import httpx

async def test_dashboard_flow():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        print("1. Logging in as Admin...")
        res = await client.post("/auth/login", json={
            "email": "administrator@example.com",
            "password": "password123"
        })
        token = res.json().get("access_token")

        print("\n2. Fetching Dashboard Summary as Admin...")
        res = await client.get("/analytics/dashboard-summary", headers={"Authorization": f"Bearer {token}"})
        print(res.status_code)
        import json
        print(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(test_dashboard_flow())
