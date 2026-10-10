@echo off
chcp 65001 > nul
title Simulador de Celular - Edison League
cd /d "%~dp0"

echo ========================================================
echo       SIMULADOR DE CELULAR (ANDROID) - EDISON LEAGUE
echo ========================================================
echo.
echo Abrindo o aplicativo em uma janela com dimensoes reais
echo de smartphone (412 x 892 - Padrao Android / Galaxy / Pixel)...
echo.

set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"

set "BROWSER="
if exist "%EDGE_PATH%" set "BROWSER=%EDGE_PATH%"
if exist "%CHROME_PATH%" if not defined BROWSER set "BROWSER=%CHROME_PATH%"

if not defined BROWSER (
    start http://127.0.0.1:5173
    exit /b
)

:: Abre em janela isolada estilo app mobile nativo
start "" "%BROWSER%" --app="http://127.0.0.1:5173" --window-size=412,892 --window-position=500,50 --user-agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

echo Janela do celular iniciada com sucesso!
echo.
echo DICA: Pressione F12 e depois Ctrl+Shift+M dentro da janela
echo caso queira selecionar outros modelos ou testar em modo paisagem.
echo.
timeout /t 5 > nul
