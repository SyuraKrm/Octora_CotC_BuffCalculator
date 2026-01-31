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

  document.getElementById("open-help")?.addEventListener("click", () => {
    document.getElementById("help-modal")?.classList.remove("hidden");
  });

  document.getElementById("close-help")?.addEventListener("click", () => {
    document.getElementById("help-modal")?.classList.add("hidden");
  });

  document.getElementById("open-settings")
    .addEventListener("click", () => {
      openSettingsModal();
    });

  const tooltip = document.getElementById("global-tooltip");

  document.addEventListener("mouseover", e => {
    const target = e.target.closest(".has-tooltip");
    if (!target) return;

    const text = target.dataset.tooltip;
    if (!text) return;

    tooltip.textContent = text;
    tooltip.style.opacity = "1";
  });

  document.addEventListener("mousemove", e => {
    if (tooltip.style.opacity !== "1") return;

    state.ui.tooltip.lastMouseEvent = e;
    if (state.ui.tooltip.tooltipRAF) return;

    state.ui.tooltip.tooltipRAF = true;
    requestAnimationFrame(updateTooltipPosition(tooltip));
  }, { passive: true });

  document.addEventListener("mouseout", e => {
    if (!e.target.closest(".has-tooltip")) return;
    tooltip.style.opacity = "0";
  });
}

function updateTooltipPosition(tooltip) {
  state.ui.tooltip.tooltipRAF = false;

  const e = state.ui.tooltip.lastMouseEvent;
  if (!e) return;

  const offset = 12;

  tooltip.style.left = `${e.clientX + offset}px`;
  tooltip.style.top  = `${e.clientY + offset}px`;

  // ★ 表示後にサイズを取得（ここが重いが rAF 内なのでOK）
  const rect = tooltip.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  // 下にはみ出る場合だけ上へずらす
  if (rect.bottom > viewportHeight) {
    const overflow = rect.bottom - viewportHeight;
    tooltip.style.top = `${e.clientY - overflow - offset}px`;
  }
}

function bindSummaryFilterHandlers() {
  // 攻撃 / 防御
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-filter-tab]")
    if (!btn) return

    state.ui.filters.tab = btn.dataset.filterTab
    renderSummaryFilters()
    recalcSummary()
  })

  // 区分・範囲
  document.addEventListener("change", e => {
    if (e.target.name === "stack") {
      state.ui.filters.stackGroup = e.target.value
      recalcSummary()
    }

    if (e.target.name === "scope") {
      state.ui.filters.scope = e.target.value
      recalcSummary()
    }

    if (e.target.id === "summary-character-filter") {
      state.ui.filters.selectedCharacter = e.target.value || null
      recalcSummary()
    }

    if (e.target.id === "attack-category-filter") {
      state.ui.filters.attackCategory = e.target.value || null
      recalcSummary()
    }
  })
}

function bindModalHandlers() {
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

function bindSettingsModalHandlers() {
  document
    .getElementById("settingsModalOkBtn")
    .addEventListener("click", confirmSettingsModal)

  document
    .getElementById("settingsModalCancelBtn")
    .addEventListener("click", closeSettingsModal)

  document
    .getElementById("settingsModalResetBtn")
    .addEventListener("click", resetHighlightSettings);
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
  calculate(); // 常時発動効果のみで一度再計算
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

  document.querySelectorAll(".modal-tab")
    .forEach(b => b.classList.remove("active"));

  document.querySelectorAll(".modal-tab")[0].classList.add("active")

  renderAbilityModal()
}

function handleAbilityModalTabClick(tab) {
  state.ui.abilityModal.tab = tab;
  renderAbilityModal();
}

function onAbilityToggle(sourceType, abilityName, target) {
  const temp = state.ui.abilityModal.tempSelected[sourceType]

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

  renderAll()
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
  list = list.filter(e => filterCapGroupsByAttackCategory(e, state.ui.filters.attackCategory))
  list = list.filter(e => isEffectVisible(
    e, state.ui.filters.scope, state.ui.filters.selectedCharacter))

  rows = aggregateToSummaryRows(list)
  rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey))

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
  return activeStackGroup === getTargetStackGroup(effect)
}

function filterCapGroupsByAttackCategory(effect, selectedKey) {
  const def = ATTACK_CATEGORY_FILTERS[selectedKey];

  if (!def) return false
  if (def.capGroups === null) return true // null は「すべて」の時のみ
  return def.capGroups.includes(effect.cap_group)
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

  // 味方単体は一旦必ず含めておく
  if (scopes.includes("ally_single")) visibleByCharacter = true;

  // バディは一旦必ず含めておく
  if (scopes.includes("buddy")) visibleByCharacter = true;

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
    if (!shouldCreateSummaryRow(effects)) continue
    rows.push(buildSummaryRow(effects))
  }

  return rows
}

function groupByCapGroup(effects) {
  const map = new Map()

  for (const e of effects) {
    const key = [
      e.cap_group
    ].join("|")

    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key).push(e)
  }

  return map
}

