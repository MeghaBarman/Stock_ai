@echo off
echo ============================================
echo   StockAI Backend — No API Key Required!
echo ============================================
cd backend

IF NOT EXIST "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate
echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo [OK] Backend running at http://localhost:8000
echo [OK] API docs at    http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.
uvicorn main:app --reload --port 8000

pause
