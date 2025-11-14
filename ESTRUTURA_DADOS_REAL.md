# 📊 ESTRUTURA REAL DOS DADOS

## 🔍 COLUNAS IDENTIFICADAS

### Coluna de Auditado:
- **Nome da coluna:** `AUDITADO`
- **Valores possíveis:** `AUDI` (Auditado) e provavelmente `NAUD` (Não Auditado)

### Coluna de Contrato:
- **Nome da coluna:** `CONTRATO`

### Colunas de Destino:
- **Nome:** `DEST.PAGAM` (Destino Pagamento)
- **Nome:** `DEST.COMPLEM` (Destino Complemento)

### Todas as Colunas (manter todas):
```
MATR.AGENTE
AGENTE CESSIONARIO
AGENTE CEDENTE
CONTRATO
HIPOTECA
NOME
CPF
DT.ASS.
END.IMOVEL
COD.MUNICIPIO
MUNICIPIO
OR
IM
TX.JUR.CONTR.
TX.JUR.EVENTO
TX.JUR.MP 1520
EVENTO
DT.EVENTO
DT.HAB.
VAF1 AGENTE
VAF2 AGENTE
VAF3 AGENTE
VAF1 SIFCVS
VAF2 SIFCVS
DT.BASE
DT.TERM.ANALISE
DEST.PAGAM
DEST.COMPLEM
SLD.VENCIDO
SLD.VINCENDO
SLD.TOTAL
MANIFESTACAO
DT.MANIFESTACAO
AUDITADO
COD GIFUS ANALISE
DT.POS.NOVACAO
PERC.FCVS
DT.PROC.HAB
JUROS 01/01/1997
STATUS RECURSO
DATA STATUS
ANUENCIA
VL.PERDA JUROS
SITUACAO ANALISE
INDVAF3TR7
INDVAF4TR7
DT.ULT.HOMOLOGACAO
DT.ULT.AUDITORIA
DT.ULT.NEGOCIACAO
Val.DED1 até Val.DED20 (20 colunas de deduções)
```

---

## ✅ AJUSTES NECESSÁRIOS NO BACKEND

### 1. FILTRO DE AUDITADO

**Valor correto:** `AUDI` (não "AUD")

```python
if filter_type == "auditado":
    if 'AUDITADO' in df.columns:
        df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
        df = df[df['AUDITADO'] == 'AUDI'].copy()  # CORRIGIDO: usar 'AUDI'

elif filter_type == "nauditado":
    if 'AUDITADO' in df.columns:
        df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
        df = df[df['AUDITADO'] == 'NAUD'].copy()
```

### 2. COLUNAS DE DESTINO

**Nomes corretos:** `DEST.PAGAM` e `DEST.COMPLEM` (não "DESTINO DE PAGAMENTO")

```python
# Para arquivo 3026-12
valores_remover = ['0x0', '1x4', '6x4', '8x4']

if 'DEST.PAGAM' in df.columns:  # CORRIGIDO
    df = df[~df['DEST.PAGAM'].astype(str).isin(valores_remover)].copy()

if 'DEST.COMPLEM' in df.columns:  # CORRIGIDO
    df = df[~df['DEST.COMPLEM'].astype(str).isin(valores_remover)].copy()
```

### 3. MANTER TODAS AS COLUNAS

**IMPORTANTE:** Não remover nenhuma coluna! Manter todas as 60+ colunas originais.

---

## 🐍 CÓDIGO CORRIGIDO PARA O BACKEND

```python
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
        
        for file in files:
            # Ler arquivo
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
            
            # MANTER TODAS AS COLUNAS ORIGINAIS - não remover nenhuma!
            
            # Aplicar filtro de auditado/não auditado
            if filter_type == "auditado":
                if 'AUDITADO' in df.columns:
                    df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
                    # CORRIGIDO: usar 'AUDI' (não 'AUD')
                    df = df[df['AUDITADO'] == 'AUDI'].copy()
            
            elif filter_type == "nauditado":
                if 'AUDITADO' in df.columns:
                    df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
                    df = df[df['AUDITADO'] == 'NAUD'].copy()
            
            # Se filter_type == "todos", não filtrar
            
            # Processamento específico por tipo de arquivo
            filename = file.filename.upper()
            
            if "3026-11" in filename or "3026-15" in filename:
                # Remover duplicados na coluna CONTRATO
                if 'CONTRATO' in df.columns:
                    df = df.drop_duplicates(subset=['CONTRATO'], keep='first').copy()
            
            elif "3026-12" in filename:
                # Aplicar filtros de DEST.PAGAM e DEST.COMPLEM
                valores_remover = ['0x0', '1x4', '6x4', '8x4']
                
                # CORRIGIDO: usar 'DEST.PAGAM' (não 'DESTINO DE PAGAMENTO')
                if 'DEST.PAGAM' in df.columns:
                    df = df[~df['DEST.PAGAM'].astype(str).isin(valores_remover)].copy()
                
                # CORRIGIDO: usar 'DEST.COMPLEM' (não 'DESTINO DE COMPLEMENTO')
                if 'DEST.COMPLEM' in df.columns:
                    df = df[~df['DEST.COMPLEM'].astype(str).isin(valores_remover)].copy()
                
                # Filtrar por CONTRATOS (se existir)
                if 'CONTRATOS' in df.columns:
                    df = df[df['CONTRATOS'].notna()].copy()
            
            arquivos_filtrados.append(df)
        
        # Verificar se há dados
        total_linhas = sum(len(df) for df in arquivos_filtrados)
        if total_linhas == 0:
            raise HTTPException(400, "Nenhum dado encontrado após aplicar os filtros")
        
        # Consolidar mantendo todas as colunas
        df_consolidado = pd.concat(arquivos_filtrados, ignore_index=True)
        
        # Criar arquivo Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_consolidado.to_excel(writer, sheet_name='Dados Filtrados', index=False)
        
        output.seek(0)
        excel_data = output.read()
        output.close()
        
        # Retornar
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

## 🔍 PONTOS IMPORTANTES IDENTIFICADOS

1. **Valor de Auditado:** `AUDI` (não "AUD")
2. **Colunas de Destino:** `DEST.PAGAM` e `DEST.COMPLEM` (com ponto, não espaços)
3. **Muitas colunas:** Manter todas as 60+ colunas originais
4. **Estrutura complexa:** Não modificar a estrutura, apenas filtrar linhas

---

**Com essas informações, o backend pode processar corretamente os dados reais!**


