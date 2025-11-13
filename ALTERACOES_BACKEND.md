# 🔧 ALTERAÇÕES NECESSÁRIAS NO BACKEND

## 📋 RESUMO

O frontend agora envia:
- `bank_type`: "bemge" ou "minas_caixa"
- `filter_type`: "auditado", "nauditado" ou "todos"
- `files`: Múltiplos arquivos Excel

O backend precisa aceitar esses parâmetros e processar corretamente.

---

## ✅ O QUE PRECISA SER ALTERADO

### 1. **ADICIONAR NOVO ENDPOINT** (ou modificar o existente)

**Opção A: Criar novo endpoint `/processar_contratos/`**

```python
@router.post("/processar_contratos/")
async def processar_contratos(
    bank_type: str = Form(...),
    filter_type: str = Form(...),
    files: List[UploadFile] = Form(...)
):
    # Implementação aqui
```

**Opção B: Modificar endpoint existente `/upload/` para aceitar múltiplos arquivos**

```python
@router.post("/upload/")
async def upload(
    file: UploadFile = None,
    files: List[UploadFile] = Form(None),  # NOVO
    tipo: str = Form(None),  # Manter para compatibilidade
    bank_type: str = Form(None),  # NOVO
    filter_type: str = Form(None)  # NOVO
):
    # Aceitar tanto file (antigo) quanto files (novo)
    if files:
        # Processar múltiplos arquivos
    elif file:
        # Processar arquivo único (compatibilidade)
```

---

### 2. **VALIDAÇÕES NECESSÁRIAS**

Adicionar validações no endpoint:

```python
# Validar bank_type
if bank_type and bank_type not in ["bemge", "minas_caixa"]:
    raise HTTPException(
        status_code=400,
        detail="bank_type deve ser 'bemge' ou 'minas_caixa'"
    )

# Validar filter_type
if filter_type and filter_type not in ["auditado", "nauditado", "todos"]:
    raise HTTPException(
        status_code=400,
        detail="filter_type deve ser 'auditado', 'nauditado' ou 'todos'"
    )

# Validar arquivos
arquivos = files if files else ([file] if file else [])
if not arquivos or len(arquivos) == 0:
    raise HTTPException(
        status_code=400,
        detail="Pelo menos um arquivo deve ser enviado"
    )
```

---

### 3. **PROCESSAR MÚLTIPLOS ARQUIVOS**

O código atual provavelmente processa apenas 1 arquivo. Precisa ser alterado para processar múltiplos:

**IMPORTANTE:** Retornar as **MESMAS TABELAS ORIGINAIS** com filtros aplicados, mantendo todas as colunas!

**ANTES (processa 1 arquivo):**
```python
file: UploadFile
contents = await file.read()
df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
# processar...
```

**DEPOIS (processa múltiplos arquivos):**
```python
files: List[UploadFile]
arquivos_filtrados = []

for file in files:
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
    
    # MANTER TODAS AS COLUNAS ORIGINAIS - não remover nenhuma!
    
    # Aplicar filtro de auditado/não auditado (apenas nas linhas)
    if filter_type == "auditado":
        if 'AUDITADO' in df.columns:
            df = df[df['AUDITADO'].astype(str).str.upper().str.strip().isin(['AUD', 'AUDI'])].copy()
    elif filter_type == "nauditado":
        if 'AUDITADO' in df.columns:
            df = df[df['AUDITADO'].astype(str).str.upper().str.strip() == 'NAUD'].copy()
    # Se filter_type == "todos", não filtrar
    
    # Identificar tipo de arquivo pelo nome
    filename = file.filename.upper()
    
    if "3026-11" in filename or "3026-15" in filename:
        # Remover duplicados na coluna CONTRATO
        if 'CONTRATO' in df.columns:
            df = df.drop_duplicates(subset=['CONTRATO'], keep='first').copy()
    elif "3026-12" in filename:
        # Aplicar filtros de DESTINO DE PAGAMENTO e DESTINO DE COMPLEMENTO
        valores_remover = ['0x0', '1x4', '6x4', '8x4']
        if 'DESTINO DE PAGAMENTO' in df.columns:
            df = df[~df['DESTINO DE PAGAMENTO'].astype(str).isin(valores_remover)].copy()
        if 'DESTINO DE COMPLEMENTO' in df.columns:
            df = df[~df['DESTINO DE COMPLEMENTO'].astype(str).isin(valores_remover)].copy()
    
    # Adicionar à lista (mantendo todas as colunas originais)
    arquivos_filtrados.append(df)

# Consolidar todos mantendo todas as colunas
df_consolidado = pd.concat(arquivos_filtrados, ignore_index=True)
```

