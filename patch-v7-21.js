/* v0.7.21 — Left-aligned mode switch and robust Forever class/race catalog for matrix/editor. */
(() => {
  const VERSION = "0.7.21";
  const MODE_KEY = "wowCharacterPlanner.gameMode.v1";
  const FOREVER_RACE_KEY = "wowCharacterPlanner.forever.customRaces.v1";
  const FOREVER_CLASS_KEY = "wowCharacterPlanner.forever.customClasses.v1";

  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : (localStorage.getItem(MODE_KEY) === "forever" ? "forever" : "retail");

  const FOREVER_RACES = [
    {key:"Forever:Orcs|Horde",name:"Orcs",faction:"Horde",forever:true},
    {key:"Forever:Untote|Horde",name:"Untote",faction:"Horde",forever:true},
    {key:"Forever:Tauren|Horde",name:"Tauren",faction:"Horde",forever:true},
    {key:"Forever:Trolle|Horde",name:"Trolle",faction:"Horde",forever:true},
    {key:"Forever:Himmelsgeborene|Horde",name:"Himmelsgeborene",faction:"Horde",forever:true},
    {key:"Forever:Menschen|Allianz",name:"Menschen",faction:"Allianz",forever:true},
    {key:"Forever:Zwerge|Allianz",name:"Zwerge",faction:"Allianz",forever:true},
    {key:"Forever:Nachtelfen|Allianz",name:"Nachtelfen",faction:"Allianz",forever:true},
    {key:"Forever:Gnome|Allianz",name:"Gnome",faction:"Allianz",forever:true},
    {key:"Forever:Himmelsgeborene|Allianz",name:"Himmelsgeborene",faction:"Allianz",forever:true}
  ];

  const FOREVER_CLASSES = [
    {name:"Krieger",armor:"Platte",color:"#C69B6D",forever:true},
    {name:"Paladin",armor:"Platte",color:"#F48CBA",forever:true},
    {name:"Jäger",armor:"Kette",color:"#AAD372",forever:true},
    {name:"Schurke",armor:"Leder",color:"#FFF468",forever:true},
    {name:"Priester",armor:"Stoff",color:"#FFFFFF",forever:true},
    {name:"Schamane",armor:"Kette",color:"#0070DD",forever:true},
    {name:"Magier",armor:"Stoff",color:"#3FC7EB",forever:true},
    {name:"Hexenmeister",armor:"Stoff",color:"#8788EE",forever:true},
    {name:"Druide",armor:"Leder",color:"#FF7C0A",forever:true}
  ];

  function readRecords(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function activeRecords(key) {
    return readRecords(key).filter(r => r && !r.deleted && String(r.name || "").trim());
  }

  function ensureForeverCatalog() {
    if (mode() !== "forever") return;

    const customRaces = activeRecords(FOREVER_RACE_KEY)
      .sort((a,b) => String(a.name).localeCompare(String(b.name),"de"))
      .map(r => ({
        key:`ForeverCustom:${r.id}`,
        name:String(r.name).trim(),
        faction:["Horde","Allianz","Neutral"].includes(r.faction) ? r.faction : "Neutral",
        custom:true,customId:String(r.id || ""),forever:true
      }));

    const customClasses = activeRecords(FOREVER_CLASS_KEY)
      .sort((a,b) => String(a.name).localeCompare(String(b.name),"de"))
      .map(c => ({
        name:String(c.name).trim(),
        armor:["Stoff","Leder","Kette","Platte"].includes(c.armor) ? c.armor : "–",
        color:/^#[0-9a-f]{6}$/i.test(String(c.color || "")) ? c.color : "#64748b",
        custom:true,customClass:true,customId:String(c.id || ""),forever:true
      }));

    RACES.splice(0,RACES.length,...FOREVER_RACES.map(r => ({...r})),...customRaces);
    CLASSES.splice(0,CLASSES.length,...FOREVER_CLASSES.map(c => ({...c})),...customClasses);
  }

  function placeHeader() {
    const topbar = document.querySelector(".topbar");
    const actions = topbar?.querySelector(".topbar-actions");
    const title = document.querySelector("#viewTitle");
    const titleBlock = title?.parentElement;
    const switcher = document.querySelector("#v714ModeSwitch");
    if (!topbar || !actions || !titleBlock || !switcher) return;

    titleBlock.classList.add("v721-title-block");
    if (switcher.parentElement !== titleBlock || switcher.previousElementSibling !== title) {
      title.insertAdjacentElement("afterend",switcher);
    }
  }

  function refreshFixes() {
    ensureForeverCatalog();
    placeHeader();
  }

  /* Repair the catalog before any composite render. This is deliberately final in
     the patch chain so older Retail custom-catalog handlers cannot leave Forever
     with an empty CLASSES array. */
  const previousRenderAll = renderAll;
  renderAll = function(...args) {
    ensureForeverCatalog();
    const result = previousRenderAll.apply(this,args);
    placeHeader();
    return result;
  };

  const previousRenderMatrix = renderMatrix;
  renderMatrix = function(...args) {
    ensureForeverCatalog();
    return previousRenderMatrix.apply(this,args);
  };

  const previousOpenCharacter = openCharacter;
  openCharacter = function(...args) {
    ensureForeverCatalog();
    return previousOpenCharacter.apply(this,args);
  };

  document.addEventListener("click",e => {
    if (!e.target.closest?.("[data-v714-mode]")) return;
    setTimeout(() => {
      ensureForeverCatalog();
      placeHeader();
      renderAll();
    },0);
  },true);

  const style = document.createElement("style");
  style.textContent = `
    /* Header: page title remains top-left; Retail/Forever sits directly below it,
       aligned to the same left edge. + Charakter stays on the far right. */
    .topbar{
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:14px!important;
    }
    .topbar > .v721-title-block{
      display:flex!important;
      flex-direction:column!important;
      align-items:flex-start!important;
      justify-content:center!important;
      min-width:0;
    }
    .v721-title-block > #viewTitle{
      order:1;
    }
    .v721-title-block > #v714ModeSwitch{
      order:2;
      align-self:flex-start!important;
      justify-self:auto!important;
      margin:5px 0 0!important;
    }
    .topbar > .topbar-actions{
      margin-left:auto!important;
      align-self:center!important;
      display:flex!important;
      flex-direction:row!important;
      align-items:center!important;
      justify-content:flex-end!important;
    }

    @media(max-width:760px){
      .topbar{
        height:80px!important;
        min-height:80px!important;
        padding:3px 0!important;
        align-items:center!important;
      }
      .v721-title-block > .eyebrow{display:none!important}
      .v721-title-block > #viewTitle{
        margin:0!important;
        font-size:23px!important;
        line-height:1.05!important;
        white-space:nowrap;
      }
      .v721-title-block > #v714ModeSwitch{
        margin-top:4px!important;
        padding:2px!important;
      }
      .v721-title-block > #v714ModeSwitch button{
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
      .v721-title-block > #viewTitle{font-size:20px!important}
      .v721-title-block > #v714ModeSwitch button{padding:4px 6px!important;font-size:.62rem!important}
      .topbar-actions #quickAdd{padding:8px!important;font-size:.78rem!important}
    }
  `;
  document.head.appendChild(style);

  refreshFixes();
  const brand = document.querySelector(".brand-sub");
  if (brand) brand.textContent = mode() === "forever" ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
})();
