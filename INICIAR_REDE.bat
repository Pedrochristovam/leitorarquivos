@echo off
echo ========================================
echo   SISTEMA DE CONTRATOS 3026
echo   INICIANDO PARA REDE LOCAL
echo ========================================
echo.

REM Obtém o IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "ip=%%a"
    setlocal enabledelayedexpansion
    set "ip=!ip:~1!"
    
    echo Iniciando servidor backend...
    start "Backend - Porta 8010" cmd /k "python servidor.py"
    
    timeout /t 3 /nobreak > nul
    
    echo Iniciando frontend React...
    start "Frontend - Porta 5173" cmd /k "npm run dev"
    
    timeout /t 5 /nobreak > nul
    
    echo.
    echo ========================================
    echo   APLICACAO INICIADA!
    echo ========================================
    echo.
    echo IP da sua maquina: !ip!
    echo.
    echo ========================================
    echo   URL PARA COMPARTILHAR:
    echo ========================================
    echo.
    echo   DESENVOLVIMENTO:
    echo   http://!ip!:5173
    echo.
    echo   PRODUCAO (apos npm run build):
    echo   http://!ip!:8010
    echo.
    echo ========================================
    echo.
    echo Pressione qualquer tecla para fechar...
    pause > nul
    goto :end
)
:end

