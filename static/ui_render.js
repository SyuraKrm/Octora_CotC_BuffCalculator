// ui_render.js
function renderAll() {
  renderCharacterAbilityCards();
  renderAbilityModal();
  //renderSummary();
}

function renderExcludeSummary() {
  renderCharacterAbilityCards();
  renderAbilityModal();
}

/////////////////////////
// キャラクターカード 
/////////////////////////

function renderCharacterAbilityCards() {
  const container = document.querySelector(".character-ability-cards");
  container.innerHTML = "";

  state.party.forEach((slot, index) => {
    container.appendChild(
      renderSingleCharacterCard(slot, index)
    );
  });
}

function renderSingleCharacterCard(slot, slotIndex) {
  const div = document.createElement("div");
  div.className = "character-card";

  const character = slot.character_id
    ? state.characters.find(c => c.character_id === slot.character_id)
    : null;

  const divLeft = renderCharacterHeader(character, slotIndex);
  const tabs = renderCharacterTabs(slotIndex);

  const divRight = document.createElement("div");
  divRight.className = "card-right";

  const body = document.createElement("div");
  body.className = "card-tab-body";

  // 初期タブは battle
  renderCharacterTabBody(body, slotIndex, "battle");

  // .character-card
  // ├ .card-left (card-header)
  // └ .card-right
  //      ├ card-tabs
  //      └ card-tab-body

  divRight.appendChild(tabs);
  divRight.appendChild(body);

  div.appendChild(divLeft);
  div.appendChild(divRight);

  return div;
}

function renderCharacterHeader(character, slotIndex) {
  const div = document.createElement("div");
  div.className = "card-left";

  const selector = renderCharacterSelectorAccordion(character, slotIndex);

  div.appendChild(selector);

  const btn = document.createElement("button");
  btn.className = "ability-edit-btn"
  btn.textContent = "バトアビ選択";
  btn.disabled = !character;
  btn.onclick = () => openAbilityModal(slotIndex);

  div.appendChild(btn);

  return div;
}

function renderCharacterTabs(slotIndex) {
  const div = document.createElement("div");
  div.className = "card-tabs";

  CHARACTER_TABS.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.textContent = t.label;
    btn.className = "card-tab";
    if (i === 0) btn.classList.add("active");

    btn.onclick = () => {
      const card = btn.closest(".character-card");
      card.querySelectorAll(".card-tab")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const body = card.querySelector(".card-tab-body");
      renderCharacterTabBody(body, slotIndex, t.key);
    };

    div.appendChild(btn);
  });

  return div;
}

function renderCharacterTabBody(container, slotIndex, tab) {
  container.innerHTML = "";

  const slot = state.party[slotIndex];
  const character = state.characters.find(
    c => c.character_id === slot.character_id
  );

  if (!character) return;

  let abilities = [];

  if (tab === "battle") {
    abilities = character.abilities.filter(a =>
      a.source_type === "battle" &&
      slot.selected_abilities.battle.includes(a.ability_name)
    );
  } else {
    abilities = character.abilities.filter(a =>
      a.source_type === tab &&
      SOURCE_RULES[a.source_type]?.always_on
    );
  }

  if (abilities.length === 0) {
    container.innerHTML = `<div class="empty-abilities">（アビリティ未選択）</div>`;
    return;
  }

  abilities.forEach(a => {
    const div = document.createElement("div");
    div.className = "card-ability";

    div.innerHTML = `
      <strong>${a.ability_name}</strong>
      <div class="desc">
        ${a.description}
      </div>
    `;

    container.appendChild(div);
  });
}

