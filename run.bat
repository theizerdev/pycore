@echo off
title PyCore - Servidor Unificado (FastAPI + React 19)
cls
echo ================================================================
echo            INICIANDO PYCORE (BACKEND + FRONTEND)
echo ================================================================
echo   * Backend:  http://127.0.0.1:8000 (Swagger: /docs)
echo   * Frontend: http://localhost:5173
echo ================================================================
echo.

npm.cmd run dev
