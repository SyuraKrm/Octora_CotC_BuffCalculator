import requests
import re
import time
from bs4 import BeautifulSoup
from collections import Counter
from .load_def import BASE_URL, EFFECT_PATTERNS, CONDITION_PATTERNS, TAG_MAP, UNKNOWN_PATTERNS


def match_patterns(line, patterns, target_list):
    for pattern, label in patterns:
        m = re.search(pattern, line)
        if m:
            data = {"type": label}
            if "value" in m.groupdict():
                data["value"] = int(m.group("value"))
            target_list.append(data)
            return True
    return False

def match_conditions(line, conditions):
    for pattern in CONDITION_PATTERNS:
        if re.search(pattern, line):
            conditions.append(line.replace('：', ''))
            return True
    return False

def parse_ability(lines):
    effects = []
    conditions = []
    unknown = []
    description = []

    for line in lines:
        description.append(line)
        if match_effects(line, effects):
            continue
        if match_conditions(line, conditions):
            continue
        unknown.append(line)

    return {
        "character": None,
        "source_type": "battle",
        "ability_name": None,
        "effects": effects,
        "conditions": conditions,
        "unknown": unknown,
        "description": description,
    }

def match_effects(line, effects):
    matched = False

    for effect_def in EFFECT_PATTERNS:
        for pattern in effect_def["patterns"]:
            m = re.search(pattern, line)
            if not m:
                continue

            # --- 共通部分 ---
            value = int(m.group("value")) if "value" in m.groupdict() else None

            # --- tags 抽出 ---
            tags = []
            raw_tags = []

            if "tag" in m.groupdict() and m.group("tag"):
                raw_tags = [m.group("tag")]

            elif "tags" in m.groupdict() and m.group("tags"):
                raw_tags.append(m.group("tags"))
                for k, v in m.groupdict().items():
                    if k.startswith("tags") and v and v not in raw_tags:
                        raw_tags.append(v)

            # tags が無い場合でも1 effectは作る
            if raw_tags:
                tags = [TAG_MAP[t] for t in raw_tags]
            else:
                tags = [None]

            # --- 分解して effects に追加 ---
            for tag in tags:
                effect = {
                    "role": effect_def["role"],
                    "category": effect_def["category"],
                    "unit": effect_def["unit"],
                }

                if "sub_category" in effect_def:
                    effect["sub_category"] = effect_def["sub_category"]

                if value is not None:
                    effect["value"] = value

                if tag:
                    effect["tag"] = tag

                # cap_group
                if "cap_group_template" in effect_def and tag:
                    effect["cap_group"] = effect_def["cap_group_template"].format(tag=tag)
                else:
                    effect["cap_group"] = effect_def.get("cap_group")

                effects.append(effect)

            matched = True

    return matched

def extract_enhanced_block(text: str) -> list[str]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    stop_words = ("(灯火Lv", "(強化前)")

    result = []
    for line in lines:
        if line.startswith(stop_words):
            break
        result.append(line)

    return result

def normalize_lines(lines: list[str]) -> list[str]:
    result = []
    for line in lines:
        line = line.replace("％", "%")
        line = re.sub(r"\s+", " ", line)
        result.append(line)
    return result

def detect_source_type(ability_soup):
    # タイトル行だけを見る
    title_area = ability_soup.select_one(
        "div.col-xs-8.col-sm-6.mi-list-title"
    )
    if not title_area:
        return "battle"

    torch = title_area.select_one("span.mi-torch")
    if torch and torch.get_text(strip=True) == "必殺":
        return "ultimate"

    return "battle"


def fetch_page(page):
    params = {
        "page": page,
        "check_all_states": 1
    }

    r = requests.get(BASE_URL, params=params)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")

    results = []

    # アビリティ単位で取得
    ability_items = soup.select("ul.mi-list > li")

    for li in ability_items:
        # まずは必殺技なのかバトアビなのかを判定する
        source_type = detect_source_type(li)

        # li の中にある mi-list-right-col-p を全部取る
        blocks = li.select("div.mi-list-right-col-p")

        if not blocks:
            continue

        # 一番最初のものが「説明テキスト」
        desc = blocks[0]

        text = desc.get_text("\n", strip=True)

        # アビリティ名
        title_div = li.select_one(".mi-list-title")
        texts = list(title_div.stripped_strings)
        ability_name = texts[1] if len(texts) >= 2 else None

        # キャラクター名
        chara_link = li.select_one('a[href^="traveler.php"]')
        character_name = chara_link.get_text(strip=True)

        results.append({
            "text": text,
            "character": character_name,
            "source_type": source_type,
            "ability_name": ability_name
        })

    return results

def fetch_pages():
    page = 1
    all_items = []

    while True:
        items = fetch_page(page)
        print(f"page={page}, 件数={len(items)}")

        if len(items) == 0:
            break

        all_items.extend(items)

        with open(f"page_{page}.txt", "w", encoding="utf-8") as f:
            f.write(
                "\n\n---\n\n".join(
                    item["text"] for item in items
                )
            )

        page += 1
        time.sleep(1)

        #if page > 3:
        #    break

    print(f"総件数: {len(all_items)}")

    return all_items

def parse_item(item):
    lines = extract_enhanced_block(item["text"])
    return parse_ability(lines)

def load_items_from_file(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()

    blocks = raw.split("\n\n---\n\n")

    items = []
    for b in blocks:
        text = b.strip()
        if not text:
            continue

        items.append({
            "text": text,
            "source_type": "battle"  # 仮置き
        })

    return items

def load_items_from_files(pages):
    results = []
    for i in range(pages):
        results.extend(load_items_from_file(f"page_{i+1}.txt"))

    return results

# ここからは実装時観測用
def classify_unknown(line: str) -> str:
    for group in UNKNOWN_PATTERNS:
        for pat in group["patterns"]:
            if re.search(pat, line):
                return group["type"]
    return "unclassified"
