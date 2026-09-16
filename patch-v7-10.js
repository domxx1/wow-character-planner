/* v0.7.10 — App-wide Back navigation with filter origins and double-Back exit hint. */
(() => {
  const VERSION = "0.7.10";
  const NAV_KEY = "wcpNavV710";
  const EXIT_HINT_MS = 2000;

  let restoring = false;
  let pendingRegularNavigation = false;
  let pendingCollapse = null;
  let programmaticDashboardReturn = false;
  let exitArmed = false;
  let exitTimer = 0;

  const stateFor = (role, view, extra = {}) => ({[NAV_KEY]:true, role, view, ...extra});
  const isNavState = state => !!state && typeof state === "object" && state[NAV_KEY] === true;

  function clearNativeFilters() {
    ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"].forEach(id => {
      const el = document.querySelector(`#${id}`);
      if (el) el.value = "";
    });
  }

  function clearTransientCharacterFilters() {
    /* Closure-backed dashboard/summary filters expose their clear action through these chips. */
    document.querySelector("#v77DashboardFilter [data-v77-clear]")?.click();
    document.querySelector("#v78SummaryFilter [data-v78-clear]")?.click();
    clearNativeFilters();
  }

  function hasCharacterFilters() {
    const native = ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"]
      .some(id => String(document.querySelector(`#${id}`)?.value || "").trim() !== "");
    const dashboardChip = !!document.querySelector("#v77DashboardFilter [data-v77-clear]");
    const summaryChip = !!document.querySelector("#v78SummaryFilter [data-v78-clear]");
    return native || dashboardChip || summaryChip;
  }

  function ensureExitHint() {
    let hint = document.querySelector("#v710ExitHint");
    if (hint) return hint;
    hint = document.createElement("div");
    hint.id = "v710ExitHint";
    hint.className = "v710-exit-hint";
    hint.setAttribute("role", "status");
    hint.setAttribute("aria-live", "polite");
    hint.hidden = true;
    hint.textContent = "Nochmal Zurück drücken, um die App zu schließen.";
    document.body.appendChild(hint);
    return hint;
  }

  function hideExitHint() {
    const hint = ensureExitHint();
    hint.hidden = true;
    hint.classList.remove("show");
  }

  function pushDashboardGuard() {
    const guard = stateFor("dashboard", "dashboard");
    try {
      history.pushState(guard, "", location.href);
      activeState = guard;
    } catch {}
  }

  function cancelExitHint(restoreGuard = false) {
    if (exitTimer) clearTimeout(exitTimer);
    exitTimer = 0;
    const wasArmed = exitArmed;
    exitArmed = false;
    hideExitHint();
    if (restoreGuard && wasArmed && activeState?.role === "exit") pushDashboardGuard();
  }

  function showExitHint() {
    if (exitTimer) clearTimeout(exitTimer);
    exitArmed = true;
    const hint = ensureExitHint();
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add("show"));
    exitTimer = window.setTimeout(() => {
      exitTimer = 0;
      if (!exitArmed) return;
      exitArmed = false;
      hideExitHint();
      /* Re-arm Back protection only after the visible confirmation window has ended. */
      if (activeState?.role === "exit" && currentView === "dashboard") pushDashboardGuard();
    }, EXIT_HINT_MS);
  }

  function restoreView(view) {
    restoring = true;
    try {
      previousSetView(view || "dashboard");
      if ((view || "dashboard") === "characters") renderCharacters();
      else if ((view || "dashboard") === "dashboard") renderDashboard();
    } finally {
      restoring = false;
    }
  }

  /* Establish one real root entry plus one dashboard guard entry. The first Back on
     the overview lands on the root and opens the hint; the guard is restored only
     when that hint expires. Therefore a second Back while it is visible can leave
     the installed PWA/browser naturally. */
  const exitState = stateFor("exit", "dashboard");
  const dashboardState = stateFor("dashboard", "dashboard");
  try {
    history.replaceState(exitState, "", location.href);
    history.pushState(dashboardState, "", location.href);
  } catch {}
  let activeState = dashboardState;

  /* Mark ordinary tab/navigation clicks so a direct jump to Characters is not
     mistaken for a filter result opened from another page. */
  document.addEventListener("click", e => {
    if (e.target.closest?.("[data-view],[data-jump]")) {
      pendingRegularNavigation = true;
      setTimeout(() => { pendingRegularNavigation = false; }, 0);
    }
  }, true);

  const previousSetView = setView;
  setView = function(view) {
    const target = String(view || "dashboard");
    if (restoring) return previousSetView(target);

    const regularNavigation = pendingRegularNavigation;
    pendingRegularNavigation = false;
    const source = currentView || activeState?.view || "dashboard";

    if (target === source) {
      cancelExitHint(true);
      return previousSetView(target);
    }

    cancelExitHint(true);

    if (target === "dashboard") {
      clearTransientCharacterFilters();
      previousSetView("dashboard");

      if (activeState?.role === "filtered") {
        programmaticDashboardReturn = true;
        history.go(-2);
      } else if (activeState?.role === "view") {
        programmaticDashboardReturn = true;
        history.back();
      } else if (activeState?.role !== "dashboard") {
        const guard = stateFor("dashboard", "dashboard");
        try { history.replaceState(guard, "", location.href); activeState = guard; } catch {}
      }
      return;
    }

    /* Any page opened directly from the overview has exactly one Back step. */
    if (source === "dashboard") {
      previousSetView(target);
      const next = stateFor("view", target, {sourceView:"dashboard"});
      try { history.pushState(next, "", location.href); activeState = next; } catch {}
      return;
    }

    /* A filtered character result opened from Matrix or another non-dashboard page
       gets its own history entry so Back returns to that source page. */
    const filteredFromSource = target === "characters" && !regularNavigation && hasCharacterFilters();
    if (filteredFromSource) {
      previousSetView(target);
      const next = stateFor("filtered", target, {sourceView:source});
      try { history.pushState(next, "", location.href); activeState = next; } catch {}
      return;
    }

    /* Switching tabs normally should not build a long history chain. If the user
       leaves a temporary filtered result via the bottom navigation, collapse that
       result back into a normal one-step page first. */
    if (activeState?.role === "filtered") {
      clearTransientCharacterFilters();
      previousSetView(target);
      pendingCollapse = {target};
      history.back();
      return;
    }

    previousSetView(target);
    const next = stateFor("view", target, {sourceView:"dashboard"});
    try { history.replaceState(next, "", location.href); activeState = next; } catch {}
  };

  window.addEventListener("popstate", e => {
    const departing = activeState;
    const targetState = isNavState(e.state) ? e.state : null;

    if (pendingCollapse) {
      const targetView = pendingCollapse.target;
      pendingCollapse = null;
      clearTransientCharacterFilters();
      const next = stateFor("view", targetView, {sourceView:"dashboard"});
      try { history.replaceState(next, "", location.href); } catch {}
      activeState = next;
      restoreView(targetView);
      return;
    }

    if (programmaticDashboardReturn) {
      programmaticDashboardReturn = false;
      clearTransientCharacterFilters();
      activeState = targetState || dashboardState;
      restoreView("dashboard");
      return;
    }

    if (departing?.role === "filtered") {
      clearTransientCharacterFilters();
      activeState = targetState || dashboardState;
      restoreView(departing.sourceView || targetState?.view || "dashboard");
      return;
    }

    if (departing?.role === "view") {
      clearTransientCharacterFilters();
      activeState = targetState || dashboardState;
      restoreView("dashboard");
      if (activeState?.role === "exit") pushDashboardGuard();
      return;
    }

    if (departing?.role === "dashboard" && targetState?.role === "exit") {
      activeState = targetState;
      restoreView("dashboard");
      showExitHint();
      return;
    }

    activeState = targetState || activeState;
    if (targetState?.view) restoreView(targetState.view);
  });

  const style = document.createElement("style");
  style.textContent = `
    .v710-exit-hint{
      position:fixed;left:50%;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:100000;
      max-width:min(88vw,420px);padding:11px 16px;border:1px solid rgba(242,210,119,.36);
      border-radius:12px;background:#18212d;color:#f2f5f9;font-size:.82rem;font-weight:700;
      text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.38);pointer-events:none;
      opacity:0;transform:translate(-50%,8px);transition:opacity .13s ease,transform .13s ease;
    }
    .v710-exit-hint.show{opacity:1;transform:translate(-50%,0)}
    .v710-exit-hint[hidden]{display:none!important}
  `;
  document.head.appendChild(style);
  ensureExitHint();

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
