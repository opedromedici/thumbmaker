@echo off
echo Iniciando Backend — Gerador de Thumb...
cd /d "%~dp0"

where pip >nul 2>&1
if errorlevel 1 (
    echo ERRO: pip nao encontrado. Instale o Python 3.10+.
    pause & exit /b 1
)

pip install -r backend\requirements.txt --quiet
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
