import json
from collections import Counter
from core import fetch_pages, load_items_from_files, parse_item, classify_unknown
from load_def import UNKNOWN_PATTERNS

OUTPUT_PATH = "../data/abilities.json"

def build_abilities():

    MODE = "web"  # or "web"

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

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(
            results,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"saved: {OUTPUT_PATH} ({len(results)} abilities)")

    return results

def load_abilities():
    with open(OUTPUT_PATH, encoding="utf-8") as f:
        return json.load(f)

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

    abilities = build_abilities()

    for i, ability in enumerate(abilities):

        print(f"--- ability:{i+1}----------------------")
        print(ability)

    #inspect_unknowns()