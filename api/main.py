from fastapi import FastAPI
from core.build_data import load_abilities

app = FastAPI()

@app.post("/calculate")
def calculate_api(payload: dict):
    result = load_abilities(payload)
    return result
