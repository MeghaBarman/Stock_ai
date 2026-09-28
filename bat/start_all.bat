@echo off
echo ============================================
echo   StockAI - Starting Backend & Frontend
echo ============================================
echo.

REM Start Backend in new window
echo Starting Backend Server on http://localhost:8000...
start "StockAI Backend" cmd /k call start_backend.bat

REM Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak

REM Start Frontend in new window
echo Starting Frontend Server on http://localhost:5173...
start "StockAI Frontend" cmd /k call start_frontend.bat

echo.
echo ============================================
echo Both servers are starting in separate windows
echo ============================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo To stop: Close each terminal window and press Ctrl+C
echo.
pause

