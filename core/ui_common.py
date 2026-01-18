from core.ui_def import EVALUATION_PRESETS, BASE_CAP, IMPACT_MAP

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

