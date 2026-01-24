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
        source_type: ability.source_type
      });
    });
  });

  const payload = {
    selected_abilities: selected,
    presets: [],
    impact: state.currentImpact
  };

  const res = await fetch("/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  renderTable(data.rows);
}
