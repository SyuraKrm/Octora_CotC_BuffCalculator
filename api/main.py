from fastapi import FastAPI, Request, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from core.build_data import load_characters, load_abilities
from core.ui_common import aggregate, get_base_cap, apply_cap, build_cap_table, apply_presets, filter_by_impact
import collections

class CalcInput(BaseModel):
    message: str

app = FastAPI()

# static ファイルを公開
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

abilities_master = load_abilities()

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
    characters = load_characters()

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
                "description": a.get("raw_text", [])[:2],
            })

    for c in characters:
        c["abilities"] = abil_map.get(c["character_id"], [])

    return {"characters": characters}


@app.post("/calculate")
def calculate(req: CalculateRequest):
    # ① 選択アビリティ → effects 展開
    all_effects = []

    for sel in req.selected_abilities:
        for group in abilities_master:
            for abil in group:
                if (
                    abil["character_id"] == sel["character"]
                    and abil["ability_name"] == sel["ability_name"]
                ):
                    all_effects.extend(abil["effects"])

    #breakpoint()

    # ② 上限突破テーブル
    cap_table = build_cap_table(all_effects)

    # ③ 評価軸フィルタ
    filtered = apply_presets(all_effects, req.presets)

    # ④ offense / defense
    filtered = filter_by_impact(filtered, req.impact)

    # ⑤ 集計（render_table の中身）
    summary = collections.defaultdict(int)

    for e in filtered:
        key = (
            e["role"],
            e["category"],
            e.get("sub_category"),
            e.get("tag"),
            e.get("cap_group")
        )
        aggregate(summary, key, e)

    rows = []
    for (role, cat, sub, tag, cap_group), value in summary.items():
        base_cap = get_base_cap(cat) or 999999
        ex_cap = cap_table.get(cap_group, 0)

        rows.append({
            "role": role,
            "category": cat,
            "sub_category": sub,
            "tag": tag,
            "total": value,
            "cap": max(base_cap, ex_cap),
            "effective": apply_cap(value, base_cap, ex_cap)
        })

    return {
        "rows": rows
    }

