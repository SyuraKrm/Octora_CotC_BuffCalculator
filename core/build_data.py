import json
from collections import Counter
from pprint import pprint
from core.core import fetch_pages, load_items_from_files, parse_item, classify_unknown, scrape_character_list, fetch_page2
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

    MODE = "web"  # or "web"

    if MODE == "web":
        items = scrape_character_list()

    with open(OUTPUT_PATH_CHARACTERS, "w", encoding="utf-8") as f:
        json.dump(
            items,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"saved: {OUTPUT_PATH_CHARACTERS} ({len(items)} characters)")

    return items

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
                if not cap:
                    continue

                if cap not in datas[stack_group]:
                    datas[stack_group][cap] = {
                        "characters": set(),
                        "abilities": set(),
                    }

                datas[stack_group][cap]["characters"].add(character_id)
                datas[stack_group][cap]["abilities"].add(ability_name)

    for stackGroup in datas:
        for cap, v in datas[stackGroup].items():
            v["characters"] = sorted(v["characters"])
            v["abilities"] = sorted(v["abilities"])

    
    with open(OUTPUT_PATH_GROUPED_DATA, "w", encoding="utf-8") as f:
        json.dump(
            datas,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"saved: {OUTPUT_PATH_CHARACTERS} ({len(datas)} stack groups)")

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
    
# -----------------------------
# 直接実行された時だけ動く
# -----------------------------
if __name__ == "__main__":

    #abilities = build_abilities()
    abilities = []

    for i, ability in enumerate(abilities):

        print(f"--- ability:{i+1}----------------------")
        print(ability)

    characters = build_characters()
    #characters = [
    #    {
    #        "character_id": "584894",
    #        "character_name": "ヒカリ",
    #    },
    #    {
    #        "character_id": "684832",
    #        "character_name": "オズバルドEX",
    #    }
    #]

    #for i, chara in enumerate(characters):

    #    print(f"--- character:{i+1}----------------------")
    #    print(chara)

    #characters = load_characters()
    build_abilities_fromwiki(characters)

    build_datas_group_by_cap_group()

    #inspect_unknowns()