/* アコーディオン機能を搭載したカスタムSelector */
function renderCharacterSelectorAccordion(character, slotIndex) {
  const wrapper = document.createElement("div");
  wrapper.className = "character-select";

  // 表示部
  const selected = document.createElement("div");
  selected.className = "selected-character";
  if (character && character.character_id) {
    selected.textContent = getCharacterLabel(character);
    selected.classList.add("has-value");
  } else {
    selected.textContent = "キャラクターを選択";
    selected.classList.remove("has-value");
  }

  wrapper.appendChild(selected);

  // ドロップダウン
  const dropdown = document.createElement("div");
  dropdown.className = "character-dropdown hidden";

  // スクロールバー用に1クッションかませる
  const dropdownScroll = document.createElement("div");
  dropdownScroll.className = "dropdown-scroll";
  dropdown.appendChild(dropdownScroll);

  const reset = document.createElement("div");
  reset.className = "reset-option";
  reset.textContent = "（選択をリセット）";

  reset.addEventListener("click", () => {
    handleCharacterSelect(slotIndex, null);
    dropdown.classList.add("hidden");
  });

  dropdownScroll.appendChild(reset);  

  const byJob = {};
  state.characters.forEach(c => {
    if (!byJob[c.job]) byJob[c.job] = [];
    byJob[c.job].push(c);
  });

  JOB_ORDER.forEach(job => {
    const chars = byJob[job];
    if (!chars) return;

    chars.sort(characterCompare);

    const group = document.createElement("div");
    group.className = "job-group";

    const header = document.createElement("div");
    header.className = "job-header";
    header.textContent = job;

    const list = document.createElement("div");
    list.className = "job-characters";

    header.addEventListener("click", () => {
      group.classList.toggle("open");
    });

    chars.forEach(c => {
      const opt = document.createElement("div");
      opt.className = "char-option";
      opt.textContent = getCharacterLabel(c);

      opt.addEventListener("click", () => {
        handleCharacterSelect(slotIndex, c.character_id);
        dropdown.classList.add("hidden");
      });

      list.appendChild(opt);
    });

    group.appendChild(header);
    group.appendChild(list);
    dropdownScroll.appendChild(group);
  });

  wrapper.appendChild(dropdown);

  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
    onOpenCharacterSelector(wrapper);
  });

  return wrapper;
}

/* 標準の Selct 要素を用いたキャラ選択の作成 */
function renderCharacterSelectorLegacy(character, slotIndex) {
  const select = document.createElement("select");
  select.innerHTML = `<option value="">（未選択）</option>`;

  const byJob = {};
  state.characters.forEach(c => {
    byJob[c.job] ??= [];
    byJob[c.job].push(c);
  });

  JOB_ORDER.forEach(job => {
    const chars = byJob[job];
    if (!chars) return;

    chars.sort(characterCompare);

    const optgroup = document.createElement("optgroup");
    optgroup.label = job;

    chars.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.character_id;
      opt.textContent = `${c.character_name} ★${c.rarity}`;
      if (character && c.character_id === character.character_id) {
        opt.selected = true;
      }
      optgroup.appendChild(opt);
    });

    select.appendChild(optgroup);
  });

  select.onchange = () => {
    handleCharacterSelect(slotIndex, select.value || null);
  };

  return select;
}


/////////////////////////
// アビリティ選択モーダル 
/////////////////////////

function renderAbilityModal() {
  const characters = state.characters;
  if (!characters) return;

  const modal = document.getElementById("abilityModal");

  if (!state.ui.abilityModal.open) {
    modal.classList.add("hidden");
    return;
  }

  modal.classList.remove("hidden");

  const slotIndex = state.ui.abilityModal.slotIndex;
  const partySlot = state.party[slotIndex];
  const character = characters.find(
    c => c.character_id === partySlot.character_id
  );

  document.getElementById("modalCharacterName").textContent =
    character?.character_name ?? "";

  renderAbilityModalBody();

  bindModalHandlers();
}

// ui_render.js
function renderAbilityModalBody() {
  const characters = state.characters;
  if (!characters) return;

  const modalBody = document.querySelector("#abilityModal .modal-body");
  modalBody.innerHTML = "";

  const { slotIndex, tab } = state.ui.abilityModal;
  if (slotIndex == null) return;

  const partySlot = state.party[slotIndex];
  if (!partySlot.character_id) return;

  const character = characters.find(
    c => c.character_id === partySlot.character_id
  );
  if (!character) return;

  const abilities = character.abilities.filter(a => {
    if (tab === "battle") return a.source_type === "battle";
    if (tab === "support") return a.source_type === "support";
    if (tab === "ex") return a.source_type === "ex" || a.source_type === "ultimate";
    return false;
  });

  // ★ここで描画を分岐
  if (tab === "battle") {
    renderBattleAbilities(modalBody, abilities);
    updateBattleAbilityCheckboxState();
  } else {
    renderReadonlyAbilities(modalBody, abilities);
  }
}

