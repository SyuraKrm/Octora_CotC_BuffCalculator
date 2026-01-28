from fastapi import FastAPI, Request, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from core.build_data import load_characters, load_abilities, load_grouped_data
from core.load_def import SOURCE_RULES

import collections

class CalcInput(BaseModel):
    message: str

app = FastAPI()

# static ファイルを公開
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

abilities_master = load_abilities()
characters_master = load_characters()
grouped_data_master = load_grouped_data()

class CalculateRequest(BaseModel):
    selected_abilities: list[dict]
    presets: list[str] = []
    impact: str = "offense"

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )

@app.get("/characters")
def get_characters():

    # character_name → abilities
    abil_map = {}

    for group in abilities_master:
        for a in group:
            cid = a.get("character_id")
            if not cid:
                continue

            abil_map.setdefault(cid, []).append({
                "ability_name": a["ability_name"],
                "source_type": a["source_type"],
                "description": a.get("raw_text", [])[:20],
            })

    for c in characters_master:
        c["abilities"] = abil_map.get(c["character_id"], [])

    return {"characters": characters_master}


@app.get("/highlight-index")
def get_grouped_data():
    return grouped_data_master


@app.post("/calculate")
def calculate(req: CalculateRequest):
    """
    effect 正規化専用 API
    - 合算しない
    - 上限適用しない
    - フィルタしない
    """

    normalized_effects = []

    for sel in req.selected_abilities:
        for group in abilities_master:
            for abil in group:

                stack_group = SOURCE_RULES.get(
                    abil["source_type"], {}
                ).get("stack_group")

                if (
                    abil.get("character_id") == sel["character_id"]
                    and abil.get("ability_name") == sel["ability_name"]
                ):
                    for e in abil.get("effects", []):
                        normalized_effects.append({
                            # --- ability 粒度 ---
                            "character_id": abil["character_id"],
                            "character_name": abil["character_name"],
                            "ability_name": abil["ability_name"],
                            "source_type": abil["source_type"],
                            "target_source_type": e.get("target_source_type"),

                            # --- effect 本体 ---
                            "role": e.get("role"),
                            "category": e.get("category"),
                            "sub_category": e.get("sub_category"),

                            "unit": e.get("unit"),
                            "value": e.get("value"),
                            "tag": e.get("tag"),

                            "stack_group": stack_group,
                            "cap_group": e.get("cap_group"),

                            "scopes": e.get("scopes", []),
                            "condition": e.get("condition"),
                        })

    #breakpoint()

    return {
        "effects": normalized_effects
    }

