@echo off
title Easy X-Ray Streamlit Launcher
echo ========================================================
echo   Easy X-Ray -- Streamlit Diagnostic App Launcher
echo ========================================================
echo.
echo Launching Streamlit on http://localhost:8501 ...
cd /d %~dp0
python -m streamlit run app.py
pause
