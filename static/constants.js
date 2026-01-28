// 8スロット固定
const partySlots = Array.from({ length: 8 }, (_, i) => ({
  slot: i,
  character: null,
  selectedAbilities: []
}));

const ROLE_JP = {
  buff: "味方",
  debuff: "敵",
}

const EFFECT_CORE_JP = {
  stat: {
    attack_physical: "物攻",
    attack_elemental: "属攻",
    defence_physical: "物防",
    defence_elemental: "属防",
    defence_all: "物防・属防",
    attack_critical_rate: "会心",
    speed: "速度",
  },
  resistance: {
    physical: "物理耐性",
    elemental: "属性耐性",
  },
  damage: {
    physical: "物理ダメージ",
    elemental: "属性ダメージ",
    critical: "クリティカル時のダメージ",
  },
  critical: {
    certain: "必ずクリティカル",
    rate: "クリティカル発生率",
  },
}

const CATEGORY_FALLBACK_JP = {
  dmg_cap: "ダメージ上限",
  power: "威力",
}

const TAG_JP = {
  sword: "剣",
  spear: "槍",
  dagger: "短剣",
  axe: "斧",
  bow: "弓",
  staff: "杖",
  fan: "扇",
  tome: "本",

  fire: "火",
  ice: "氷",
  lightning: "雷",
  wind: "風",
  dark: "闇",
  light: "光",
}

const SOURCE_RULES = {
  battle: {
    always_on: false,
    stack_group: "battle"
  },
  ultimate: {
    always_on: true,
    stack_group: "ultimate"
  },
  ex: {
    always_on: true,
    stack_group: "battle"
  },
  support: {
    always_on: true,
    stack_group: "support"
  },
  override: {
    always_on: true,
    stack_group: "battle"
  },
};

const STACK_GROUP_DEFINITIONS = {
  battle:   { label: "バトアビ" },
  support:  { label: "サポアビ" },
  ultimate: { label: "必殺技" },
};

const JOB_ORDER = [
  "剣士",
  "商人",
  "盗賊",
  "薬師",
  "狩人",
  "神官",
  "学者",
  "踊子",
];

const MAX_BATTLE_ABILITIES = 4;

const CHARACTER_TABS = [
  { key: "battle", label: "バトアビ", targets:[{type:"battle", prefix:""}]},
  { key: "ex", label: "EX・技変化", targets: [{type:"ex", prefix:"【EX】"}, {type:"override",prefix:"【技変化】"}] },
  { key: "ultimate", label: "必殺技", targets: [{type:"ultimate", prefix:""}] },
  { key: "support", label: "サポアビ", targets: [{type:"support", prefix:""}] }
];

const EFFECT_ROLE_MAP = {
  attack: [
    { role: "buff",   category: "cap_increase" },
    { role: "debuff", category: "cap_increase" },
    { role: "buff",   category: "damage" },
    { role: "buff",   category: "dmg_cap" },
    { role: "buff",   category: "power" },
    { role: "debuff", category: "resistance" },
    { role: "buff",   category: "stat",     sub_category: "attack_physical" },
    { role: "buff",   category: "stat",     sub_category: "attack_elemental" },
    { role: "debuff", category: "stat",     sub_category: "defence_physical" },
    { role: "debuff", category: "stat",     sub_category: "defence_elemental" },
    { role: "buff",   category: "critical", sub_category: "certain" },
  ],

  defense: [
    { role: "buff",   category: "cap_increase" },
    { role: "debuff", category: "cap_increase" },
    { role: "buff",   category: "stat",     sub_category: "defence_physical" },
    { role: "buff",   category: "stat",     sub_category: "defence_elemental" },
    { role: "debuff", category: "stat",     sub_category: "attack_physical" },
    { role: "debuff", category: "stat",     sub_category: "attack_elemental" },
  ],

  both: [
    { role: "buff",   category: "cap_increase" },
    { role: "debuff", category: "cap_increase" },
    { role: "buff",   category: "damage" },
    { role: "debuff", category: "resistance" },
    { role: "buff",   category: "dmg_cap" },
    { role: "buff",   category: "power" },
    { role: "buff",   category: "critical", sub_category: "certain" },
    { role: "buff",   category: "stat",     sub_category: "attack_physical" },
    { role: "buff",   category: "stat",     sub_category: "attack_elemental" },
    { role: "buff",   category: "stat",     sub_category: "defence_physical" },
    { role: "buff",   category: "stat",     sub_category: "defence_elemental" },
    { role: "debuff", category: "stat",     sub_category: "attack_physical" },
    { role: "debuff", category: "stat",     sub_category: "attack_elemental" },
    { role: "debuff", category: "stat",     sub_category: "defence_physical" },
    { role: "debuff", category: "stat",     sub_category: "defence_elemental" },
  ]
}

