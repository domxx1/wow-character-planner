/* v0.6.8 — Refine people chart mobile spacing and people-group controls. */
(() => {
  const VERSION = "0.6.8";

  function moveGroupingToggleToPeoplePanel() {
    const panel = document.querySelector("#v67PeoplePanel");
    const tools = document.querySelector("#v67PeopleTools");
    if (!panel || !tools) return;
    if (tools.parentElement !== panel) panel.insertAdjacentElement("afterbegin", tools);
    tools.classList.add("v68-people-tools-inline");
  }

  const style = document.createElement("style");
  style.textContent = `
    /* Keep the grouping switch directly with the people chart. */
    #v67PeoplePanel > #v67PeopleTools.v68-people-tools-inline{
      margin:0 0 16px;
      padding:10px 12px;
      width:100%;
    }

    /* People names need more room than class names, especially on phones. */
    #v67PeopleCoverage .v51-row{
      grid-template-columns:minmax(155px,210px) minmax(90px,1fr) minmax(210px,auto);
    }
    #v67PeopleCoverage .v51-name{
      min-width:0;
      white-space:normal;
      overflow-wrap:anywhere;
      word-break:normal;
      line-height:1.18;
    }

    /* Group member choices: checkbox and label stay left-aligned as one unit. */
    #v67GroupMembers{
      justify-items:stretch;
      align-items:start;
    }
    #v67GroupMembers .v67-member-option{
      display:flex !important;
      width:100%;
      min-width:0;
      justify-content:flex-start !important;
      align-items:center !important;
      text-align:left !important;
      gap:9px;
    }
    #v67GroupMembers .v67-member-option input[type="checkbox"]{
      flex:0 0 auto !important;
      width:18px !important;
      height:18px !important;
      margin:0 !important;
      padding:0 !important;
    }
    #v67GroupMembers .v67-member-option span{
      display:block;
      flex:1 1 auto;
      min-width:0;
      text-align:left !important;
      line-height:1.25;
      overflow-wrap:anywhere;
    }

    @media(max-width:640px){
      #v67PeopleCoverage .v51-row{
        grid-template-columns:minmax(124px,145px) minmax(42px,1fr) minmax(104px,auto);
        gap:6px;
      }
      #v67PeopleCoverage .v51-name{
        font-size:.75rem;
      }
      #v67PeoplePanel > #v67PeopleTools.v68-people-tools-inline{
        margin-bottom:14px;
      }
      #v67GroupMembers .v67-member-option{
        padding:7px 4px;
      }
    }
  `;
  document.head.appendChild(style);

  moveGroupingToggleToPeoplePanel();

  const previousRenderDashboard = renderDashboard;
  renderDashboard = function() {
    previousRenderDashboard();
    moveGroupingToggleToPeoplePanel();
  };

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
