import asyncio
import httpx

async def test_procurement_flow():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        print("1. Logging in as SCM...")
        res = await client.post("/auth/login", json={
            "email": "supply_chain_manager@example.com",
            "password": "password123"
        })
        scm_token = res.json().get("access_token")
        print("SCM Token received:", scm_token is not None)

        print("\n2. Creating Procurement Request as SCM...")
        res = await client.post("/procurement/requests", json={
            "department": "Logistics",
            "description": "New delivery trucks needed",
            "items": [
                {"item_name": "Heavy Truck", "quantity": 2, "estimated_cost": 85000.0},
                {"item_name": "Spare Tires", "quantity": 10, "estimated_cost": 500.0}
            ]
        }, headers={"Authorization": f"Bearer {scm_token}"})
        print(res.status_code, res.json())
        new_pr = res.json()

        print("\n3. Logging in as PM...")
        res = await client.post("/auth/login", json={
            "email": "procurement_manager@example.com",
            "password": "password123"
        })
        pm_token = res.json().get("access_token")

        print("\n4. Fetching Procurement Requests as PM...")
        res = await client.get("/procurement/requests", headers={"Authorization": f"Bearer {pm_token}"})
        print(res.status_code)
        prs = res.json()
        print(f"Found {len(prs)} PRs. First PR: {prs[0]['total_estimated_cost']}")

        print("\n5. Approving Procurement Request as PM...")
        res = await client.patch(f"/procurement/requests/{new_pr['id']}/status", json={
            "status": "Approved"
        }, headers={"Authorization": f"Bearer {pm_token}"})
        print(res.status_code, res.json())

if __name__ == "__main__":
    asyncio.run(test_procurement_flow())
