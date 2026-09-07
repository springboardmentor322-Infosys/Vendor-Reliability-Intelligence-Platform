import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def get(path, headers=None):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=headers or {})
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read().decode('utf-8')
    except Exception as e:
        return getattr(e, 'code', 0), getattr(e, 'read', lambda: b'')().decode('utf-8')

def post_json(path, data):
    encoded = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}{path}", data=encoded, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read().decode('utf-8')
    except Exception as e:
        return getattr(e, 'code', 0), getattr(e, 'read', lambda: b'')().decode('utf-8')

status, _ = get("/health")
print(f"Health: {status}")

status, _ = get("/docs")
print(f"Docs: {status}")

payload = {"email": "administrator@example.com", "password": "password123", "role_name": "Administrator"}
status, body = post_json("/auth/login", payload)
print(f"Login: {status}")

if status == 200:
    jwt = json.loads(body).get("access_token")
    headers = {"Authorization": f"Bearer {jwt}"}
    
    status, body_me = get("/auth/me", headers)
    print(f"Me: {status}")
    if status == 200:
        me_data = json.loads(body_me)
        role = me_data.get('role', {})
        role_name = role.get('name') if isinstance(role, dict) else role
        print(f"Role: {role_name}")
    
    status, body_dash = get("/analytics/dashboard-summary", headers)
    print(f"Dashboard: {status}")
    if status == 200:
        dash = json.loads(body_dash)
        print("Dashboard Output OK")
