# 🔧 ALTERAÇÕES NECESSÁRIAS NO BACKEND - DEZEMBRO 2024

## 📋 RESUMO DAS ALTERAÇÕES SOLICITADAS

Este documento contém todas as alterações solicitadas no teste do sistema em 10/12/2024.

---

## 1️⃣ TIPOS DE FILTROS - GERAÇÃO DE PLANILHAS

### ✅ Implementado no Frontend
O frontend agora envia um novo parâmetro `file_type` com os valores:
- `3026-11`
- `3026-12`
- `3026-15`
- `todos`

### 🔧 Alteração no Backend
O endpoint `/processar_contratos/` deve aceitar o novo parâmetro:

```python
@router.post("/processar_contratos/")
async def processar_contratos(
    bank_type: str = Form(...),
    filter_type: str = Form(...),
    file_type: str = Form("todos"),  # NOVO PARÂMETRO
    files: List[UploadFile] = Form(...)
):
    # Validar file_type
    if file_type not in ["3026-11", "3026-12", "3026-15", "todos"]:
        raise HTTPException(400, "file_type deve ser '3026-11', '3026-12', '3026-15' ou 'todos'")
    
    # Se file_type != "todos", filtrar apenas arquivos do tipo especificado
    if file_type != "todos":
        files = [f for f in files if file_type.upper() in f.filename.upper()]
```

---

## 2️⃣ FORMATAÇÃO DA COLUNA CONTRATO

### Problema
A linha de contratos continua sem formatação adequada.

### Solução
Formatar a coluna CONTRATO como texto, preservando zeros à esquerda:

```python
# Após ler o DataFrame
if 'CONTRATO' in df.columns:
    # Converter para string e remover decimais
    df['CONTRATO'] = df['CONTRATO'].apply(lambda x: str(int(x)) if pd.notna(x) and isinstance(x, (int, float)) else str(x) if pd.notna(x) else '')
    # Garantir formato de texto no Excel
```

### Ao Salvar no Excel
```python
from openpyxl.styles import numbers

# Após criar o workbook
for cell in ws['D']:  # Coluna CONTRATO (ajustar conforme necessário)
    cell.number_format = '@'  # Formato texto
```

---

## 3️⃣ FORMATAÇÃO DE COLUNAS DE DATA

### Colunas Afetadas
- `DT.ASS.` - Data de Assinatura
- `DT.EVENTO` - Data do Evento
- `DT.HAB.` - Data de Habilitação
- `DT.PROC.HAB.` - Data de Processamento de Habilitação

### Problema
As datas estão aparecendo com hora (datetime completo).

### Solução
Deixar somente a data (sem hora):

```python
# Lista de colunas de data
colunas_data = ['DT.ASS.', 'DT.EVENTO', 'DT.HAB.', 'DT.PROC.HAB.']

for col in colunas_data:
    if col in df.columns:
        # Converter para datetime e manter apenas a data
        df[col] = pd.to_datetime(df[col], errors='coerce').dt.date
```

### Formato no Excel
```python
from openpyxl.styles import numbers

# Ao salvar, formatar como data
for col in colunas_data:
    if col in df.columns:
        col_idx = df.columns.get_loc(col) + 1
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        for cell in ws[col_letter]:
            cell.number_format = 'DD/MM/YYYY'
```

---

## 4️⃣ REMOVER COLUNAS AF, AG, AH (GERAL)

### Colunas a Remover (por índice de coluna Excel)
- **AF (coluna 32)**: `INDVAF3TR7`
- **AG (coluna 33)**: `INDVAF4TR7`
- **AH (coluna 34)**: `DT.ULT.HOMOLOGACAO`

### Solução
```python
# Colunas a remover (usar os nomes reais das colunas)
colunas_remover_geral = ['INDVAF3TR7', 'INDVAF4TR7', 'DT.ULT.HOMOLOGACAO']

# Ou por índice (0-based, AF=31, AG=32, AH=33)
# colunas_remover_indices = [31, 32, 33]

for col in colunas_remover_geral:
    if col in df.columns:
        df = df.drop(columns=[col])
```

---

## 5️⃣ ALTERAÇÕES ESPECÍFICAS - 3026-12

### 5.1 Remover Colunas BT e BU
- **BT (coluna 72)**: Verificar nome real
- **BU (coluna 73)**: Verificar nome real

```python
if "3026-12" in filename:
    # Remover colunas BT e BU (índices 71 e 72, 0-based)
    colunas_bt_bu = df.columns[71:73].tolist() if len(df.columns) > 72 else []
    for col in colunas_bt_bu:
        if col in df.columns:
            df = df.drop(columns=[col])
```

