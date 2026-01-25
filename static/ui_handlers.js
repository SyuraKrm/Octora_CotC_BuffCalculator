// ui_handlers.js
function bindHandlers() {
  document.addEventListener("click", (e) => {
    if (!state.ui.characterSelectorOpen) return;

    const wrapper = state.ui.openSelectorWrapper;
    if (!wrapper.contains(e.target)) {
      closeCharacterSelector();
    }
  });

  document.querySelectorAll(".modal-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-tab")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      handleAbilityModalTabClick(btn.dataset.tab);
    });
  });
}

function bindModalHandlers() {
  document.querySelectorAll(".modal-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-tab")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      handleAbilityModalTabClick(btn.dataset.tab);
    });
  });

  document
    .querySelectorAll(".ability-checkbox")
    .forEach(cb => cb.addEventListener("change", onToggleAbility))

  document
    .getElementById("modalOkBtn")
    .addEventListener("click", onConfirmAbilityModal)

  document
    .getElementById("modalCancelBtn")
    .addEventListener("click", onCancelAbilityModal)

//  document
//    .getElementById("modalCloseBtn")
//    .addEventListener("click", onCancelAbilityModal);
}

function onOpenCharacterSelector(wrapper) {
  openCharacterSelector(wrapper)
}

function onCloseCharacterSelector() {
  closeCharacterSelector()
}

function onOpenAbilityModal(slotIndex) {
  openAbilityModal(slotIndex)
}

function onToggleAbility(e) {
  const { source_type, ability } = e.target.dataset
  onAbilityToggle(source_type, ability, e.target)
}

function onConfirmAbilityModal() {
  confirmAbilityModal()
}

function onCancelAbilityModal() {
  closeAbilityModal()
}

function handleCharacterSelect(slotIndex, characterId) {
  const slot = state.party[slotIndex];

  slot.slotIndex = slotIndex;
  slot.character_id = characterId;

  // キャラを変えたらアビリティはリセット
  slot.selected_abilities = {
    battle: [],
    //ex: [],
    //support: []
  };

  renderAll();
}

function openCharacterSelector(wrapper) {
  state.ui.characterSelectorOpen = true;
  state.ui.openSelectorWrapper = wrapper;
}

function closeCharacterSelector() {
  const dropdown = document.querySelector(".character-dropdown:not(.hidden)");
  if (dropdown) dropdown.classList.add("hidden");

  state.ui.characterSelectorOpen = false;
  state.ui.openSelectorWrapper = null;
}

function openAbilityModal(slotIndex, tab = "battle") {
  const slot = state.party[slotIndex]

  state.ui.abilityModal = {
    open: true,
    slotIndex: slotIndex,
    tab: tab,
    tempSelected: {
      battle: new Set(slot.selected_abilities.battle),
      //ex: new Set(slot.selected_abilities.ex),
      //support: new Set(slot.selected_abilities.support),
    }
  }

  renderAbilityModal()
}

function handleAbilityModalTabClick(tab) {
  state.ui.abilityModal.tab = tab;
  renderAbilityModal();
}

function onAbilityToggle(sourceType, abilityName, target) {
  const temp = state.ui.abilityModal.tempSelected[sourceType]

  const { slotIndex } = state.ui.abilityModal;
  const slot = state.party[slotIndex];

  if (target.checked) {
    if (temp.size >= MAX_BATTLE_ABILITIES) {
        // 制限超過 → 元に戻す
        target.checked = false;
        return;
    }
    temp.add(abilityName)
  } else {
    temp.delete(abilityName)
  }

  updateBattleAbilityCheckboxState();
}

function updateBattleAbilityCheckboxState() {
  const temp = state.ui.abilityModal.tempSelected["battle"]

  const checkboxes = document.querySelectorAll(
    "#abilityModal .ability-checkbox"
  );

  checkboxes.forEach(cb => {
    const ability = cb.dataset.ability;
    const isChecked = temp.has(ability);

    // 4個選択済み & 未選択 → disable
    cb.disabled = temp.size >= MAX_BATTLE_ABILITIES && !isChecked;
  });
}

function confirmAbilityModal() {
  const { slotIndex, tempSelected } = state.ui.abilityModal
  const slot = state.party[slotIndex]

  slot.selected_abilities = {
    battle: Array.from(tempSelected.battle),
    //ex: Array.from(tempSelected.ex),
    //support: Array.from(tempSelected.support),
  }

  state.ui.abilityModal.open = false

  renderExcludeSummary()
  calculate() // 効果再計算
}

function closeAbilityModal() {
  state.ui.abilityModal.open = false;
  state.ui.abilityModal.slotIndex = null;

  renderAbilityModal();
}

