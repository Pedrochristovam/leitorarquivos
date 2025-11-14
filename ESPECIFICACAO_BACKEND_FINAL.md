# 📋 ESPECIFICAÇÃO FINAL DO BACKEND

## 🎯 OBJETIVO

O backend deve retornar **as mesmas planilhas originais** com os filtros aplicados, mantendo:
- ✅ Todas as colunas originais
- ✅ Todas as linhas que correspondem ao filtro
- ✅ Estrutura original da planilha

---

## 🔌 ENDPOINT

### `POST /processar_contratos/`

**Parâmetros:**
- `bank_type` (Form): "bemge" ou "minas_caixa"
- `filter_type` (Form): "auditado", "nauditado" ou "todos"
- `files` (List[UploadFile]): Múltiplos arquivos Excel

**Resposta:**
- Arquivo Excel (.xlsx) com as planilhas filtradas
- Se múltiplos arquivos: uma aba por arquivo (ou consolidado em uma aba)

---

## 📊 LÓGICA DE PROCESSAMENTO

### 1. PROCESSAR CADA ARQUIVO

Para cada arquivo enviado:

```python
# Ler arquivo
df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')

# MANTER TODAS AS COLUNAS ORIGINAIS
# Não remover nenhuma coluna!

# Aplicar filtro de auditado/não auditado
if filter_type == "auditado":
    # Filtrar apenas linhas onde AUDITADO = "AUD" ou "AUDI"
    if 'AUDITADO' in df.columns:
        df = df[df['AUDITADO'].astype(str).str.upper().str.strip().isin(['AUD', 'AUDI'])].copy()
    elif 'AUD' in df.columns:
        df = df[df['AUD'].astype(str).str.upper().str.strip().isin(['AUD', 'AUDI'])].copy()

elif filter_type == "nauditado":
    # Filtrar apenas linhas onde AUDITADO = "NAUD"
    if 'AUDITADO' in df.columns:
        df = df[df['AUDITADO'].astype(str).str.upper().str.strip() == 'NAUD'].copy()
    elif 'AUD' in df.columns:
        df = df[df['AUD'].astype(str).str.upper().str.strip() == 'NAUD'].copy()

# Se filter_type == "todos", não filtrar (manter todas as linhas)

# MANTER TODAS AS COLUNAS - não adicionar colunas extras
# Apenas aplicar o filtro nas linhas
```

### 2. PROCESSAMENTO ESPECÍFICO POR TIPO DE ARQUIVO

#### **Arquivos 3026-11 e 3026-15:**
- Aplicar filtro de auditado/não auditado (se aplicável)
- Remover duplicados na coluna CONTRATO (manter primeira ocorrência)
- **MANTER TODAS AS COLUNAS ORIGINAIS**

#### **Arquivo 3026-12:**
- Aplicar filtro de auditado/não auditado
- Se filter_type = "auditado": manter apenas linhas com AUD
- Se filter_type = "nauditado": manter apenas linhas com NAUD
- Se filter_type = "todos": manter todas as linhas
- Aplicar filtros de DESTINO DE PAGAMENTO e DESTINO DE COMPLEMENTO (remover 0x0, 1x4, 6x4, 8x4)
- **MANTER TODAS AS COLUNAS ORIGINAIS**

### 3. RETORNAR PLANILHA(S) FILTRADA(S)

**Opção A: Um arquivo por arquivo enviado (múltiplas abas)**
```python
with pd.ExcelWriter(output, engine='openpyxl') as writer:
    for i, df_filtrado in enumerate(arquivos_filtrados):
        nome_aba = f"Arquivo_{i+1}"  # ou usar nome do arquivo
        df_filtrado.to_excel(writer, sheet_name=nome_aba, index=False)
```

