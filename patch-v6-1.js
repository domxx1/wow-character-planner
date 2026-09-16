/* v0.6.1 — Show total, existing and planned character counts in all summary bars. */
(() => {
  const VERSION = "0.6.1";

  function isExisting(c) {
    return c.status !== "Geplant";
  }

  function statsFor(list) {
    const total = list.length;
    const planned = list.filter(c => c.status === "Geplant").length;
    const existing = list.filter(isExisting).length;
    return { total, existing, planned };
  }

  function metricMarkup(stats) {
    return `
      <span class="v61-metric"><b>${stats.total}</b><small>gesamt</small></span>
      <span class="v61-metric"><b>${stats.existing}</b><small>vorhanden</small></span>
      <span class="v61-metric"><b>${stats.planned}</b><small>geplant</small></span>`;
  }

  function enhanceRows(rootSelector, matcher) {
    const root = document.querySelector(rootSelector);
    if (!root) return;
    root.querySelectorAll(".v51-row").forEach(row => {
      const name = row.querySelector(".v51-name")?.textContent?.trim() || "";
      const count = row.querySelector(".v51-count");
      if (!count || !name) return;
      const list = characters.filter(c => matcher(c, name));
      count.classList.add("v61-count");
      count.innerHTML = metricMarkup(statsFor(list));
    });
  }

  function ensureExistingCard() {
    const grid = document.querySelector("#dashboard .stat-grid");
    const totalCard = document.querySelector("#statCharacters")?.closest(".stat-card");
    if (!grid || !totalCard) return;

    let card = document.querySelector("#statExisting")?.closest(".stat-card");
    if (!card) {
      card = document.createElement("article");
      card.className = "stat-card";
      card.innerHTML = '<div class="stat-label">Vorhanden</div><div class="stat-value" id="statExisting">0</div><div class="stat-note">tatsächlich erstellt</div>';
      totalCard.insertAdjacentElement("afterend", card);
    }

    const existing = characters.filter(isExisting).length;
    const planned = characters.filter(c => c.status === "Geplant").length;
    document.querySelector("#statCharacters").textContent = characters.length;
    document.querySelector("#statExisting").textContent = existing;
    if (document.querySelector("#statPlanned")) document.querySelector("#statPlanned").textContent = planned;
  }

  function enhanceDashboard() {
    ensureExistingCard();
    enhanceRows("#v51FactionBars", (c, name) => c.faction === name);
    enhanceRows("#classCoverage", (c, name) => c.className === name);
    enhanceRows("#armorCoverage", (c, name) => classInfo(c.className).armor === name);
  }

  function enhanceProfessions() {
    enhanceRows("#professionCoverage", (c, name) => c.profession1 === name || c.profession2 === name);
  }

  const previousRenderDashboard = renderDashboard;
  renderDashboard = function() {
    previousRenderDashboard();
    enhanceDashboard();
  };

  const previousRenderProfessions = renderProfessions;
  renderProfessions = function() {
    previousRenderProfessions();
    enhanceProfessions();
  };

  const style = document.createElement("style");
  style.textContent = `
    #dashboard .stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
    .v51-row{grid-template-columns:minmax(92px,145px) minmax(110px,1fr) minmax(210px,auto)}
    .v51-count.v61-count{display:flex;align-items:center;justify-content:flex-end;gap:10px}
    .v61-metric{display:inline-grid;grid-template-columns:auto;line-height:1.05;text-align:right}
    .v61-metric b{font-size:.9rem;color:var(--text)}
    .v61-metric small{font-size:.64rem;color:var(--muted);margin-top:2px}
    @media(max-width:640px){
      #dashboard .stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      .v51-row{grid-template-columns:minmax(72px,96px) minmax(70px,1fr) minmax(112px,auto);gap:6px}
      .v51-count.v61-count{display:grid;grid-template-columns:1fr;gap:2px}
      .v61-metric{display:flex;justify-content:flex-end;gap:4px;align-items:baseline}
      .v61-metric b{font-size:.78rem}.v61-metric small{font-size:.57rem;margin:0}
    }
  `;
  document.head.appendChild(style);

  enhanceDashboard();
  enhanceProfessions();

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
