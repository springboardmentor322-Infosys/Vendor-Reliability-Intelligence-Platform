$ErrorActionPreference = 'Stop'
$body = '{"email":"finance_officer@example.com","password":"password123","role_name":"Finance Officer"}'
$resp = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method Post -Body $body -Headers @{"Content-Type"="application/json"}
$token = $resp.access_token
$dash = Invoke-RestMethod -Uri "http://localhost:8000/analytics/dashboard/finance" -Headers @{"Authorization"="Bearer $token"}
$dash | ConvertTo-Json -Depth 5 | Out-File dash_test.json -Encoding UTF8