function shouldCreateSummaryRow(effectsInGroup) {
  return effectsInGroup.some(e => e.category !== "cap_increase")
}

function buildSummaryRow(effectsInGroup) {

  let base = null
  for (const e of effectsInGroup) {
    if (e.category !== "cap_increase") {
      base = e;
      break;
    }
  }

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
      unit: base.unit,
      sum,
      cap,
      applied,
      capped: cap != null && applied == cap,
      cap_increased: cap != null && cap > defaultCap
    },

    meta: {
      stack_group: getTargetStackGroup(base),
      sources: effectsInGroup
    },

    sortKey: buildSortKey(base)
  }
}

function buildSortKey(baseEffect) {
  return [
    ROLE_ORDER[baseEffect.role] ?? 99,
    CATEGORY_ORDER[baseEffect.category] ?? 99,
    SUB_CATEGORY_ORDER[baseEffect.sub_category] ?? 99,
    TAG_ORDER[baseEffect.tag] ?? 99
  ].join("|")
}

function getTargetStackGroup(effect) {
  if (!effect.target_source_type) return effect.stack_group
  return SOURCE_RULES[effect.target_source_type].stack_group
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

////////////////////////////
// ハイライト回り
////////////////////////////

function confirmSettingsModal() {
  state.ui.settingsModal.open = false;

  applyHighlightSettings();
  renderAll();
}

function openSettingsModal() {

  state.ui.settingsModal = {
    open: true,
  }

  renderSettingsModal();
}

function applyHighlightSettings() {
  const capGroups = [...document.querySelectorAll(
    '#settings-modal input[data-cap-key]:checked'
  )].map(el => el.dataset.capKey);

  const stackGroups = [...document.querySelectorAll(
    '#settings-modal input[data-stack-key]:checked'
  )].map(el => el.dataset.stackKey);

  const onlyHighlights = document.querySelector(
    '#settings-modal input[data-only-highlights]'
  )?.checked ?? false;

  state.ui.highlightSettings = {
    cap_groups: capGroups,
    stack_groups: stackGroups,
    view_only_highlights: onlyHighlights,
  };

  buildHighlightIndex();
}

function buildHighlightIndex() {
  const { cap_groups, stack_groups } = state.ui.highlightSettings;

  if (!cap_groups.length || !stack_groups.length) {
    state.highlightIndex = null;
    return;
  }

  const characterIds = new Set();
  const abilityNames = new Set();

  for (const stack of stack_groups) {
    const stackData = state.capGroupIndex[stack];
    if (!stackData) continue;

    for (const cap_def of cap_groups) {
      const caps = CAP_GROUP_DEFINITIONS[cap_def].capGroups;
      for (const cap of caps) {
        const entry = stackData[cap];
        if (!entry) continue;
  
        entry.characters?.forEach(id => characterIds.add(id));
        entry.abilities?.forEach(name => abilityNames.add(name));
      }
    }
  }

  state.highlightIndex = {
    characterIds,
    abilityNames,
  };
}

function closeSettingsModal() {
  state.ui.settingsModal.open = false;

  renderSettingsModal();
}

async function loadGroupedData() {
  await fetch("/highlight-index")
    .then(r => r.json())
    .then(data => {
      state.capGroupIndex = normalize(data)
    })
}

function normalize(rawIndex) {
  const result = {}

  for (const [stackGroup, capGroups] of Object.entries(rawIndex)) {
    result[stackGroup] = {}

    for (const [capGroup, entry] of Object.entries(capGroups)) {
      result[stackGroup][capGroup] = {
        characters: new Set(entry.characters ?? []),
        abilities: new Set(entry.abilities ?? []),
      }
    }
  }

  return result
}

function resetHighlightSettings() {
  // cap_group → 全OFF
  document.querySelectorAll(
    '#settings-modal input[data-cap-key]'
  ).forEach(cb => cb.checked = false);

  // stack_group → battle のみON
  document.querySelectorAll(
    '#settings-modal input[data-stack-key]'
  ).forEach(cb => {
    cb.checked = (cb.dataset.stackKey === "battle");
  });
}


////////////////////////////
// ローカルストレージ周り
////////////////////////////

function saveSelection() {
  const data = collectSelectionState();
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  showSaveLoadMessage("保存しました！");
}

function collectSelectionState() {
  return {
    version: 1,
    party: [...state.party],
  };
}

function loadSelection() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;

  const data = JSON.parse(raw);

  state.party = data.party;

  rebuildAfterSelectionChange();
  showSaveLoadMessage("ロードしました！");
}

function rebuildAfterSelectionChange() {
  buildHighlightIndex();
  renderAll();
  calculate();
}

let messageTimer = null;

function showSaveLoadMessage(text) {
  const el = document.getElementById("save-load-message");
  if (!el) return;

  el.textContent = text;
  el.classList.add("visible");

  if (messageTimer) {
    clearTimeout(messageTimer);
  }

  messageTimer = setTimeout(() => {
    el.classList.remove("visible");
    el.textContent = "";
  }, 2500);
}