const CATEGORY_CAP_MAP = {
  resistance: 30,
  damage: 30,
  stat: 30,
  dmg_cap: 999999,
  power: 999999,
  critical: 1,
}

const ROLE_ORDER = {
  buff: 10,
  debuff: 20,
}

const CATEGORY_ORDER = {
  stat: 10,
  damage: 20,
  resistance: 30,
  critical: 50,
  power: 60,
  dmg_cap: 70,
  cap_increase: 99,
}

const SUB_CATEGORY_ORDER = {
  certain: 5,
  physical: 10,
  elemental: 20,
  attack_physical: 11,
  attack_elemental: 21,
  defence_physical: 31,
  defence_elemental: 41,
  attack_critical_rate: 50,
  critical: 80,
  rate: 85,
  speed: 90,
  attack: 98,
  defence: 99,
}

const TAG_ORDER = {
  sword: 10,
  spear: 11,
  dagger: 12,
  axe: 13,
  bow: 14,
  staff: 15,
  tome: 16,
  fan: 17,

  fire: 40,
  ice: 41,
  lightning: 42,
  wind: 43,
  light: 44,
  dark: 45,
}

const COMMON_CAP_GROUPS = [
  "buff_damage_crit",
  "critical_certain",
  "damage_cap",
  "power_up",
]

const PHYS_STAT_GROUPS = [
  "buff_stat_atk_phys",
  "buff_stat_def_phys",
  "debuff_stat_atk_phys",
  "debuff_stat_def_phys",
]

const ELEM_STAT_GROUPS = [
  "buff_stat_atk_elem",
  "buff_stat_def_elem",
  "debuff_stat_atk_elem",
  "debuff_stat_def_elem",
]

