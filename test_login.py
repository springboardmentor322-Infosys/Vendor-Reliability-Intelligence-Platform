import urllib.request
import urllib.parse
import json

url = "http://127.0.0.1:8000/auth/login"
payload = json.dumps({
    "email": "auditor@example.com",
    "password": "password123",
    "role_name": "Auditor"
}).encode('utf-8')

req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as res:
        print(f"POST /auth/login STATUS: {res.status}")
        data = json.loads(res.read().decode())
        print(f"RESPONSE: {data}")
        token = data.get("access_token")
        
        url_me = "http://127.0.0.1:8000/auth/me"
        req_me = urllib.request.Request(url_me, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req_me) as res_me:
            print(f"/auth/me STATUS: {res_me.status}")
            print(f"/auth/me RESPONSE: {res_me.read().decode()}")
except Exception as e:
    print(f"ERROR: {e}")
    if hasattr(e, 'read'):
        print(f"DETAILS: {e.read().decode()}")
