/* v0.7.19 — Compact mode switch placement and Forever grouping cleanup. */
(() => {
  const VERSION = "0.7.19";
  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : (localStorage.getItem("wowCharacterPlanner.gameMode.v1") === "forever" ? "forever" : "retail");

  function placeModeSwitch() {
    const topbar = document.querySelector(".topbar");
    const titleBlock = topbar?.querySelector(":scope > div:first-child");
    const switcher = document.querySelector("#v714ModeSwitch");
    if (!titleBlock || !switcher) return;
    titleBlock.classList.add("v719-title-block");
    if (switcher.parentElement !== titleBlock) titleBlock.insertAdjacentElement("afterbegin", switcher);
  }

  function simplifyPeopleTools() {
    [document.querySelector("#v67PeopleTools"), document.querySelector("#v715ForeverPeopleTools")].forEach(tools => {
      if (!tools) return;
      tools.querySelectorAll(":scope > .muted").forEach(el => el.remove());
      tools.classList.add("v719-people-tools-compact");
    });
  }

  function refreshLayout() {
    placeModeSwitch();
    simplifyPeopleTools();
  }

  const previousRenderAll = renderAll;
  renderAll = function(...args) {
    const result = previousRenderAll.apply(this,args);
    refreshLayout();
    return result;
  };

  const previousRenderDashboard = renderDashboard;
  renderDashboard = function(...args) {
    const result = previousRenderDashboard.apply(this,args);
    refreshLayout();
    return result;
  };

  document.addEventListener("click", e => {
    if (e.target.closest?.("[data-v714-mode]")) setTimeout(refreshLayout,0);
  },true);

  const style = document.createElement("style");
  style.textContent = `
    .v719-title-block{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
    .v719-title-block > #v714ModeSwitch{margin:0 0 4px 0;align-self:flex-start}
    #v67PeopleTools.v719-people-tools-compact,
    #v715ForeverPeopleTools.v719-people-tools-compact{gap:0!important}

    @media(max-width:460px){
      .topbar{
        height:88px!important;
        min-height:88px!important;
        padding:5px 0 7px!important;
        align-items:flex-start!important;
        gap:10px!important;
      }
      .v719-title-block{min-width:0;justify-content:flex-start}
      .v719-title-block > #v714ModeSwitch{
        margin-bottom:2px;
        padding:2px;
      }
      .v719-title-block > #v714ModeSwitch button{
        padding:5px 8px!important;
        font-size:.68rem!important;
        line-height:1.15;
      }
      .v719-title-block > .eyebrow{display:none!important}
      .v719-title-block > h1{
        margin:1px 0 0!important;
        font-size:23px!important;
        line-height:1.08;
      }
      .topbar-actions{
        display:flex!important;
        flex-direction:row!important;
        align-items:flex-start!important;
        justify-content:flex-end!important;
        gap:0!important;
        padding:0!important;
        margin:0!important;
      }
      .topbar-actions #quickAdd{
        margin-top:1px!important;
        white-space:nowrap;
        position:relative;
        z-index:2;
      }
    }
  `;
  document.head.appendChild(style);

  refreshLayout();
  const brand = document.querySelector(".brand-sub");
  if (brand) brand.textContent = mode() === "forever" ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
})();
