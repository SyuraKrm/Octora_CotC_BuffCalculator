import json
from collections import Counter
from pprint import pprint
from core.core import (
    fetch_pages,
    load_items_from_files,
    parse_item,
    classify_unknown,
    scrape_character_list,
    scrape_latest_characters,
    fetch_page2,
)
from core.load_def import UNKNOWN_PATTERNS, SOURCE_RULES

OUTPUT_PATH_ABILITIES = "data/abilities.json"
OUTPUT_PATH_CHARACTERS = "data/characters.json"
OUTPUT_PATH_GROUPED_DATA = "data/grouped_data.json"

# アビリティ一覧のスクレイピング
def build_abilities():

    MODE = "web"  # or "file"

    if MODE == "web":
        items = fetch_pages()
    elif MODE == "file":
        items = load_items_from_files(119)

    results = []

    for i, item in enumerate(items):
        result = parse_item(item)
        result["character"] = item["character"]
        result["source_type"] = item["source_type"]
        result["ability_name"] = item["ability_name"]

        results.append(result)

    with open(OUTPUT_PATH_ABILITIES, "w", encoding="utf-8") as f:
        json.dump(
            results,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"saved: {OUTPUT_PATH_ABILITIES} ({len(results)} abilities)")

    return results

# ファイルからのキャラクター一覧取得
def load_characters():
    with open(OUTPUT_PATH_CHARACTERS, encoding="utf-8") as f:
        return json.load(f)

# ファイルからのアビリティ一覧取得
def load_abilities():
    with open(OUTPUT_PATH_ABILITIES, encoding="utf-8") as f:
        return json.load(f)

# ファイルからのアビリティ一覧取得
def load_grouped_data():
    with open(OUTPUT_PATH_GROUPED_DATA, encoding="utf-8") as f:
        return json.load(f)

# キャラクター一覧のスクレイピング
def build_characters():

    items = scrape_character_list()
    latest_items = scrape_latest_characters() or []

    list_ids = {c["character_id"] for c in items}
    latest_only_items = [
        c for c in latest_items
        if c["character_id"] not in list_ids
    ]
    if latest_only_items:
        print(
            "[characters] prepend latest-only ids: "
            f"{[c['character_id'] for c in latest_only_items]}"
        )
        items = latest_only_items + items

    file = load_characters()

    existing_ids = {c["character_id"] for c in file}
    scraped_ids  = {c["character_id"] for c in items}

    if not scraped_ids.issuperset(existing_ids):
        if latest_only_items:
            scraped_by_id = {c["character_id"]: c for c in items}
            missing_items = [
                c for c in file
                if c["character_id"] not in scraped_ids
            ]
            print(
                "[characters] keep existing missing ids: "
                f"{[c['character_id'] for c in missing_items]}"
            )
            new_items = [
                c for c in items
                if c["character_id"] not in existing_ids
            ]
            items = new_items + [
                scraped_by_id.get(c["character_id"], c)
                for c in file
            ]
        else:
            print("skip: characters missing")
            return file

    with open(OUTPUT_PATH_CHARACTERS, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"saved: {OUTPUT_PATH_CHARACTERS} ({len(items)} characters)")
    return items


def detect_new_character_ids():
    """
    一覧ページ + 最新ページからID取得し、
    既存JSONとの差分を返す
    """
    existing = load_characters()
    existing_ids = {c["character_id"] for c in existing}

    list_items = scrape_character_list()
    list_ids = {c["character_id"] for c in list_items}

    latest_items = scrape_latest_characters()
    latest_ids = {c["character_id"] for c in latest_items}

    unknown_ids = (list_ids | latest_ids) - existing_ids
    print(f"[detect] unknown_ids={sorted(unknown_ids)}")
    return unknown_ids

# アビリティ一覧のスクレイピング
def build_abilities_fromwiki(characters):
    results = []

    for character in characters:
        print(f"scraping character:{character['character_name']} page_id:{character['character_id']}")
        items = fetch_page2(character["character_id"], character['character_name'])
        results.append(items)
        
    with open(OUTPUT_PATH_ABILITIES, "w", encoding="utf-8") as f:
        json.dump(
            results,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"saved: {OUTPUT_PATH_ABILITIES} ({len(results)} abilities)")