const ATTACK_CATEGORY_FILTERS = {
  ALL: {
    label: "すべて",
    capGroups: null,
  },

  /* ---------- 物理 ---------- */

  PHYSICAL_ALL: {
    label: "全物理",
    capGroups: [
      "buff_damage_phys_all",
      "buff_damage_phys_sword",
      "buff_damage_phys_spear",
      "buff_damage_phys_dagger",
      "buff_damage_phys_axe",
      "buff_damage_phys_bow",
      "buff_damage_phys_staff",
      "buff_damage_phys_tome",
      "buff_damage_phys_fan",
      "debuff_resist_phys_all",
      "debuff_resist_phys_sword",
      "debuff_resist_phys_spear",
      "debuff_resist_phys_dagger",
      "debuff_resist_phys_axe",
      "debuff_resist_phys_bow",
      "debuff_resist_phys_staff",
      "debuff_resist_phys_tome",
      "debuff_resist_phys_fan",
      ...PHYS_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  SWORD: {
    label: "剣",
    capGroups: [
      "buff_damage_phys_all",
      "buff_damage_phys_sword",
      "debuff_resist_phys_all",
      "debuff_resist_phys_sword",
      ...PHYS_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  SPEAR: {
    label: "槍",
    capGroups: [
      "buff_damage_phys_all",
      "buff_damage_phys_spear",
      "debuff_resist_phys_all",
      "debuff_resist_phys_spear",
      ...PHYS_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  DAGGER: {
    label: "短剣",
    capGroups: [
      "buff_damage_phys_all",
      "buff_damage_phys_dagger",
      "debuff_resist_phys_all",
      "debuff_resist_phys_dagger",
      ...PHYS_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  AXE: {
    label: "斧",
    capGroups: [
      "buff_damage_phys_all",
      "buff_damage_phys_axe",
      "debuff_resist_phys_all",
      "debuff_resist_phys_axe",
      ...PHYS_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  BOW: {
    label: "弓",
    capGroups: [
      "buff_damage_phys_all",
      "buff_damage_phys_bow",
      "debuff_resist_phys_all",
      "debuff_resist_phys_bow",
      ...PHYS_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  STAFF: {
    label: "杖",
    capGroups: [
      "buff_damage_phys_all",
      "buff_damage_phys_staff",
      "debuff_resist_phys_all",
      "debuff_resist_phys_staff",
      ...PHYS_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  TOME: {
    label: "本",
    capGroups: [
      "buff_damage_phys_all",
      "buff_damage_phys_tome",
      "debuff_resist_phys_all",
      "debuff_resist_phys_tome",
      ...PHYS_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  FAN: {
    label: "扇",
    capGroups: [
      "buff_damage_phys_all",
      "buff_damage_phys_fan",
      "debuff_resist_phys_all",
      "debuff_resist_phys_fan",
      ...PHYS_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  /* ---------- 属性 ---------- */

  ELEMENT_ALL: {
    label: "全属性",
    capGroups: [
      "buff_damage_elem_all",
      "buff_damage_elem_fire",
      "buff_damage_elem_ice",
      "buff_damage_elem_lightning",
      "buff_damage_elem_wind",
      "buff_damage_elem_light",
      "buff_damage_elem_dark",
      "debuff_resist_elem_all",
      "debuff_resist_elem_fire",
      "debuff_resist_elem_ice",
      "debuff_resist_elem_lightning",
      "debuff_resist_elem_wind",
      "debuff_resist_elem_light",
      "debuff_resist_elem_dark",
      ...ELEM_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  FIRE: {
    label: "火",
    capGroups: [
      "buff_damage_elem_all",
      "buff_damage_elem_fire",
      "debuff_resist_elem_all",
      "debuff_resist_elem_fire",
      ...ELEM_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  ICE: {
    label: "氷",
    capGroups: [
      "buff_damage_elem_all",
      "buff_damage_elem_ice",
      "debuff_resist_elem_all",
      "debuff_resist_elem_ice",
      ...ELEM_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  LIGHTNING: {
    label: "雷",
    capGroups: [
      "buff_damage_elem_all",
      "buff_damage_elem_lightning",
      "debuff_resist_elem_all",
      "debuff_resist_elem_lightning",
      ...ELEM_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  WIND: {
    label: "風",
    capGroups: [
      "buff_damage_elem_all",
      "buff_damage_elem_wind",
      "debuff_resist_elem_all",
      "debuff_resist_elem_wind",
      ...ELEM_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  LIGHT: {
    label: "光",
    capGroups: [
      "buff_damage_elem_all",
      "buff_damage_elem_light",
      "debuff_resist_elem_all",
      "debuff_resist_elem_light",
      ...ELEM_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },

  DARK: {
    label: "闇",
    capGroups: [
      "buff_damage_elem_all",
      "buff_damage_elem_dark",
      "debuff_resist_elem_all",
      "debuff_resist_elem_dark",
      ...ELEM_STAT_GROUPS,
      ...COMMON_CAP_GROUPS,
    ],
  },
}

const CAP_GROUP_UI_DEFINITION = [
  {
    section: "buff",
    label: "味方向けバフ",
    groups: [
      {
        label: "ステータスアップ",
        rows: [
          ["BUFF_STAT_ATK_PHYS", "BUFF_STAT_ATK_ELEM", "BUFF_STAT_DEF_PHYS", "BUFF_STAT_DEF_ELEM"]
        ],
      },
      {
        label: "ダメージアップ",
        rows: [
          ["BUFF_DAMAGE_PHYS_ALL"],
          ["BUFF_DAMAGE_PHYS_SWORD", "BUFF_DAMAGE_PHYS_SPEAR", "BUFF_DAMAGE_PHYS_DAGGER", "BUFF_DAMAGE_PHYS_AXE"],
          ["BUFF_DAMAGE_PHYS_BOW", "BUFF_DAMAGE_PHYS_STAFF", "BUFF_DAMAGE_PHYS_TOME", "BUFF_DAMAGE_PHYS_FAN"],

          ["BUFF_DAMAGE_ELEM_ALL"],
          ["BUFF_DAMAGE_ELEM_FIRE", "BUFF_DAMAGE_ELEM_ICE", "BUFF_DAMAGE_ELEM_LIGHTNING" ,"BUFF_DAMAGE_ELEM_WIND", "BUFF_DAMAGE_ELEM_LIGHT", "BUFF_DAMAGE_ELEM_DARK"]
        ],
      },
      {
        label: "その他",
        rows: [
          ["POWER_UP", "DAMAGE_CAP", "CRITICAL_CERTAIN"]
        ],
      },
    ],
  },

  {
    section: "debuff",
    label: "敵向けデバフ",
    groups: [
      {
        label: "ステータスダウン",
        rows: [
          ["DEBUFF_STAT_ATK_PHYS", "DEBUFF_STAT_ATK_ELEM", "DEBUFF_STAT_DEF_PHYS", "DEBUFF_STAT_DEF_ELEM"]
        ],
      },
      {
        label: "耐性ダウン",
        rows: [
          ["DEBUFF_RESIST_PHYS_ALL"],
          ["DEBUFF_RESIST_PHYS_SWORD", "DEBUFF_RESIST_PHYS_SPEAR", "DEBUFF_RESIST_PHYS_DAGGER", "DEBUFF_RESIST_PHYS_AXE"],
          ["DEBUFF_RESIST_PHYS_BOW", "DEBUFF_RESIST_PHYS_STAFF", "DEBUFF_RESIST_PHYS_TOME", "DEBUFF_RESIST_PHYS_FAN"],

          ["DEBUFF_RESIST_ELEM_ALL"],
          ["DEBUFF_RESIST_ELEM_FIRE", "DEBUFF_RESIST_ELEM_ICE", "DEBUFF_RESIST_ELEM_LIGHTNING", "DEBUFF_RESIST_ELEM_WIND", "DEBUFF_RESIST_ELEM_LIGHT", "DEBUFF_RESIST_ELEM_DARK"]
        ],
      },
    ],
  },
];

const CAP_GROUP_DEFINITIONS = {
  // --- Buff: Stat ---
  BUFF_STAT_ATK_PHYS: {
    label: "物攻アップ",
    capGroups: ["buff_stat_atk_phys"],
  },
  BUFF_STAT_ATK_ELEM: {
    label: "属攻アップ",
    capGroups: ["buff_stat_atk_elem"],
  },
  BUFF_STAT_DEF_PHYS: {
    label: "物防アップ",
    capGroups: ["buff_stat_def_phys"],
  },
  BUFF_STAT_DEF_ELEM: {
    label: "属防アップ",
    capGroups: ["buff_stat_def_elem"],
  },

  // --- Buff: Damage (Physical) ---
  BUFF_DAMAGE_PHYS_ALL: {
    label: "全物理",
    capGroups: ["buff_damage_phys_all"],
  },
  BUFF_DAMAGE_PHYS_SWORD: {
    label: "剣",
    capGroups: ["buff_damage_phys_sword"],
  },
  BUFF_DAMAGE_PHYS_SPEAR: {
    label: "槍",
    capGroups: ["buff_damage_phys_spear"],
  },
  BUFF_DAMAGE_PHYS_DAGGER: {
    label: "短剣",
    capGroups: ["buff_damage_phys_dagger"],
  },
  BUFF_DAMAGE_PHYS_AXE: {
    label: "斧",
    capGroups: ["buff_damage_phys_axe"],
  },
  BUFF_DAMAGE_PHYS_BOW: {
    label: "弓",
    capGroups: ["buff_damage_phys_bow"],
  },
  BUFF_DAMAGE_PHYS_STAFF: {
    label: "杖",
    capGroups: ["buff_damage_phys_staff"],
  },
  BUFF_DAMAGE_PHYS_TOME: {
    label: "本",
    capGroups: ["buff_damage_phys_tome"],
  },
  BUFF_DAMAGE_PHYS_FAN: {
    label: "扇",
    capGroups: ["buff_damage_phys_fan"],
  },

  // --- Buff: Damage (Element) ---
  BUFF_DAMAGE_ELEM_ALL: {
    label: "全属性",
    capGroups: ["buff_damage_elem_all"],
  },
  BUFF_DAMAGE_ELEM_FIRE: {
    label: "火",
    capGroups: ["buff_damage_elem_fire"],
  },
  BUFF_DAMAGE_ELEM_ICE: {
    label: "氷",
    capGroups: ["buff_damage_elem_ice"],
  },
  BUFF_DAMAGE_ELEM_LIGHTNING: {
    label: "雷",
    capGroups: ["buff_damage_elem_lightning"],
  },
  BUFF_DAMAGE_ELEM_WIND: {
    label: "風",
    capGroups: ["buff_damage_elem_wind"],
  },
  BUFF_DAMAGE_ELEM_LIGHT: {
    label: "光",
    capGroups: ["buff_damage_elem_light"],
  },
  BUFF_DAMAGE_ELEM_DARK: {
    label: "闇",
    capGroups: ["buff_damage_elem_dark"],
  },

  // --- Buff: Other ---
  POWER_UP: {
    label: "威力アップ",
    capGroups: ["power_up"],
  },
  DAMAGE_CAP: {
    label: "ダメージ上限アップ",
    capGroups: ["damage_cap"],
  },
  CRITICAL_CERTAIN: {
    label: "必ずクリティカル",
    capGroups: ["critical_certain"],
  },

  // --- Debuff: Stat ---
  DEBUFF_STAT_ATK_PHYS: {
    label: "物攻ダウン",
    capGroups: ["debuff_stat_atk_phys"],
  },
  DEBUFF_STAT_ATK_ELEM: {
    label: "属攻ダウン",
    capGroups: ["debuff_stat_atk_elem"],
  },
  DEBUFF_STAT_DEF_PHYS: {
    label: "物防ダウン",
    capGroups: ["debuff_stat_def_phys"],
  },
  DEBUFF_STAT_DEF_ELEM: {
    label: "属防ダウン",
    capGroups: ["debuff_stat_def_elem"],
  },

  // --- Debuff: Resist ---
  DEBUFF_RESIST_PHYS_ALL: {
    label: "全物理",
    capGroups: ["debuff_resist_phys_all"],
  },
  DEBUFF_RESIST_PHYS_SWORD: {
    label: "剣",
    capGroups: ["debuff_resist_phys_sword"],
  },
  DEBUFF_RESIST_PHYS_SPEAR: {
    label: "槍",
    capGroups: ["debuff_resist_phys_spear"],
  },
  DEBUFF_RESIST_PHYS_DAGGER: {
    label: "短剣",
    capGroups: ["debuff_resist_phys_dagger"],
  },
  DEBUFF_RESIST_PHYS_AXE: {
    label: "斧",
    capGroups: ["debuff_resist_phys_axe"],
  },
  DEBUFF_RESIST_PHYS_BOW: {
    label: "弓",
    capGroups: ["debuff_resist_phys_bow"],
  },
  DEBUFF_RESIST_PHYS_STAFF: {
    label: "杖",
    capGroups: ["debuff_resist_phys_staff"],
  },
  DEBUFF_RESIST_PHYS_TOME: {
    label: "本",
    capGroups: ["debuff_resist_phys_tome"],
  },
  DEBUFF_RESIST_PHYS_FAN: {
    label: "扇",
    capGroups: ["debuff_resist_phys_fan"],
  },

  DEBUFF_RESIST_ELEM_ALL: {
    label: "全属性",
    capGroups: ["debuff_resist_elem_all"],
  },
  DEBUFF_RESIST_ELEM_FIRE: {
    label: "火",
    capGroups: ["debuff_resist_elem_fire"],
  },
  DEBUFF_RESIST_ELEM_ICE: {
    label: "氷",
    capGroups: ["debuff_resist_elem_ice"],
  },
  DEBUFF_RESIST_ELEM_LIGHTNING: {
    label: "雷",
    capGroups: ["debuff_resist_elem_lightning"],
  },
  DEBUFF_RESIST_ELEM_WIND: {
    label: "風",
    capGroups: ["debuff_resist_elem_wind"],
  },
  DEBUFF_RESIST_ELEM_LIGHT: {
    label: "光",
    capGroups: ["debuff_resist_elem_light"],
  },
  DEBUFF_RESIST_ELEM_DARK: {
    label: "闇",
    capGroups: ["debuff_resist_elem_dark"],
  },
};

const SAVE_KEY = "octra-selection-v1";