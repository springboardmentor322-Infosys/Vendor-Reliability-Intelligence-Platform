import urllib.request
import json
import traceback

try:
    data = json.dumps({
        'email':'administrator@example.com', 
        'password':'password123', 
        'role_name':'Administrator'
    }).encode('utf-8')

    req = urllib.request.Request('http://127.0.0.1:8000/auth/login', data=data, headers={
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8081'
    })
    res = urllib.request.urlopen(req)
    res_data = json.loads(res.read())
    token = res_data['access_token']
    print("LOGIN SUCCESS")

    req2 = urllib.request.Request('http://127.0.0.1:8000/auth/me', headers={
        'Authorization': 'Bearer ' + token,
        'Origin': 'http://localhost:8081'
    })
    res2 = urllib.request.urlopen(req2)
    print('ME SUCCESS', json.loads(res2.read())['email'])

    # Test the dashboard endpoint that the dashboard component is awaiting!
    # Administrator fetches /analytics/dashboard-summary
    req3 = urllib.request.Request('http://127.0.0.1:8000/analytics/dashboard-summary', headers={
        'Authorization': 'Bearer ' + token,
        'Origin': 'http://localhost:8081'
    })
    res3 = urllib.request.urlopen(req3)
    print('DASHBOARD SUCCESS:', res3.read().decode()[:100] + "...")

    print("ALL API REQUESTS SUCCESSFUL")
except Exception as e:
    traceback.print_exc()