async function calculate() {
  const selected = [];

  state.party.forEach(slot => {
    if (!slot.character_id) return;

    const charData = state.characters.find(
      c => c.character_id === slot.character_id
    );
    if (!charData) return;

    charData.abilities.forEach(ability => {
      const rule = SOURCE_RULES[ability.source_type];
      if (!rule) return;

      const picked =
        rule.always_on ||
        slot.selected_abilities[ability.source_type]?.includes(
          ability.ability_name
        );

      if (!picked) return;

      selected.push({
        character_id: slot.character_id,
        ability_name: ability.ability_name,
      });
    });
  });

  const payload = {
    selected_abilities: selected,
  };

  const res = await fetch("/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  state.effects = data.effects;

  recalcSummary();
}

function recalcSummary() {
  let list = state.effects

  list = list.filter(e => filterByRoleCategory(e, state.ui.filters.tab))
  list = list.filter(e => filterByStackGroup(e, state.ui.filters.stackGroup))
  list = list.filter(e => isEffectVisible(
    e, state.ui.filters.scope, state.ui.filters.selectedCharacter))

  rows = aggregateToSummaryRows(list)

  renderSummary(rows)
}

function filterByRoleCategory(effect, activeTab) {
  const rules = EFFECT_ROLE_MAP[activeTab]
  if (!rules) return false

  return rules.some(rule =>
    effect.role === rule.role &&
    effect.category === rule.category &&
    (!rule.sub_category || effect.sub_category === rule.sub_category)
  )
}

function filterByStackGroup(effect, activeStackGroup) {
  return activeStackGroup === effect.stack_group
}

function isEffectVisible(effect, viewScope, selectedCharacterId) {
  const scopes = effect.scopes

  // 敵向けは無条件に含めておく
  if (scopes.includes("enemy_single")) return true
  if (scopes.includes("enemy_all")) return true
  if (scopes.includes("random")) return true

  // 「自信を除く」かつ「その人のアビ」である場合は除外
  if (scopes.includes("self_exclude") && selectedCharacterId && effect.character_id === selectedCharacterId) {
    return false
  }

  let visibleByScope = false;
  let visibleByCharacter = false;

  if (viewScope === "both") {
    visibleByScope = scopes.some(s =>
      s === "ally_front_all" ||
      s === "ally_back_all" ||
      s === "ally_all"
    )
  }

  if (viewScope === "front") {
    visibleByScope = scopes.some(s =>
      s === "ally_front_all" ||
      s === "ally_all"
    )
  }

  if (viewScope === "back") {
    visibleByScope = scopes.some(s =>
      s === "ally_back_all" ||
      s === "ally_all"
    )
  }

  // 味方単体は一旦必ず含めておく？
  if (scopes.includes("ally_single")) visibleByCharacter = true;

  if (selectedCharacterId) {
    if (scopes.includes("self")) {
      visibleByCharacter = effect.character_id === selectedCharacterId
    }
  } else {
    // キャラが選択されていない = 誰視点かわからないので自己以外バフは一旦必ず含めておく
    if (scopes.includes("self_exclude")) visibleByCharacter = true;
  }

  return visibleByScope || visibleByCharacter
}

function aggregateToSummaryRows(filteredEffects) {
  const groups = groupByCapGroup(filteredEffects)
  const rows = []

  for (const effects of groups.values()) {
    rows.push(buildSummaryRow(effects))
  }

  return rows
}

function groupByCapGroup(effects) {
  const map = new Map()

  for (const e of effects) {
    const key = [
      e.role,
      e.category,
      e.sub_category,
      e.tag
    ].join("|")

    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key).push(e)
  }

  return map
}

function buildSummaryRow(effectsInGroup) {
  const base = effectsInGroup[0]

  const sum = effectsInGroup
    .filter(e => e.category !== "cap_increase")
    .reduce((acc, e) => acc + e.value, 0)

  let defaultCap = CATEGORY_CAP_MAP[base.category];

  const cap = Math.max(defaultCap, 
    effectsInGroup
      .filter(e => e.category === "cap_increase" && e.cap_group)
      .reduce((max, e) => Math.max(max, e.value), null))

  const applied = cap != null ? Math.min(sum, cap) : sum

  return {
    key: {
      role: base.role,
      category: base.category,
      sub_category: base.sub_category,
      tag: base.tag,
      cap_group: base.cap_group
    },

    label: {
      target: roleToJP(base.role),
      effect: effectContentToJP(base),
      type: tagToJP(base.tag)
    },

    value: {
      sum,
      cap,
      applied,
      capped: cap != null && sum > cap
    },

    meta: {
      stack_group: base.stack_group,
      sources: effectsInGroup
    }
  }
}

function roleToJP(role) {
  return ROLE_JP[role] ?? role
}

function tagToJP(tag) {
  if (!tag) return "―"
  return TAG_JP[tag] ?? tag
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
