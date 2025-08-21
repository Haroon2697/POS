@echo off
echo ========================================
echo    Supermarket POS System Installer
echo ========================================
echo.

echo Installing dependencies...
echo.

REM Install root dependencies
echo [1/3] Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install root dependencies
    pause
    exit /b 1
)

REM Install server dependencies
echo [2/3] Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install server dependencies
    pause
    exit /b 1
)
cd ..

REM Install client dependencies
echo [3/3] Installing client dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install client dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo    Installation Complete!
echo ========================================
echo.
echo To start the system:
echo   1. Run: npm run dev
echo   2. Open: http://localhost:3000
echo.
echo Default credentials:
echo   Admin: admin / admin
echo   Cashier: cashier / cashier
echo.
echo Remember to change default passwords!
echo.
pause
