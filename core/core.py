import requests
import re
import time
from bs4 import BeautifulSoup
from collections import Counter
from core.load_def import SHOKO_BASE_URL, GAME8_BASE_URL, GAME8_LIST_URL_SUFFIX, EFFECT_PATTERNS, CONDITION_PATTERNS, TAG_MAP, UNKNOWN_PATTERNS, SCOPE_PATTERN, SCOPE_NORMALIZE_MAP, SCOPE_OPTIONAL_PREFIX, SCOPE_OPTIONAL_SUFFIX, TAB_DEFS


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

def match_effects(line, effects, scopes=None):
    matched = False

    for effect_def in EFFECT_PATTERNS:
        for pattern in effect_def["patterns"]:
            m = re.search(pattern, line.replace(' ', ''))
            if not m:
                continue

            # --- 共通部分 ---
            value = int(m.group("value")) if "value" in m.groupdict() else None

            # --- tags 抽出 ---
            tags = []
            raw_tags = []

            if "tags" in m.groupdict() and m.group("tags"):
                raw_tags = m.group("tags").replace('攻撃','').split("・")

            tags = [TAG_MAP[t] for t in raw_tags] if raw_tags else [None]

            # --- 分解して effects に追加 ---
            for tag in tags:
                effect = {
                    "role": effect_def["role"],
                    "category": effect_def["category"],
                    "unit": effect_def["unit"],
                }

                if "sub_category" in effect_def:
                    effect["sub_category"] = effect_def["sub_category"]

                if "target_source_type" in effect_def:
                    effect["target_source_type"] = effect_def["target_source_type"]

                if "value" in effect_def:
                    effect["value"] = effect_def["value"]

                if value is not None:
                    effect["value"] = value

                if tag:
                    effect["tag"] = tag

                # cap_group
                if "cap_group_template" in effect_def and tag:
                    effect["cap_group"] = effect_def["cap_group_template"].format(tag=tag)
                else:
                    effect["cap_group"] = effect_def.get("cap_group")

                if scopes:
                    effect["scopes"] = scopes

                if "scopes" in effect_def:
                    effect["scopes"] = effect_def["scopes"]

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

import re

def split_by_scope(lines: list[str]) -> list[dict]:
    blocks = []
    current_scopes = []
    current_lines = []

    for line in lines:
        m = SCOPE_PATTERN.search(line)

        if m:
            # 既存ブロックを確定
            if current_lines:
                blocks.append({
                    "scopes": current_scopes,
                    "text": " ".join(current_lines),
                })

            # 新しい scope 開始
            current_scopes = []
            scope_raw = m.group("scope")

            # オプション的についている接頭辞と接尾辞を先に追加
            for prefix in SCOPE_OPTIONAL_PREFIX:
                if scope_raw.startswith(prefix):
                    current_scopes.append(SCOPE_NORMALIZE_MAP.get(prefix))
                    scope_raw = scope_raw.removeprefix(prefix)
                    break

            for suffix in SCOPE_OPTIONAL_SUFFIX:
                if scope_raw.endswith(suffix):
                    current_scopes.append(SCOPE_NORMALIZE_MAP.get(suffix))
                    scope_raw = scope_raw.removesuffix(suffix)
                    break

            current_scopes.append(SCOPE_NORMALIZE_MAP.get(scope_raw))
            current_lines = [line]

        else:
            # scopeなし → 直前の scope に属する
            if current_lines:
                current_lines.append(line)
            else:
                # scopeが一度も出ていない場合
                current_lines = [line]

    # 最後のブロック
    if current_lines:
        blocks.append({
            "scopes": current_scopes,
            "text": " ".join(current_lines),
        })

    return blocks

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

# ここからは オクトラ書庫 からのスクレイプ
def fetch_page(page):
    params = {
        "page": page,
        "check_all_states": 1
    }

    r = requests.get(SHOKO_BASE_URL, params=params)
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

# ここからは game8 からのスクレイプ
def scrape_character_list():
    res = requests.get(GAME8_BASE_URL + GAME8_LIST_URL_SUFFIX)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")

    characters = []

    tables = soup.find_all("table")

    character_table = None
    for table in tables:
        if table.find("a", href=re.compile(r"/octopathtraveler-sp/\d+")):
            character_table = table
            break

        if table.find("a", href=re.compile(r"/archives/\d+")):
            character_table = table
            break

    if character_table is None:
        raise RuntimeError("character table not found")

    rows = character_table.find_all("tr")

    for row in rows:
        link = row.find("a", href=re.compile(r"/octopathtraveler-sp/\d+"))

        if not link:
            link = row.find("a", href=re.compile(r"/archives/\d+"))

        if not link:
            continue

        # character_id
        href = link["href"]
        character_id = href.split("/")[-1]

        # character_name
        character_name = link.get_text(strip=True)

        tds = row.find_all("td")

        # 初期値
        job = None
        rarity = None
        elements = []
        physicals = []

        # 各セルを総当たりで解析（game8 は構造変更が入りやすいため）
        for td in tds:
            text = td.get_text(strip=True)

            # ★レアリティ
            if "星" in text:
                rarity = text[-1]

            # ジョブ（日本語1～3文字想定）
            if text in ["剣士", "商人", "薬師", "神官", "学者", "盗賊", "狩人", "踊子"]:
                job = text

            # アイコン（属性・武器）
            for img in td.find_all("img"):
                alt = img.get("alt", "")

                # 属性
                if alt in ["火", "氷", "雷", "風", "光", "闇"]:
                    elements.append(alt)

                # 武器（physicals）
                if alt in ["剣", "斧", "槍", "弓", "杖", "本", "扇"]:
                    physicals.append(alt)

                if alt in ["短"]:
                    physicals.append("短剣")

        characters.append({
            "character_id": character_id,
            "character_name": character_name,
            "job": job,
            "rarity": rarity,
            "elements": sorted(set(elements)),
            "physicals": sorted(set(physicals)),
        })

    return characters

