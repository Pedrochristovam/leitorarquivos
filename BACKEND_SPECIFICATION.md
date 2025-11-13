# 📋 ESPECIFICAÇÃO DO BACKEND - PROCESSAMENTO DE CONTRATOS 3026

## 🎯 VISÃO GERAL

O backend deve processar múltiplas planilhas Excel de contratos dos bancos BEMGE e MINAS CAIXA, aplicando filtros complexos e gerando planilhas consolidadas.

---

## 🔌 ENDPOINT PRINCIPAL

### `POST /processar_contratos/`

**Parâmetros:**
- `bank_type` (Form): `"bemge"` ou `"minas_caixa"`
- `files` (UploadFile[]): Múltiplos arquivos Excel (.xlsx)

**Resposta:**
- **Sucesso (200)**: Arquivo Excel consolidado (.xlsx)
- **Erro (400/500)**: JSON com `{"erro": "mensagem"}`

---

## 📊 PROCESSAMENTO POR TIPO DE ARQUIVO

### 1. Arquivos 3026-11 e 3026-15 (BEMGE e MINAS CAIXA)

**Processamento:**
1. Ler o arquivo Excel
2. Contar total de linhas (contratos)
3. Filtrar por ordem de contratos (remover duplicados)
4. Renomear arquivo: `"3026-XX - {BANCO} - {TOTAL} (CONTRATOS)"`

**Exemplo:** `"3026-11 - BEMGE - 150 (CONTRATOS)"`

---

### 2. Arquivo 3026-12 - NAUD (Não Auditado)

**Processamento:**
1. Filtrar coluna "AUD" ou "AUDITADO" = "NAUD"
2. Deletar todas as outras linhas
3. Salvar como: `"3026-12 - NAUD"`
4. Aplicar filtros:
   - **DESTINO DE PAGAMENTO** e **DESTINO DE COMPLEMENTO**
   - Remover linhas contendo: `"0x0"`, `"1x4"`, `"6x4"`, `"8x4"`
5. Contar contratos após filtros
6. Filtrar por coluna "CONTRATOS"
7. Renomear: `"3026-12 - {BANCO} - NAUD - {TOTAL} (CONTRATOS)"`

**Exemplo:** `"3026-12 - BEMGE - NAUD - 85 (CONTRATOS)"`

---

### 3. Arquivo 3026-12 - AUD (Auditado)

**Processamento:**
1. Filtrar coluna "AUD" ou "AUDITADO" = "AUD"
2. Deletar todas as outras linhas
3. Salvar como: `"3026-12 - AUD"`
4. Aplicar filtros:
   - **DESTINO DE PAGAMENTO** e **DESTINO DE COMPLEMENTO**
   - Remover linhas contendo: `"0x0"`, `"1x4"`, `"6x4"`, `"8x4"`
5. Contar contratos após filtros
6. Filtrar por coluna "CONTRATOS"
7. Renomear: `"3026-12 - {BANCO} - AUD - {TOTAL} (CONTRATOS)"`

**Exemplo:** `"3026-12 - BEMGE - AUD - 65 (CONTRATOS)"`

---

## 📁 ESTRUTURA DE PASTAS

O backend deve criar a seguinte estrutura:

```
arquivo_morto/
├── bemge/
│   ├── 3026-11 - BEMGE - 150 (CONTRATOS).xlsx
│   ├── 3026-12 - BEMGE - NAUD - 85 (CONTRATOS).xlsx
│   ├── 3026-12 - BEMGE - AUD - 65 (CONTRATOS).xlsx
│   └── 3026-15 - BEMGE - 200 (CONTRATOS).xlsx
├── minas_caixa/
│   ├── 3026-11 - MINAS CAIXA - 120 (CONTRATOS).xlsx
│   ├── 3026-12 - MINAS CAIXA - NAUD - 70 (CONTRATOS).xlsx
│   ├── 3026-12 - MINAS CAIXA - AUD - 50 (CONTRATOS).xlsx
│   └── 3026-15 - MINAS CAIXA - 180 (CONTRATOS).xlsx
└── 3026 - Filtragens/
    ├── bemge_movimentacao.xlsx
    └── minas_caixa_movimentacao.xlsx
```

---

## 🔍 FILTROS DE MOVIMENTAÇÃO

Após processar todos os arquivos, o sistema deve:

1. **Buscar contratos com movimentação** (identificar coluna de movimentação)
2. **Separar em novas planilhas** por banco
3. **Salvar na pasta "3026 - Filtragens"**

---

## 📊 PLANILHA CONSOLIDADA FINAL

A planilha consolidada deve conter:

### Aba 1: "Resumo Geral"
- Total de arquivos processados
- Total de contratos por banco
- Total de contratos auditados (AUD)
- Total de contratos não auditados (NAUD)
- Total de contratos repetidos
- Valores totais (se houver coluna de valores)
- Valores somados por categoria

### Aba 2: "Contratos Totais"
- Lista completa de todos os contratos
- Colunas: CONTRATO, BANCO, AUDITADO, REPETIDO, VALOR (se disponível)

### Aba 3: "Contratos Repetidos"
- Lista apenas dos contratos que aparecem mais de uma vez
- Colunas: CONTRATO, BANCO, QUANTIDADE, VALOR (se disponível)

### Aba 4: "Contratos por Banco"
- Separação por BEMGE e MINAS CAIXA
- Totais por banco

---

## 🐍 EXEMPLO DE CÓDIGO PYTHON

```python
import pandas as pd
import os
from pathlib import Path
from fastapi import UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
import io

def processar_contratos_3026(files: list[UploadFile], bank_type: str):
    """
    Processa múltiplos arquivos Excel de contratos 3026
    
    Args:
        files: Lista de arquivos Excel
        bank_type: 'bemge' ou 'minas_caixa'
    
    Returns:
        Arquivo Excel consolidado
    """
    
    # Criar estrutura de pastas
    base_path = Path("arquivo_morto")
    bank_path = base_path / bank_type
    filtragens_path = base_path / "3026 - Filtragens"
    
    bank_path.mkdir(parents=True, exist_ok=True)
    filtragens_path.mkdir(parents=True, exist_ok=True)
    
    # Processar cada arquivo
    arquivos_processados = []
    todos_contratos = []
    
    for file in files:
        # Ler arquivo
        df = pd.read_excel(io.BytesIO(await file.read()), engine='openpyxl')
        
        # Identificar tipo de arquivo pelo nome
        filename = file.filename
        
        if "3026-11" in filename or "3026-15" in filename:
            # Processar 3026-11 ou 3026-15
            df_processado = processar_3026_11_15(df, bank_type, filename)
            
        elif "3026-12" in filename:
            # Processar 3026-12 (AUD e NAUD)
            df_aud, df_naud = processar_3026_12(df, bank_type)
            arquivos_processados.extend([df_aud, df_naud])
            
        todos_contratos.append(df_processado)
    
    # Consolidar todos os contratos
    df_consolidado = pd.concat(todos_contratos, ignore_index=True)
    
    # Gerar estatísticas
    resumo = gerar_resumo(df_consolidado, bank_type)
    
    # Criar planilha Excel consolidada
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Aba 1: Resumo
        resumo.to_excel(writer, sheet_name='Resumo Geral', index=False)
        
        # Aba 2: Contratos Totais
        df_consolidado.to_excel(writer, sheet_name='Contratos Totais', index=False)
        
        # Aba 3: Contratos Repetidos
        df_repetidos = df_consolidado[df_consolidado.duplicated(subset=['CONTRATO'], keep=False)]
        df_repetidos.to_excel(writer, sheet_name='Contratos Repetidos', index=False)
        
        # Aba 4: Por Banco
        df_por_banco = df_consolidado.groupby('BANCO').agg({
            'CONTRATO': 'count',
            'VALOR': 'sum'  # Se houver coluna de valor
        }).reset_index()
        df_por_banco.to_excel(writer, sheet_name='Contratos por Banco', index=False)
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=3026_{bank_type.upper()}_CONSOLIDADO.xlsx"
        }
    )

def processar_3026_11_15(df: pd.DataFrame, bank: str, filename: str):
    """Processa arquivos 3026-11 e 3026-15"""
    # Contar linhas
    total = len(df)
    
    # Filtrar por ordem de contratos (remover duplicados)
    df_unique = df.drop_duplicates(subset=['CONTRATO'], keep='first')
    
    # Adicionar coluna de banco
    df_unique['BANCO'] = bank.upper()
    
    # Salvar arquivo processado
    numero = "11" if "3026-11" in filename else "15"
    nome_arquivo = f"3026-{numero} - {bank.upper()} - {len(df_unique)} (CONTRATOS).xlsx"
    
    caminho = Path("arquivo_morto") / bank / nome_arquivo
    df_unique.to_excel(caminho, index=False, engine='openpyxl')
    
    return df_unique

def processar_3026_12(df: pd.DataFrame, bank: str):
    """Processa arquivo 3026-12 (gera AUD e NAUD)"""
    # Normalizar coluna AUDITADO
    if 'AUD' in df.columns:
        df['AUDITADO'] = df['AUD']
    elif 'AUDITADO' not in df.columns:
        raise ValueError("Coluna AUD ou AUDITADO não encontrada")
    
    # Separar AUD e NAUD
    df_aud = df[df['AUDITADO'].astype(str).str.upper() == 'AUD'].copy()
    df_naud = df[df['AUDITADO'].astype(str).str.upper() == 'NAUD'].copy()
    
    # Processar cada um
    df_aud_processado = aplicar_filtros_3026_12(df_aud, bank, 'AUD')
    df_naud_processado = aplicar_filtros_3026_12(df_naud, bank, 'NAUD')
    
    return df_aud_processado, df_naud_processado

def aplicar_filtros_3026_12(df: pd.DataFrame, bank: str, tipo: str):
    """Aplica filtros específicos para 3026-12"""
    # Filtrar DESTINO DE PAGAMENTO e DESTINO DE COMPLEMENTO
    if 'DESTINO DE PAGAMENTO' in df.columns and 'DESTINO DE COMPLEMENTO' in df.columns:
        # Remover linhas com 0x0, 1x4, 6x4, 8x4
        valores_remover = ['0x0', '1x4', '6x4', '8x4']
        
        mask = ~(
            df['DESTINO DE PAGAMENTO'].astype(str).isin(valores_remover) |
            df['DESTINO DE COMPLEMENTO'].astype(str).isin(valores_remover)
        )
        df = df[mask].copy()
    
    # Filtrar por CONTRATOS (se necessário)
    if 'CONTRATOS' in df.columns:
        df = df[df['CONTRATOS'].notna()].copy()
    
    # Adicionar coluna de banco
    df['BANCO'] = bank.upper()
    df['TIPO_AUDITADO'] = tipo
    
    # Contar contratos
    total = len(df)
    
    # Salvar arquivo processado
    nome_arquivo = f"3026-12 - {bank.upper()} - {tipo} - {total} (CONTRATOS).xlsx"
    caminho = Path("arquivo_morto") / bank / nome_arquivo
    df.to_excel(caminho, index=False, engine='openpyxl')
    
    return df

def gerar_resumo(df: pd.DataFrame, bank: str):
    """Gera resumo consolidado"""
    resumo = pd.DataFrame({
        'Métrica': [
            'Total de Contratos',
            'Contratos Auditados (AUD)',
            'Contratos Não Auditados (NAUD)',
            'Contratos Repetidos',
            'Valor Total'  # Se houver coluna de valor
        ],
        'Valor': [
            len(df),
            len(df[df.get('AUDITADO', pd.Series()).astype(str).str.upper() == 'AUD']),
            len(df[df.get('AUDITADO', pd.Series()).astype(str).str.upper() == 'NAUD']),
            len(df[df.duplicated(subset=['CONTRATO'], keep=False)]),
            df.get('VALOR', pd.Series()).sum() if 'VALOR' in df.columns else 0
        ]
    })
    
    return resumo
```

