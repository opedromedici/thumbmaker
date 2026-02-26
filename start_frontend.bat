@echo off
echo Iniciando Frontend — Gerador de Thumb...

REM node_modules fica em C:\gerador-thumb-dev\frontend\ (fora do Google Drive)
set LOCAL_DEV=C:\gerador-thumb-dev\frontend

if not exist "%LOCAL_DEV%" (
    echo Criando diretorio local de dev...
    mkdir "%LOCAL_DEV%"
    copy "%~dp0frontend\package.json" "%LOCAL_DEV%\"
    copy "%~dp0frontend\index.html" "%LOCAL_DEV%\"
    copy "%~dp0frontend\vite.config.local.js" "%LOCAL_DEV%\vite.config.js"
)

if not exist "%LOCAL_DEV%\node_modules" (
    echo Instalando dependencias (npm install)...
    cd /d "%LOCAL_DEV%"
    npm install
)

echo.
echo Subindo Vite na porta 5173...
cd /d "%LOCAL_DEV%"
node_modules\.bin\vite.cmd --config vite.config.js
pause
