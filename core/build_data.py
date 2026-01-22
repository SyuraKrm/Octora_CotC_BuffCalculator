import json
from collections import Counter
from pprint import pprint
from core.core import fetch_pages, load_items_from_files, parse_item, classify_unknown, scrape_character_list, fetch_page2
from core.load_def import UNKNOWN_PATTERNS

OUTPUT_PATH_ABILITIES = "data/abilities.json"
OUTPUT_PATH_CHARACTERS = "data/characters.json"

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
        print(f"scraping character:{character["character_name"]} page_id:{character["character_id"]}")
        items = fetch_page2(character["character_id"])
        results.append(items)
        
    with open(OUTPUT_PATH_ABILITIES, "w", encoding="utf-8") as f:
        json.dump(
            results,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"saved: {OUTPUT_PATH_ABILITIES} ({len(results)} abilities)")

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
        print(f"----type:{unknown_pat["type"]}------------")
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

    #characters = build_characters()
    characters = [
        {
            "character_id": "733055",
            "character_name": "アラウネEX2",
        },
        {
            "character_id": "377291",
            "character_name": "サイラス",
        }
    ]

    for i, chara in enumerate(characters):

        print(f"--- character:{i+1}----------------------")
        print(chara)

    characters = load_characters()
    build_abilities_fromwiki(characters)

    #inspect_unknowns()