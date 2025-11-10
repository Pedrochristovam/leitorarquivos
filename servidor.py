from fastapi import FastAPI, UploadFile, Form, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
from processar_contratos import processar_excel

app = FastAPI()

# Configura pastas
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

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

