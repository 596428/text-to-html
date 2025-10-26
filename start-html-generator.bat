@echo off
echo ========================================
echo Starting HTML Generator Service
echo ========================================
echo.

echo [Step 1/2] Checking if Cloudflare tunnel is running...
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>NUL | find /I /N "cloudflared.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Cloudflare tunnel is running
) else (
    echo [WARNING] Cloudflare tunnel is NOT running!
    echo Please run start-acacia-services_0902.bat first
    pause
    exit /b 1
)

echo.
echo [Step 2/2] Starting Next.js dev server in WSL...
echo Target: localhost:3000
echo URL: https://html.acacia.chat
echo.

wsl -d Ubuntu-24.04 bash -lc "source ~/.nvm/nvm.sh && cd /mnt/c/CodePracticeProject/TexttoHtml/text-to-html && npm run dev"

echo.
echo ========================================
echo Next.js dev server stopped
echo ========================================
pause
