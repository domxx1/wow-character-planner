/* v0.7.12 — Deterministic Android Back navigation with a persistent exit guard. */
(() => {
  const VERSION = "0.7.12";
  const NAV_KEY = "wcpNavV712";
  const EXIT_HINT_MS = 2000;

  let restoring = false;
  let pendingRegularNavigation = false;
  let pendingDashboardJump = false;
  let pendingCollapseTarget = "";
  let exitArmed = false;
  let exitTimer = 0;
  let allowingExit = false;
  let activeState = null;

  const makeState = (role, view, extra = {}) => ({[NAV_KEY]:true, role, view, ...extra});
  const isOurState = state => !!state && typeof state === "object" && state[NAV_KEY] === true;
  const exitState = makeState("exit", "dashboard");

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
    let hint = document.querySelector("#v712ExitHint");
    if (hint) return hint;
    hint = document.createElement("div");
    hint.id = "v712ExitHint";
    hint.className = "v712-exit-hint";
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
    exitTimer = 0;
  }

  function armExitHint() {
    clearExitTimer();
    exitArmed = true;
    const hint = ensureExitHint();
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add("show"));
    exitTimer = window.setTimeout(() => {
      exitTimer = 0;
      exitArmed = false;
      hideExitHint();
    }, EXIT_HINT_MS);
  }

  function cancelExitHint() {
    clearExitTimer();
    exitArmed = false;
    hideExitHint();
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

  function establishGuard(view = "dashboard") {
    if (allowingExit) return;
    try {
      history.replaceState(exitState, "", location.href);
      pushViewState(view || "dashboard");
    } catch {
      activeState = makeState("view", view || "dashboard");
    }
  }

  function ensureGuard() {
    if (allowingExit) return;
    const state = history.state;
    if (isOurState(state) && state.role === "view") {
      activeState = state;
      return;
    }
    if (isOurState(state) && state.role === "result") {
      activeState = state;
      return;
    }
    if (isOurState(state) && state.role === "exit") {
      pushViewState(currentView || "dashboard");
      return;
    }
    establishGuard(currentView || "dashboard");
  }

  establishGuard("dashboard");

  /* Keep the guard healthy after task switches/resumes. Unlike the previous
     implementation this is intentionally not a one-shot interaction listener. */
  document.addEventListener("pointerdown", ensureGuard, {capture:true, passive:true});
  document.addEventListener("keydown", ensureGuard, {capture:true});
  window.addEventListener("focus", () => {
    if (!allowingExit && document.visibilityState === "visible") ensureGuard();
  });
  window.addEventListener("pageshow", () => {
    if (!allowingExit && document.visibilityState === "visible") ensureGuard();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      allowingExit = false;
      ensureGuard();
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

    ensureGuard();
    cancelExitHint();

    const source = currentView || activeState?.view || "dashboard";
    const regularNavigation = pendingRegularNavigation;
    pendingRegularNavigation = false;

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

    if (allowingExit) return;

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
      if (!target || target.role === "exit") replaceViewState(sourceView);
      return;
    }

    if (departing?.role === "view" && departing.view !== "dashboard") {
      clearTransientCharacterFilters();
      activeState = target || exitState;
      restoreView("dashboard");
      pushViewState("dashboard");
      return;
    }

    if (departing?.role === "view" && departing.view === "dashboard") {
      activeState = target || exitState;
      restoreView("dashboard");

      if (exitArmed) {
        /* Second Back inside the confirmation window: now deliberately traverse
           one more step out of the app. Do not recreate the guard until the app
           is visible again later. */
        clearExitTimer();
        exitArmed = false;
        hideExitHint();
        allowingExit = true;
        setTimeout(() => {
          try { history.back(); } catch {}
        }, 0);
        return;
      }

      /* First Back on the overview: immediately restore the guard, then show the
         short confirmation. Because the guard already exists again, expiry of the
         popup cannot leave the app unprotected. */
      pushViewState("dashboard");
      armExitHint();
      return;
    }

    activeState = target || activeState;
    if (target?.view && target.role !== "exit") restoreView(target.view);
    else if (!allowingExit) ensureGuard();
  });

  const style = document.createElement("style");
  style.textContent = `
    .v712-exit-hint{
      position:fixed;left:50%;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:100000;
      max-width:min(88vw,420px);padding:11px 16px;border:1px solid rgba(242,210,119,.36);
      border-radius:12px;background:#18212d;color:#f2f5f9;font-size:.82rem;font-weight:700;
      text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.38);pointer-events:none;
      opacity:0;transform:translate(-50%,8px);transition:opacity .13s ease,transform .13s ease;
    }
    .v712-exit-hint.show{opacity:1;transform:translate(-50%,0)}
    .v712-exit-hint[hidden]{display:none!important}
  `;
  document.head.appendChild(style);
  ensureExitHint();

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
