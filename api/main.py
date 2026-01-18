from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from core.build_data import load_abilities

class CalcInput(BaseModel):
    message: str

app = FastAPI()

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )

@app.post("/calculate")
def calculate(data: CalcInput):
    return {
        "received": data.message,
        "status": "ok"
    }
    #result = load_abilities(payload)
    #return result