### 5.2 Coluna D - Fora de Formato
A coluna D (CONTRATO) precisa ser formatada como texto:

```python
if "3026-12" in filename:
    # Coluna D é a 4ª coluna (índice 3)
    coluna_d = df.columns[3] if len(df.columns) > 3 else None
    if coluna_d:
        df[coluna_d] = df[coluna_d].apply(
            lambda x: str(int(x)) if pd.notna(x) and isinstance(x, (int, float)) else str(x) if pd.notna(x) else ''
        )
```

### 5.3 Colunas AA e AB - Deixar como Único Número
- **AA (coluna 27)**: Provavelmente `VAF1 SIFCVS`
- **AB (coluna 28)**: Provavelmente `VAF2 SIFCVS`

Converter para número inteiro único (sem decimais):

```python
if "3026-12" in filename:
    # Colunas AA e AB (índices 26 e 27)
    for idx in [26, 27]:
        if len(df.columns) > idx:
            col = df.columns[idx]
            df[col] = df[col].apply(
                lambda x: int(x) if pd.notna(x) and isinstance(x, (int, float)) else x
            )
```

### 5.4 Coluna B - Deletar Linhas que NÃO são 52101
**IMPORTANTE**: Manter apenas linhas onde a coluna B = 52101

```python
if "3026-12" in filename:
    # Coluna B é a 2ª coluna (índice 1) - provavelmente "AGENTE CESSIONARIO" ou similar
    coluna_b = df.columns[1] if len(df.columns) > 1 else None
    if coluna_b:
        # Converter para string para comparação
        df[coluna_b] = df[coluna_b].astype(str).str.strip()
        # Filtrar apenas linhas onde coluna B = "52101"
        df = df[df[coluna_b] == '52101'].copy()
```

---

## 6️⃣ ALTERAÇÕES ESPECÍFICAS - 3026-15

### Coluna D - Fora de Formato
Mesma correção do 3026-12 - formatar como texto:

```python
if "3026-15" in filename:
    # Coluna D é a 4ª coluna (índice 3)
    coluna_d = df.columns[3] if len(df.columns) > 3 else None
    if coluna_d:
        df[coluna_d] = df[coluna_d].apply(
            lambda x: str(int(x)) if pd.notna(x) and isinstance(x, (int, float)) else str(x) if pd.notna(x) else ''
        )
```

---

## 7️⃣ ERRO MINAS CAIXA - ARQUIVO NÃO ENCONTRADO

### Problema
Quando enviado arquivo para o banco MINAS CAIXA, a geração apresenta "arquivo não encontrado".

### Possíveis Causas
1. **Validação de nome de arquivo**: O backend pode estar esperando um padrão específico no nome do arquivo
2. **Caminho de arquivo**: Problema ao salvar/ler arquivos temporários
3. **Encoding**: Problema com caracteres especiais no caminho
4. **Espaço no nome**: "MINAS CAIXA" contém espaço

### Solução
```python
# Verificar se bank_type está sendo tratado corretamente
bank_type = bank_type.lower().replace(" ", "_")  # "minas_caixa"

# Garantir que pastas existem
from pathlib import Path
import os

# Usar underscores em vez de espaços
base_path = Path("arquivo_morto")
bank_folder = "minas_caixa" if bank_type == "minas_caixa" else bank_type
bank_path = base_path / bank_folder
bank_path.mkdir(parents=True, exist_ok=True)

# Ao salvar arquivos temporários
temp_path = Path("uploads")
temp_path.mkdir(parents=True, exist_ok=True)

# Usar UUID para nomes de arquivos temporários
import uuid
temp_filename = f"{uuid.uuid4().hex}_{file.filename}"
temp_filepath = temp_path / temp_filename

# Verificar se arquivo foi salvo
with open(temp_filepath, "wb") as f:
    f.write(await file.read())

if not temp_filepath.exists():
    raise HTTPException(500, f"Erro ao salvar arquivo temporário: {temp_filename}")
```

### Debug Adicional
```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Log detalhado
logger.debug(f"bank_type recebido: {bank_type}")
logger.debug(f"Arquivos recebidos: {[f.filename for f in files]}")
logger.debug(f"Caminho temporário: {temp_filepath}")
logger.debug(f"Arquivo existe: {temp_filepath.exists()}")
```

---

## 🐍 CÓDIGO COMPLETO ATUALIZADO

