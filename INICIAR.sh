#!/bin/bash

echo "========================================"
echo "   SISTEMA DE CONTRATOS 3026"
echo "========================================"
echo ""
echo "Iniciando servidor backend..."
echo ""

# Inicia o backend em background
python servidor.py &
BACKEND_PID=$!

sleep 3

echo ""
echo "========================================"
echo "   Backend iniciado na porta 8010"
echo "========================================"
echo ""
echo "Aguarde 3 segundos para iniciar o frontend..."
echo ""

sleep 3

echo "Iniciando frontend React..."
echo ""

# Inicia o frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "   APLICACAO INICIADA COM SUCESSO!"
echo "========================================"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8010"
echo ""
echo "Pressione Ctrl+C para parar os servidores"
echo ""

# Aguarda Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait

