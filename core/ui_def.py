ROLE_JP = {
    "buff": "味方をアップ",
    "debuff": "敵をダウン",
}

CATEGORY_JP = {
    "damage": "ダメージアップ",
    "stat": "パラメータ",
    "resistance": "耐性",
    "critical": "クリティカル",
    "dmg_cap": "ダメージ上限アップ",
    "power": "威力アップ",
}

SUB_JP = {
    "attack_physical": "物攻",
    "attack_elemental": "属攻",
    "defence_physical": "物防",
    "attack_critical": "クリティカル",
    "defence_elemental": "属防",
    "defence_all": "物防・属防",
    "physical": "物理",
    "elemental": "属性",
}

TAG_JP = {
    "sword": "剣",
    "spear": "槍",
    "dagger": "短剣",
    "axe": "斧",
    "bow": "弓",
    "staff": "杖",
    "fan": "扇",
    "tome": "本",

    "fire": "火",
    "ice": "氷",
    "lightning": "雷",
    "wind": "風",
    "dark": "闇",
    "light": "光",
}

BASE_CAP = {
    "damage": 30,
    "stat": 30,
    "resistance": 30,
}

EVALUATION_PRESETS = {
    "ALL": None,   # ← 特別扱い
    "物理：剣": {
        "include": [
            {"category": "damage", "tag": "sword"},
            {"category": "stat", "sub_category": "attack_physical"},
            {"category": "resistance", "sub_category": "physical"},
            {"category": "critical"},
        ]
    },
    "属性：雷": {
        "include": [
            {"category": "damage", "tag": "lightning"},
            {"category": "stat", "sub_category": "attack_elemental"},
            {"category": "resistance", "sub_category": "elemental"},
        ]
    },
}

IMPACT_MAP = {
    #############
    # 攻撃に寄与 #
    #############
    # 詳細
    ("buff", "stat", "attack_physical"): "offense",
    ("buff", "stat", "attack_elemental"): "offense",
    ("debuff", "stat", "defence_physical"): "offense",
    ("debuff", "stat", "defence_elemental"): "offense",
    ("buff", "critical", "certain"): "offense",

    # tag ベース
    ("buff", "damage", "sword"): "offense",
    ("buff", "damage", "fire"): "offense",

    # category fallback
    ("buff", "damage"): "offense",
    ("buff", "dmg_cap"): "offense",
    ("buff", "power"): "offense",
    ("debuff", "resistance"): "offense",

    #############
    # 防御に寄与 #
    #############
    ("buff", "stat", "defence_physical"): "defense",
    ("buff", "stat", "defence_elemental"): "defense",
    ("debuff", "stat", "attack_physical"): "defense",
    ("debuff", "stat", "attack_elemental"): "defense",

    ###############
    # その他に寄与 #
    ###############
    ("buff", "stat", "speed"): "other",
    ("buff", "stat", "attack_critical_rate"): "other",
    ("buff", "critical", "rate"): "other",
    ("debuff", "stat", "speed"): "other",
    ("debuff", "stat", "attack_critical_rate"): "other",
}

STACK_GROUPS = {
    "physical_damage": [
        ("damage", "physical"),
        ("damage", "critical"),
    ],
    "elemental_damage": [
        ("damage", "elemental"),
        ("damage", "critical"),
    ],
}
