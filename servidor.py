from typing import List, Optional

from fastapi import FastAPI, UploadFile, Form, Request, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import io
import os
import pandas as pd

from processar_contratos import (
    processar_excel,
    filtrar_planilha_contratos,
    concatenar_dataframes,
    processar_3026_12_com_abas,
)

app = FastAPI()

# Configura pastas
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


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
    habitacional_filter_enabled: str = Form("false"),
    habitacional_reference_date: Optional[str] = Form(None),
    habitacional_months_back: str = Form("2"),
    minas_caixa_3026_15_filter_enabled: str = Form("false"),
    minas_caixa_3026_15_reference_date: Optional[str] = Form(None),
    minas_caixa_3026_15_months_back: str = Form("2"),
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
    habitacional_filter_flag = str(habitacional_filter_enabled).lower() == "true"
    minas_caixa_3026_15_filter_flag = str(minas_caixa_3026_15_filter_enabled).lower() == "true"

    try:
        months_back_int = max(int(months_back), 0)
        habitacional_months_back_int = max(int(habitacional_months_back), 0)
        minas_caixa_3026_15_months_back_int = max(int(minas_caixa_3026_15_months_back), 0)
    except ValueError:
        raise HTTPException(status_code=400, detail="months_back deve ser um número inteiro válido")

    reference_date_value = (
        reference_date.strip() if reference_date and reference_date.strip() else None
    )
    habitacional_reference_date_value = (
        habitacional_reference_date.strip() if habitacional_reference_date and habitacional_reference_date.strip() else None
    )
    minas_caixa_3026_15_reference_date_value = (
        minas_caixa_3026_15_reference_date.strip() if minas_caixa_3026_15_reference_date and minas_caixa_3026_15_reference_date.strip() else None
    )

    # Verificar se há arquivo 3026-12 para processar com abas separadas (BEMGE e MINAS CAIXA)
    has_3026_12 = any("3026-12" in f.filename.upper() for f in files)
    is_bemge = bank_lower == "bemge"
    is_minas_caixa = bank_lower == "minas_caixa"
    
    # Se tiver 3026-12, processar com abas separadas (BEMGE e MINAS CAIXA)
    if has_3026_12:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            dataframes_aud = []
            dataframes_naud = []
            dataframes_outros = []
            
            for upload_file in files:
                try:
                    contents = await upload_file.read()
                    filename_upper = upload_file.filename.upper()
                    
                    if "3026-12" in filename_upper:
                        # Processar 3026-12 com abas separadas (BEMGE e MINAS CAIXA)
                        abas = processar_3026_12_com_abas(
                            contents, 
                            bank_lower, 
                            filter_lower,
                            period_filter_flag,
                            reference_date_value,
                            months_back_int
                        )
                        
                        # Adicionar às listas conforme filtro selecionado
                        if filter_lower == "auditado" or filter_lower == "todos":
                            if not abas['aud'].empty:
                                dataframes_aud.append(abas['aud'])
                        
                        if filter_lower == "nauditado" or filter_lower == "todos":
                            if not abas['naud'].empty:
                                dataframes_naud.append(abas['naud'])
                    else:
                        # Processar outros arquivos normalmente
                        df_filtrado = filtrar_planilha_contratos(
                            contents,
                            filter_lower,
                            period_filter_flag,
                            reference_date_value,
                            months_back_int,
                            upload_file.filename,
                            bank_lower,
                            habitacional_filter_flag,
                            habitacional_reference_date_value,
                            habitacional_months_back_int,
                            minas_caixa_3026_15_filter_flag,
                            minas_caixa_3026_15_reference_date_value,
                            minas_caixa_3026_15_months_back_int,
                        )
                        if not df_filtrado.empty:
                            dataframes_outros.append(df_filtrado)
                except Exception as exc:
                    raise HTTPException(
                        status_code=400, detail=f"Falha ao ler '{upload_file.filename}': {str(exc)}"
                    )
                finally:
                    await upload_file.close()
            
            # Criar abas separadas para AUD e NAUD (3026-12)
            # Nomes padronizados conforme banco
            if dataframes_aud:
                df_aud_consolidado = concatenar_dataframes(dataframes_aud)
                if not df_aud_consolidado.empty:
                    if is_minas_caixa:
                        df_aud_consolidado.to_excel(writer, sheet_name="Minas Caixa 3026-12-Homol. Auditado", index=False)
                    else:
                        df_aud_consolidado.to_excel(writer, sheet_name="AUD - Auditados", index=False)
            
            if dataframes_naud:
                df_naud_consolidado = concatenar_dataframes(dataframes_naud)
                if not df_naud_consolidado.empty:
                    if is_minas_caixa:
                        df_naud_consolidado.to_excel(writer, sheet_name="Minas Caixa 3026-12-Homol.Não Auditado", index=False)
                    else:
                        df_naud_consolidado.to_excel(writer, sheet_name="NAUD - Não Auditados", index=False)
            
            # Adicionar outros arquivos processados
            if dataframes_outros:
                df_outros_consolidado = concatenar_dataframes(dataframes_outros)
                if not df_outros_consolidado.empty:
                    df_outros_consolidado.to_excel(writer, sheet_name="Dados Filtrados", index=False)
            
            # Se não houver nenhum dado, criar aba vazia
            if not dataframes_aud and not dataframes_naud and not dataframes_outros:
                pd.DataFrame().to_excel(writer, sheet_name="Dados Filtrados", index=False)
        
        output.seek(0)
        
        banco_nome = "BEMGE" if bank_lower == "bemge" else "MINAS_CAIXA"
        filtro_nome = filter_lower.upper()
        filename = f"3026_{banco_nome}_{filtro_nome}_FILTRADO.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    
    # Processamento normal (sem abas separadas)
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
                bank_lower,
                habitacional_filter_flag,
                habitacional_reference_date_value,
                habitacional_months_back_int,
                minas_caixa_3026_15_filter_flag,
                minas_caixa_3026_15_reference_date_value,
                minas_caixa_3026_15_months_back_int,
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

    # Nomes padronizados para MINAS CAIXA
    if bank_lower == "minas_caixa":
        # Identificar tipo de arquivo para nome correto
        filename_parts = []
        for f in files:
            fname_upper = f.filename.upper()
            if "3026-11" in fname_upper:
                filename_parts.append("Minas Caixa 3026-11-Habil.Não Homol")
            elif "3026-12" in fname_upper:
                if filter_lower == "auditado":
                    filename_parts.append("Minas Caixa 3026-12-Homol. Auditado")
                elif filter_lower == "nauditado":
                    filename_parts.append("Minas Caixa 3026-12-Homol.Não Auditado")
                else:
                    filename_parts.append("Minas Caixa 3026-12-Homol")
            elif "3026-15" in fname_upper:
                filename_parts.append("Minas Caixa 3026-15-Homol.Neg.Cob")
        
        if filename_parts:
            filename = filename_parts[0] + ".xlsx"
        else:
            banco_nome = "MINAS_CAIXA"
            filtro_nome = filter_lower.upper()
            filename = f"3026_{banco_nome}_{filtro_nome}_FILTRADO.xlsx"
    else:
        banco_nome = "BEMGE"
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
        f.write(await file.read())

    # Processa o Excel
    resultado, erro = processar_excel(caminho_temp, tipo)

    if erro:
        return {"erro": erro}

    # Retorna o arquivo Excel processado pro download
    return FileResponse(resultado, filename=os.path.basename(resultado))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8010)

