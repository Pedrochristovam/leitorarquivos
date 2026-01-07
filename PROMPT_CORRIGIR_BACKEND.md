# 🚨 PROMPT PARA CORRIGIR BACKEND - ERROS CORS E 404

## 📋 PROBLEMAS IDENTIFICADOS

Com base nos erros do console:

1. **❌ CORS Policy Block**: O backend não está retornando o header `Access-Control-Allow-Origin`
2. **❌ 404 Not Found**: O endpoint `/upload/` está retornando 404
3. **❌ Aplicação não responde**: Nenhuma função está funcionando devido aos erros acima

---

## 🔧 CORREÇÕES NECESSÁRIAS NO `servidor.py`

### 1. **ADICIONAR CORS MIDDLEWARE** (CRÍTICO)

O FastAPI precisa do middleware CORS configurado para aceitar requisições do frontend hospedado em outro domínio.

**Adicionar no início do arquivo `servidor.py`, logo após criar a instância do FastAPI:**

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CONFIGURAÇÃO CORS - ADICIONAR ESTAS LINHAS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://leitorarquivos.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],  # Lista de origens permitidas
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Permite todos os headers
)

# Configura pastas
app.mount("/static", StaticFiles(directory="static"), name="static")
```

**OU, para desenvolvimento/teste (menos seguro, mas funciona para tudo):**

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CONFIGURAÇÃO CORS - PERMISSIVA (para desenvolvimento)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todas as origens
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 2. **VERIFICAR ENDPOINT `/upload/`**

O endpoint `/upload/` existe no código, mas pode estar com problema de roteamento. 

**Garantir que o endpoint está correto:**

```python
@app.post("/upload/")
async def upload(file: UploadFile, tipo: str = Form(...)):
    # Garante que a pasta de uploads existe
    os.makedirs("uploads", exist_ok=True)
    caminho_temp = os.path.join("uploads", file.filename)

    # Salva o arquivo temporariamente
    with open(caminho_temp, "wb") as f:
        content = await file.read()
        f.write(content)

    # Processa o Excel
    resultado, erro = processar_excel(caminho_temp, tipo)

    if erro:
        raise HTTPException(status_code=400, detail=erro)

    # Retorna o arquivo Excel processado pro download
    return FileResponse(
        resultado, 
        filename=os.path.basename(resultado),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
```

---

### 3. **ADICIONAR ENDPOINT DE HEALTH CHECK** (OPCIONAL MAS RECOMENDADO)

Para verificar se o servidor está respondendo:

```python
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Servidor funcionando"}
```

---

### 4. **ADICIONAR TRATAMENTO DE ERROS GLOBAL** (OPCIONAL)

Para retornar erros em formato JSON consistente:

```python
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"erro": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"erro": "Dados inválidos", "detalhes": str(exc)}
    )
```

---

## 📝 CÓDIGO COMPLETO DO `servidor.py` CORRIGIDO

```python
from typing import List, Optional

from fastapi import FastAPI, UploadFile, Form, Request, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware  # ADICIONAR
import io
import os
import pandas as pd

from processar_contratos import (
    processar_excel,
    filtrar_planilha_contratos,
    concatenar_dataframes,
)

app = FastAPI()

