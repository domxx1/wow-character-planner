/* v0.7.8 — Dashboard summary cards open the character list with matching scope. */
(() => {
  const VERSION = "0.7.8";
  let summaryFilter = "";

  function clearNativeFilters() {
    ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"].forEach(id => {
      const el = document.querySelector(`#${id}`);
      if (el) el.value = "";
    });
  }

  function clearDashboardFilter() {
    const button = document.querySelector("#v77DashboardFilter [data-v77-clear]");
    if (button) button.click();
  }

  function openCharacterList(mode) {
    summaryFilter = "";
    clearDashboardFilter();
    clearNativeFilters();

    if (mode === "existing") {
      summaryFilter = "existing";
    } else if (mode === "planned") {
      const status = document.querySelector("#filterStatus");
      if (status) status.value = "Geplant";
    }

    setView("characters");
    renderCharacters();

    if (mode === "existing") toast("Vorhandene Charaktere angezeigt");
    else if (mode === "planned") toast("Geplante Charaktere angezeigt");
    else toast("Alle Charaktere angezeigt");
  }

  const previousGetFilteredCharacters = getFilteredCharacters;
  getFilteredCharacters = function() {
    const list = previousGetFilteredCharacters();
    if (summaryFilter === "existing") return list.filter(c => c.status !== "Geplant");
    return list;
  };

  function ensureSummaryChip() {
    const count = document.querySelector("#characterCount");
    if (!count) return null;
    let host = document.querySelector("#v78SummaryFilter");
    if (!host) {
      host = document.createElement("div");
      host.id = "v78SummaryFilter";
      host.className = "v77-filter-host";
      count.insertAdjacentElement("afterend", host);
      host.addEventListener("click", e => {
        const clear = e.target.closest("[data-v78-clear]");
        if (!clear) return;
        summaryFilter = "";
        renderCharacters();
      });
    }
    return host;
  }

  function renderSummaryChip() {
    const host = ensureSummaryChip();
    if (!host) return;
    if (summaryFilter !== "existing") {
      host.innerHTML = "";
      host.hidden = true;
      return;
    }
    host.hidden = false;
    host.innerHTML = '<button type="button" class="v77-filter-chip" data-v78-clear title="Filter entfernen"><span>Status · Vorhanden</span><b aria-hidden="true">×</b><span class="sr-only">Filter entfernen</span></button>';
  }

  const previousRenderCharacters = renderCharacters;
  renderCharacters = function() {
    previousRenderCharacters();
    renderSummaryChip();
  };

  function cardFor(id) {
    return document.querySelector(`#${id}`)?.closest(".stat-card") || null;
  }

  function decorateSummaryCards() {
    const cards = [
      [cardFor("statCharacters"), "all", "Alle Charaktere anzeigen"],
      [cardFor("statExisting"), "existing", "Vorhandene Charaktere anzeigen"],
      [cardFor("statPlanned"), "planned", "Geplante Charaktere anzeigen"]
    ];
    cards.forEach(([card, mode, label]) => {
      if (!card) return;
      card.classList.add("v78-summary-link");
      card.dataset.v78Summary = mode;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", label);
      card.setAttribute("title", label);
    });
  }

  const dashboard = document.querySelector("#dashboard");
  if (dashboard && !dashboard.dataset.v78SummaryLinks) {
    dashboard.dataset.v78SummaryLinks = "1";
    dashboard.addEventListener("click", e => {
      const card = e.target.closest(".v78-summary-link");
      if (!card || !dashboard.contains(card)) return;
      openCharacterList(card.dataset.v78Summary || "all");
    });
    dashboard.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".v78-summary-link");
      if (!card || !dashboard.contains(card)) return;
      e.preventDefault();
      openCharacterList(card.dataset.v78Summary || "all");
    });

    /* A dashboard bar selection replaces the summary-card scope. */
    dashboard.addEventListener("click", e => {
      if (e.target.closest(".v77-dashboard-link")) summaryFilter = "";
    }, true);
    dashboard.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && e.target.closest(".v77-dashboard-link")) summaryFilter = "";
    }, true);
  }

  const previousRenderDashboard = renderDashboard;
  renderDashboard = function() {
    previousRenderDashboard();
    decorateSummaryCards();
  };

  const style = document.createElement("style");
  style.textContent = `
    #dashboard .stat-card.v78-summary-link{cursor:pointer;transition:border-color .14s ease,background .14s ease,transform .14s ease;outline:none}
    #dashboard .stat-card.v78-summary-link:hover{border-color:rgba(212,175,55,.42);background:rgba(255,255,255,.025)}
    #dashboard .stat-card.v78-summary-link:focus-visible{box-shadow:0 0 0 2px rgba(242,210,119,.62);border-color:rgba(212,175,55,.5)}
    #dashboard .stat-card.v78-summary-link:active{transform:scale(.985)}
    @media(max-width:640px){#dashboard .stat-card.v78-summary-link{min-height:132px}}
  `;
  document.head.appendChild(style);

  decorateSummaryCards();
  renderSummaryChip();

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
