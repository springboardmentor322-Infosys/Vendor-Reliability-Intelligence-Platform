import requests

def test():
    res = requests.post("http://127.0.0.1:8000/api/auth/login", json={"email": "admin@vendorintel.com", "password": "1234"})
    token = res.json()["access_token"]
    payload = {
        "request_number": "PR-123457",
        "department": "IT",
        "vendor_id": 1,
        "total_cost": 100000,
        "estimated_cost": 100000
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    pr_res = requests.post("http://127.0.0.1:8000/api/procurement_requests", json=payload, headers=headers)
    print("Status PR:", pr_res.status_code)
    print("Response PR:", pr_res.text)

if __name__ == '__main__':
    test()
