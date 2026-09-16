/* v0.7.9 — Android/browser Back returns dashboard-filter jumps to the overview. */
(() => {
  const VERSION = "0.7.9";
  const HISTORY_KEY = "wcpDashboardJump";
  let dashboardJumpActive = !!history.state?.[HISTORY_KEY];

  function clearNativeFilters() {
    ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"].forEach(id => {
      const el = document.querySelector(`#${id}`);
      if (el) el.value = "";
    });
  }

  function clearDashboardFilters() {
    /* Clear closure-backed filters through their existing UI controls. */
    document.querySelector("#v77DashboardFilter [data-v77-clear]")?.click();
    document.querySelector("#v78SummaryFilter [data-v78-clear]")?.click();
    clearNativeFilters();
  }

  function markDashboardBase() {
    if (history.state?.wcpView === "dashboard") return;
    try {
      history.replaceState({...history.state, wcpView:"dashboard"}, "", location.href);
    } catch {}
  }

  function pushDashboardJump() {
    if (dashboardJumpActive || history.state?.[HISTORY_KEY]) return;
    try {
      history.pushState({...history.state, [HISTORY_KEY]:true, wcpView:"characters"}, "", location.href);
      dashboardJumpActive = true;
    } catch {}
  }

  function isDashboardJumpTarget(target) {
    return target?.closest?.("#dashboard .v77-dashboard-link,#dashboard .v78-summary-link") || null;
  }

  /* Capture before v0.7.7/v0.7.8 switch the visible view. */
  document.addEventListener("click", e => {
    if (isDashboardJumpTarget(e.target)) pushDashboardJump();
  }, true);

  document.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (isDashboardJumpTarget(e.target)) pushDashboardJump();
  }, true);

  window.addEventListener("popstate", () => {
    if (!dashboardJumpActive) return;
    dashboardJumpActive = false;
    clearDashboardFilters();
    setView("dashboard");
    renderDashboard();
  });

  markDashboardBase();

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
