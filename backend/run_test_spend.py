import urllib.request
import urllib.parse
import json

data = json.dumps({'email':'finance_officer@example.com','password':'password123','role_name':'Finance Officer'}).encode('utf-8')
req = urllib.request.Request('http://localhost:8000/auth/login', data=data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as f:
    res = json.loads(f.read().decode('utf-8'))
    token = res['access_token']

req2 = urllib.request.Request('http://localhost:8000/finance/spend-analysis', headers={'Authorization': 'Bearer ' + token})
with urllib.request.urlopen(req2) as f:
    dash = json.loads(f.read().decode('utf-8'))
    print('Total Spend:', dash['total_spend'])
    print('Num Categories:', len(dash['by_category']))
    if dash['by_category']:
        print('First Category:', dash['by_category'][0])
