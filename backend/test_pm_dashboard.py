import urllib.request
import json

base_url = "http://127.0.0.1:8000"

def login():
    data = {"email": "administrator@example.com", "password": "password123", "role_name": "Administrator"}
    req = urllib.request.Request(f"{base_url}/auth/login", method="POST", data=json.dumps(data).encode("utf-8"))
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            return res.get("access_token")
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def test_pm_dashboard(token):
    req = urllib.request.Request(f"{base_url}/procurement/purchase-orders")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            print("Successfully fetched POs list")
            print("Total POs available:", len(res))
            if res:
                print("First PO ID is:", res[0]["id"])
    except Exception as e:
        print(f"Failed to fetch PO list: {e}")

if __name__ == "__main__":
    token = login()
    if token:
        print("Login successful. Fetching dashboard...")
        test_pm_dashboard(token)
