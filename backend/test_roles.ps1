$ErrorActionPreference = 'Stop'
function Test-Login {
    param($email, $role, $desc)
    $body = '{"email":"' + $email + '","password":"password123","role_name":"' + $role + '"}'
    $resp = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method Post -Body $body -Headers @{"Content-Type"="application/json"}
    $token = $resp.access_token
    $me = Invoke-RestMethod -Uri "http://localhost:8000/auth/me" -Headers @{"Authorization"="Bearer $token"}
    if ($me.role.name -eq $role) { Write-Host "[PASS] $desc ($role)" -ForegroundColor Green }
    else { Write-Host "[FAIL] $desc expected $role got" $me.role.name -ForegroundColor Red }
}
Write-Host "--- Cross-Role Authentication Test ---"
Test-Login -email 'admin@example.com' -role 'Administrator' -desc 'Admin Login'
Test-Login -email 'pm@example.com' -role 'Procurement Manager' -desc 'PM Login'
Test-Login -email 'scm@example.com' -role 'Supply Chain Manager' -desc 'SCM Login'
Test-Login -email 'finance_officer@example.com' -role 'Finance Officer' -desc 'Finance Officer Login'
Test-Login -email 'vendor@example.com' -role 'Vendor' -desc 'Vendor Login'
