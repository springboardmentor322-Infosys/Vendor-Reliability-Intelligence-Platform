import urllib.request
import urllib.parse
import json

data = json.dumps({'email':'finance_officer@example.com','password':'password123','role_name':'Finance Officer'}).encode('utf-8')
req = urllib.request.Request('http://localhost:8000/auth/login', data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as f:
        res = json.loads(f.read().decode('utf-8'))
        token = res['access_token']
    
    req2 = urllib.request.Request('http://localhost:8000/analytics/dashboard/finance', headers={'Authorization': 'Bearer ' + token})
    with urllib.request.urlopen(req2) as f:
        dash = json.loads(f.read().decode('utf-8'))
        print("KPIs:", dash.get('kpis'))
        print("Cat Spend:", json.dumps(dash.get('spend_by_category')))
        print("Monthly Spend:", json.dumps(dash.get('monthly_spend')))
        print("Pay Flow:", json.dumps(dash.get('payment_flow')))
        print("Pay Summary:", json.dumps(dash.get('payment_summary')))
except Exception as e:
    print(e)
