@echo off
echo Starting StockAI Frontend...
cd frontend

IF NOT EXIST "node_modules" (
    echo Installing npm packages...
    npm install
)

echo.
echo [OK] Frontend running at http://localhost:5173
echo [OK] Backend proxy configured to http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
npm run dev

pause
