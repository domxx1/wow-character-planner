/* v0.7.11 — Robust Back navigation and re-armed double-Back exit guard. */
(() => {
  const VERSION = "0.7.11";
  const NAV_KEY = "wcpNavV711";
  const EXIT_HINT_MS = 2000;

  let restoring = false;
  let pendingRegularNavigation = false;
  let pendingDashboardJump = false;
  let pendingCollapseTarget = "";
  let exitArmed = false;
  let exitTimer = 0;
  let rearmingForward = false;
  let rearmFallback = 0;

  const makeState = (role, view, extra = {}) => ({[NAV_KEY]:true, role, view, ...extra});
  const isOurState = state => !!state && typeof state === "object" && state[NAV_KEY] === true;

  function clearNativeFilters() {
    ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"].forEach(id => {
      const el = document.querySelector(`#${id}`);
      if (el) el.value = "";
    });
  }

  function clearTransientCharacterFilters() {
    document.querySelector("#v77DashboardFilter [data-v77-clear]")?.click();
    document.querySelector("#v78SummaryFilter [data-v78-clear]")?.click();
    clearNativeFilters();
  }

  function hasCharacterFilters() {
    const native = ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"]
      .some(id => String(document.querySelector(`#${id}`)?.value || "").trim() !== "");
    return native || !!document.querySelector("#v77DashboardFilter [data-v77-clear]") || !!document.querySelector("#v78SummaryFilter [data-v78-clear]");
  }

  function ensureExitHint() {
    let hint = document.querySelector("#v711ExitHint");
    if (hint) return hint;
    hint = document.createElement("div");
    hint.id = "v711ExitHint";
    hint.className = "v711-exit-hint";
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

  function clearExitTimer() {
    if (exitTimer) clearTimeout(exitTimer);
    if (rearmFallback) clearTimeout(rearmFallback);
    exitTimer = 0;
    rearmFallback = 0;
  }

  let activeState;
  const baseState = makeState("base", "dashboard");
  const initialViewState = makeState("view", "dashboard", {sourceView:"dashboard"});

  function pushViewState(view = "dashboard", extra = {}) {
    const next = makeState("view", view, {sourceView:"dashboard", ...extra});
    try {
      history.pushState(next, "", location.href);
      activeState = next;
    } catch {}
    return next;
  }

  function replaceViewState(view = "dashboard", extra = {}) {
    const next = makeState("view", view, {sourceView:"dashboard", ...extra});
    try {
      history.replaceState(next, "", location.href);
      activeState = next;
    } catch {}
    return next;
  }

  function establishHistoryGuard() {
    try {
      history.replaceState(baseState, "", location.href);
      history.pushState(initialViewState, "", location.href);
      activeState = initialViewState;
    } catch {
      activeState = initialViewState;
    }
  }

  function ensureInteractiveGuard() {
    const state = history.state;
    if (isOurState(state) && state.role !== "base") {
      activeState = state;
      return;
    }
    if (isOurState(state) && state.role === "base") {
      pushViewState(currentView || "dashboard");
      return;
    }
    try {
      history.replaceState(baseState, "", location.href);
      pushViewState(currentView || "dashboard");
    } catch {}
  }

  function cancelExitHint({restoreGuard = true} = {}) {
    clearExitTimer();
    exitArmed = false;
    hideExitHint();
    if (restoreGuard && currentView === "dashboard" && isOurState(history.state) && history.state.role === "base") {
      pushViewState("dashboard");
    }
  }

  function rearmAfterHint() {
    if (!(currentView === "dashboard" && isOurState(history.state) && history.state.role === "base")) return;

    /* The original dashboard entry is still one step forward. Moving forward instead of
       adding another entry keeps the history stack stable across repeated Back attempts. */
    rearmingForward = true;
    try { history.forward(); } catch { rearmingForward = false; }

    rearmFallback = window.setTimeout(() => {
      rearmFallback = 0;
      if (!rearmingForward) return;
      rearmingForward = false;
      if (currentView === "dashboard" && isOurState(history.state) && history.state.role === "base") {
        pushViewState("dashboard");
      }
    }, 220);
  }

  function showExitHint() {
    clearExitTimer();
    exitArmed = true;
    const hint = ensureExitHint();
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add("show"));

    exitTimer = window.setTimeout(() => {
      exitTimer = 0;
      if (!exitArmed) return;
      exitArmed = false;
      hideExitHint();
      rearmAfterHint();
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

  establishHistoryGuard();

  /* Browser Back handling can be restricted before the first trusted user interaction.
     Re-confirm the guard on the first real interaction and whenever the user comes back
     to the foreground. */
  const activateGuard = () => ensureInteractiveGuard();
  document.addEventListener("pointerdown", activateGuard, {capture:true, passive:true, once:true});
  document.addEventListener("keydown", activateGuard, {capture:true, once:true});
  window.addEventListener("pageshow", () => {
    if (document.visibilityState === "visible" && !isOurState(history.state)) establishHistoryGuard();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isOurState(history.state) && history.state.role === "base" && !exitArmed) {
      pushViewState(currentView || "dashboard");
    }
  });

  document.addEventListener("click", e => {
    if (e.target.closest?.("#dashboard .v77-dashboard-link,#dashboard .v78-summary-link")) {
      pendingDashboardJump = true;
      return;
    }
    if (e.target.closest?.("[data-view],[data-jump]")) {
      pendingRegularNavigation = true;
      setTimeout(() => { pendingRegularNavigation = false; }, 0);
    }
  }, true);

  document.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target.closest?.("#dashboard .v77-dashboard-link,#dashboard .v78-summary-link")) {
      pendingDashboardJump = true;
      return;
    }
    if (e.target.closest?.("[data-view],[data-jump]")) {
      pendingRegularNavigation = true;
      setTimeout(() => { pendingRegularNavigation = false; }, 0);
    }
  }, true);

  const previousSetView = setView;
  setView = function(view) {
    const target = String(view || "dashboard");
    if (restoring) return previousSetView(target);

    ensureInteractiveGuard();
    const source = currentView || activeState?.view || "dashboard";
    const regularNavigation = pendingRegularNavigation;
    pendingRegularNavigation = false;

    cancelExitHint({restoreGuard:true});

    if (target === source) {
      pendingDashboardJump = false;
      return previousSetView(target);
    }

    if (target === "dashboard") {
      pendingDashboardJump = false;
      clearTransientCharacterFilters();
      if (activeState?.role === "result") {
        pendingCollapseTarget = "dashboard";
        try { history.back(); } catch {
          previousSetView("dashboard");
          replaceViewState("dashboard");
        }
        return;
      }
      previousSetView("dashboard");
      replaceViewState("dashboard");
      return;
    }

    const dashboardJump = source === "dashboard" && pendingDashboardJump && target === "characters";
    pendingDashboardJump = false;
    const filteredFromOtherPage = source !== "dashboard" && target === "characters" && !regularNavigation && hasCharacterFilters();

    if (dashboardJump || filteredFromOtherPage) {
      previousSetView(target);
      const result = makeState("result", target, {sourceView:source});
      try {
        history.pushState(result, "", location.href);
        activeState = result;
      } catch {}
      return;
    }

    if (activeState?.role === "result") {
      clearTransientCharacterFilters();
      pendingCollapseTarget = target;
      try { history.back(); } catch {
        previousSetView(target);
        replaceViewState(target);
      }
      return;
    }

    previousSetView(target);
    replaceViewState(target);
  };

  window.addEventListener("popstate", e => {
    const departing = activeState;
    const target = isOurState(e.state) ? e.state : null;

    if (rearmingForward) {
      rearmingForward = false;
      if (rearmFallback) clearTimeout(rearmFallback);
      rearmFallback = 0;
      activeState = target || makeState("view", "dashboard");
      if (activeState.role === "base") pushViewState("dashboard");
      return;
    }

    if (pendingCollapseTarget) {
      const targetView = pendingCollapseTarget;
      pendingCollapseTarget = "";
      clearTransientCharacterFilters();
      activeState = target || makeState("view", targetView);
      restoreView(targetView);
      replaceViewState(targetView);
      return;
    }

    if (departing?.role === "result") {
      clearTransientCharacterFilters();
      const sourceView = departing.sourceView || target?.view || "dashboard";
      activeState = target || makeState("view", sourceView);
      restoreView(sourceView);
      if (!target) replaceViewState(sourceView);
      return;
    }

    if (departing?.role === "view" && departing.view !== "dashboard") {
      clearTransientCharacterFilters();
      activeState = target || baseState;
      restoreView("dashboard");
      pushViewState("dashboard");
      return;
    }

    if (departing?.role === "view" && departing.view === "dashboard") {
      activeState = target || baseState;
      restoreView("dashboard");
      showExitHint();
      return;
    }

    /* If a second Back arrives while the hint is active, do not rebuild the guard.
       The browser/Android is then free to leave the standalone PWA naturally. */
    if (exitArmed) {
      clearExitTimer();
      exitArmed = false;
      hideExitHint();
      return;
    }

    activeState = target || activeState;
    if (target?.view) restoreView(target.view);
  });

  const style = document.createElement("style");
  style.textContent = `
    .v711-exit-hint{
      position:fixed;left:50%;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:100000;
      max-width:min(88vw,420px);padding:11px 16px;border:1px solid rgba(242,210,119,.36);
      border-radius:12px;background:#18212d;color:#f2f5f9;font-size:.82rem;font-weight:700;
      text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.38);pointer-events:none;
      opacity:0;transform:translate(-50%,8px);transition:opacity .13s ease,transform .13s ease;
    }
    .v711-exit-hint.show{opacity:1;transform:translate(-50%,0)}
    .v711-exit-hint[hidden]{display:none!important}
  `;
  document.head.appendChild(style);
  ensureExitHint();

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
