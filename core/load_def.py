import re


SHOKO_BASE_URL = "https://octopath.mimoza.jp/battle_abilities.php"

GAME8_BASE_URL = "https://game8.jp/octopathtraveler-sp/"

GAME8_LIST_URL_SUFFIX = "263473"

ATTACK_RE = re.compile(
    r'(?P<target>ランダムな)?ターゲットに(?P<hits>\d+)回の(?P<attr>.+?)属性攻撃'
)

DMG_CAP_RE = re.compile(
    r'ダメージ上限が(?P<value>\d+)アップ'
)

BOOST_RE = re.compile(
    r'ブースト(?P<level>MAX|\d+)時：(?P<effect>.+)'
)

CONDITION_RE = re.compile(
    r'使用条件：(.+)'
)

LIMIT_RE = re.compile(
    r'使用可能回数：(?P<count>\d+)回'
)

BUFF_PATTERNS = [
    (r'与ダメージが(?P<value>\d+)%アップ', '与ダメアップ'),
    (r'被ダメージを(?P<value>\d+)%軽減', '被ダメ軽減'),
    (r'ダメージ上限が(?P<value>\d+)アップ', 'ダメージ上限アップ'),
    (r'BPを(?P<value>\d+)回復', 'BP回復'),
]

DEBUFF_PATTERNS = [
    (r'被ダメージが(?P<value>\d+)%増加', '被ダメ増加'),
    (r'(.+?)耐性ダウン(?P<value>\d+)%', '耐性ダウン'),
    (r'(物防|属防|攻撃|防御)ダウン(?P<value>\d+)%', 'ステータスダウン'),
    (r'弱点を付与', '弱点付与'),
]

SPECIAL_PATTERNS = [
    (r'火・雷・闇弱点を突ける', '複合弱点付与'),
    (r'弱点を突ける', '弱点付与'),
]

CONDITION_PATTERNS = [
    r'.+?時：',          # ○○時：
    r'\d+ターン目以降',  # 3ターン目以降
    r'自身の必殺技を\d+回以上使用する',  # 必殺技１回以上使用
]

SOURCE_TYPES = {
    "battle": "battle",
    "ultimate": "ultimate",
}

