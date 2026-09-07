import json
import urllib.request
import urllib.parse
import urllib.error

def test_api():
    try:
        # POST /auth/login
        data = urllib.parse.urlencode({'username': 'auditor@example.com', 'password': 'password123'}).encode('utf-8')
        req = urllib.request.Request('http://127.0.0.1:8000/auth/login', data=data)
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
        
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            token = res_data.get('access_token')
            
        print('Got Token')
        
        # GET /analytics/dashboard/auditor
        req2 = urllib.request.Request('http://127.0.0.1:8000/analytics/dashboard/auditor')
        req2.add_header('Authorization', f'Bearer {token}')
        
        try:
            with urllib.request.urlopen(req2) as response2:
                print('DASHBOARD STATUS:', response2.status)
                dash_data = json.loads(response2.read().decode())
                print('DASHBOARD KEYS:', list(dash_data.keys()))
        except urllib.error.HTTPError as e:
            print('DASHBOARD ERROR STATUS:', e.code)
            print('DASHBOARD ERROR BODY:', e.read().decode())
            
    except Exception as e:
        print('HTTP ERROR:', e)

test_api()
