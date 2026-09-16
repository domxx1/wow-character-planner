/* v0.7.22 — Header layout: mode switch left, page title centered, action right. */
(() => {
  const VERSION = "0.7.22";
  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : (localStorage.getItem("wowCharacterPlanner.gameMode.v1") === "forever" ? "forever" : "retail");

  function placeHeader() {
    const topbar = document.querySelector(".topbar");
    const title = document.querySelector("#viewTitle");
    const titleBlock = title?.parentElement;
    const switcher = document.querySelector("#v714ModeSwitch");
    const actions = topbar?.querySelector(".topbar-actions");
    if (!topbar || !titleBlock || !switcher || !actions) return;

    titleBlock.classList.remove("v719-title-block","v721-title-block");
    titleBlock.classList.add("v722-title-block");

    /* Stable three-column order: switch | title | actions. */
    if (switcher.parentElement !== topbar || topbar.firstElementChild !== switcher) {
      topbar.insertBefore(switcher, titleBlock);
    }
    if (titleBlock.nextElementSibling !== actions) {
      topbar.insertBefore(titleBlock, actions);
    }
  }

  function refresh() { placeHeader(); }

  const previousRenderAll = renderAll;
  renderAll = function(...args) {
    const result = previousRenderAll.apply(this,args);
    refresh();
    return result;
  };

  document.addEventListener("click",e => {
    if (e.target.closest?.("[data-v714-mode]")) setTimeout(refresh,0);
  },true);

  const style = document.createElement("style");
  style.textContent = `
    .topbar{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important;
      align-items:center!important;
      gap:12px!important;
    }
    .topbar > #v714ModeSwitch{
      grid-column:1!important;
      justify-self:start!important;
      align-self:center!important;
      margin:0!important;
      order:initial!important;
    }
    .topbar > .v722-title-block{
      grid-column:2!important;
      justify-self:center!important;
      align-self:center!important;
      display:block!important;
      text-align:center!important;
      min-width:0;
    }
    .v722-title-block > #viewTitle{
      margin:3px 0 0!important;
      text-align:center!important;
      white-space:nowrap;
    }
    .topbar > .topbar-actions{
      grid-column:3!important;
      justify-self:end!important;
      align-self:center!important;
      margin:0!important;
      padding:0!important;
      display:flex!important;
      flex-direction:row!important;
      align-items:center!important;
      justify-content:flex-end!important;
    }

    @media(max-width:760px){
      .topbar{
        height:80px!important;
        min-height:80px!important;
        padding:0!important;
        gap:7px!important;
      }
      .v722-title-block > .eyebrow{display:none!important}
      .v722-title-block > #viewTitle{
        margin:0!important;
        font-size:23px!important;
        line-height:1.08!important;
      }
      .topbar > #v714ModeSwitch{
        padding:2px!important;
      }
      .topbar > #v714ModeSwitch button{
        padding:5px 8px!important;
        font-size:.66rem!important;
        line-height:1.05!important;
      }
      .topbar-actions #quickAdd{
        margin:0!important;
        padding:9px 10px!important;
        white-space:nowrap;
      }
    }

    @media(max-width:390px){
      .topbar{gap:4px!important}
      .v722-title-block > #viewTitle{font-size:20px!important}
      .topbar > #v714ModeSwitch button{padding:4px 6px!important;font-size:.62rem!important}
      .topbar-actions #quickAdd{padding:8px!important;font-size:.78rem!important}
    }
  `;
  document.head.appendChild(style);

  refresh();
  const brand = document.querySelector(".brand-sub");
  if (brand) brand.textContent = mode() === "forever" ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
})();
