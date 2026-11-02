@echo off
title Easy X-Ray Development Server Launcher
echo ========================================================
echo   Easy X-Ray -- AI Diagnostic Healthcare System
echo ========================================================
echo.

echo Starting Django REST API Backend on http://localhost:8000 ...
start "Easy X-Ray Backend (Django :8000)" cmd /k "cd /d %~dp0 && python manage.py runserver 8000"

echo Starting React + Vite Frontend on http://localhost:5173 ...
start "Easy X-Ray Frontend (Vite :5173)" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Both servers are launching!
echo Backend API:  http://localhost:8000/api/dashboard/
echo React App:    http://localhost:5173
echo.
timeout /t 3 >nul
start http://localhost:5173