**Opção B: Consolidar todos em uma aba (recomendado)**
```python
# Consolidar todos os DataFrames
df_consolidado = pd.concat(arquivos_filtrados, ignore_index=True)

with pd.ExcelWriter(output, engine='openpyxl') as writer:
    # Uma única aba com todos os dados filtrados
    df_consolidado.to_excel(writer, sheet_name='Dados Filtrados', index=False)
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
    Retorna as mesmas planilhas com filtros aplicados
    """
    
    # Validações
    if bank_type not in ["bemge", "minas_caixa"]:
        raise HTTPException(400, "bank_type deve ser 'bemge' ou 'minas_caixa'")
    
    if filter_type not in ["auditado", "nauditado", "todos"]:
        raise HTTPException(400, "filter_type deve ser 'auditado', 'nauditado' ou 'todos'")
    
    if not files:
        raise HTTPException(400, "Pelo menos um arquivo deve ser enviado")
    
    try:
        arquivos_filtrados = []
        nomes_arquivos = []
        
        # Processar cada arquivo
        for file in files:
            # Ler arquivo
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
            
            # MANTER TODAS AS COLUNAS ORIGINAIS
            # Não modificar colunas, apenas filtrar linhas
            
            # Normalizar coluna AUDITADO (se existir)
            coluna_auditado = None
            if 'AUDITADO' in df.columns:
                coluna_auditado = 'AUDITADO'
            elif 'AUD' in df.columns:
                coluna_auditado = 'AUD'
            
            # Aplicar filtro de auditado/não auditado
            if filter_type != "todos" and coluna_auditado:
                df[coluna_auditado] = df[coluna_auditado].astype(str).str.upper().str.strip()
                
                if filter_type == "auditado":
                    # Filtrar apenas AUD ou AUDI
                    df = df[df[coluna_auditado].isin(['AUD', 'AUDI'])].copy()
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
                # Aplicar filtros de DESTINO DE PAGAMENTO e DESTINO DE COMPLEMENTO
                valores_remover = ['0x0', '1x4', '6x4', '8x4']
                
                if 'DESTINO DE PAGAMENTO' in df.columns:
                    df = df[~df['DESTINO DE PAGAMENTO'].astype(str).isin(valores_remover)].copy()
                
                if 'DESTINO DE COMPLEMENTO' in df.columns:
                    df = df[~df['DESTINO DE COMPLEMENTO'].astype(str).isin(valores_remover)].copy()
                
                # Filtrar por CONTRATOS (remover vazios)
                if 'CONTRATOS' in df.columns:
                    df = df[df['CONTRATOS'].notna()].copy()
            
            # Adicionar à lista (mesmo que vazio após filtro)
            arquivos_filtrados.append(df)
            nomes_arquivos.append(file.filename)
        
        # Verificar se há dados após filtros
        total_linhas = sum(len(df) for df in arquivos_filtrados)
        if total_linhas == 0:
            raise HTTPException(400, "Nenhum dado encontrado após aplicar os filtros")
        
        # Consolidar todos os arquivos em um único DataFrame
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
        banco_nome = "BEMGE" if bank_type == "bemge" else "MINAS_CAIXA"
        filtro_nome = filter_type.upper()
        
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

## ✅ REGRAS IMPORTANTES

1. **MANTER TODAS AS COLUNAS ORIGINAIS**
   - Não remover colunas
   - Não adicionar colunas extras (exceto se necessário para processamento interno)
   - Retornar exatamente as mesmas colunas que vieram no arquivo original

2. **APLICAR FILTROS APENAS NAS LINHAS**
   - Filtro de auditado: manter apenas linhas onde AUDITADO = AUD/AUDI
   - Filtro de não auditado: manter apenas linhas onde AUDITADO = NAUD
   - Filtro de todos: manter todas as linhas

3. **PROCESSAMENTO ESPECÍFICO**
   - 3026-11 e 3026-15: remover duplicados na coluna CONTRATO
   - 3026-12: aplicar filtros de DESTINO DE PAGAMENTO e DESTINO DE COMPLEMENTO

4. **ESTRUTURA DE RETORNO**
   - Uma única aba "Dados Filtrados" com todos os dados
   - Ou múltiplas abas (uma por arquivo)
   - Manter todas as colunas originais

---

## 📝 EXEMPLO DE RESULTADO

**Arquivo Original:**
```
CONTRATO | AUDITADO | VALOR | DATA | OUTRAS_COLUNAS
123      | AUD      | 1000  | ...  | ...
456      | NAUD     | 2000  | ...  | ...
789      | AUD      | 3000  | ...  | ...
```

**Após filtro "auditado":**
```
CONTRATO | AUDITADO | VALOR | DATA | OUTRAS_COLUNAS
123      | AUD      | 1000  | ...  | ...
789      | AUD      | 3000  | ...  | ...
```

**Todas as colunas são mantidas!**

---

**IMPORTANTE:** O backend deve retornar as mesmas colunas que vieram no arquivo original, apenas com as linhas filtradas conforme o filtro selecionado.