EFFECT_PATTERNS = [
    ####################################
    # ダメージ系バフ
    ####################################
    {
        "role": "buff",
        "category": "damage",
        "sub_category": "physical",
        "unit": "%",
        "cap_group": "buff_damage_phys_all",
        "patterns": [
            r"物理([^0-9]*)ダメージアップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "damage",
        "sub_category": "elemental",
        "unit": "%",
        "cap_group": "buff_damage_elem_all",
        "patterns": [
            r"[^火氷雷風光闇]属性([^0-9]*)ダメージアップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "damage",
        "sub_category": "physical",
        "unit": "%",
        "patterns": [
            r"(?P<tags>(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?(?:・(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?)*)(?:・[火氷雷風光闇](?:属性)?)*ダメージアップ(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "buff_damage_phys_{tag}"
    },
    {
        "role": "buff",
        "category": "damage",
        "sub_category": "elemental",
        "unit": "%",
        "patterns": [
            r"(?P<tags>(?:火|氷|雷|風|光|闇)(?:・(?:火|氷|雷|風|光|闇))*)(属性)?ダメージアップ(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "buff_damage_elem_{tag}"
    },
    {
        "role": "buff",
        "category": "damage",
        "sub_category": "critical",
        "unit": "%",
        "cap_group": "buff_damage_crit",
        "patterns": [
            r"クリティカル時の?ダメージアップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "damage",
        "sub_category": "weak",
        "unit": "%",
        "cap_group": "buff_damage_weak",
        "patterns": [
            r"(?<!自身が)敵の弱点を突いた時の?ダメージアップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "damage",
        "sub_category": "weak",
        "unit": "%",
        "cap_group": "buff_damage_weak",
        "scopes": ["self"],
        "patterns": [
            r"自身が敵の弱点を突いた時の?ダメージアップ(?P<value>\d+)[%％]"
        ],
    },
    ####################################
    # ステータス系バフ
    ####################################
    {
        "role": "buff",
        "category": "stat",
        "sub_category": "attack_physical",
        "unit": "%",
        "cap_group": "buff_stat_atk_phys",
        "patterns": [
            r"物攻([^0-9]*)アップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "stat",
        "sub_category": "attack_elemental",
        "unit": "%",
        "cap_group": "buff_stat_atk_elem",
        "patterns": [
            r"属攻([^0-9]*)アップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "stat",
        "sub_category": "attack_critical_rate",
        "unit": "%",
        "cap_group": "buff_stat_atk_crit",
        "patterns": [
            r"会心([^0-9]*)アップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "stat",
        "sub_category": "defence_physical",
        "unit": "%",
        "cap_group": "buff_stat_def_phys",
        "patterns": [
            r"物防([^0-9]*)アップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "stat",
        "sub_category": "defence_elemental",
        "unit": "%",
        "cap_group": "buff_stat_def_elem",
        "patterns": [
            r"属防([^0-9]*)アップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "stat",
        "sub_category": "speed",
        "unit": "%",
        "cap_group": "buff_stat_speed",
        "patterns": [
            r"速度([^0-9]*)アップ(?P<value>\d+)[%％]"
        ],
    },
    ####################################
    # クリティカル系バフ
    ####################################
    {
        "role": "buff",
        "category": "critical",
        "sub_category": "certain",
        "unit": "",
        "value": 1,
        "cap_group": "critical_certain",
        "target_source_type": "battle",
        "patterns": [
            r"必ずクリティカルの効果(と.*効果)?を付与",
            r"必ずクリティカルダメージになる効果を付与"
        ],
    },
    {
        "role": "buff",
        "category": "critical",
        "sub_category": "elemental",
        "unit": "",
        "value": 1,
        "cap_group": "critical_elem",
        "target_source_type": "battle",
        "patterns": [
            r"属性攻撃でクリティカルが発生する効果(?!.?が必要)"
        ],
    },
    {
        "role": "buff",
        "category": "critical",
        "sub_category": "rate",
        "unit": "%",
        "cap_group": "critical_rate",
        "patterns": [
            r"クリティカル率アップ(?P<value>\d+)[%％]"
        ],
    },
    ####################################
    # そのほか個別カテゴリ
    ####################################
    {
        "role": "buff",
        "category": "power",
        "unit": "%",
        "cap_group": "power_up",
        "target_source_type": "battle",
        "patterns": [
            r"威力アップ(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "buff",
        "category": "dmg_cap",
        "unit": "",
        "cap_group": "damage_cap",
        "target_source_type": "battle",
        "patterns": [
            r"ダメージ上限アップ[\(（]効果量 ?(?P<value>\d+)",
            #r"ダメージ上限が(?P<value>\d+)アップ",
        ],
    },
    {
        "role": "buff",
        "category": "cap_increase",
        "sub_category": "attack",
        "unit": "%",
        "cap_group": "buff_stat_atk_phys",
        "target_source_type": "battle",
        "patterns": [
            r"(バトアビ|バトルアビリティ)による([^0-9]*)物攻([^0-9]*)アップの上限[^0-9]*が(?P<value>\d+)[%％]",
        ],
    },
    {
        "role": "buff",
        "category": "cap_increase",
        "sub_category": "attack",
        "unit": "%",
        "cap_group": "buff_stat_atk_elem",
        "target_source_type": "battle",
        "patterns": [
            r"(バトアビ|バトルアビリティ)による([^0-9]*)属攻([^0-9]*)アップの上限[^0-9]*が(?P<value>\d+)[%％]",
        ],
    },
    {
        "role": "buff",
        "category": "cap_increase",
        "sub_category": "physical",
        "unit": "%",
        "target_source_type": "battle",
        "patterns": [
            r"(バトアビ|バトルアビリティ)による([^0-9槍短剣弓斧杖扇本]*)(?P<tags>(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?(?:・(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?)*)(?:・[火氷雷風光闇](?:属性)?)*ダメージアップの上限[^0-9]*が(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "buff_damage_phys_{tag}"
    },
    {
        "role": "buff",
        "category": "cap_increase",
        "sub_category": "elemental",
        "unit": "%",
        "target_source_type": "battle",
        "patterns": [
            r"(バトアビ|バトルアビリティ)による([^0-9火氷雷風光闇]*)(?P<tags>(?:火|氷|雷|風|光|闇)(?:・(?:火|氷|雷|風|光|闇))*)属性ダメージアップの上限[^0-9]*が(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "buff_damage_elem_{tag}"
    },
    {
        "role": "debuff",
        "category": "cap_increase",
        "sub_category": "defence",
        "unit": "%",
        "cap_group": "debuff_stat_def_phys",
        "target_source_type": "battle",
        "patterns": [
            r"(バトアビ|バトルアビリティ)による([^0-9]*)物防([^0-9]*)ダウンを受けた際の上限[^0-9]*が(?P<value>\d+)[%％]",
        ],
    },
    {
        "role": "debuff",
        "category": "cap_increase",
        "sub_category": "defence",
        "unit": "%",
        "cap_group": "debuff_stat_def_elem",
        "target_source_type": "battle",
        "patterns": [
            r"(バトアビ|バトルアビリティ)による([^0-9]*)属防([^0-9]*)ダウンを受けた際の上限[^0-9]*が(?P<value>\d+)[%％]",
        ],
    },
    {
        "role": "debuff",
        "category": "cap_increase",
        "sub_category": "physical",
        "unit": "%",
        "target_source_type": "battle",
        "patterns": [
            r"(バトアビ|バトルアビリティ)による([^0-9槍短剣弓斧杖扇本]*)(?P<tags>(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?(?:・(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?)*)(?:・[火氷雷風光闇](?:属性)?)*耐性ダウンを受けた際の上限[^0-9]*が(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "debuff_resist_phys_{tag}"
    },
    {
        "role": "debuff",
        "category": "cap_increase",
        "sub_category": "elemental",
        "unit": "%",
        "target_source_type": "battle",
        "patterns": [
            r"(バトアビ|バトルアビリティ)による([^0-9火氷雷風光闇]*)(?P<tags>(?:火|氷|雷|風|光|闇)(?:・(?:火|氷|雷|風|光|闇))*)耐性ダウンを受けた際の上限[^0-9]*が(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "debuff_resist_elem_{tag}"
    },
    {
        "role": "buff",
        "category": "cap_increase",
        "sub_category": "attack",
        "unit": "%",
        "cap_group": "buff_stat_atk_phys",
        "target_source_type": "support",
        "patterns": [
            r"サポアビと装備性能による([^0-9]*)物攻([^0-9]*)アップの上限[^0-9]*が(?P<value>\d+)[%％]",
        ],
    },
    {
        "role": "buff",
        "category": "cap_increase",
        "sub_category": "attack",
        "unit": "%",
        "cap_group": "buff_stat_atk_elem",
        "target_source_type": "support",
        "patterns": [
            r"サポアビと装備性能による([^0-9]*)属攻([^0-9]*)アップの上限[^0-9]*が(?P<value>\d+)[%％]",
        ],
    },
    {
        "role": "buff",
        "category": "cap_increase",
        "sub_category": "physical",
        "unit": "%",
        "target_source_type": "support",
        "patterns": [
            r"サポアビと装備性能による([^0-9槍短剣弓斧杖扇本]*)(?P<tags>(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?(?:・(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?)*)(?:・[火氷雷風光闇](?:属性)?)*ダメージアップの上限[^0-9]*が(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "buff_damage_phys_{tag}"
    },
    {
        "role": "buff",
        "category": "cap_increase",
        "sub_category": "elemental",
        "unit": "%",
        "target_source_type": "support",
        "patterns": [
            r"サポアビと装備性能による([^0-9火氷雷風光闇]*)(?P<tags>(?:火|氷|雷|風|光|闇)(?:・(?:火|氷|雷|風|光|闇))*)属性ダメージアップの上限[^0-9]*が(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "buff_damage_elem_{tag}"
    },
    {
        "role": "debuff",
        "category": "cap_increase",
        "sub_category": "defence",
        "unit": "%",
        "cap_group": "debuff_stat_def_phys",
        "target_source_type": "support",
        "patterns": [
            r"サポアビと装備性能による([^0-9]*)物防([^0-9]*)ダウンを受けた際の上限[^0-9]*が(?P<value>\d+)[%％]",
        ],
    },
    {
        "role": "debuff",
        "category": "cap_increase",
        "sub_category": "defence",
        "unit": "%",
        "cap_group": "debuff_stat_def_elem",
        "target_source_type": "support",
        "patterns": [
            r"サポアビと装備性能による([^0-9]*)属防([^0-9]*)ダウンを受けた際の上限[^0-9]*が(?P<value>\d+)[%％]",
        ],
    },
    {
        "role": "debuff",
        "category": "cap_increase",
        "sub_category": "physical",
        "unit": "%",
        "target_source_type": "support",
        "patterns": [
            r"サポアビと装備性能による([^0-9槍短剣弓斧杖扇本]*)(?P<tags>(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?(?:・(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?)*)(?:・[火氷雷風光闇](?:属性)?)*耐性ダウンを受けた際の上限[^0-9]*が(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "debuff_resist_phys_{tag}"
    },
    {
        "role": "debuff",
        "category": "cap_increase",
        "sub_category": "elemental",
        "unit": "%",
        "target_source_type": "support",
        "patterns": [
            r"サポアビと装備性能による([^0-9火氷雷風光闇]*)(?P<tags>(?:火|氷|雷|風|光|闇)(?:・(?:火|氷|雷|風|光|闇))*)耐性ダウンを受けた際の上限[^0-9]*が(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "debuff_resist_elem_{tag}"
    },
    # ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
    # ここからデバフ
    # ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
    ####################################
    # 耐性系デバフ
    ####################################
    {
        "role": "debuff",
        "category": "resistance",
        "sub_category": "physical",
        "unit": "%",
        "cap_group": "debuff_resist_phys_all",
        "tag" : "all",
        "patterns": [
            r"物理(?:・属性)?耐性ダウン(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "debuff",
        "category": "resistance",
        "sub_category": "elemental",
        "unit": "%",
        "cap_group": "debuff_resist_elem_all",
        "tag" : "all",
        "patterns": [
            r"属性耐性ダウン(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "debuff",
        "category": "resistance",
        "sub_category": "physical",
        "unit": "%",
        "patterns": [
            r"(?P<tags>(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?(?:・(?:槍|短剣|剣|弓|斧|杖|扇|本)(攻撃)?)*)(?:・[火氷雷風光闇](?:属性)?)*耐性ダウン(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "debuff_resist_phys_{tag}"
    },
    {
        "role": "debuff",
        "category": "resistance",
        "sub_category": "elemental",
        "unit": "%",
        "patterns": [
            r"(?P<tags>(?:火|氷|雷|風|光|闇)(?:・(?:火|氷|雷|風|光|闇))*)耐性ダウン(?P<value>\d+)[%％]"
        ],
        "cap_group_template": "debuff_resist_elem_{tag}"
    },
    ####################################
    # ステータス系デバフ
    ####################################
    {
        "role": "debuff",
        "category": "stat",
        "sub_category": "defence_physical",
        "unit": "%",
        "cap_group": "debuff_stat_def_phys",
        "patterns": [
            r"物防([^0-9]*)ダウン(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "debuff",
        "category": "stat",
        "sub_category": "defence_elemental",
        "unit": "%",
        "cap_group": "debuff_stat_def_elem",
        "patterns": [
            r"属防([^0-9]*)ダウン(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "debuff",
        "category": "stat",
        "sub_category": "attack_critical_rate",
        "unit": "%",
        "cap_group": "debuff_stat_atk_crit",
        "patterns": [
            r"会心([^0-9]*)ダウン(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "debuff",
        "category": "stat",
        "sub_category": "attack_physical",
        "unit": "%",
        "cap_group": "debuff_stat_atk_phys",
        "patterns": [
            r"物攻([^0-9]*)ダウン(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "debuff",
        "category": "stat",
        "sub_category": "attack_elemental",
        "unit": "%",
        "cap_group": "debuff_stat_atk_elem",
        "patterns": [
            r"属攻([^0-9]*)ダウン(?P<value>\d+)[%％]"
        ],
    },
    {
        "role": "debuff",
        "category": "stat",
        "sub_category": "speed",
        "unit": "%",
        "cap_group": "debuff_stat_speed",
        "patterns": [
            r"速度([^0-9]*)ダウン(?P<value>\d+)[%％]"
        ],
    }
]

TAG_MAP = {
    "剣": "sword",
    "槍": "spear",
    "短剣": "dagger",
    "斧": "axe",
    "弓": "bow",
    "杖": "staff",
    "本": "tome",
    "扇": "fan",

    "火": "fire",
    "氷": "ice",
    "雷": "lightning",
    "風": "wind",
    "光": "light",
    "闇": "dark",
}


# ここからは実装時テスト用
UNKNOWN_PATTERNS = [
    {
        "type": "tobepatterned",
        "patterns": [
            r"弱点を突ける効果を付与",
            r"の状態異常を付与",
            r"状態異常無効化の効果を付与",
            r"弱点(を)?付与",
            r"HPバリアを付与",
            r"脆点付与",
            r"必殺技ゲージを(\d\.)+[%％]増加"
        ],
    },
    {
        "type": "ignore",
        "patterns": [
            r"\(威力 ?\d+",
            r"弱点を突ける",
            r"シールド",
            r"ダメージ計算",
            r"SP消費",
            r"使用可能回数：\d+回",
            r"後衛に移動する",
            r"この(必殺技|アビリティ)のダメージ上限が\d+アップ",
            r"ターン中、素早く行動",
            r"行動順影響は",
            r"攻撃を完全に",
            r"使用した次のターンから\dターンに\d回",
            r"燃焼：",
            r"凍結：",
            r"感電：",
            r"腐蝕：",
            r"魅惑：",
            r".+pt：",
            r"高いほうのみ適用される",
            r"必ずクリティカルダメージ",
            r"ターン中、行動が遅くなる",
            r"戦闘中\d回のみ使用可能",
            r"ペイント：",
            r"自身のBPを\d回復",
            r"元からその弱点があればその弱点ダメージ倍率をプラス",
            r"pt”(を|は)\d(消費|追加)",
            r"この効果によって自身は",
            r"その後、.+を解除する",
            r"攻撃回数が\d回",
            r"与えたダメージ量の\d+%",
        ],
    },
    {
        "type": "target",
        "patterns": [
            r"^味方",
            r"^敵",
            r"^自身",
            r"前衛",
            r"後衛",
            r"前後衛",
            r"全体",
            r"単体",
        ],
    },
    {
        "type": "duration",
        "patterns": [
            r"\d+ターン",
            r"次のターン",
        ],
    },
    {
        "type": "condition",
        "patterns": [
            r"使用条件",
            r".+時",
            r"ブレイク",
            r"HPが",
        ],
    },
    {
        "type": "unclassified",
        "patterns": [
        ],
    },
]

SCOPE_PATTERN = re.compile(
    r"(?P<scope>(自身を除く)?"
    r"(自身|自身とバディ|自身と後衛|前衛と後衛|"
    r"味方後衛全体|味方前衛全体|味方前後衛全体|味方単体|"
    r"ランダムなターゲット|敵全体|敵単体|ブレイクさせた敵|ブレイク中の敵|攻撃してきた敵|確率で敵)"
    r"(と自身の後衛)?)"
    r"(に|の|を)"
)

SCOPE_OPTIONAL_PREFIX = [
    "自身を除く",
]

SCOPE_OPTIONAL_SUFFIX = [
    "と自身の後衛",
    "と後衛",
    "とバディ",
]

SCOPE_NORMALIZE_MAP = {
    "自身": "self",
    "前衛": "self",
    "と自身の後衛": "buddy",
    "と後衛": "buddy",
    "とバディ": "buddy",
    "自身を除く": "self_exclude",

    "味方単体": "ally_single",

    "味方前衛全体": "ally_front_all",
    "味方後衛全体": "ally_back_all",
    "味方前後衛全体": "ally_all",

    "ブレイクさせた敵": "enemy_single",
    "ブレイク中の敵": "enemy_single",
    "攻撃してきた敵": "enemy_single",
    "確率で敵": "enemy_single",
    "敵単体": "enemy_single",
    "敵全体": "enemy_all",

    "ランダムなターゲット": "random",
}

TAB_DEFS = [
    {
        "tab_index": 0,
        "source_type": "battle",
        "mode": "table",
    },
    {
        "tab_index": 1,
        "source_type": "support",
        "mode": "table",
    },
    {
        "tab_index": 3,
        "source_type": "ultimate",
        "mode": "split_table",  # ← 特殊
        "sections": [
            {
                "name": "ultimate",
                "th_index": 0,
            },
            {
                "name": "ex",
                "th_index": 1,
            },
        ],
    },
]

SOURCE_RULES = {
    "battle": {
        "stack_group": "battle"
    },
    "ultimate": {
        "stack_group": "ultimate"
    },
    "ex": {
        "stack_group": "battle"
    },
    "support": {
        "stack_group": "support"
    },
    "override": {
        "stack_group": "battle"
    },
}
