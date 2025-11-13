# 🚀 PROMPT COMPLETO PARA O BACKEND

## 📋 CONTEXTO

O frontend está enviando múltiplos arquivos Excel com filtros de banco (BEMGE/MINAS CAIXA) e filtros de auditado/não auditado. O backend precisa processar e retornar as **MESMAS TABELAS ORIGINAIS** com os filtros aplicados.

---

## 🎯 REQUISITO PRINCIPAL

**RETORNAR AS MESMAS TABELAS ORIGINAIS COM FILTROS APLICADOS**

- ✅ Manter **TODAS as colunas originais** do arquivo
- ✅ Aplicar filtros **apenas nas LINHAS**
- ✅ Não criar novas estruturas ou colunas extras
- ✅ Retornar planilha com dados filtrados

---

## 🔌 ENDPOINT A CRIAR/MODIFICAR

### `POST /processar_contratos/`

**Parâmetros recebidos (Form):**
- `bank_type`: "bemge" ou "minas_caixa" (obrigatório)
- `filter_type`: "auditado", "nauditado" ou "todos" (obrigatório)
- `files`: Lista de múltiplos arquivos Excel (obrigatório)

**Resposta:**
- Status 200: Arquivo Excel (.xlsx) com dados filtrados
- Status 400/500: JSON com `{"erro": "mensagem"}`

---

## 📊 LÓGICA DE PROCESSAMENTO

### 1. PROCESSAR CADA ARQUIVO

```python
arquivos_filtrados = []

for file in files:
    # Ler arquivo
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
    
    # IMPORTANTE: MANTER TODAS AS COLUNAS ORIGINAIS
    # Não remover nenhuma coluna!
    
    # Aplicar filtro de auditado/não auditado (apenas nas linhas)
    if filter_type == "auditado":
        # Filtrar apenas linhas onde AUDITADO = "AUDI"
        if 'AUDITADO' in df.columns:
            df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
            df = df[df['AUDITADO'] == 'AUDI'].copy()  # Valor real: AUDI
    
    elif filter_type == "nauditado":
        # Filtrar apenas linhas onde AUDITADO = "NAUD"
        if 'AUDITADO' in df.columns:
            df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
            df = df[df['AUDITADO'] == 'NAUD'].copy()
    
    # Se filter_type == "todos", não filtrar (manter todas as linhas)
    
    # Processamento específico por tipo de arquivo
    filename = file.filename.upper()
    
    if "3026-11" in filename or "3026-15" in filename:
        # Remover duplicados na coluna CONTRATO
        if 'CONTRATO' in df.columns:
            df = df.drop_duplicates(subset=['CONTRATO'], keep='first').copy()
    
    elif "3026-12" in filename:
        # Aplicar filtros de DEST.PAGAM e DEST.COMPLEM
        valores_remover = ['0x0', '1x4', '6x4', '8x4']
        
        # Nomes reais das colunas: DEST.PAGAM e DEST.COMPLEM
        if 'DEST.PAGAM' in df.columns:
            df = df[~df['DEST.PAGAM'].astype(str).isin(valores_remover)].copy()
        
        if 'DEST.COMPLEM' in df.columns:
            df = df[~df['DEST.COMPLEM'].astype(str).isin(valores_remover)].copy()
        
        # Filtrar por CONTRATOS (remover vazios) - se a coluna existir
        if 'CONTRATOS' in df.columns:
            df = df[df['CONTRATOS'].notna()].copy()
    
    # Adicionar à lista (mantendo todas as colunas originais)
    arquivos_filtrados.append(df)
```

### 2. CONSOLIDAR E RETORNAR

```python
# Consolidar todos os arquivos
if not arquivos_filtrados:
    raise HTTPException(400, "Nenhum dado encontrado após aplicar os filtros")

df_consolidado = pd.concat(arquivos_filtrados, ignore_index=True)

# Criar arquivo Excel
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
```

---

## 🐍 CÓDIGO COMPLETO DE EXEMPLO

