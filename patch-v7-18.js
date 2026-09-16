/* v0.7.18 — Mobile parity fixes for Retail/Forever controls. */
(() => {
  const VERSION = "0.7.18";
  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : (localStorage.getItem("wowCharacterPlanner.gameMode.v1") === "forever" ? "forever" : "retail");

  function fixPeopleTools() {
    const panel = document.querySelector("#v67PeoplePanel");
    const retail = document.querySelector("#v67PeopleTools");
    const forever = document.querySelector("#v715ForeverPeopleTools");
    const isForever = mode() === "forever";

    if (panel) {
      if (retail && retail.parentElement !== panel) panel.insertAdjacentElement("afterbegin", retail);
      if (forever && forever.parentElement !== panel) panel.insertAdjacentElement("afterbegin", forever);
    }

    retail?.classList.add("v68-people-tools-inline");
    forever?.classList.add("v68-people-tools-inline");

    if (retail) {
      retail.hidden = isForever;
      retail.style.display = isForever ? "none" : "";
    }
    if (forever) {
      forever.hidden = !isForever;
      forever.style.display = isForever ? "" : "none";
    }
  }

  const previousRenderDashboard = renderDashboard;
  renderDashboard = function(...args) {
    const result = previousRenderDashboard.apply(this, args);
    fixPeopleTools();
    return result;
  };

  const previousRenderAll = renderAll;
  renderAll = function(...args) {
    const result = previousRenderAll.apply(this, args);
    fixPeopleTools();
    return result;
  };

  document.addEventListener("click", e => {
    if (e.target.closest?.("[data-v714-mode]")) setTimeout(fixPeopleTools, 0);
  }, true);

  const style = document.createElement("style");
  style.textContent = `
    /* Forever Völker-Gruppen use exactly the same left-aligned member layout as Retail. */
    #v715GroupMembers{
      justify-items:stretch;
      align-items:start;
    }
    #v715GroupMembers .v67-member-option{
      display:flex !important;
      width:100%;
      min-width:0;
      justify-content:flex-start !important;
      align-items:center !important;
      text-align:left !important;
      gap:9px;
    }
    #v715GroupMembers .v67-member-option input[type="checkbox"]{
      flex:0 0 auto !important;
      width:18px !important;
      height:18px !important;
      margin:0 !important;
      padding:0 !important;
    }
    #v715GroupMembers .v67-member-option span{
      display:block;
      flex:1 1 auto;
      min-width:0;
      text-align:left !important;
      line-height:1.25;
      overflow-wrap:anywhere;
    }

    /* Forever Custom-Klassen mirror the Retail class form, including the color field. */
    #v714ForeverClasses .v714-custom-form{
      grid-template-columns:minmax(0,1.4fr) minmax(135px,.7fr) 92px auto;
    }
    #v714ForeverClasses #v714ClassColor[type="color"]{
      width:100% !important;
      height:42px !important;
      min-height:42px;
      padding:4px !important;
      border-radius:8px;
      background:var(--input-bg,rgba(255,255,255,.04));
      border:1px solid rgba(255,255,255,.1);
    }

    /* The active grouping switch belongs inside the Völker panel in both modes. */
    #v67PeoplePanel > #v715ForeverPeopleTools.v68-people-tools-inline,
    #v67PeoplePanel > #v67PeopleTools.v68-people-tools-inline{
      margin:0 0 16px;
      padding:10px 12px;
      width:100%;
    }

    @media(max-width:760px){
      #v715GroupMembers .v67-member-option{padding:7px 4px}
      #v714ForeverClasses .v714-custom-form{grid-template-columns:1fr 1fr}
      #v714ForeverClasses .v714-actions{grid-column:1/-1}
      #v67PeoplePanel > #v715ForeverPeopleTools.v68-people-tools-inline,
      #v67PeoplePanel > #v67PeopleTools.v68-people-tools-inline{margin-bottom:14px}
    }

    @media(max-width:520px){
      #v714ForeverClasses .v714-custom-form{grid-template-columns:1fr}
      #v714ForeverClasses .v714-actions{grid-column:auto}
    }

    /* The mode switch added a second control row to the mobile top bar. Give it
       real layout height so + Charakter can never overlap the toolbar/panels below. */
    @media(max-width:460px){
      .topbar{
        height:auto !important;
        min-height:144px;
        align-items:flex-start !important;
        padding:8px 0 12px;
        gap:10px;
      }
      .topbar-actions{
        display:flex !important;
        flex-direction:column !important;
        align-items:flex-end !important;
        justify-content:flex-start !important;
        gap:8px !important;
      }
      .topbar-actions .v714-mode-switch,
      .topbar-actions .btn{
        position:relative;
        z-index:1;
      }
    }
  `;
  document.head.appendChild(style);

  fixPeopleTools();

  const brand = document.querySelector(".brand-sub");
  if (brand) brand.textContent = mode() === "forever" ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
})();
