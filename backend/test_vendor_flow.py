import asyncio
import httpx

async def test_vendor_flow():
    test_email = "newvendor11@example.com"
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        print("1. Registering Vendor...")
        res = await client.post("/auth/register", json={
            "email": test_email,
            "password": "password123",
            "name": "Acme Corp",
            "role_name": "Vendor"
        })
        print(res.status_code, res.json())
        
        print("\n2. Attempting to log in as new vendor (should fail)...")
        res = await client.post("/auth/login", json={
            "email": test_email,
            "password": "password123"
        })
        print(res.status_code, res.json())
        
        print("\n3. Logging in as Admin to approve vendor...")
        res = await client.post("/auth/login", json={
            "email": "administrator@example.com",
            "password": "password123"
        })
        admin_token = res.json()["access_token"]
        
        print("\n4. Fetching Vendors...")
        res = await client.get("/vendors/", headers={"Authorization": f"Bearer {admin_token}"})
        print("Vendors Response Status:", res.status_code)
        print("Vendors Response Text:", res.text)
        vendors = res.json()
        if isinstance(vendors, list):
            new_vendor = next((v for v in vendors if v["contact_email"] == test_email), None)
        else:
            new_vendor = None
        
        if new_vendor:
            print(f"Found new vendor ID: {new_vendor['id']}")
            print("\n5. Approving Vendor...")
            res = await client.patch(f"/vendors/{new_vendor['id']}/status", json={"status": "Approved"}, headers={"Authorization": f"Bearer {admin_token}"})
            print(res.status_code, res.json())
            
            print("\n6. Attempting to log in as new vendor again (should succeed)...")
            res = await client.post("/auth/login", json={
                "email": test_email,
                "password": "password123"
            })
            print(res.status_code, res.json())
        else:
            print("Vendor not found in directory!")

asyncio.run(test_vendor_flow())