```python
from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from pathlib import Path
from typing import List

router = APIRouter()

@router.post("/processar_contratos/")
async def processar_contratos(
    bank_type: str = Form(...),
    filter_type: str = Form(...),
    files: List[UploadFile] = Form(...)
):
    """
    Processa múltiplos arquivos Excel aplicando filtros
    Retorna as mesmas planilhas com filtros aplicados (mantendo todas as colunas)
    """
    
    # Validações
    if bank_type not in ["bemge", "minas_caixa"]:
        raise HTTPException(
            status_code=400,
            detail="bank_type deve ser 'bemge' ou 'minas_caixa'"
        )
    
    if filter_type not in ["auditado", "nauditado", "todos"]:
        raise HTTPException(
            status_code=400,
            detail="filter_type deve ser 'auditado', 'nauditado' ou 'todos'"
        )
    
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=400,
            detail="Pelo menos um arquivo deve ser enviado"
        )
    
    try:
        arquivos_filtrados = []
        
        # Processar cada arquivo
        for file in files:
            # Ler arquivo
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
            
            # MANTER TODAS AS COLUNAS ORIGINAIS - não remover nenhuma!
            
            # Identificar coluna de auditado
            coluna_auditado = None
            if 'AUDITADO' in df.columns:
                coluna_auditado = 'AUDITADO'
            elif 'AUD' in df.columns:
                coluna_auditado = 'AUD'
            
            # Aplicar filtro de auditado/não auditado (apenas nas linhas)
            if filter_type != "todos" and coluna_auditado:
                df[coluna_auditado] = df[coluna_auditado].astype(str).str.upper().str.strip()
                
                if filter_type == "auditado":
                    # Filtrar apenas AUDI (valor real nos dados: "AUDI", não "AUD")
                    df = df[df[coluna_auditado] == 'AUDI'].copy()
                elif filter_type == "nauditado":
                    # Filtrar apenas NAUD
                    df = df[df[coluna_auditado] == 'NAUD'].copy()
            
            # Processamento específico por tipo de arquivo
            filename = file.filename.upper()
            
            if "3026-11" in filename or "3026-15" in filename:
                # Remover duplicados na coluna CONTRATO
                if 'CONTRATO' in df.columns:
                    df = df.drop_duplicates(subset=['CONTRATO'], keep='first').copy()
            
            elif "3026-12" in filename:
                # Aplicar filtros de DEST.PAGAM e DEST.COMPLEM
                valores_remover = ['0x0', '1x4', '6x4', '8x4']
                
                # Nomes reais das colunas: DEST.PAGAM e DEST.COMPLEM
                if 'DEST.PAGAM' in df.columns:
                    df = df[~df['DEST.PAGAM'].astype(str).isin(valores_remover)].copy()
                
                if 'DEST.COMPLEM' in df.columns:
                    df = df[~df['DEST.COMPLEM'].astype(str).isin(valores_remover)].copy()
                
                # Filtrar por CONTRATOS (remover vazios)
                if 'CONTRATOS' in df.columns:
                    df = df[df['CONTRATOS'].notna()].copy()
            
            # Adicionar à lista (mantendo todas as colunas originais)
            arquivos_filtrados.append(df)
        
        # Verificar se há dados após filtros
        total_linhas = sum(len(df) for df in arquivos_filtrados)
        if total_linhas == 0:
            raise HTTPException(
                status_code=400,
                detail="Nenhum dado encontrado após aplicar os filtros"
            )
        
        # Consolidar todos os arquivos (mantendo todas as colunas originais)
        df_consolidado = pd.concat(arquivos_filtrados, ignore_index=True)
        
        # Criar arquivo Excel
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
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar arquivos: {str(e)}"
        )
```

---

## ✅ VALIDAÇÕES NECESSÁRIAS

1. ✅ Validar `bank_type` (deve ser "bemge" ou "minas_caixa")
2. ✅ Validar `filter_type` (deve ser "auditado", "nauditado" ou "todos")
3. ✅ Validar se pelo menos um arquivo foi enviado
4. ✅ Validar se os arquivos são Excel válidos
5. ✅ Verificar se há dados após aplicar os filtros

---

## 🚨 PONTOS CRÍTICOS

1. **MANTER TODAS AS COLUNAS ORIGINAIS**
   - Não remover nenhuma coluna
   - Não adicionar colunas extras
   - Retornar exatamente as mesmas colunas que vieram

2. **APLICAR FILTROS APENAS NAS LINHAS**
   - Filtro "auditado": manter apenas linhas onde AUDITADO = AUD/AUDI
   - Filtro "nauditado": manter apenas linhas onde AUDITADO = NAUD
   - Filtro "todos": manter todas as linhas

3. **PROCESSAMENTO ESPECÍFICO**
   - 3026-11 e 3026-15: remover duplicados na coluna CONTRATO
   - 3026-12: aplicar filtros de DESTINO DE PAGAMENTO e DESTINO DE COMPLEMENTO

4. **RETORNAR ARQUIVO EXCEL**
   - Uma única aba "Dados Filtrados"
   - Usar `engine='openpyxl'`
   - Retornar como `StreamingResponse` em modo binário

---

## 📝 EXEMPLO DE RESULTADO ESPERADO

**Arquivo Original:**
```
CONTRATO | AUDITADO | VALOR | DATA | COLUNA_A | COLUNA_B | COLUNA_C
123      | AUD      | 1000  | ...  | ...      | ...      | ...
456      | NAUD     | 2000  | ...  | ...      | ...      | ...
789      | AUD      | 3000  | ...  | ...      | ...      | ...
```

**Após filtro "auditado":**
```
CONTRATO | AUDITADO | VALOR | DATA | COLUNA_A | COLUNA_B | COLUNA_C
123      | AUD      | 1000  | ...  | ...      | ...      | ...
789      | AUD      | 3000  | ...  | ...      | ...      | ...
```

**Todas as colunas são mantidas! Apenas as linhas são filtradas.**

---

## 🔧 CONFIGURAÇÕES NECESSÁRIAS

### CORS (se ainda não estiver configurado)

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

## 📋 CHECKLIST

- [ ] Criar endpoint `/processar_contratos/`
- [ ] Aceitar parâmetros: `bank_type`, `filter_type`, `files`
- [ ] Validar todos os parâmetros
- [ ] Processar múltiplos arquivos
- [ ] Aplicar filtro de auditado/não auditado (apenas linhas)
- [ ] Manter todas as colunas originais
- [ ] Processar 3026-11, 3026-12, 3026-15 conforme tipo
- [ ] Consolidar todos os arquivos
- [ ] Retornar arquivo Excel com uma única aba
- [ ] Usar `engine='openpyxl'` ao salvar
- [ ] Retornar como `StreamingResponse` em modo binário
- [ ] Configurar CORS corretamente
- [ ] Tratar erros com mensagens claras

---

## 🎯 RESUMO FINAL

O backend deve:
1. Receber múltiplos arquivos Excel
2. Aplicar filtros de auditado/não auditado (apenas nas linhas)
3. Manter todas as colunas originais
4. Retornar uma planilha Excel com os dados filtrados
5. Nome do arquivo: `3026_{BANCO}_{FILTRO}_FILTRADO.xlsx`

**IMPORTANTE:** Retornar as mesmas colunas que vieram no arquivo original, apenas com as linhas filtradas!

---

**Por favor, implemente este endpoint seguindo exatamente essas especificações.**

