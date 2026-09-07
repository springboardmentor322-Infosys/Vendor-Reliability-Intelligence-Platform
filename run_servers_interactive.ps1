Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd ""D:\Vendor Reliability Intelligence Platform\backend""; echo "Starting Backend..."; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload'
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd ""D:\Vendor Reliability Intelligence Platform\frontend""; echo "Starting Frontend..."; npm run start'
