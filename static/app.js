// app.js

let currentImpact = "offense";

async function loadCharacters() {
  const res = await fetch("/characters");
  data = await res.json();
  
  state.characters = data.characters;

  //initPartySlots();
}

async function init() {
  await loadCharacters();
  await loadGroupedData();
  bindHandlers();
  bindSummaryFilterHandlers();

  renderAll();
}

init();
console.log("app.js loaded");


///////////////////////////////
// ここから先は v2 の実装そのまま 
///////////////////////////////

// 既に未使用のはず
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

// 既に未使用のはず
function populateCharacterSelect(slotDiv, slotState) {
  const select = slotDiv.querySelector(".character-select");
  select.innerHTML = `<option value="">（未選択）</option>`;

  const byJob = {};

  state.characters.forEach(c => {
    if (!byJob[c.job]) {
      byJob[c.job] = [];
    }
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
      opt.textContent = `${c.character_name} ★${(c.rarity)}`;
      optgroup.appendChild(opt);
    });

    select.appendChild(optgroup);
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

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.currentImpact = btn.dataset.tab;
    calculate();
  });
});
