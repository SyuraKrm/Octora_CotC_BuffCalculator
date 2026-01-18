import streamlit as st
import collections
from ui_def import ROLE_JP, CATEGORY_JP, SUB_JP, TAG_JP, BASE_CAP, EVALUATION_PRESETS, IMPACT_MAP

# main.py で生成した items を import する想定
# 例: items = fetch_pages()
from core.build_data import load_abilities

@st.cache_data
def load():
    return load_abilities()
    
def get_base_cap(category):
    return BASE_CAP.get(category)

def build_cap_table(effects):
    caps = {}


    for e in effects:
        if e["category"] == "cap_increase":
            caps[e["cap_group"]] = e["value"]

    return caps

def apply_cap(total, base_cap, extra_cap):
    if base_cap is None:
        return total
    return min(total, max(base_cap, extra_cap))

def apply_presets(effects, selected_presets):
    # ALL が選ばれていたら無条件
    if "ALL" in selected_presets or not selected_presets:
        return effects

    rules = []
    for p in selected_presets:
        preset = EVALUATION_PRESETS.get(p)
        if not preset:
            continue
        rules.extend(preset.get("include", []))

    def match(effect):
        for r in rules:
            ok = True
            for k, v in r.items():
                if effect.get(k) != v:
                    ok = False
                    break
            if ok:
                return True
        return False

    return [e for e in effects if match(e)]

def classify_impact(effect):
    role = effect["role"]
    category = effect["category"]
    sub = effect.get("sub_category")
    tag = effect.get("tag")

    # 1. role + category + sub
    if (role, category, sub) in IMPACT_MAP:
        return IMPACT_MAP[(role, category, sub)]

    # 2. role + category + tag
    if (role, category, tag) in IMPACT_MAP:
        return IMPACT_MAP[(role, category, tag)]

    # 3. role + category
    if (role, category) in IMPACT_MAP:
        return IMPACT_MAP[(role, category)]

    return None


def filter_by_impact(effects, impact):
    return [
        e for e in effects
        if classify_impact(e) == impact
    ]

def belongs_to_stack(effect, stack_def):
    return (
        effect["category"],
        effect.get("sub_category")
    ) in stack_def

def render_table(effects, ex_cap_table):
    summary = collections.defaultdict(int)

    for e in effects:
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
        base_cap = get_base_cap(cat)
        if not base_cap: base_cap = 9999999

        ex_cap = ex_cap_table.get(cap_group)
        if not ex_cap: ex_cap = 0

        rows.append({
            "区分": ROLE_JP.get(role, role),
            "種別": CATEGORY_JP.get(cat, cat),
            "内容": SUB_JP.get(sub, sub),
            "対象": TAG_JP.get(tag, "-"),
            "合計効果量(%)": value,
            "上限": max(base_cap, ex_cap),
            "有効値": apply_cap(
                total=value,
                base_cap=base_cap,
                extra_cap=ex_cap
            )
        })
        
    st.markdown(
        """
        <style>
        div[data-testid="stDataFrame"] * {
            font-size: 15px;
        }
        div[data-testid="stDataFrame"] table td:nth-child(5),
        div[data-testid="stDataFrame"] table td:nth-child(6),
        div[data-testid="stDataFrame"] table td:nth-child(7) {
            font-size: 17px;
            font-weight: 600;
        }
        </style>
        """,
        unsafe_allow_html=True
    )

    st.dataframe(rows)   

def aggregate(summary, key, effect):
    cat = effect["category"]
    sub = effect.get("sub_category")
    value = effect.get("value", 0)

    # critical/certain → 件数カウント
    if cat == "critical" and sub == "certain":
        summary[key] += 1

    # power → 最大値
    elif cat == "power":
        summary[key] = max(summary[key], value)

    # 通常 → 加算
    else:
        summary[key] += value

def view_abilities():
    # --------------------------------
    # キャラごとにまとめる
    # --------------------------------
    by_character = collections.defaultdict(list)
    abilities = load()
    for ability in abilities:
        by_character[ability["character"]].append(ability)

    characters = sorted(by_character.keys())

    # --------------------------------
    # UI
    # --------------------------------
    selected_char = st.selectbox(
        "キャラクターを選択",
        characters
    )

    st.divider()

    abilities = by_character[selected_char]

    for ab in abilities:
        with st.expander(f"{ab['ability_name']}  ({ab['source_type']})", expanded=False):

            st.markdown("### 基本情報")
            st.write({
                "キャラ": ab["character"],
                "アビリティ名": ab["ability_name"],
                "種別": ab["source_type"],
            })

            if ab["effects"]:
                st.markdown("### Effects")
                st.json(ab["effects"])

            if ab["conditions"]:
                st.markdown("### Conditions")
                for c in ab["conditions"]:
                    st.write("•", c)

            if ab["unknown"]:
                st.markdown("### Unknown（未解析）")
                for u in ab["unknown"]:
                    st.write("•", u)

def view_buff_debuff():
    css = f"""
    <style>
    div[data-testid="stColumn"] {{
        overflow: scroll;
        height: 80vh;
    }}
    </style>
    """
    st.markdown(css, unsafe_allow_html=True)
    left, right = st.columns([1.2, 1])

    with left:
        st.markdown("## 編成・アビリティ選択")

        # --------------------------------
        # キャラごとにまとめる
        # --------------------------------
        by_character = collections.defaultdict(list)
        abilities = load()
        for ability in abilities:
            by_character[ability["character"]].append(ability)

        characters = sorted(by_character.keys())

        # --------------------------------
        # UI
        # --------------------------------
        selected_chars = st.multiselect(
            "使用キャラクター（最大8人）",
            options=characters,
            max_selections=8
        )

        selected_abilities = {}

        for char in selected_chars:

            character_header(char)
            
            char_abilities = [
                a for a in abilities
                if a["character"] == char
                and a["source_type"] == "battle"
            ]

            char_ultimates = [
                a for a in abilities
                if a["character"] == char
                and a["source_type"] == "ultimate"
            ]

            selected = []

            count = 0
            for abil in char_abilities:
                if count >= 4:
                    break

                label = abil["ability_name"]

                checked = st.checkbox(
                    label,
                    key=f"{char}_{label}"
                )

                # 軽い説明（説明の最初の2行）
                desc = abil["description"][:2]

                st.caption(desc)

                if checked:
                    selected.append(label)
                    count += 1

            selected_abilities[char] = [
                a for a in char_abilities if a["ability_name"] in selected
            ]

        all_effects = []

        for abil_list in selected_abilities.values():
            for abil in abil_list:
                all_effects.extend(abil["effects"])

        # この時点で上限突破効果テーブルを作っておく
        cap_table = build_cap_table(all_effects)

    with right:
        st.markdown("### 評価軸")

        selected_presets = []

        for name in EVALUATION_PRESETS.keys():
            if st.checkbox(name, key=f"preset_{name}"):
                selected_presets.append(name)

        filtered_effects = apply_presets(all_effects, selected_presets)

        st.markdown("## 効果サマリー")

        tab_offense, tab_defense = st.tabs(["🗡 攻撃性能", "🛡 防御性能"])

        show_combined = st.checkbox("合算効果を表示")

        tabbed_effects = []

        with tab_offense:
            active_impact = "offense"
            tabbed_effects = filter_by_impact(filtered_effects, active_impact)
            render_table(tabbed_effects, cap_table)

        with tab_defense:
            active_impact = "defense"
            tabbed_effects = filter_by_impact(filtered_effects, active_impact)
            render_table(tabbed_effects, cap_table)


def character_header(name):
    st.markdown(
        f"""
        <div style="
            background-color:#2a2f38;
            padding:8px 12px;
            border-radius:6px;
            font-weight:bold;
            font-size:16px;
            margin-top:12px;
            margin-bottom:6px;
        ">
        {name}
        </div>
        """,
        unsafe_allow_html=True
    )

def debug_unclassified():
    # --------------------------------
    # キャラごとにまとめる
    # --------------------------------
    abilities = load()

    summary = collections.defaultdict(int)

    for i, ability in enumerate(abilities):

        unclassified = [
            e for e in ability["effects"]
            if classify_impact(e) is None
        ]

        for unc in unclassified:
            key = (
                unc["role"],
                unc["category"],
                unc.get("sub_category"),
                unc.get("tag"),
                unc.get("cap_group")
            )
            summary[key] += 1

    for (role, cat, sub, tag, cap_group), value in summary.items():

        print(f"{role},{cat},{sub},{tag},{cap_group} : {value}")

##################
# 本処理はここから
##################
st.set_page_config(page_title="Ability Viewer", layout="wide")

st.title("📜 オクトパストラベラー 大陸の覇者 アビリティ一覧")

#view_abilities()
view_buff_debuff()
#debug_unclassified()