# アビリティ／キャラクターを cap_group 単位でまとめたデータの生成
def build_datas_group_by_cap_group():
    datas = {}

    for type in SOURCE_RULES:
        datas[SOURCE_RULES.get(type).get("stack_group")] = {}

    abilities_master = load_abilities()

    for group in abilities_master:
        for a in group:
            ability_name = a["ability_name"]
            character_id = a["character_id"]
            stack_group = SOURCE_RULES.get(
                    a["source_type"], {}
                ).get("stack_group")
            for effect in a["effects"]:
                cap = effect.get("cap_group")
                category = effect.get("category")
                if not cap:
                    continue

                if not category:
                    continue

                key = ','.join([category, cap])

                if key not in datas[stack_group]:
                    datas[stack_group][key] = {
                        "characters": set(),
                        "abilities": set(),
                        "scope_groups": {
                            "ex_single": {
                                "characters": set(),
                                "abilities": set(),
                            },
                        },
                    }

                datas[stack_group][key]["characters"].add(character_id)
                datas[stack_group][key]["abilities"].add(ability_name)

                scopes = set(effect.get("scopes") or [])
                if scopes and scopes not in ({"self"}, {"enemy_single"}):
                    ex_single = datas[stack_group][key]["scope_groups"]["ex_single"]
                    ex_single["characters"].add(character_id)
                    ex_single["abilities"].add(ability_name)

    for stackGroup in datas:
        for key, v in datas[stackGroup].items():
            v["characters"] = sorted(v["characters"])
            v["abilities"] = sorted(v["abilities"])
            for scope_group in v["scope_groups"].values():
                scope_group["characters"] = sorted(scope_group["characters"])
                scope_group["abilities"] = sorted(scope_group["abilities"])

    
    with open(OUTPUT_PATH_GROUPED_DATA, "w", encoding="utf-8") as f:
        json.dump(
            datas,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"saved: {OUTPUT_PATH_GROUPED_DATA} ({len(datas)} stack groups)")

    return datas


#Unknown精査用関数
def inspect_unknowns():

    unknown_counter = Counter()

    abilities = load_abilities()

    for i, ability in enumerate(abilities):

        print(f"--- ability:{i+1}----------------------")
        print(ability)

        for u in ability["unknown"]:
            unknown_counter[u] += 1

    for unknown_pat in UNKNOWN_PATTERNS:
        print()
        print()
        print(f"------------------------------------------")
        print(f"----type:{unknown_pat['type']}------------")
        print(f"------------------------------------------")
        for k, v in unknown_counter.most_common():
            if classify_unknown(k) == unknown_pat["type"]:
                print(v, k)
    

def build_data_main(mode="ALL"):
    scrapeCharacters = False
    scrapeAbilities = False
    scrapeAbilitiesForPartialChara = False
    buildDataGroups = False

    if mode == "ALL":
        scrapeCharacters = True
        scrapeAbilities = True
        buildDataGroups = True
    elif mode == "CHARA":
        scrapeCharacters = True
    elif mode == "ABILITY":
        scrapeAbilities = True
        buildDataGroups = True
    elif mode == "PARTIAL":
        scrapeAbilitiesForPartialChara = True
        scrapeAbilities = True
    elif mode == "GROUP_DATA":
        buildDataGroups = True

    characters = []

    if scrapeCharacters:
        characters = build_characters()
    elif scrapeAbilitiesForPartialChara:
        characters = [
            {
                "character_id": "763254",
                "character_name": "七英雄ロックブーケ",
            },
            {
                "character_id": "745083",
                "character_name": "ヨミ",
            },
            {
                "character_id": "733055",
                "character_name": "アラウネEx2",
            },
        ]
    else:
        characters = load_characters()

    if scrapeAbilities:
        build_abilities_fromwiki(characters)
    
    if buildDataGroups:
        build_datas_group_by_cap_group()    


# -----------------------------
# 直接実行された時だけ動く
# -----------------------------
if __name__ == "__main__":

    #detect_new_character_ids()
    #build_data_main("CHARA")

    build_data_main("ABILITY")
    #build_data_main("PARTIAL")
    #build_data_main("GROUP_DATA")

    #inspect_unknowns()