---

### 4. **APLICAR FILTRO DE AUDITADO/NÃO AUDITADO**

Quando `filter_type` for "auditado" ou "nauditado", filtrar os resultados:

```python
# Após processar todos os arquivos
if filter_type and filter_type != "todos":
    if 'AUDITADO' in df_consolidado.columns:
        df_consolidado['AUDITADO'] = df_consolidado['AUDITADO'].astype(str).str.upper().str.strip()
        
        if filter_type == "auditado":
            df_consolidado = df_consolidado[df_consolidado['AUDITADO'] == 'AUD'].copy()
        elif filter_type == "nauditado":
            df_consolidado = df_consolidado[df_consolidado['AUDITADO'] == 'NAUD'].copy()
```

---

### 5. **CRIAR ESTRUTURA DE PASTAS**

Criar pastas para salvar arquivos processados:

```python
from pathlib import Path

# Criar estrutura de pastas
base_path = Path("arquivo_morto")
bank_path = base_path / (bank_type or "geral")
filtragens_path = base_path / "3026 - Filtragens"

bank_path.mkdir(parents=True, exist_ok=True)
filtragens_path.mkdir(parents=True, exist_ok=True)
```

---

### 6. **RETORNAR ARQUIVO EXCEL COM DADOS FILTRADOS**

O backend deve retornar as **MESMAS TABELAS ORIGINAIS** com filtros aplicados:

```python
from fastapi.responses import StreamingResponse
import io

# Criar planilha com dados filtrados (mantendo todas as colunas originais)
output = io.BytesIO()

with pd.ExcelWriter(output, engine='openpyxl') as writer:
    # Uma única aba com todos os dados filtrados
    # MANTER TODAS AS COLUNAS ORIGINAIS
    df_consolidado.to_excel(writer, sheet_name='Dados Filtrados', index=False)

output.seek(0)
excel_data = output.read()
output.close()

filtro_nome = filter_type.upper()
banco_nome = "BEMGE" if bank_type == "bemge" else "MINAS_CAIXA"

return StreamingResponse(
    io.BytesIO(excel_data),
    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    headers={
        "Content-Disposition": f"attachment; filename=3026_{banco_nome}_{filtro_nome}_FILTRADO.xlsx"
    }
)
```

**IMPORTANTE:** 
- Retornar as mesmas colunas que vieram no arquivo original
- Apenas filtrar as linhas conforme o filtro selecionado
- Não criar novas estruturas ou abas extras

---

### 7. **CONFIGURAR CORS** (se ainda não estiver)

Garantir que o CORS está configurado para aceitar requisições do frontend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📝 EXEMPLO COMPLETO DE ENDPOINT

