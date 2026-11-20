@echo off
title MediSoft Suite / PyCore - Servidor Unificado (FastAPI + React 19)
cls
echo ================================================================
echo            INICIANDO PYCORE (BACKEND + FRONTEND)
echo ================================================================
echo   * Backend:  http://127.0.0.1:8000 (Swagger: /docs)
echo   * Frontend: http://localhost:5173
echo ================================================================
echo   CREDENCIALES DE ACCESO:
echo   --------------------------------------------------------------
echo   * Superadministrador:
echo       Email:     admin@pycore.com
echo       Password:  Admin1234*
echo.
echo   * Administrador Clinico:
echo       Email:     admin@plataforma.com
echo       Password:  Admin1234*
echo.
echo   * Medico Especialista:
echo       Email:     admin@medflow.com
echo       Password:  Admin1234*
echo ================================================================
echo.

REM Liberar posibles instancias previas en puerto 8000 para evitar conflictos de sesion WhatsApp
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>&1
)

npm.cmd run dev