function renderBattleAbilities(container, abilities) {

  const temp = state.ui.abilityModal.tempSelected["battle"];

  if (temp.size >= MAX_BATTLE_ABILITIES) {
    const note = document.createElement("div");
    note.className = "limit-note";
    note.textContent = "※ バトルアビリティは最大4つまで選択できます";
    //container.appendChild(note);
  }

  abilities.forEach(a => {
    const checked =
      temp.has(a.ability_name);

    const div = document.createElement("div");
    div.className = "modal-ability";

    div.innerHTML = `
      <label>
        <input type="checkbox"
               class="ability-checkbox"
               data-ability="${a.ability_name}"
               data-source_type="${a.source_type}"
               ${checked ? "checked" : ""}>
        <strong>${a.ability_name}</strong>
      </label>
      <div class="desc">${a.description?.join("<br>") ?? ""}</div>
    `;

    container.appendChild(div);
  });
}

function renderReadonlyAbilities(container, abilities) {
  abilities.forEach(a => {
    const div = document.createElement("div");
    div.className = "modal-ability readonly";

    div.innerHTML = `
      <strong>${a.ability_name}</strong>
      <div class="desc">${a.description?.join("<br>") ?? ""}</div>
    `;

    container.appendChild(div);
  });
}

function characterCompare(a, b) {
  // 1. rarity 降順
  const rDiff = Number(b.rarity) - Number(a.rarity);
  if (rDiff !== 0) return rDiff;

  // 2. 五十音順（実用）
  return a.character_name.localeCompare(
    b.character_name,
    "ja"
  );
}

function getCharacterLabel(character) {
  return `${character.character_name} ★${character.rarity}`
}

/////////////////////////
// 効果サマリーペイン 
/////////////////////////

function renderSummary(rows) {
  const tbody = document.querySelector("#effect-summary-body")
  if (!tbody) return

  tbody.innerHTML = ""

  for (const row of rows) {
    tbody.appendChild(renderSummaryRow(row))
  }
}

function renderSummaryRow(row) {
  const tr = document.createElement("tr")
  tr.className = "summary-row"

  tr.dataset.capGroup = row.key.cap_group ?? ""
  tr.dataset.stackGroup = row.meta.stack_group

  tr.appendChild(td(row.label.target, "col-target"))
  tr.appendChild(td(row.label.effect, "col-effect"))
  tr.appendChild(td(row.label.type, "col-type"))

  tr.appendChild(td(formatValue(row.value.sum), "col-sum"))
  tr.appendChild(td(formatCap(row.value.cap), "col-cap"))
  tr.appendChild(td(formatApplied(row.value), "col-applied"))

  if (row.value.capped) {
    tr.classList.add("is-capped")
  }

  return tr
}

function td(text, className) {
  const el = document.createElement("td")
  el.textContent = text
  if (className) el.className = className
  return el
}

function formatValue(value) {
  return `${value}%`
}

function formatCap(cap) {
  return cap == null ? "―" : `${cap}%`
}

function formatApplied(value) {
  return value.capped
    ? `${value.applied}%`
    : `${value.applied}%`
}


/////////////////////////
// ここから先は v2 の実装 
/////////////////////////

function renderAbilities(slotDiv, slotState) {
  const box = slotDiv.querySelector(".abilities-box");
  box.innerHTML = "";

  const charData = state.characters.find(
    c => c.character_id === slotState.character
  );
  if (!charData) return;

  const bySource = {};
  charData.abilities.forEach(a => {
    bySource[a.source_type] ||= [];
    bySource[a.source_type].push(a);
  });

  Object.entries(bySource).forEach(([source, abilities]) => {
    renderAbilitySection(box, slotState, source, abilities);
  });
}

function renderAbilitySection(container, slotState, source, abilities) {
  const section = document.createElement("div");
  section.className = `ability-section ${source}`;

  const title = {
    battle: "バトルアビリティ",
    ex: "EXアビリティ（常時）",
    support: "サポートアビリティ（常時）",
    ultimate: "必殺技（常時）",
  }[source] ?? source;

  section.innerHTML = `<h4>${title}</h4>`;

  abilities.forEach(a => {
    const div = document.createElement("div");
    div.className = "ability";

    const rule = SOURCE_RULES[source];

    if (rule.always_on) {
      div.innerHTML = `
        <strong>${a.ability_name}</strong>
        <span class="always-on">常時発動</span>
        <div class="desc">${a.description.join("<br>")}</div>
      `;
    } else {
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
    }

    section.appendChild(div);
  });

  container.appendChild(section);
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

function makeGroupKey(effect) {
  return effect.cap_group ?? "__no_group__"
}


