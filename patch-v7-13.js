/* v0.7.13 — Reset Back navigation and add matrix race/class filters. */
(() => {
  const VERSION = "0.7.13";
  const NAV_KEY = "wcpNavV713";

  let restoring = false;
  let pendingRegularNavigation = false;
  let explicitFilterOrigin = "";
  let pendingAfterFilter = "";
  let pendingDashboardReturn = false;
  let matrixFilter = null;
  let activeState = null;

  const makeState = (role, view, extra = {}) => ({[NAV_KEY]:true, role, view, ...extra});
  const isOurState = state => !!state && typeof state === "object" && state[NAV_KEY] === true;

  function clearNativeFilters() {
    ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"].forEach(id => {
      const el = document.querySelector(`#${id}`);
      if (el) el.value = "";
    });
  }

  function clearCharacterFilters() {
    document.querySelector("#v77DashboardFilter [data-v77-clear]")?.click();
    document.querySelector("#v78SummaryFilter [data-v78-clear]")?.click();
    matrixFilter = null;
    clearNativeFilters();
  }

  function hasCharacterFilters() {
    const native = ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"]
      .some(id => String(document.querySelector(`#${id}`)?.value || "").trim() !== "");
    return native || !!matrixFilter ||
      !!document.querySelector("#v77DashboardFilter [data-v77-clear]") ||
      !!document.querySelector("#v78SummaryFilter [data-v78-clear]");
  }

  function restoreView(view) {
    restoring = true;
    try {
      previousSetView(view || "dashboard");
      if ((view || "dashboard") === "characters") renderCharacters();
      else if ((view || "dashboard") === "dashboard") renderDashboard();
      else if ((view || "dashboard") === "matrix") renderMatrix();
    } finally {
      restoring = false;
    }
  }

  function replaceState(role, view, extra = {}) {
    const next = makeState(role, view, extra);
    try { history.replaceState(next, "", location.href); } catch {}
    activeState = next;
    return next;
  }

  function pushState(role, view, extra = {}) {
    const next = makeState(role, view, extra);
    try { history.pushState(next, "", location.href); } catch {}
    activeState = next;
    return next;
  }

  /* Start from one clean logical root. Old v0.7.10–0.7.12 handlers are shims now. */
  replaceState("dashboard", "dashboard");

  document.addEventListener("click", e => {
    if (e.target.closest?.("[data-view],[data-jump]")) {
      pendingRegularNavigation = true;
      setTimeout(() => { pendingRegularNavigation = false; }, 0);
    }
  }, true);

  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest?.("[data-view],[data-jump]")) {
      pendingRegularNavigation = true;
      setTimeout(() => { pendingRegularNavigation = false; }, 0);
    }
  }, true);

  const previousSetView = setView;
  setView = function(view) {
    const target = String(view || "dashboard");
    if (restoring) return previousSetView(target);

    const source = currentView || activeState?.view || "dashboard";
    const regularNavigation = pendingRegularNavigation;
    pendingRegularNavigation = false;

    if (target === source) {
      explicitFilterOrigin = "";
      return previousSetView(target);
    }

    const filterOrigin = explicitFilterOrigin ||
      (target === "characters" && source !== "characters" && !regularNavigation && hasCharacterFilters() ? source : "");
    explicitFilterOrigin = "";

    /* Leaving a temporary filtered result via the bottom navigation collapses the
       result first, so the next Back always goes straight to the overview. */
    if (activeState?.role === "filter" && regularNavigation) {
      pendingAfterFilter = target;
      const steps = activeState.origin === "dashboard" ? -1 : -2;
      try { history.go(steps); } catch {
        clearCharacterFilters();
        previousSetView(target);
        if (target === "dashboard") replaceState("dashboard", "dashboard");
        else pushState("view", target);
      }
      return;
    }

    if (target === "dashboard") {
      clearCharacterFilters();
      if (source === "dashboard") return previousSetView("dashboard");
      pendingDashboardReturn = true;
      try { history.back(); } catch {
        previousSetView("dashboard");
        replaceState("dashboard", "dashboard");
      }
      return;
    }

    previousSetView(target);

    if (filterOrigin) {
      pushState("filter", target, {origin:filterOrigin});
      return;
    }

    if (source === "dashboard") {
      pushState("view", target, {origin:"dashboard"});
    } else {
      replaceState("view", target, {origin:"dashboard"});
    }
  };

  window.addEventListener("popstate", e => {
    const departing = activeState;
    const target = isOurState(e.state) ? e.state : null;

    if (pendingAfterFilter) {
      const nextView = pendingAfterFilter;
      pendingAfterFilter = "";
      clearCharacterFilters();
      restoreView("dashboard");
      replaceState("dashboard", "dashboard");
      if (nextView !== "dashboard") {
        restoreView(nextView);
        pushState("view", nextView, {origin:"dashboard"});
      }
      return;
    }

    if (pendingDashboardReturn) {
      pendingDashboardReturn = false;
      clearCharacterFilters();
      activeState = target || makeState("dashboard", "dashboard");
      restoreView("dashboard");
      if (!target || target.view !== "dashboard") replaceState("dashboard", "dashboard");
      return;
    }

    if (departing?.role === "filter") {
      clearCharacterFilters();
      const origin = departing.origin || target?.view || "dashboard";
      activeState = target || makeState(origin === "dashboard" ? "dashboard" : "view", origin);
      restoreView(origin);
      if (!target) replaceState(origin === "dashboard" ? "dashboard" : "view", origin, {origin:"dashboard"});
      return;
    }

    if (departing?.role === "view" && departing.view !== "dashboard") {
      clearCharacterFilters();
      activeState = target || makeState("dashboard", "dashboard");
      restoreView("dashboard");
      if (!target || target.view !== "dashboard") replaceState("dashboard", "dashboard");
      return;
    }

    /* On the overview we intentionally do nothing. Android/browser Back can then
       leave the installed PWA normally; there is no extra exit-popup logic anymore. */
    activeState = target || activeState;
  });

  /* Matrix-only race filter. Class filters can use the existing class dropdown. */
  const previousGetFilteredCharacters = getFilteredCharacters;
  getFilteredCharacters = function() {
    const list = previousGetFilteredCharacters();
    if (!matrixFilter) return list;
    const race = String(matrixFilter.race || "").toLocaleLowerCase("de");
    const faction = String(matrixFilter.faction || "").toLocaleLowerCase("de");
    return list.filter(c =>
      String(c.race || "").toLocaleLowerCase("de") === race &&
      (!faction || String(c.faction || "").toLocaleLowerCase("de") === faction)
    );
  };

  function ensureMatrixFilterChip() {
    const count = document.querySelector("#characterCount");
    if (!count) return null;
    let host = document.querySelector("#v713MatrixFilter");
    if (!host) {
      host = document.createElement("div");
      host.id = "v713MatrixFilter";
      host.className = "v77-filter-host";
      count.insertAdjacentElement("afterend", host);
      host.addEventListener("click", e => {
        if (!e.target.closest("[data-v713-clear]")) return;
        matrixFilter = null;
        const faction = document.querySelector("#filterFaction");
        if (faction) faction.value = "";
        renderCharacters();
      });
    }
    return host;
  }

  function renderMatrixFilterChip() {
    const host = ensureMatrixFilterChip();
    if (!host) return;
    if (!matrixFilter) {
      host.innerHTML = "";
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const suffix = matrixFilter.faction ? ` · ${escapeHtml(matrixFilter.faction)}` : "";
    host.innerHTML = `<button type="button" class="v77-filter-chip" data-v713-clear title="Matrix-Filter entfernen"><span>Volk · ${escapeHtml(matrixFilter.race)}${suffix}</span><b aria-hidden="true">×</b><span class="sr-only">Filter entfernen</span></button>`;
  }

  const previousRenderCharacters = renderCharacters;
  renderCharacters = function() {
    previousRenderCharacters();
    renderMatrixFilterChip();
  };

  function raceFromRow(row) {
    const key = row?.querySelector?.(".matrix-cell[data-v3-race]")?.dataset?.v3Race;
    if (!key) return null;
    return RACES.find(r => (r.key || `${r.name}|${r.faction}`) === key) || null;
  }

  function classFromHeader(th) {
    const row = th?.parentElement;
    if (!row) return "";
    const columnIndex = Array.from(row.children).indexOf(th) + 1;
    if (columnIndex < 2) return "";
    const cell = document.querySelector(`#raceClassMatrix tbody tr td:nth-child(${columnIndex}) .matrix-cell[data-class]`);
    return String(cell?.dataset?.class || "");
  }

  function openMatrixRaceFilter(race) {
    if (!race) return;
    clearCharacterFilters();
    matrixFilter = {race:race.name, faction:race.faction};
    const faction = document.querySelector("#filterFaction");
    if (faction && [...faction.options].some(o => o.value === race.faction)) faction.value = race.faction;
    explicitFilterOrigin = "matrix";
    setView("characters");
    renderCharacters();
    toast(`${race.name} als Filter gesetzt`);
  }

  function openMatrixClassFilter(className) {
    if (!className) return;
    clearCharacterFilters();
    const select = document.querySelector("#filterClass");
    if (select && [...select.options].some(o => o.value === className)) select.value = className;
    explicitFilterOrigin = "matrix";
    setView("characters");
    renderCharacters();
    toast(`${className} als Filter gesetzt`);
  }

  function decorateMatrixFilters() {
    const table = document.querySelector("#raceClassMatrix");
    if (!table) return;

    table.querySelectorAll("thead th.v75-class-head").forEach(th => {
      const className = classFromHeader(th);
      if (!className) return;
      th.dataset.v713Class = className;
      th.classList.add("v713-matrix-filter-link");
      th.setAttribute("role", "button");
      th.setAttribute("tabindex", "0");
      th.setAttribute("aria-label", `${className} in der Charakterliste anzeigen`);
      th.title = `${className} in der Charakterliste anzeigen`;
    });

    table.querySelectorAll("tbody tr").forEach(row => {
      const race = raceFromRow(row);
      const cell = row.querySelector(":scope > td:first-child");
      if (!race || !cell) return;
      cell.dataset.v713Race = race.key || `${race.name}|${race.faction}`;
      cell.classList.add("v713-matrix-filter-link");
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute("aria-label", `${race.name} (${race.faction}) in der Charakterliste anzeigen`);
      cell.title = `${race.name} (${race.faction}) in der Charakterliste anzeigen`;
    });
  }

  const previousRenderMatrix = renderMatrix;
  renderMatrix = function() {
    previousRenderMatrix();
    decorateMatrixFilters();
  };

  const matrix = document.querySelector("#raceClassMatrix");
  if (matrix && !matrix.dataset.v713Filters) {
    matrix.dataset.v713Filters = "1";
    matrix.addEventListener("click", e => {
      const classHead = e.target.closest("th[data-v713-class]");
      if (classHead) {
        e.preventDefault();
        openMatrixClassFilter(classHead.dataset.v713Class);
        return;
      }
      const raceCell = e.target.closest("tbody td[data-v713-race]");
      if (raceCell) {
        e.preventDefault();
        const key = raceCell.dataset.v713Race;
        const race = RACES.find(r => (r.key || `${r.name}|${r.faction}`) === key);
        openMatrixRaceFilter(race);
      }
    });

    matrix.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const classHead = e.target.closest("th[data-v713-class]");
      if (classHead) {
        e.preventDefault();
        openMatrixClassFilter(classHead.dataset.v713Class);
        return;
      }
      const raceCell = e.target.closest("tbody td[data-v713-race]");
      if (raceCell) {
        e.preventDefault();
        const key = raceCell.dataset.v713Race;
        const race = RACES.find(r => (r.key || `${r.name}|${r.faction}`) === key);
        openMatrixRaceFilter(race);
      }
    });
  }

  const style = document.createElement("style");
  style.textContent = `
    #raceClassMatrix .v713-matrix-filter-link{cursor:pointer;outline:none;transition:background .14s ease,filter .14s ease}
    #raceClassMatrix .v713-matrix-filter-link:hover{background:rgba(212,175,55,.08)!important;filter:brightness(1.12)}
    #raceClassMatrix .v713-matrix-filter-link:focus-visible{box-shadow:inset 0 0 0 2px rgba(242,210,119,.58)}
    #raceClassMatrix thead th.v713-matrix-filter-link:active,#raceClassMatrix tbody td.v713-matrix-filter-link:active{background:rgba(212,175,55,.14)!important}
  `;
  document.head.appendChild(style);

  decorateMatrixFilters();
  renderMatrixFilterChip();

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
