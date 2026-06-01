@echo off
title MeiValam Backend Restart
color 0A
echo.
echo  ========================================
echo    MeiValam Backend - Restart Utility
echo  ========================================
echo.

:: Kill any existing process on port 8000
echo  [1/3] Stopping existing backend on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    echo        Killing PID %%a...
    taskkill /PID %%a /F >nul 2>&1
)
echo        Done.
echo.

:: Activate virtual environment
echo  [2/3] Activating virtual environment...
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
echo        Done.
echo.

:: Start the backend server
echo  [3/3] Starting FastAPI server on http://localhost:8000
echo.
echo  ----------------------------------------
echo   Press Ctrl+C to stop the server.
echo  ----------------------------------------
echo.
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
