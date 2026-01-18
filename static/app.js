let abilitiesData = null;
let currentImpact = "offense";

async function loadAbilities() {
  const res = await fetch("/abilities");
  abilitiesData = await res.json();

  const select = document.getElementById("characterSelect");
  select.innerHTML = "";

  abilitiesData.characters.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.character;
    opt.textContent = c.character;
    select.appendChild(opt);
  });

  select.addEventListener("change", renderAbilities);
  renderAbilities();
}

function renderAbilities() {
  const char = document.getElementById("characterSelect").value;
  const box = document.getElementById("abilities");
  box.innerHTML = "";

  const data = abilitiesData.characters.find(c => c.character === char);
  if (!data) return;

  data.abilities
    .filter(a => a.source_type === "battle")
    .forEach(a => {
      const div = document.createElement("div");

      div.innerHTML = `
        <label>
          <input type="checkbox" data-ability="${a.ability_name}">
          <strong>${a.ability_name}</strong>
        </label>
        <div class="desc">${a.description.join("<br>")}</div>
      `;

      box.appendChild(div);
    });
}

async function calculate() {
  const character = document.getElementById("characterSelect").value;

  const checked = [...document.querySelectorAll("input[type=checkbox]:checked")]
    .map(c => ({
      character: c.dataset.character,
      ability_name: c.dataset.ability
    }));

  const payload = {
    selected_abilities: checked,
    presets: [],
    impact: "offense"
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

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.role}</td>
      <td>${r.category}</td>
      <td>${r.sub_category ?? "-"}</td>
      <td>${r.tag ?? "-"}</td>
      <td>${r.total}</td>
      <td>${r.cap}</td>
      <td>${r.effective}</td>
    `;
    tbody.appendChild(tr);
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

function triggerCalculate(payload) {
  console.log("triggerCalculate called", payload);

  fetch("/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(res => {
    console.log("response status", res.status);
    return res.json();
  })
  .then(data => {
    console.log("response json", data);
  })
  .catch(err => {
    console.error("fetch error", err);
  });
}
