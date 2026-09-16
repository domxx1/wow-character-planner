/* v0.7.20 — Centered mode switch, restored title position and reliable Forever character saving. */
(() => {
  const VERSION = "0.7.20";
  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : (localStorage.getItem("wowCharacterPlanner.gameMode.v1") === "forever" ? "forever" : "retail");

  function raceKey(r) {
    return r?.key || `${r?.name || ""}|${r?.faction || ""}`;
  }

  function selectedRace() {
    const value = document.querySelector("#charRace")?.value || "";
    return RACES.find(r => raceKey(r) === value) || null;
  }

  function placeModeSwitch() {
    const topbar = document.querySelector(".topbar");
    const titleBlock = topbar?.querySelector(":scope > div:first-child");
    const actions = topbar?.querySelector(".topbar-actions");
    const switcher = document.querySelector("#v714ModeSwitch");
    if (!topbar || !titleBlock || !actions || !switcher) return;

    titleBlock.classList.remove("v719-title-block");
    if (switcher.parentElement !== topbar || switcher.nextElementSibling !== actions) {
      topbar.insertBefore(switcher, actions);
    }
  }

  function simplifyPeopleTools() {
    [document.querySelector("#v67PeopleTools"), document.querySelector("#v715ForeverPeopleTools")].forEach(tools => {
      if (!tools) return;
      tools.querySelectorAll(":scope > .muted").forEach(el => el.remove());
    });
  }

  function safeAvatar(value, fallback="") {
    const s = String(value || "").trim();
    if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(s) || /^https?:\/\//i.test(s)) return s;
    return fallback || "";
  }

  function saveForeverCharacter() {
    if (mode() !== "forever") return false;

    const id = document.querySelector("#charId")?.value || "";
    const existing = id ? characters.find(c => String(c.id) === String(id)) : null;
    const race = selectedRace();
    const status = document.querySelector("#charStatus")?.value || "Geplant";
    const name = document.querySelector("#charName")?.value.trim() || "";
    const className = document.querySelector("#charClass")?.value || "";

    if (!name && status !== "Geplant") {
      toast("Für vorhandene Charaktere ist ein Name erforderlich");
      return true;
    }
    if (!className) {
      toast("Bitte eine Klasse auswählen");
      return true;
    }

    const levelRaw = Number.parseInt(document.querySelector("#charLevel")?.value || "", 10);
    const data = {
      ...(existing || {}),
      id: id || uid(),
      gameMode: "forever",
      name,
      race: race?.name || "",
      variant: document.querySelector("#charVariant")?.value.trim() || "",
      faction: race?.faction || document.querySelector("#charFaction")?.value || "Neutral",
      className,
      gender: document.querySelector("#charGender")?.value || "",
      profession1: document.querySelector("#charProfession1")?.value || "",
      profession2: document.querySelector("#charProfession2")?.value || "",
      status,
      level: Number.isFinite(levelRaw) && levelRaw > 0 ? Math.min(60, levelRaw) : "",
      specialization: document.querySelector("#charSpecialization")?.value.trim() || "",
      realm: document.querySelector("#charRealm")?.value.trim() || "",
      region: document.querySelector("#charRegion")?.value || existing?.region || "eu",
      remixEvent: document.querySelector("#charRemix")?.value.trim() || "",
      avatarUrl: safeAvatar(document.querySelector("#charAvatar")?.value, existing?.avatarUrl || ""),
      armoryUrl: existing?.armoryUrl || "",
      notes: document.querySelector("#charNotes")?.value.trim() || ""
    };

    if (document.querySelector("#charMidnight")) data.midnight = document.querySelector("#charMidnight").value || "";

    if (id) {
      const index = characters.findIndex(c => String(c.id) === String(id));
      if (index >= 0) characters[index] = data;
      else characters.push(data);
    } else {
      characters.push(data);
    }

    document.querySelector("#characterDialog")?.close();
    saveCharacters();
    toast(id ? "Forever-Charakter aktualisiert" : "Forever-Charakter angelegt");
    return true;
  }

  /* Run before the older Retail/custom save handlers. Those handlers predate the
     split roster and can otherwise swallow Forever submissions on some paths. */
  window.addEventListener("click", e => {
    if (mode() !== "forever" || !e.target?.closest?.("#saveCharacter")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    saveForeverCharacter();
  }, true);

  window.addEventListener("keydown", e => {
    if (mode() !== "forever" || e.key !== "Enter" || e.target?.tagName === "TEXTAREA") return;
    if (!e.target?.closest?.("#characterForm")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    saveForeverCharacter();
  }, true);

  window.addEventListener("submit", e => {
    if (mode() !== "forever" || e.target?.id !== "characterForm") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    saveForeverCharacter();
  }, true);

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
  }, true);

  const style = document.createElement("style");
  style.textContent = `
    /* One-row top bar: title left, version switch truly centered, action right. */
    .topbar{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important;
      align-items:center!important;
      gap:12px!important;
    }
    .topbar > div:first-child{
      justify-self:start!important;
      min-width:0;
      display:block!important;
    }
    .topbar > #v714ModeSwitch{
      justify-self:center!important;
      align-self:center!important;
      margin:0!important;
    }
    .topbar > .topbar-actions{
      justify-self:end!important;
      align-self:center!important;
      display:flex!important;
      flex-direction:row!important;
      align-items:center!important;
      gap:0!important;
      margin:0!important;
      padding:0!important;
    }

    @media(max-width:760px){
      .topbar{
        height:80px!important;
        min-height:80px!important;
        padding:0!important;
        grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important;
        gap:7px!important;
      }
      .topbar > div:first-child > .eyebrow{display:none!important}
      .topbar > div:first-child > h1{
        margin:0!important;
        font-size:23px!important;
        line-height:1.08!important;
        white-space:nowrap;
      }
      .topbar > #v714ModeSwitch{
        padding:2px!important;
      }
      .topbar > #v714ModeSwitch button{
        padding:6px 8px!important;
        font-size:.68rem!important;
        line-height:1.1!important;
      }
      .topbar-actions #quickAdd{
        margin:0!important;
        padding:9px 10px!important;
        white-space:nowrap;
        position:relative;
        z-index:2;
      }
    }

    @media(max-width:390px){
      .topbar{gap:4px!important}
      .topbar > div:first-child > h1{font-size:20px!important}
      .topbar > #v714ModeSwitch button{padding:5px 6px!important;font-size:.63rem!important}
      .topbar-actions #quickAdd{padding:8px 8px!important;font-size:.78rem!important}
    }
  `;
  document.head.appendChild(style);

  refreshLayout();
  const brand = document.querySelector(".brand-sub");
  if (brand) brand.textContent = mode() === "forever" ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
})();
