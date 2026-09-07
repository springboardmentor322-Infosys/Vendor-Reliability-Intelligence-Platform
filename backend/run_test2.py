import requests

def test_dash():
    # Login
    data = {"username": "auditor@example.com", "password": "password123"}
    response = requests.post("http://127.0.0.1:8000/auth/login", data=data)
    token = response.json().get("access_token")
    
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get("http://127.0.0.1:8000/analytics/dashboard/auditor", headers=headers)
    print("DASHBOARD STATUS:", res.status_code)
    if res.status_code != 200:
        print(res.text)
    else:
        print("SUCCESS")
        
test_dash()
