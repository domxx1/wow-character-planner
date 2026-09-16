/* v0.7.7 — Dashboard bars open the character list with matching filters. */
(() => {
  const VERSION = "0.7.7";
  const GROUP_STORAGE_KEY = "wowCharacterPlanner.peopleGroups.v1";
  let dashboardFilter = null;

  const lower = value => String(value || "").trim().toLocaleLowerCase("de");

  function clearNativeFilters() {
    const values = {
      searchInput: "",
      filterFaction: "",
      filterClass: "",
      filterStatus: "",
      filterRemix: "",
      filterRealm: ""
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = document.querySelector(`#${id}`);
      if (el) el.value = value;
    });
    dashboardFilter = null;
  }

  function peopleGroupRaces(groupName) {
    let groups = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY) || "[]");
      groups = Array.isArray(parsed) ? parsed : [];
    } catch {}
    const group = groups.find(g => !g?.deleted && lower(g?.name) === lower(groupName));
    if (!group || !Array.isArray(group.members)) return [];

    const names = [];
    group.members.forEach(token => {
      const value = String(token || "");
      if (value.startsWith("custom:")) {
        const id = value.slice(7);
        RACES.filter(r => r?.customId === id).forEach(r => names.push(r.name));
        return;
      }
      if (value.startsWith("builtin:")) {
        const key = value.slice(8);
        RACES.filter(r => !r?.custom && lower(r?.name) === key).forEach(r => names.push(r.name));
      }
    });
    return [...new Set(names.filter(Boolean))];
  }

  function rowName(row) {
    const source = row?.querySelector(".v51-name");
    if (!source) return "";
    const clone = source.cloneNode(true);
    clone.querySelectorAll("small").forEach(el => el.remove());
    return String(clone.textContent || "").trim();
  }

  function applyDashboardCriterion(root, row) {
    const name = rowName(row);
    if (!name) return;
    clearNativeFilters();

    if (root.id === "v51FactionBars") {
      const select = document.querySelector("#filterFaction");
      if (select && [...select.options].some(option => option.value === name)) select.value = name;
      setView("characters");
      renderCharacters();
      toast(`${name} als Filter gesetzt`);
      return;
    }

    if (root.id === "classCoverage") {
      const select = document.querySelector("#filterClass");
      if (select && [...select.options].some(option => option.value === name)) select.value = name;
      setView("characters");
      renderCharacters();
      toast(`${name} als Filter gesetzt`);
      return;
    }

    if (root.id === "armorCoverage") {
      dashboardFilter = {kind:"armor", value:name, label:`Rüstung · ${name}`};
      setView("characters");
      renderCharacters();
      toast(`${name} als Filter gesetzt`);
      return;
    }

    if (root.id === "v67PeopleCoverage") {
      if (row.classList.contains("v67-group-row")) {
        const races = peopleGroupRaces(name);
        dashboardFilter = {kind:"races", values:races, label:`Völker-Gruppe · ${name}`};
      } else {
        dashboardFilter = {kind:"race", value:name, label:`Volk · ${name}`};
      }
      setView("characters");
      renderCharacters();
      toast(`${name} als Filter gesetzt`);
    }
  }

  const previousGetFilteredCharacters = getFilteredCharacters;
  getFilteredCharacters = function() {
    const list = previousGetFilteredCharacters();
    if (!dashboardFilter) return list;
    if (dashboardFilter.kind === "armor") {
      return list.filter(c => classInfo(c.className).armor === dashboardFilter.value);
    }
    if (dashboardFilter.kind === "race") {
      const wanted = lower(dashboardFilter.value);
      return list.filter(c => lower(c.race) === wanted);
    }
    if (dashboardFilter.kind === "races") {
      const wanted = new Set((dashboardFilter.values || []).map(lower));
      return list.filter(c => wanted.has(lower(c.race)));
    }
    return list;
  };

  function ensureFilterChip() {
    const count = document.querySelector("#characterCount");
    if (!count) return null;
    let host = document.querySelector("#v77DashboardFilter");
    if (!host) {
      host = document.createElement("div");
      host.id = "v77DashboardFilter";
      host.className = "v77-filter-host";
      count.insertAdjacentElement("afterend", host);
      host.addEventListener("click", e => {
        const clear = e.target.closest("[data-v77-clear]");
        if (!clear) return;
        dashboardFilter = null;
        renderCharacters();
      });
    }
    return host;
  }

  function renderFilterChip() {
    const host = ensureFilterChip();
    if (!host) return;
    if (!dashboardFilter) {
      host.innerHTML = "";
      host.hidden = true;
      return;
    }
    host.hidden = false;
    host.innerHTML = `<button type="button" class="v77-filter-chip" data-v77-clear title="Übersicht-Filter entfernen"><span>${escapeHtml(dashboardFilter.label)}</span><b aria-hidden="true">×</b><span class="sr-only">Filter entfernen</span></button>`;
  }

  const previousRenderCharacters = renderCharacters;
  renderCharacters = function() {
    previousRenderCharacters();
    renderFilterChip();
  };

  function decorateDashboardRows() {
    const selectors = ["#v51FactionBars", "#classCoverage", "#armorCoverage", "#v67PeopleCoverage"];
    selectors.forEach(selector => {
      document.querySelectorAll(`${selector} .v51-row`).forEach(row => {
        const name = rowName(row);
        if (!name) return;
        row.classList.add("v77-dashboard-link");
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `${name} in der Charakterliste filtern`);
      });
    });
  }

  const dashboard = document.querySelector("#dashboard");
  if (dashboard && !dashboard.dataset.v77FilterLinks) {
    dashboard.dataset.v77FilterLinks = "1";
    dashboard.addEventListener("click", e => {
      const row = e.target.closest(".v77-dashboard-link");
      if (!row || !dashboard.contains(row)) return;
      const root = row.closest("#v51FactionBars,#classCoverage,#armorCoverage,#v67PeopleCoverage");
      if (root) applyDashboardCriterion(root, row);
    });
    dashboard.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const row = e.target.closest(".v77-dashboard-link");
      if (!row || !dashboard.contains(row)) return;
      e.preventDefault();
      const root = row.closest("#v51FactionBars,#classCoverage,#armorCoverage,#v67PeopleCoverage");
      if (root) applyDashboardCriterion(root, row);
    });
  }

  const previousRenderDashboard = renderDashboard;
  renderDashboard = function() {
    previousRenderDashboard();
    decorateDashboardRows();
  };

  const style = document.createElement("style");
  style.textContent = `
    .v77-dashboard-link{cursor:pointer;border-radius:8px;transition:background .14s ease,filter .14s ease;outline:none}
    .v77-dashboard-link:hover{background:rgba(255,255,255,.035)}
    .v77-dashboard-link:focus-visible{box-shadow:0 0 0 2px rgba(242,210,119,.62)}
    .v77-dashboard-link .v51-track{transition:filter .14s ease,transform .14s ease}
    .v77-dashboard-link:hover .v51-track,.v77-dashboard-link:focus-visible .v51-track{filter:brightness(1.16)}
    .v77-filter-host{display:flex;align-items:center;margin:-2px 0 10px}
    .v77-filter-host[hidden]{display:none!important}
    .v77-filter-chip{display:inline-flex;align-items:center;gap:8px;min-height:34px;padding:6px 10px;border:1px solid rgba(212,175,55,.42);border-radius:999px;background:rgba(212,175,55,.09);color:var(--gold-2);font-size:.76rem;font-weight:750}
    .v77-filter-chip b{font-size:1rem;line-height:1;color:var(--muted)}
    .v77-filter-chip:hover{background:rgba(212,175,55,.15)}
    .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
    @media(max-width:640px){.v77-dashboard-link{min-height:44px}.v77-filter-chip{min-height:38px;font-size:.72rem}}
  `;
  document.head.appendChild(style);

  decorateDashboardRows();
  renderFilterChip();

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
