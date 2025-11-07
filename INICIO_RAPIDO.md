# 🚀 Início Rápido - Como Ver a Aplicação Funcionando

## 📋 Pré-requisitos

Certifique-se de ter instalado:
- ✅ Python 3.8 ou superior
- ✅ Node.js 16 ou superior (e npm)
- ✅ Dependências Python instaladas
- ✅ Dependências Node.js instaladas

## 🔧 Passo 1: Instalar Dependências

### Instalar dependências Python:
```bash
pip install -r requirements.txt
```

### Instalar dependências Node.js:
```bash
npm install
```

## 🎯 Passo 2: Executar a Aplicação

### Opção A: Modo Desenvolvimento (Recomendado)

Abra **2 terminais**:

#### Terminal 1 - Backend (Python/FastAPI):
```bash
python servidor.py
```
Você verá algo como:
```
INFO:     Uvicorn running on http://0.0.0.0:8010
```

#### Terminal 2 - Frontend (React):
```bash
npm run dev
```
Você verá algo como:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 🌐 URLs para Acessar:

- **Frontend (React)**: http://localhost:5173
- **Backend (API)**: http://localhost:8010

**Acesse a aplicação em: http://localhost:5173**

---

### Opção B: Modo Produção (Tudo em um servidor)

#### 1. Construir o React:
```bash
npm run build
```

#### 2. Iniciar o servidor:
```bash
python servidor.py
```

#### 3. Acessar:
**URL**: http://localhost:8010

---

## ✅ Verificando se Está Funcionando

### 1. Verificar Backend:
Abra no navegador: http://localhost:8010/health

Você deve ver:
```json
{"status":"ok"}
```

### 2. Verificar Frontend:
Abra no navegador: http://localhost:5173 (dev) ou http://localhost:8010 (produção)

Você deve ver a interface moderna do Sistema de Contratos!

## 🐛 Problemas Comuns

### Erro: "Cannot find module"
```bash
npm install
```

### Erro: "Module not found" (Python)
```bash
pip install -r requirements.txt
```

### Porta já em uso:
- Backend: Altere a porta em `servidor.py` (linha 81)
- Frontend: O Vite perguntará se quer usar outra porta

### CORS Error:
- Certifique-se de que o backend está rodando na porta 8010
- Verifique se as URLs no `servidor.py` estão corretas

## 📱 Como Usar

1. **Acesse a URL** (http://localhost:5173 ou http://localhost:8010)
2. **Arraste ou selecione** um arquivo Excel (.xlsx)
3. **Escolha o filtro** (Auditado, Não Auditado, ou Todos)
4. **Clique em "Processar Arquivo"**
5. **Aguarde o processamento**
6. **Faça o download** do resultado

## 🎨 Funcionalidades Visíveis

- ✅ Interface moderna com efeitos glassmorphism
- ✅ Drag & drop de arquivos
- ✅ Seleção visual de filtros
- ✅ Indicadores de progresso
- ✅ Histórico de processamentos
- ✅ Toggle de tema claro/escuro

---

**Pronto! Sua aplicação está rodando! 🎉**