def fetch_page2(character_id, character_name):
    url = GAME8_BASE_URL + character_id
    html = requests.get(url).text
    soup = BeautifulSoup(html, "html.parser")

    tabs = soup.select("div.a-tabContainer > div.a-tabPanels > div.a-tabPanel")

    all_abilities = []

    for tab_def in TAB_DEFS:
        tab = tabs[tab_def["tab_index"]]

        if tab_def["mode"] == "table":
            abilities = parse_ability_table(
                character_id,
                character_name,
                tab,
                source_type=tab_def["source_type"]
            )
            all_abilities.extend(abilities)

        elif tab_def["mode"] == "split_table":
            abilities = parse_split_table(
                character_id,
                character_name,
                tab,
                tab_def["sections"]
            )
            all_abilities.extend(abilities)

    return all_abilities

def parse_ability_table(character_id, character_name, tab, source_type):

    rows = tab.find_all("tr")

    abilities = []
    current = None
    enhance_mode = "after"
    section = "normal"  # normal / boost / condition / pre_enhance
    is_override = False
    override_source = None

    for tr in rows:

        # --- ヘッダ行（アビリティ名 + SP） ---
        if tr.find("th"):
            override_source = None
            ths = tr.find_all("th")
            header_text = ths[0].get_text(strip=True)

            isEvol = False

            if "進化" in header_text:
                isEvol = True

            # アイコン判定（保険）
            if ths[0].find("img", alt=lambda x: x and "進化" in x):
                isEvol = True

            if  is_override:
                if ths[0].find("img", alt=lambda x: x and "技変化" in x):
                    override_source = "override"
                else:
                    is_override = False

            if isEvol:
                # === 進化アビ ===
                if current is None:
                    continue  # 念のため

                # ここから先の td は「強化後」
                enhance_mode = "after"
                section = "normal"
                current["_is_evolution"] = True
                current["raw_text_pre_enhance"] = current["raw_text"]
                current["raw_text"] = []
                current["ability_name"] = header_text
                continue

            # 新アビリティ開始
            current = {
                "character_id": character_id,
                "character_name": character_name, 
                "ability_name": header_text,
                "source_type": override_source if override_source is not None else source_type,
                "cost": None,
                "raw_text": [],
                "raw_text_pre_enhance": []
            }

            # SP が取れそうなら取る
            if len(ths) >= 2:
                current["cost"] = ths[1].get_text(strip=True)

            abilities.append(current)
            enhance_mode = "after"
            section = "normal"
            continue

        if current is None:
            continue

        td = tr.find("td")
        if not td:
            continue

        # span / br を含めてテキスト化
        lines = td.stripped_strings

        for line in lines:
            # 単なるアビリティ強化内容の話であればスキップ
            if "【アビリティ強化】" in line:
                break

            # 強化前の切り替え検出
            if "灯火強化" in line:
                enhance_mode = "before"
                continue

            # バトアビ変化を検出
            if "アビリティ編成が以下の内容になる" in line:
                is_override = True
                section = "override"
                continue

            if tr.find("hr", class_="a-table__line"):
                # 次に来る見出しで section を切り替える
                if "【ブースト時】" in line:
                    section = "boost"

                if "【使用条件】" in line:
                    section = "condition"

                if "【灯火強化】" in line:
                    section = "pre_enhance"

            if enhance_mode == "after":
                if section == "normal":
                    current["raw_text"].append(line)
                elif section == "boost":
                    current.setdefault("raw_text_boost", []).append(line)
                elif section == "condition":
                    current.setdefault("raw_text_condition", []).append(line)
                elif section == "pre_enhance":
                    current["raw_text_pre_enhance"].append(line)
                elif section == "override":
                    current.setdefault("raw_text_override_battle", []).append(line)
            else:
                current["raw_text_pre_enhance"].append(line)

        blocks = split_by_scope(current["raw_text"])

        effects = []
        conditions = []
        unknown = []

        for block in blocks:
            if match_effects(block["text"], effects, block["scopes"]):
                continue
            if match_conditions(block["text"], conditions):
                continue
            unknown.append(block["text"])

        current["effects"] = effects
        current["conditions"] = conditions
        current["unknown"] = unknown
        current["blocks"] = blocks

    return abilities

def parse_split_table(character_id, character_name, tab, sections):
    rows = tab.find_all("tr")

    collected = []
    current_rows = []
    section_idx = 0

    for tr in rows:
        if tr.find("th"):
            if current_rows:
                collected.append((sections[section_idx], current_rows))
                current_rows = []
                section_idx += 1

        current_rows.append(tr)

    if current_rows and section_idx < len(sections):
        collected.append((sections[section_idx], current_rows))

    abilities = []

    for section_def, rows in collected:
        abilities.extend(
            parse_rows_as_abilities(
                character_id,
                character_name, 
                rows,
                source_type=section_def["name"]
            )
        )

    return abilities

def parse_rows_as_abilities(character_id, character_name, rows, source_type):
    tab_soup = BeautifulSoup("<table></table>", "html.parser")
    table = tab_soup.table

    for r in rows:
        table.append(r)

    return parse_ability_table(
        character_id,
        character_name,
        tab_soup,
        source_type=source_type
    )


# ここからは実装時観測用
def classify_unknown(line: str) -> str:
    for group in UNKNOWN_PATTERNS:
        for pat in group["patterns"]:
            if re.search(pat, line):
                return group["type"]
    return "unclassified"
