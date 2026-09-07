Write-Output "Checking Ports..."
Get-NetTCPConnection -LocalPort 5432,6379,8000,8081 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize
