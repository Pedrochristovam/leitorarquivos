# 🚀 PROMPT FINAL PARA O BACKEND - COM ESTRUTURA REAL DOS DADOS

## 📊 ESTRUTURA REAL DOS DADOS IDENTIFICADA

Com base nos dados reais fornecidos:

### **Coluna de Auditado:**
- **Nome:** `AUDITADO`
- **Valor para Auditado:** `AUDI` (não "AUD"!)
- **Valor para Não Auditado:** `NAUD`

### **Colunas de Destino:**
- **Nome:** `DEST.PAGAM` (com ponto, não espaços)
- **Nome:** `DEST.COMPLEM` (com ponto, não espaços)

### **Coluna de Contrato:**
- **Nome:** `CONTRATO`

### **Total de Colunas:**
- Aproximadamente **60+ colunas** que devem ser **TODAS MANTIDAS**

---

## 🔌 ENDPOINT A CRIAR

### `POST /processar_contratos/`

**Parâmetros:**
- `bank_type` (Form): "bemge" ou "minas_caixa"
- `filter_type` (Form): "auditado", "nauditado" ou "todos"
- `files` (List[UploadFile]): Múltiplos arquivos Excel

**Resposta:**
- Arquivo Excel (.xlsx) com dados filtrados (mantendo todas as colunas)

---

## 🐍 CÓDIGO CORRETO BASEADO NOS DADOS REAIS

```python
from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from typing import List

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
        arquivos_filtrados = []
        
        # Processar cada arquivo
        for file in files:
            # Ler arquivo
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
            
            # ⚠️ IMPORTANTE: MANTER TODAS AS COLUNAS ORIGINAIS
            # Não remover nenhuma coluna! (são 60+ colunas)
            
            # Aplicar filtro de auditado/não auditado (apenas nas linhas)
            if filter_type == "auditado":
                if 'AUDITADO' in df.columns:
                    df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
                    # CORRETO: valor real é "AUDI" (não "AUD")
                    df = df[df['AUDITADO'] == 'AUDI'].copy()
            
            elif filter_type == "nauditado":
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
                
                # CORRETO: nomes reais são "DEST.PAGAM" e "DEST.COMPLEM" (com ponto)
                if 'DEST.PAGAM' in df.columns:
                    df = df[~df['DEST.PAGAM'].astype(str).isin(valores_remover)].copy()
                
                if 'DEST.COMPLEM' in df.columns:
                    df = df[~df['DEST.COMPLEM'].astype(str).isin(valores_remover)].copy()
                
                # Filtrar por CONTRATOS (se a coluna existir)
                if 'CONTRATOS' in df.columns:
                    df = df[df['CONTRATOS'].notna()].copy()
            
            # Adicionar à lista (mantendo todas as 60+ colunas originais)
            arquivos_filtrados.append(df)
        
        # Verificar se há dados
        total_linhas = sum(len(df) for df in arquivos_filtrados)
        if total_linhas == 0:
            raise HTTPException(400, "Nenhum dado encontrado após aplicar os filtros")
        
        # Consolidar todos os arquivos (mantendo todas as colunas)
        df_consolidado = pd.concat(arquivos_filtrados, ignore_index=True)
        
        # Criar arquivo Excel
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Uma única aba com todos os dados filtrados
            # MANTER TODAS AS 60+ COLUNAS ORIGINAIS
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

## ✅ PONTOS CRÍTICOS BASEADOS NOS DADOS REAIS

1. **Valor de Auditado:** `AUDI` (não "AUD" ou "AUDI" - apenas "AUDI")
2. **Colunas de Destino:** `DEST.PAGAM` e `DEST.COMPLEM` (com ponto, não espaços)
3. **Muitas colunas:** Manter todas as 60+ colunas originais
4. **Estrutura:** Não modificar estrutura, apenas filtrar linhas

---

## 📝 EXEMPLO COM DADOS REAIS

**Arquivo Original:**
```
MATR.AGENTE | AGENTE CESSIONARIO | ... | CONTRATO | ... | AUDITADO | ... | DEST.PAGAM | DEST.COMPLEM | ...
43026       | 43026              | ... | 3870010300013 | ... | AUDI     | ... | 1          | 0            | ...
```

**Após filtro "auditado":**
```
MATR.AGENTE | AGENTE CESSIONARIO | ... | CONTRATO | ... | AUDITADO | ... | DEST.PAGAM | DEST.COMPLEM | ...
43026       | 43026              | ... | 3870010300013 | ... | AUDI     | ... | 1          | 0            | ...
```

**Todas as 60+ colunas são mantidas!**

---

## 🎯 RESUMO

O backend deve:
1. ✅ Processar múltiplos arquivos
2. ✅ Filtrar por `AUDITADO == "AUDI"` (auditado) ou `AUDITADO == "NAUD"` (não auditado)
3. ✅ Usar colunas `DEST.PAGAM` e `DEST.COMPLEM` (com ponto)
4. ✅ **MANTER TODAS AS 60+ COLUNAS ORIGINAIS**
5. ✅ Retornar planilha Excel com dados filtrados

**Por favor, implemente seguindo exatamente essas especificações baseadas nos dados reais.**

