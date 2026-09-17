/* v0.7.30 — Replace fragile filtered-result history handling with simple tab navigation. */
(() => {
  const VERSION = "0.7.30";
  const NAV_KEY = "wcpNavV730";

  let pendingFilterOrigin = "";
  let pendingFilterTimer = 0;
  let temporaryFilterOrigin = "";
  let returningHome = false;

  function directSetView(view) {
    const target = ["dashboard","characters","matrix","professions","settings"].includes(view) ? view : "dashboard";
    currentView = target;
    document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === target));
    document.querySelectorAll(".nav-btn,.bottom-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === target));
    const titles = {
      dashboard:"Übersicht",
      characters:"Charaktere",
      matrix:"Volk × Klasse",
      professions:"Berufe",
      settings:"Einstellungen"
    };
    const title = document.querySelector("#viewTitle");
    if (title) title.textContent = titles[target] || "Charakterplaner";
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function replaceNavState(view, extra={}) {
    try { history.replaceState({[NAV_KEY]:true,role:"view",view,...extra},"",location.href); } catch {}
  }

  function pushNavState(role, view, extra={}) {
    try { history.pushState({[NAV_KEY]:true,role,view,...extra},"",location.href); } catch {}
  }

  function clearTemporaryCharacterFilters() {
    document.querySelector("#v77DashboardFilter [data-v77-clear]")?.click();
    document.querySelector("#v78SummaryFilter [data-v78-clear]")?.click();
    document.querySelector("#v713MatrixFilter [data-v713-clear]")?.click();
    ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"].forEach(id => {
      const el = document.querySelector(`#${id}`);
      if (el) el.value = "";
    });
    try { renderCharacters(); } catch {}
  }

  function markPendingFilterOrigin(origin) {
    pendingFilterOrigin = origin;
    if (pendingFilterTimer) clearTimeout(pendingFilterTimer);
    pendingFilterTimer = setTimeout(() => {
      pendingFilterTimer = 0;
      pendingFilterOrigin = "";
    }, 0);
  }

  function filterTriggerFromEvent(e) {
    const source = currentView || "dashboard";
    if (source === "dashboard" && e.target?.closest?.("#dashboard .v77-dashboard-link,#dashboard .v78-summary-link")) {
      markPendingFilterOrigin("dashboard");
      return;
    }
    if (source === "matrix" && e.target?.closest?.("#raceClassMatrix [data-v713-class],#raceClassMatrix tbody td[data-v713-race]")) {
      markPendingFilterOrigin("matrix");
    }
  }

  document.addEventListener("click", filterTriggerFromEvent, true);
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") filterTriggerFromEvent(e);
  }, true);

  /* v0.7.13 used history.go()/history.back() inside setView. When a filtered
     character result was open, those asynchronous jumps could consume later tab
     clicks and leave the app stuck on the overview. From this point on, setView
     changes tabs synchronously. Only the browser Back action for a temporary
     dashboard/matrix filter uses the history entry. */
  setView = function(view) {
    const target = ["dashboard","characters","matrix","professions","settings"].includes(String(view || "")) ? String(view) : "dashboard";
    const source = currentView || "dashboard";
    const filterTransition = target === "characters" && source !== "characters" && pendingFilterOrigin === source;

    pendingFilterOrigin = "";
    if (pendingFilterTimer) {
      clearTimeout(pendingFilterTimer);
      pendingFilterTimer = 0;
    }

    const leavingTemporaryResult = !!temporaryFilterOrigin && source === "characters" && target !== "characters";
    if (leavingTemporaryResult) {
      clearTemporaryCharacterFilters();
      temporaryFilterOrigin = "";
    }

    if (target === source) {
      directSetView(target);
      return;
    }

    directSetView(target);

    if (filterTransition) {
      temporaryFilterOrigin = source;
      pushNavState("filter","characters",{origin:source});
      return;
    }

    if (leavingTemporaryResult) {
      /* Do not perform a history jump here. Replacing the temporary result is what
         keeps every bottom/sidebar tab immediately usable after a filtered view. */
      replaceNavState(target,{origin:"dashboard"});
      return;
    }

    if (target === "dashboard") {
      const state = history.state;
      if (source !== "dashboard" && state?.[NAV_KEY] && state.role === "view" && state.origin === "dashboard") {
        returningHome = true;
        try { history.back(); }
        catch { replaceNavState("dashboard"); returningHome = false; }
      } else {
        replaceNavState("dashboard");
      }
      return;
    }

    if (source === "dashboard") pushNavState("view",target,{origin:"dashboard"});
    else replaceNavState(target,{origin:"dashboard"});
  };

  window.addEventListener("popstate", e => {
    if (returningHome) {
      returningHome = false;
      directSetView("dashboard");
      replaceNavState("dashboard");
      return;
    }

    if (temporaryFilterOrigin) {
      const origin = temporaryFilterOrigin;
      temporaryFilterOrigin = "";
      clearTemporaryCharacterFilters();
      directSetView(origin);
      replaceNavState(origin,{origin:origin === "dashboard" ? "" : "dashboard"});
      return;
    }

    const state = e.state;
    if (state?.[NAV_KEY]) directSetView(state.view || "dashboard");
  });

  /* Establish one clean state after all older navigation patches have loaded. */
  replaceNavState(currentView || "dashboard");

  const brand = document.querySelector(".brand-sub");
  if (brand) {
    const forever = typeof window.wowCharacterPlannerGameMode === "function" && window.wowCharacterPlannerGameMode() === "forever";
    brand.textContent = forever ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
  }
})();