# CONFIGURAÇÃO CORS - ADICIONAR ESTA SEÇÃO
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://leitorarquivos.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configura pastas
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.get("/health")  # ADICIONAR ENDPOINT DE HEALTH CHECK
async def health_check():
    return {"status": "ok", "message": "Servidor funcionando"}


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/processar_contratos/")
async def processar_contratos(
    bank_type: str = Form(...),
    filter_type: str = Form(...),
    file_type: str = Form(...),
    period_filter_enabled: str = Form("false"),
    reference_date: Optional[str] = Form(None),
    months_back: str = Form("2"),
    files: List[UploadFile] = Form(...),
):
    bank_lower = bank_type.lower()
    if bank_lower not in {"bemge", "minas_caixa"}:
        raise HTTPException(status_code=400, detail="bank_type deve ser 'bemge' ou 'minas_caixa'")

    filter_lower = filter_type.lower()
    if filter_lower not in {"auditado", "nauditado", "todos"}:
        raise HTTPException(status_code=400, detail="filter_type deve ser 'auditado', 'nauditado' ou 'todos'")

    if not files:
        raise HTTPException(status_code=400, detail="Pelo menos um arquivo deve ser enviado")

    period_filter_flag = str(period_filter_enabled).lower() == "true"

    try:
        months_back_int = max(int(months_back), 0)
    except ValueError:
        raise HTTPException(status_code=400, detail="months_back deve ser um número inteiro válido")

    reference_date_value = (
        reference_date.strip() if reference_date and reference_date.strip() else None
    )

    dataframes = []
    for upload_file in files:
        try:
            contents = await upload_file.read()
            df_filtrado = filtrar_planilha_contratos(
                contents,
                filter_lower,
                period_filter_flag,
                reference_date_value,
                months_back_int,
                upload_file.filename,
            )
            dataframes.append(df_filtrado)
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"Falha ao ler '{upload_file.filename}': {str(exc)}"
            )
        finally:
            await upload_file.close()

    df_consolidado = concatenar_dataframes(dataframes)

    if df_consolidado.empty:
        raise HTTPException(status_code=400, detail="Nenhum dado encontrado após aplicar os filtros")

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_consolidado.to_excel(writer, sheet_name="Dados Filtrados", index=False)
    output.seek(0)

    banco_nome = "BEMGE" if bank_lower == "bemge" else "MINAS_CAIXA"
    filtro_nome = filter_lower.upper()
    filename = f"3026_{banco_nome}_{filtro_nome}_FILTRADO.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/upload/")
async def upload(file: UploadFile, tipo: str = Form(...)):
    # Garante que a pasta de uploads existe
    os.makedirs("uploads", exist_ok=True)
    caminho_temp = os.path.join("uploads", file.filename)

    # Salva o arquivo temporariamente
    with open(caminho_temp, "wb") as f:
        content = await file.read()
        f.write(content)

    # Processa o Excel
    resultado, erro = processar_excel(caminho_temp, tipo)

    if erro:
        raise HTTPException(status_code=400, detail=erro)

    # Retorna o arquivo Excel processado pro download
    return FileResponse(
        resultado, 
        filename=os.path.basename(resultado),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8010)
```

---

## ✅ CHECKLIST DE CORREÇÕES

- [ ] Adicionar `from fastapi.middleware.cors import CORSMiddleware` no topo do arquivo
- [ ] Adicionar `app.add_middleware(CORSMiddleware, ...)` logo após `app = FastAPI()`
- [ ] Configurar `allow_origins` com as URLs do frontend (incluindo `https://leitorarquivos.onrender.com`)
- [ ] Configurar `allow_methods=["*"]` e `allow_headers=["*"]`
- [ ] Verificar que o endpoint `/upload/` está correto
- [ ] Adicionar endpoint `/health` para verificação
- [ ] Testar se o servidor está respondendo após as alterações

---

## 🚀 DEPLOY NO RENDER

Após fazer as alterações:

1. **Commit e push das alterações**:
   ```bash
   git add servidor.py
   git commit -m "Fix: Adicionar CORS middleware e corrigir endpoints"
   git push
   ```

2. **O Render vai fazer deploy automaticamente**

3. **Verificar se está funcionando**:
   - Acessar `https://leitorback-2.onrender.com/health` (deve retornar `{"status": "ok"}`)
   - Testar requisição do frontend

---

## 🔍 TESTE RÁPIDO

Após fazer as alterações, testar com curl:

```bash
# Testar health check
curl https://leitorback-2.onrender.com/health

# Testar CORS (deve retornar headers CORS)
curl -I -X OPTIONS https://leitorback-2.onrender.com/processar_contratos/ \
  -H "Origin: https://leitorarquivos.onrender.com" \
  -H "Access-Control-Request-Method: POST"
```

---

## ⚠️ IMPORTANTE

1. **CORS é CRÍTICO**: Sem ele, nenhuma requisição do frontend vai funcionar
2. **Verificar URLs**: Certifique-se de que as URLs nas `allow_origins` estão corretas
3. **Deploy**: Após alterar, fazer deploy no Render para as mudanças terem efeito

---

**Este prompt deve resolver todos os erros de CORS e 404 que estão impedindo a aplicação de funcionar.**