---

## ✅ VALIDAÇÕES NECESSÁRIAS

1. ✅ Verificar se `bank_type` é "bemge" ou "minas_caixa"
2. ✅ Verificar se pelo menos um arquivo foi enviado
3. ✅ Verificar se os arquivos são Excel válidos (.xlsx)
4. ✅ Verificar se as colunas necessárias existem:
   - CONTRATO
   - AUD ou AUDITADO (para 3026-12)
   - DESTINO DE PAGAMENTO (para 3026-12)
   - DESTINO DE COMPLEMENTO (para 3026-12)

---

## 🚨 TRATAMENTO DE ERROS

- **400 Bad Request**: Dados inválidos (banco inválido, arquivos inválidos)
- **500 Internal Server Error**: Erro no processamento (com mensagem detalhada)

---

## 📝 NOTAS IMPORTANTES

1. O sistema deve processar **múltiplos arquivos** de uma vez
2. Cada arquivo deve ser processado conforme seu tipo (3026-11, 3026-12, 3026-15)
3. Todos os arquivos processados devem ser salvos na pasta correspondente
4. A planilha consolidada deve ser retornada como resposta
5. O sistema deve identificar automaticamente o tipo de arquivo pelo nome

---

**Data:** Hoje  
**Status:** Aguardando implementação no backend

