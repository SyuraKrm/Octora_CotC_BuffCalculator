let abilitiesData = null;
let currentImpact = "offense";

// 8スロット固定
const partySlots = Array.from({ length: 8 }, (_, i) => ({
  slot: i,
  character: null,
  selectedAbilities: []
}));

async function loadAbilities() {
  const res = await fetch("/abilities");
  abilitiesData = await res.json();

  initPartySlots();
}

function initPartySlots() {
  const container = document.querySelector(".party-slots");
  container.innerHTML = "";

  partySlots.forEach(slot => {
    const div = document.createElement("div");
    div.className = "party-slot empty";
    div.dataset.slot = slot.slot;

    div.innerHTML = `
      <div class="slot-header">
        <select class="character-select">
          <option value="">（未選択）</option>
        </select>
      </div>
      <div class="abilities-box"></div>
    `;

    container.appendChild(div);

    populateCharacterSelect(div, slot);
  });
}

function populateCharacterSelect(slotDiv, slotState) {
  const select = slotDiv.querySelector(".character-select");

  abilitiesData.characters.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.character;
    opt.textContent = c.character;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    slotState.character = select.value || null;
    slotState.selectedAbilities = [];

    if (slotState.character) {
      slotDiv.classList.remove("empty");
      renderAbilities(slotDiv, slotState);
    } else {
      slotDiv.classList.add("empty");
      slotDiv.querySelector(".abilities-box").innerHTML = "";
    }

    calculate();
  });
}

function renderAbilities(slotDiv, slotState) {
  const box = slotDiv.querySelector(".abilities-box");
  box.innerHTML = "";

  const charData = abilitiesData.characters.find(
    c => c.character === slotState.character
  );
  if (!charData) return;

  charData.abilities
    .filter(a => a.source_type === "battle")
    .forEach(a => {
      const div = document.createElement("div");
      div.className = "ability";

      div.innerHTML = `
        <label>
          <input type="checkbox" data-ability="${a.ability_name}">
          <strong>${a.ability_name}</strong>
        </label>
        <div class="desc">${a.description.join("<br>")}</div>
      `;

      const checkbox = div.querySelector("input");
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          slotState.selectedAbilities.push(a.ability_name);
        } else {
          slotState.selectedAbilities =
            slotState.selectedAbilities.filter(x => x !== a.ability_name);
        }
        calculate();
      });

      box.appendChild(div);
    });
}

async function calculate() {
  const selected = [];

  partySlots.forEach(slot => {
    if (!slot.character) return;

    slot.selectedAbilities.forEach(name => {
      selected.push({
        character: slot.character,
        ability_name: name
      });
    });
  });

  const payload = {
    selected_abilities: selected,
    presets: [],
    impact: currentImpact
  };

  const res = await fetch("/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  renderTable(data.rows);
}

function renderTable(rows) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  let prevGroupKey = null

  rows.forEach(r => {
    const groupKey = makeGroupKey(r)
    const isSameGroup = groupKey === prevGroupKey

    const tr = document.createElement("tr");

    if (isSameGroup) {
      tr.classList.add("group-continued")
    } else {
      tr.classList.add("group-start")
    }

    tr.innerHTML = `
      <td>${roleToJP(r.role)}</td>
      <td>${effectContentToJP(r)}</td>
      <td>${tagToJP(r.tag)}</td>
      <td>${r.total}%</td>
      <td>${r.cap}%</td>
      <td>${r.effective}%</td>
    `;
    tbody.appendChild(tr);
    prevGroupKey = groupKey
  });
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentImpact = btn.dataset.tab;
    calculate();
  });
});

loadAbilities();
console.log("app.js loaded");

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

function roleToJP(role) {
  return ROLE_JP[role] ?? role
}

function effectContentToJP(effect) {
  const { role, category, sub_category } = effect

  const isBuff = role === "buff"
  const isCritCertain = (category === "critical" && sub_category === "certain")
  const suffix = isCritCertain ? "" : isBuff ? "アップ" : "ダウン"

  // CATEGORY + SUB
  if (sub_category && EFFECT_CORE_JP[category]?.[sub_category]) {
    return EFFECT_CORE_JP[category][sub_category] + suffix
  }

  // CATEGORY fallback
  if (CATEGORY_FALLBACK_JP[category]) {
    return CATEGORY_FALLBACK_JP[category] + suffix
  }

  // unknown 可視化
  return `${category}${sub_category ? ":" + sub_category : ""}`
}

function tagToJP(tag) {
  if (!tag) return "―"
  return TAG_JP[tag] ?? tag
}

function makeGroupKey(effect) {
  return effect.cap_group ?? "__no_group__"
}
