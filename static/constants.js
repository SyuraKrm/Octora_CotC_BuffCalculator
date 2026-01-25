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
  }
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
  { key: "battle", label: "バトアビ" },
  { key: "ex", label: "EX" },
  { key: "ultimate", label: "必殺技" },
  { key: "support", label: "サポアビ" }
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