```python
from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from pathlib import Path
from typing import List, Optional

router = APIRouter()

@router.post("/processar_contratos/")
async def processar_contratos(
    bank_type: str = Form(...),
    filter_type: str = Form(...),
    files: List[UploadFile] = Form(...)
):
    # Validações
    if bank_type not in ["bemge", "minas_caixa"]:
        raise HTTPException(400, "bank_type deve ser 'bemge' ou 'minas_caixa'")
    
    if filter_type not in ["auditado", "nauditado", "todos"]:
        raise HTTPException(400, "filter_type deve ser 'auditado', 'nauditado' ou 'todos'")
    
    if not files:
        raise HTTPException(400, "Pelo menos um arquivo deve ser enviado")
    
    try:
        # Criar pastas
        base_path = Path("arquivo_morto")
        bank_path = base_path / bank_type
        bank_path.mkdir(parents=True, exist_ok=True)
        
        # Processar cada arquivo
        todos_contratos = []
        
        for file in files:
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
            
            # Normalizar colunas
            df.columns = [str(c).strip().upper() for c in df.columns]
            
            filename = file.filename.upper()
            
            # Aplicar filtro de auditado/não auditado PRIMEIRO
            # MANTER TODAS AS COLUNAS ORIGINAIS
            if filter_type == "auditado":
                if 'AUDITADO' in df.columns:
                    df = df[df['AUDITADO'].astype(str).str.upper().str.strip().isin(['AUD', 'AUDI'])].copy()
                elif 'AUD' in df.columns:
                    df = df[df['AUD'].astype(str).str.upper().str.strip().isin(['AUD', 'AUDI'])].copy()
            elif filter_type == "nauditado":
                if 'AUDITADO' in df.columns:
                    df = df[df['AUDITADO'].astype(str).str.upper().str.strip() == 'NAUD'].copy()
                elif 'AUD' in df.columns:
                    df = df[df['AUD'].astype(str).str.upper().str.strip() == 'NAUD'].copy()
            
            # Processar conforme tipo de arquivo
            if "3026-11" in filename or "3026-15" in filename:
                # Remover duplicados na coluna CONTRATO
                if 'CONTRATO' in df.columns:
                    df = df.drop_duplicates(subset=['CONTRATO'], keep='first').copy()
                todos_contratos.append(df)
            elif "3026-12" in filename:
                # Aplicar filtros de DESTINO DE PAGAMENTO e DESTINO DE COMPLEMENTO
                valores_remover = ['0x0', '1x4', '6x4', '8x4']
                if 'DESTINO DE PAGAMENTO' in df.columns:
                    df = df[~df['DESTINO DE PAGAMENTO'].astype(str).isin(valores_remover)].copy()
                if 'DESTINO DE COMPLEMENTO' in df.columns:
                    df = df[~df['DESTINO DE COMPLEMENTO'].astype(str).isin(valores_remover)].copy()
                if 'CONTRATOS' in df.columns:
                    df = df[df['CONTRATOS'].notna()].copy()
                todos_contratos.append(df)
        
        if not todos_contratos:
            raise HTTPException(400, "Nenhum arquivo válido foi processado")
        
        # Consolidar todos os arquivos (mantendo todas as colunas originais)
        df_consolidado = pd.concat(todos_contratos, ignore_index=True)
        
        # Criar arquivo Excel com dados filtrados
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Uma única aba com todos os dados filtrados
            # MANTER TODAS AS COLUNAS ORIGINAIS
            df_consolidado.to_excel(writer, sheet_name='Dados Filtrados', index=False)
        
        output.seek(0)
        excel_data = output.read()
        output.close()
        
        # Retornar arquivo
        filtro_nome = filter_type.upper()
        banco_nome = "BEMGE" if bank_type == "bemge" else "MINAS_CAIXA"
        
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=3026_{banco_nome}_{filtro_nome}_FILTRADO.xlsx"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erro ao processar: {str(e)}")
```

---

## 🔄 COMPATIBILIDADE COM CÓDIGO ANTIGO

Se quiser manter compatibilidade com o endpoint antigo `/upload/`:

```python
@router.post("/upload/")
async def upload(
    file: Optional[UploadFile] = None,
    files: Optional[List[UploadFile]] = Form(None),
    tipo: Optional[str] = Form(None),
    bank_type: Optional[str] = Form(None),
    filter_type: Optional[str] = Form(None)
):
    # Se receber files (novo formato), usar novo processamento
    if files:
        return await processar_contratos(bank_type or "bemge", filter_type or tipo or "todos", files)
    
    # Se receber file (formato antigo), manter compatibilidade
    if file:
        formData = new FormData()
        formData.append('file', file)
        formData.append('tipo', tipo or 'auditado')
        # Processar arquivo único...
```

---

## ✅ CHECKLIST DE ALTERAÇÕES

- [ ] Adicionar parâmetro `bank_type` no endpoint
- [ ] Adicionar parâmetro `filter_type` no endpoint
- [ ] Adicionar parâmetro `files` (List[UploadFile]) no endpoint
- [ ] Validar `bank_type` (bemge ou minas_caixa)
- [ ] Validar `filter_type` (auditado, nauditado ou todos)
- [ ] Modificar código para processar múltiplos arquivos
- [ ] Aplicar filtro de auditado/não auditado quando necessário
- [ ] Criar estrutura de pastas `arquivo_morto/`
- [ ] Salvar arquivos processados nas pastas corretas
- [ ] Gerar planilha consolidada com múltiplas abas
- [ ] Retornar arquivo Excel como StreamingResponse
- [ ] Configurar CORS corretamente
- [ ] Testar com múltiplos arquivos
- [ ] Testar com diferentes filtros

---

## 🚨 IMPORTANTE

1. **CORS**: Certifique-se de que o CORS está configurado para aceitar requisições do frontend
2. **Engine OpenPyXL**: Sempre use `engine='openpyxl'` ao salvar arquivos Excel
3. **StreamingResponse**: Use StreamingResponse em modo binário para retornar arquivos
4. **Validações**: Valide todos os parâmetros antes de processar
5. **Tratamento de Erros**: Retorne mensagens de erro claras usando HTTPException

---

**Data:** Hoje  
**Status:** Aguardando implementação

