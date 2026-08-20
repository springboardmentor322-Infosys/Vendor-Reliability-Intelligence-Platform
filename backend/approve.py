import urllib.request
import urllib.parse
import json

try:
    # 1. Login
    url = 'http://127.0.0.1:8000/api/auth/login'
    data = json.dumps({'email': 'admin@vendorintel.com', 'password': '1234'}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        auth_data = json.loads(res.read().decode('utf-8'))
        token = auth_data['access_token']
        print("Logged in successfully.")

    # 2. Get Vendors
    url = 'http://127.0.0.1:8000/api/vendors'
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
    with urllib.request.urlopen(req) as res:
        vendors = json.loads(res.read().decode('utf-8'))

    # 3. Approve Pending Vendors
    for v in vendors:
        if v['approval_status'] == 'Pending':
            print(f"Approving vendor {v['id']} ({v['company_name']})...")
            url = f'http://127.0.0.1:8000/api/vendors/{v["id"]}/status'
            data = json.dumps({'approval_status': 'Approved'}).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}, method='PUT')
            with urllib.request.urlopen(req) as res:
                print('Status code:', res.getcode())
except Exception as e:
    print("Error:", e)
