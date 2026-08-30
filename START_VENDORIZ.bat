@echo off
setlocal
cd /d "%~dp0"
title VendorIQ Launcher

echo.
echo ==========================================
echo          Starting VendorIQ
echo ==========================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
    echo Docker Desktop is not installed or is not available in PATH.
    echo Install and start Docker Desktop, then run this file again.
    pause
    exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
    echo Docker Desktop is installed but is not running.
    echo Start Docker Desktop, wait until it is ready, then run this file again.
    pause
    exit /b 1
)

if not exist ".env" (
    echo Creating a local secure configuration file...
    powershell -NoProfile -Command "$secret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'); Set-Content -LiteralPath '.env' -Value ('SECRET_KEY=' + $secret)"
    if errorlevel 1 (
        echo Could not create .env. Please copy .env.example to .env and set SECRET_KEY.
        pause
        exit /b 1
    )
)

echo Building and starting services. The first run can take a few minutes...
docker compose up --build -d
if errorlevel 1 (
    echo.
    echo VendorIQ could not start. See the Docker output above for details.
    pause
    exit /b 1
)

echo.
echo VendorIQ is running.
echo App:      http://localhost:8080
echo API docs: http://localhost:8000/docs
echo.
start "" "http://localhost:8080"
pause
