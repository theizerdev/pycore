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

npm.cmd run dev
