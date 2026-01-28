// ui_render.js
function renderAll() {
  renderCharacterAbilityCards();
  renderAbilityModal();
  renderSettingsModal();
  renderSummaryFilters();
  recalcSummary();
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
      renderCharacterTabBody(body, slotIndex, t.key, t.targets);
    };

    div.appendChild(btn);
  });

  return div;
}

function renderCharacterTabBody(container, slotIndex, tab, targets) {
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
    targets.forEach(t => {
      let temp = character.abilities.filter(a =>
        a.source_type === t.type &&
        SOURCE_RULES[a.source_type]?.always_on
      );
      temp.forEach(a => {
        a.ability_prefix = t.prefix
      });
      abilities = abilities.concat(temp);
    });
  }

  if (abilities.length === 0) {
    container.innerHTML = `<div class="empty-abilities">（アビリティ未選択）</div>`;
    return;
  }

  abilities.forEach(a => {
    const div = document.createElement("div");
    div.className = "card-ability";
    if (isHighlightedAbility(a.ability_name)) {
      div.classList.add("highlight");
    }
    const prefix = a.ability_prefix? a.ability_prefix: ""

    div.innerHTML = `
      <strong>${prefix}${a.ability_name}</strong>
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
      if (isHighlightedCharacter(c.character_id)) {
        opt.classList.add("highlight");
      }
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
    if (tab === "ex") return a.source_type === "ex" || a.source_type === "override" || a.source_type === "ultimate";
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
    if (isHighlightedAbility(a.ability_name)) {
      div.classList.add("highlight");
    }

    div.innerHTML = `
      <label>
        <input type="checkbox"
               class="ability-checkbox"}
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

    if (isHighlightedAbility(a.ability_name)) {
      div.classList.add("highlight");
    }

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

function renderSummaryFilters() {
  const root = document.getElementById("summary-filters")
  if (!root) return

  const { tab, stackGroup, scope, selectedCharacter, attackCategory } = state.ui.filters

  root.innerHTML = `
    <div class="filter-group">
      <div class="filter-title has-tooltip"
          data-tooltip="味方の攻撃に関連するバフ・デバフか
      味方の防御に関連するバフ・デバフかを切り替えられます。">
        対象
      </div>
      <div class="filter-options">
        <button data-filter-tab="attack" class="${tab === "attack" ? "active" : ""}">攻撃</button>
        <button data-filter-tab="defense" class="${tab === "defense" ? "active" : ""}">防御</button>
        <button data-filter-tab="both" class="${tab === "both" ? "active" : ""}">両方</button>
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-title has-tooltip"
          data-tooltip="バフ・デバフの枠種別で絞り込みます。">
        区分
      </div>
      <div class="filter-options">
        ${renderRadio("stack", "battle", "バトアビ", stackGroup)}
        ${renderRadio("stack", "support", "サポアビ", stackGroup)}
        ${renderRadio("stack", "ultimate", "必殺技", stackGroup)}
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-title has-tooltip"
          data-tooltip="どの列を対象としたバフを合算するか指定します。
      例えば「前衛のみ」だと「前衛全体」「前後衛全体」を合算します。
      「すべて」だと「前衛全体」「後衛全体」「前後衛全体」を合算します。">
        合算対象
      </div>
      <div class="filter-options">
        ${renderRadio("scope", "both", "すべて", scope)}
        ${renderRadio("scope", "front", "前衛のみ", scope)}
        ${renderRadio("scope", "back", "後衛のみ", scope)}
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-title has-tooltip"
          data-tooltip="効果を「誰視点」で見るかを指定します。
      列対象効果に加えて、自身対象の効果なども合算されます。">
        キャラ視点
      </div>
      <div class="filter-options">
        ${renderCharacterSelect(selectedCharacter)}
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-title has-tooltip"
          data-tooltip="表示する効果を、攻撃種に関連するものに絞り込みます。">
        攻撃種
      </div>
      <div class="filter-options">
        ${renderAttackCategorySelect(attackCategory)}
      </div>
    </div>
  `
}

function renderRadio(name, value, label, current) {
  return `
    <label class="filter-radio">
      <input type="radio" name="${name}" value="${value}" ${current === value ? "checked" : ""}>
      ${label}
    </label>
  `
}

function renderCharacterSelect(selectedCharacterId) {
  const options = state.party
    .filter(p => p.character_id)
    .map(p => {
      const ch = state.characters.find(c => c.character_id === p.character_id)
      return `<option value="${ch.character_id}" ${selectedCharacterId === ch.character_id ?
         "selected" : ""}>${ch.character_name}</option>`
    })
    .join("")

  return `
    <select id="summary-character-filter">
      <option value="">全員共通</option>
      ${options}
    </select>
  `
}

function renderAttackCategorySelect(selectedKey) {
  const options = Object.entries(ATTACK_CATEGORY_FILTERS)
    .map(([key, def]) => {
      return `<option value="${key}" ${key === selectedKey ? "selected" : ""}>
        ${def.label}
      </option>`
    })
    .join("")

  return `
    <select id="attack-category-filter">
      ${options}
    </select>
  `
}

function renderSummary(rows) {
  const tbody = document.querySelector("#effect-summary-body")
  if (!tbody) return

  tbody.innerHTML = ""

  let lastGroupKey = null
  let isOddGroup = false

  for (const row of rows) {
    const groupKey = `${row.key.role}|${row.key.category}|${row.key.sub_category}`

    if (groupKey !== lastGroupKey) {
      isOddGroup = !isOddGroup
      lastGroupKey = groupKey
    }

    const tr = renderSummaryRow(row)

    if (isOddGroup) {
      tr.classList.add("group-odd")
    } else {
      tr.classList.add("group-even")
    }

    tbody.appendChild(tr)
  }
}

function renderSummaryRow(row) {
  const tr = document.createElement("tr")
  tr.className = "summary-row"

  tr.dataset.capGroup = row.key.cap_group ?? ""
  tr.dataset.stackGroup = row.meta.stack_group

  tr.appendChild(td(row, row.label.target, "col-target"))
  tr.appendChild(td(row, row.label.effect, "col-effect"))
  tr.appendChild(td(row, row.label.type, "col-type"))

  tr.appendChild(td(row, formatValue(row.value.sum, row.value.unit), "col-sum"))
  const capTd = td(row, formatCap(row.value.cap, row.value.unit), "col-cap")
  if (row.value.cap_increased) {
    capTd.classList.add("cap-increased");
  }
  tr.appendChild(capTd)
  const appliedTd = td(row, formatApplied(row.value, row.value.unit), "col-applied")
  if (row.value.capped) {
    appliedTd.classList.add("capped");
  }
  tr.appendChild(appliedTd)

  return tr
}

function td(row, text, className) {
  const el = document.createElement("td");
  el.textContent = text;
  if (className) el.className = className;

  const sources = row.meta.sources;
  if (!Array.isArray(sources) || sources.length === 0) return el;

  const tooltipLines = sources
    .map(s => {
      if (!s?.ability_name) return null;

      const char = s.character_name ?? "不明";
      const suffix = s.category === "cap_increase"
        ? "【上限】"
        : ` ${s.value}${s.unit}`;

      return `${char}：${s.ability_name}${suffix}`;
    })
    .filter(Boolean);

  if (tooltipLines.length > 0) {
    el.classList.add("has-tooltip");
    el.dataset.tooltip = tooltipLines.join("\n");
  }

  return el;
}

function formatValue(value, unit) {
  return `${value}${unit}`
}

function formatCap(cap, unit) {
  return cap == null ? "―" : `${cap}${unit}`
}

function formatApplied(value, unit) {
  return value.capped
    ? `${value.applied}${unit}`
    : `${value.applied}${unit}`
}


/////////////////////////
// 設定モーダル 
/////////////////////////

function renderSettingsModal() {
  const modal = document.getElementById("settings-modal");

  if (!state.ui.settingsModal.open) {
    modal.classList.add("hidden");
    return;
  }

  modal.classList.remove("hidden");

  const modalBody = modal.querySelector(".modal-body");
  modalBody.innerHTML = "";

  /* ===== 保存 / ロード セクション ===== */
  const saveSection = document.createElement("section");
  saveSection.className = "settings-section save-load-section";

  const saveTitle = document.createElement("div");
  saveTitle.className = "settings-section-title has-tooltip";
  saveTitle.textContent = "キャラ・アビリティ選択状況の保存／ロード";
  saveTitle.setAttribute(
    "data-tooltip",
    "キャラクターおよびアビリティの選択状況を保存・ロードします。"
  );

  const buttonRow = document.createElement("div");
  buttonRow.className = "save-load-buttons";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-save";
  saveBtn.textContent = "保存";
  saveBtn.addEventListener("click", saveSelection);

  const loadBtn = document.createElement("button");
  loadBtn.className = "btn btn-load";
  loadBtn.textContent = "ロード";
  loadBtn.addEventListener("click", loadSelection);

  const message = document.createElement("span");
  message.id = "save-load-message";
  message.className = "save-load-message";
  
  buttonRow.append(saveBtn, loadBtn);
  buttonRow.appendChild(message);
  saveSection.append(saveTitle, buttonRow);

  modalBody.appendChild(saveSection);

  /* ===== ハイライト設定 ===== */
  const title = document.createElement("div");
  title.className = "highlight-title has-tooltip";
  title.textContent = "ハイライト設定";
  title.setAttribute(
    "data-tooltip",
    "選択した効果を所持するキャラクターやアビリティを強調表示します。\n" +
    "区分（バトアビ or サポアビ or 必殺技）とバフ・デバフ効果の両方を選択してください。"
  );

  modalBody.appendChild(title)

  renderStackGroupOptions(modalBody);
  renderCapGroupHighlightOptions(modalBody);

  bindSettingsModalHandlers();
}

function renderCapGroupHighlightOptions(container) {
  const section = document.createElement("section");
  section.className = "cap-group-options";

  section.innerHTML = CAP_GROUP_UI_DEFINITION.map(section => `
    <div class="highlight-section">
      <div class="highlight-section-title">${section.label}</div>
      ${section.groups.map(group => `
        <div class="highlight-group">
          <div class="highlight-group-title">${group.label}</div>
          <div class="highlight-options">
            ${group.items.map(key => {
              const checked = state.ui.highlightSettings?.cap_groups.includes(key);
              return `
                <label>
                  <input type="checkbox"
                         data-cap-key="${key}"
                         ${checked ? "checked" : ""}>
                  ${CAP_GROUP_DEFINITIONS[key].label}
                </label>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `).join("");
  
  container.appendChild(section)
}

function renderCapGroupHighlightOptions(container) {
  const section = document.createElement("section");
  section.className = "cap-highlight-root";

  section.innerHTML = 
    CAP_GROUP_UI_DEFINITION.map(section => `
    <div class="highlight-section">
      <div class="highlight-section-title">${section.label}</div>
      ${section.groups.map(group => `
        <div class="highlight-category">
          <div class="highlight-category-title">${group.label}</div>

          ${group.rows.map(row => `
            <div class="highlight-row">
              ${row.map(key => {
                const checked = state.ui.highlightSettings?.cap_groups.includes(key);
                const def = CAP_GROUP_DEFINITIONS[key];
                if (!def) return "";

                return `
                  <label class="highlight-option">
                    <input type="checkbox"
                          data-cap-key="${key}"
                          ${checked ? "checked" : ""}>
                    <span>${def.label}</span>
                  </label>
                `;
              }).join("")}
            </div>
          `).join("")}
        </div>
      `).join("")}
      </div>
    `).join("");

  container.appendChild(section);
}


function renderStackGroupOptions(container) {
  const section = document.createElement("section");
  section.className = "stack-group-options";

  section.innerHTML = ``;

  Object.entries(STACK_GROUP_DEFINITIONS).forEach(([key, def]) => {
    const label = document.createElement("label");
    const checked = state.ui.highlightSettings?.stack_groups.includes(key);

    label.innerHTML = `
      <input
        type="checkbox"
        data-stack-key="${key}"
        ${checked ? "checked" : ""}
      />
      ${def.label}
    `;

    section.appendChild(label);
  });

  container.appendChild(section);
}


/////////////////////////
// 共通系 
/////////////////////////

function isHighlightedCharacter(characterId) {
  return state.highlightIndex?.characterIds.has(characterId);
}

function isHighlightedAbility(abilityName) {
  return state.highlightIndex?.abilityNames.has(abilityName);
}
