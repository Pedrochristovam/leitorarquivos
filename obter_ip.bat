@echo off
echo ========================================
echo   SISTEMA DE CONTRATOS 3026
echo   URL PARA COMPARTILHAR
echo ========================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "ip=%%a"
    setlocal enabledelayedexpansion
    set "ip=!ip:~1!"
    echo IP da sua maquina: !ip!
    echo.
    echo ========================================
    echo   URL PARA COMPARTILHAR:
    echo ========================================
    echo.
    echo   DESENVOLVIMENTO (React):
    echo   http://!ip!:5173
    echo.
    echo   PRODUCAO (Servidor unificado):
    echo   http://!ip!:8010
    echo.
    echo ========================================
    echo.
    pause
)

