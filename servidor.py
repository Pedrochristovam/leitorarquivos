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
    files: List[UploadFile] = Form(...),
):
    bank_lower = bank_type.lower()
    if bank_lower not in {"bemge", "minas_caixa"}:
        raise HTTPException(400, "bank_type deve ser 'bemge' ou 'minas_caixa'")

    filter_lower = filter_type.lower()
    if filter_lower not in {"auditado", "nauditado", "todos"}:
        raise HTTPException(400, "filter_type deve ser 'auditado', 'nauditado' ou 'todos'")

    if not files:
        raise HTTPException(400, "Pelo menos um arquivo deve ser enviado")

    period_filter_flag = str(period_filter_enabled).lower() == "true"

    try:
        months_back_int = max(int(months_back), 0)
    except ValueError:
        raise HTTPException(400, "months_back deve ser um número inteiro válido")

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
                400, f"Falha ao ler '{upload_file.filename}': {str(exc)}"
            )
        finally:
            await upload_file.close()

    df_consolidado = concatenar_dataframes(dataframes)

    if df_consolidado.empty:
        raise HTTPException(400, "Nenhum dado encontrado após aplicar os filtros")

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

