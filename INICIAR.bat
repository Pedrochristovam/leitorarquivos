@echo off
echo ========================================
echo   SISTEMA DE CONTRATOS 3026
echo ========================================
echo.
echo Iniciando servidor backend...
echo.

start "Backend - Porta 8010" cmd /k "python servidor.py"

timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo   Backend iniciado na porta 8010
echo ========================================
echo.
echo Aguarde 3 segundos para iniciar o frontend...
echo.

timeout /t 3 /nobreak > nul

echo Iniciando frontend React...
echo.

start "Frontend - Porta 5173" cmd /k "npm run dev"

echo.
echo ========================================
echo   APLICACAO INICIADA COM SUCESSO!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8010
echo.
echo Pressione qualquer tecla para fechar esta janela...
echo (Os servidores continuarao rodando nas outras janelas)
pause > nul

