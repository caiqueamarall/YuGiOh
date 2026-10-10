@echo off
chcp 65001 > nul
title Compilador Android APK - Edison League

echo ========================================================
echo    COMPILANDO APLICATIVO ANDROID (APK) - EDISON LEAGUE
echo ========================================================
echo.

set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [1/4] Compilando recursos da aplicacao (Vite + React)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha no build da aplicacao!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] Sincronizando arquivos com o projeto Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao sincronizar o Capacitor!
    pause
    exit /b %errorlevel%
)

echo.
echo [3/4] Compilando APK nativo via Gradle...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao compilar o APK no Gradle!
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [4/4] Copiando APK gerado para a pasta do projeto...
copy /y android\app\build\outputs\apk\debug\app-debug.apk EdisonLeague.apk > nul

echo.
echo ========================================================
echo    SUCESSO! APK GERADO COM EXITO:
echo    d:\Projetos\YuGiOh\EdisonLeague.apk
echo ========================================================
echo.
echo Voce pode transferir o arquivo EdisonLeague.apk para
echo seu celular Android (via WhatsApp, Google Drive ou USB)
echo e instalar diretamente!
echo.
pause
