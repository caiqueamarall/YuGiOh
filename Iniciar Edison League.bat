@echo off
title Edison League - Yu-Gi-Oh! Tournament Manager
cd /d "%~dp0"

echo ===================================================
echo     Edison League - Yu-Gi-Oh! Tournament Manager
echo ===================================================
echo.
echo Iniciando o servidor local...
echo O aplicativo abrira automaticamente no seu navegador.
echo.

start http://localhost:5173
call npm.cmd run dev -- --host 0.0.0.0 --port 5173

pause