```python
from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from typing import List
from pathlib import Path
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/processar_contratos/")
async def processar_contratos(
    bank_type: str = Form(...),
    filter_type: str = Form(...),
    file_type: str = Form("todos"),
    files: List[UploadFile] = Form(...)
):
    # Validações
    if bank_type not in ["bemge", "minas_caixa"]:
        raise HTTPException(400, "bank_type deve ser 'bemge' ou 'minas_caixa'")
    
    if filter_type not in ["auditado", "nauditado", "todos"]:
        raise HTTPException(400, "filter_type deve ser 'auditado', 'nauditado' ou 'todos'")
    
    if file_type not in ["3026-11", "3026-12", "3026-15", "todos"]:
        raise HTTPException(400, "file_type deve ser '3026-11', '3026-12', '3026-15' ou 'todos'")
    
    if not files:
        raise HTTPException(400, "Pelo menos um arquivo deve ser enviado")
    
    logger.info(f"Processando: bank={bank_type}, filter={filter_type}, file_type={file_type}, files={len(files)}")
    
    try:
        arquivos_filtrados = []
        
        for file in files:
            filename = file.filename.upper()
            logger.debug(f"Processando arquivo: {filename}")
            
            # Filtrar por tipo de arquivo se especificado
            if file_type != "todos" and file_type.upper() not in filename:
                logger.debug(f"Arquivo {filename} ignorado (não é {file_type})")
                continue
            
            # Ler arquivo
            try:
                contents = await file.read()
                df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
            except Exception as e:
                logger.error(f"Erro ao ler arquivo {filename}: {e}")
                raise HTTPException(400, f"Erro ao ler arquivo {file.filename}: {str(e)}")
            
            # ========================================
            # FORMATAÇÃO DE DATAS (todas as planilhas)
            # ========================================
            colunas_data = ['DT.ASS.', 'DT.EVENTO', 'DT.HAB.', 'DT.PROC.HAB.']
            for col in colunas_data:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], errors='coerce').dt.date
            
            # ========================================
            # REMOVER COLUNAS AF, AG, AH (geral)
            # ========================================
            colunas_remover_geral = ['INDVAF3TR7', 'INDVAF4TR7', 'DT.ULT.HOMOLOGACAO']
            for col in colunas_remover_geral:
                if col in df.columns:
                    df = df.drop(columns=[col])
            
            # ========================================
            # FILTRO DE AUDITADO/NÃO AUDITADO
            # ========================================
            if filter_type == "auditado":
                if 'AUDITADO' in df.columns:
                    df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
                    df = df[df['AUDITADO'] == 'AUDI'].copy()
            elif filter_type == "nauditado":
                if 'AUDITADO' in df.columns:
                    df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
                    df = df[df['AUDITADO'] == 'NAUD'].copy()
            
            # ========================================
            # PROCESSAMENTO ESPECÍFICO POR TIPO
            # ========================================
            
            if "3026-11" in filename:
                # Formatar coluna D (CONTRATO) como texto
                if len(df.columns) > 3:
                    coluna_d = df.columns[3]
                    df[coluna_d] = df[coluna_d].apply(
                        lambda x: str(int(x)) if pd.notna(x) and isinstance(x, (int, float)) else str(x) if pd.notna(x) else ''
                    )
                
                # Remover duplicados na coluna CONTRATO
                if 'CONTRATO' in df.columns:
                    df = df.drop_duplicates(subset=['CONTRATO'], keep='first').copy()
            
            elif "3026-12" in filename:
                # 1. Coluna B - Manter apenas linhas onde = 52101
                if len(df.columns) > 1:
                    coluna_b = df.columns[1]
                    df[coluna_b] = df[coluna_b].astype(str).str.strip()
                    df = df[df[coluna_b] == '52101'].copy()
                
                # 2. Formatar coluna D como texto
                if len(df.columns) > 3:
                    coluna_d = df.columns[3]
                    df[coluna_d] = df[coluna_d].apply(
                        lambda x: str(int(x)) if pd.notna(x) and isinstance(x, (int, float)) else str(x) if pd.notna(x) else ''
                    )
                
                # 3. Colunas AA e AB - deixar como número único
                for idx in [26, 27]:  # AA=26, AB=27 (0-based)
                    if len(df.columns) > idx:
                        col = df.columns[idx]
                        df[col] = df[col].apply(
                            lambda x: int(x) if pd.notna(x) and isinstance(x, (int, float)) else x
                        )
                
                # 4. Remover colunas BT e BU
                if len(df.columns) > 72:
                    colunas_bt_bu = df.columns[71:73].tolist()
                    df = df.drop(columns=colunas_bt_bu, errors='ignore')
                
                # 5. Aplicar filtros de destino
                valores_remover = ['0x0', '1x4', '6x4', '8x4']
                if 'DEST.PAGAM' in df.columns:
                    df = df[~df['DEST.PAGAM'].astype(str).isin(valores_remover)].copy()
                if 'DEST.COMPLEM' in df.columns:
                    df = df[~df['DEST.COMPLEM'].astype(str).isin(valores_remover)].copy()
            
            elif "3026-15" in filename:
                # Formatar coluna D como texto
                if len(df.columns) > 3:
                    coluna_d = df.columns[3]
                    df[coluna_d] = df[coluna_d].apply(
                        lambda x: str(int(x)) if pd.notna(x) and isinstance(x, (int, float)) else str(x) if pd.notna(x) else ''
                    )
                
                # Remover duplicados na coluna CONTRATO
                if 'CONTRATO' in df.columns:
                    df = df.drop_duplicates(subset=['CONTRATO'], keep='first').copy()
            
            # ========================================
            # FORMATAÇÃO DA COLUNA CONTRATO (todas)
            # ========================================
            if 'CONTRATO' in df.columns:
                df['CONTRATO'] = df['CONTRATO'].apply(
                    lambda x: str(int(x)) if pd.notna(x) and isinstance(x, (int, float)) else str(x) if pd.notna(x) else ''
                )
            
            arquivos_filtrados.append(df)
        
        # Verificar se há dados
        if not arquivos_filtrados:
            raise HTTPException(400, "Nenhum arquivo válido foi processado")
        
        total_linhas = sum(len(df) for df in arquivos_filtrados)
        if total_linhas == 0:
            raise HTTPException(400, "Nenhum dado encontrado após aplicar os filtros")
        
        # Consolidar
        df_consolidado = pd.concat(arquivos_filtrados, ignore_index=True)
        
        # Criar Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_consolidado.to_excel(writer, sheet_name='Dados Filtrados', index=False)
            
            # Aplicar formatação
            workbook = writer.book
            worksheet = writer.sheets['Dados Filtrados']
            
            # Formatar colunas de data
            from openpyxl.utils import get_column_letter
            for col_name in colunas_data:
                if col_name in df_consolidado.columns:
                    col_idx = df_consolidado.columns.get_loc(col_name) + 1
                    col_letter = get_column_letter(col_idx)
                    for row in range(2, len(df_consolidado) + 2):
                        worksheet[f"{col_letter}{row}"].number_format = 'DD/MM/YYYY'
            
            # Formatar coluna CONTRATO como texto
            if 'CONTRATO' in df_consolidado.columns:
                col_idx = df_consolidado.columns.get_loc('CONTRATO') + 1
                col_letter = get_column_letter(col_idx)
                for row in range(2, len(df_consolidado) + 2):
                    worksheet[f"{col_letter}{row}"].number_format = '@'
        
        output.seek(0)
        excel_data = output.read()
        
        # Nome do arquivo
        filtro_nome = filter_type.upper()
        banco_nome = "BEMGE" if bank_type == "bemge" else "MINAS_CAIXA"
        tipo_nome = f"_{file_type}" if file_type != "todos" else ""
        
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=3026{tipo_nome}_{banco_nome}_{filtro_nome}_FILTRADO.xlsx"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao processar: {e}")
        raise HTTPException(500, f"Erro ao processar: {str(e)}")
```

---

## ✅ CHECKLIST DE ALTERAÇÕES

### Geral (todos os arquivos)
- [ ] Aceitar novo parâmetro `file_type`
- [ ] Formatar coluna CONTRATO como texto
- [ ] Formatar colunas de data (DT.ASS., DT.EVENTO, DT.HAB., DT.PROC.HAB.) - apenas data
- [ ] Remover colunas AF, AG, AH

### 3026-11
- [ ] Formatar coluna D como texto
- [ ] Remover duplicados na coluna CONTRATO

### 3026-12
- [ ] Coluna B - Deletar tudo que não for 52101
- [ ] Formatar coluna D como texto
- [ ] Colunas AA e AB - deixar como número único (sem decimais)
- [ ] Remover colunas BT e BU
- [ ] Aplicar filtros de DEST.PAGAM e DEST.COMPLEM

### 3026-15
- [ ] Formatar coluna D como texto
- [ ] Remover duplicados na coluna CONTRATO

### MINAS CAIXA
- [ ] Corrigir erro "arquivo não encontrado"
- [ ] Adicionar logs de debug
- [ ] Verificar criação de pastas
- [ ] Verificar encoding de caminhos

---

**Data:** 10/12/2024
**Status:** Aguardando implementação no backend



