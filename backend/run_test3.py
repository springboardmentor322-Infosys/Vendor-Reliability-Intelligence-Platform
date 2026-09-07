import urllib.request
import urllib.parse
import json

def test_dash():
    # Login
    data = urllib.parse.urlencode({"username": "auditor@example.com", "password": "password123"}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/auth/login", data=data)
    with urllib.request.urlopen(req) as response:
        token = json.loads(response.read().decode())["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    req2 = urllib.request.Request("http://127.0.0.1:8000/analytics/dashboard/auditor", headers=headers)
    try:
        with urllib.request.urlopen(req2) as response:
            print("STATUS:", response.status)
            print(response.read().decode()[:100])
    except urllib.error.HTTPError as e:
        print("HTTP ERROR:", e.code)
        print(e.read().decode())
        
test_dash()
