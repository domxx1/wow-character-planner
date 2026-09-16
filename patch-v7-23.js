/* v0.7.23 — Dedicated Forever matrix renderer. */
(() => {
  const VERSION = "0.7.23";
  const MODE_KEY = "wowCharacterPlanner.gameMode.v1";
  const FOREVER_RACE_KEY = "wowCharacterPlanner.forever.customRaces.v1";
  const FOREVER_CLASS_KEY = "wowCharacterPlanner.forever.customClasses.v1";

  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : (localStorage.getItem(MODE_KEY) === "forever" ? "forever" : "retail");

  const BASE_RACES = [
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

  const BASE_CLASSES = [
    {name:"Priester",armor:"Stoff",color:"#FFFFFF",forever:true},
    {name:"Magier",armor:"Stoff",color:"#3FC7EB",forever:true},
    {name:"Hexenmeister",armor:"Stoff",color:"#8788EE",forever:true},
    {name:"Schurke",armor:"Leder",color:"#FFF468",forever:true},
    {name:"Druide",armor:"Leder",color:"#FF7C0A",forever:true},
    {name:"Jäger",armor:"Kette",color:"#AAD372",forever:true},
    {name:"Schamane",armor:"Kette",color:"#0070DD",forever:true},
    {name:"Krieger",armor:"Platte",color:"#C69B6D",forever:true},
    {name:"Paladin",armor:"Platte",color:"#F48CBA",forever:true}
  ];

  const COMBOS = {
    Menschen:["Krieger","Paladin","Jäger","Schurke","Priester","Magier","Hexenmeister"],
    Zwerge:["Krieger","Paladin","Jäger","Schurke","Priester","Schamane"],
    Nachtelfen:["Krieger","Jäger","Schurke","Priester","Druide"],
    Gnome:["Krieger","Schurke","Priester","Magier","Hexenmeister"],
    Orcs:["Krieger","Jäger","Schurke","Schamane","Magier","Hexenmeister"],
    Untote:["Krieger","Paladin","Schurke","Priester","Magier","Hexenmeister"],
    Tauren:["Krieger","Jäger","Schamane","Druide"],
    Trolle:["Krieger","Jäger","Schurke","Priester","Schamane","Magier","Hexenmeister"]
  };

  const ARMOR_ORDER = ["Stoff","Leder","Kette","Platte"];
  const OFFICIAL_ORDER = {
    Stoff:["Priester","Magier","Hexenmeister"],
    Leder:["Schurke","Druide"],
    Kette:["Jäger","Schamane"],
    Platte:["Krieger","Paladin"]
  };

  function readRecords(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.filter(x => x && !x.deleted && String(x.name || "").trim()) : [];
    } catch { return []; }
  }

  function raceKey(r) { return r.key || `${r.name}|${r.faction}`; }
  function normalizeColor(value) { return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#64748b"; }

  function foreverRaces() {
    const custom = readRecords(FOREVER_RACE_KEY)
      .map(r => ({
        key:`ForeverCustom:${String(r.id || "")}`,
        name:String(r.name).trim(),
        faction:["Horde","Allianz","Neutral"].includes(r.faction) ? r.faction : "Neutral",
        custom:true,customId:String(r.id || ""),forever:true
      }))
      .sort((a,b) => {
        const factionOrder = {Horde:0,Allianz:1,Neutral:2};
        return (factionOrder[a.faction] ?? 3) - (factionOrder[b.faction] ?? 3) || a.name.localeCompare(b.name,"de");
      });

    const hordeBase = BASE_RACES.filter(r => r.faction === "Horde");
    const allianceBase = BASE_RACES.filter(r => r.faction === "Allianz");
    return [
      ...hordeBase,
      ...custom.filter(r => r.faction === "Horde"),
      ...allianceBase,
      ...custom.filter(r => r.faction === "Allianz"),
      ...custom.filter(r => r.faction === "Neutral")
    ].map(r => ({...r}));
  }

  function foreverClasses() {
    const custom = readRecords(FOREVER_CLASS_KEY).map(c => ({
      name:String(c.name).trim(),
      armor:ARMOR_ORDER.includes(c.armor) ? c.armor : "",
      color:normalizeColor(c.color),
      custom:true,customClass:true,customId:String(c.id || ""),forever:true
    }));
    return [...BASE_CLASSES.map(c => ({...c})), ...custom].sort((a,b) => {
      const ag = ARMOR_ORDER.includes(a.armor) ? ARMOR_ORDER.indexOf(a.armor) : 99;
      const bg = ARMOR_ORDER.includes(b.armor) ? ARMOR_ORDER.indexOf(b.armor) : 99;
      if (ag !== bg) return ag - bg;
      const ao = (OFFICIAL_ORDER[a.armor] || []).indexOf(a.name);
      const bo = (OFFICIAL_ORDER[b.armor] || []).indexOf(b.name);
      const aRank = a.customClass ? 500 : (ao < 0 ? 400 : ao);
      const bRank = b.customClass ? 500 : (bo < 0 ? 400 : bo);
      return aRank - bRank || a.name.localeCompare(b.name,"de");
    });
  }

  function validCombo(race, cls) {
    if (race.custom || cls.customClass) return true;
    if (race.name === "Himmelsgeborene") {
      if (["Krieger","Jäger","Schurke","Druide"].includes(cls.name)) return true;
      return race.faction === "Horde" ? cls.name === "Schamane" : cls.name === "Magier";
    }
    return (COMBOS[race.name] || []).includes(cls.name);
  }

  function rgba(hex, alpha) {
    const value = normalizeColor(hex).slice(1);
    const r = parseInt(value.slice(0,2),16), g = parseInt(value.slice(2,4),16), b = parseInt(value.slice(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function comboFlags(list) {
    const existing = list.some(c => c.status !== "Geplant");
    const planned = list.some(c => c.status === "Geplant");
    return {existing,planned,total:existing || planned};
  }

  function scopeCharacters() {
    return (Array.isArray(characters) ? characters : []).filter(c => !c.gameMode || c.gameMode === "forever");
  }

  function classStats(list, className, faction="") {
    const grouped = new Map();
    list.filter(c => c.className === className && (!faction || c.faction === faction)).forEach(c => {
      const key = `${c.race}|${c.faction}`;
      if (!grouped.has(key)) grouped.set(key,[]);
      grouped.get(key).push(c);
    });
    const stats={existing:0,planned:0,total:0};
    grouped.forEach(items => {
      const f=comboFlags(items);
      if(f.existing)stats.existing++;
      if(f.planned)stats.planned++;
      if(f.total)stats.total++;
    });
    return stats;
  }

  function overallStats(list, faction="") {
    const grouped = new Map();
    list.filter(c => !faction || c.faction === faction).forEach(c => {
      const key=`${c.race}|${c.faction}|${c.className}`;
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(c);
    });
    const stats={existing:0,planned:0,total:0};
    grouped.forEach(items=>{
      const f=comboFlags(items);
      if(f.existing)stats.existing++;
      if(f.planned)stats.planned++;
      if(f.total)stats.total++;
    });
    return stats;
  }

  function factionWord(faction) {
    if(faction === "Horde") return '<span class="v75-faction-word v75-horde-text">Horde</span>';
    if(faction === "Allianz") return '<span class="v75-faction-word v75-alliance-text">Allianz</span>';
    return '<span>Neutral</span>';
  }

  function renderForeverMatrix() {
    const table=document.querySelector("#raceClassMatrix");
    if(!table)return;

    const races=foreverRaces();
    const classes=foreverClasses();
    const list=scopeCharacters();

    /* Keep the shared catalog populated for all existing click/filter handlers. */
    RACES.splice(0,RACES.length,...races.map(r=>({...r})));
    CLASSES.splice(0,CLASSES.length,...classes.map(c=>({...c})));

    const classStarts=new Set();
    classes.forEach((c,i)=>{if(i===0 || classes[i-1].armor !== c.armor)classStarts.add(i);});

    const head=`<thead><tr><th>Volk</th>${classes.map((cls,i)=>{
      const label=`${cls.name} · ${cls.armor || "Ohne Rüstungsart"}${cls.customClass ? " · Custom" : ""}`;
      return `<th class="v75-class-head${classStarts.has(i)?" v73-armor-start":""} v713-matrix-filter-link" data-v713-class="${escapeHtml(cls.name)}" role="button" tabindex="0" title="${escapeHtml(cls.name)} in der Charakterliste anzeigen" aria-label="${escapeHtml(cls.name)} in der Charakterliste anzeigen"><span class="v75-class-dot" style="--class:${escapeHtml(cls.color)}" aria-hidden="true"></span></th>`;
    }).join("")}<th class="v75-sum-head v75-head-existing">Erstellt</th><th class="v75-sum-head v75-head-planned">Geplant</th><th class="v75-sum-head v75-head-total">Gesamt</th></tr></thead>`;

    let previousFaction="";
    const body=races.map((race,index)=>{
      const nextFaction=races[index+1]?.faction || "";
      const factionStart=race.faction!==previousFaction;
      const factionEnd=race.faction!==nextFaction;
      previousFaction=race.faction;
      const rowList=list.filter(c=>c.race===race.name && c.faction===race.faction);
      const rowStats={existing:0,planned:0,total:0};

      const cells=classes.map((cls,classIndex)=>{
        const matches=rowList.filter(c=>c.className===cls.name);
        const flags=comboFlags(matches);
        if(flags.existing)rowStats.existing++;
        if(flags.planned)rowStats.planned++;
        if(flags.total)rowStats.total++;
        const valid=validCombo(race,cls);
        const armorStart=classStarts.has(classIndex)?" v73-armor-start":"";
        if(!valid && !matches.length){
          return `<td class="${armorStart.trim()}"><button class="matrix-cell v5-invalid" type="button" disabled aria-label="Nicht verfügbare Kombination"><span class="count">–</span></button></td>`;
        }
        const existing=matches.filter(c=>c.status!=="Geplant");
        const planned=matches.filter(c=>c.status==="Geplant");
        const state=existing.length&&planned.length?"v3-both":existing.length?"has":planned.length?"planned":"";
        const marks=matches.length
          ? `<span class="v3-marks">${existing.length?`<span class="v3-x" title="Erstellt">x${existing.length>1?existing.length:""}</span>`:""}${planned.length?`<span class="v3-y" title="Geplant">y${planned.length>1?planned.length:""}</span>`:""}</span>`
          : '<span class="count">＋</span>';
        const title=matches.length
          ? matches.map(c=>`${c.name||"Unbenannt"} (${c.status||"Aktiv"})`).join(", ")
          : `${race.name} · ${race.faction} · ${cls.name} planen`;
        return `<td class="${armorStart.trim()}"><button class="matrix-cell ${state} v73-possible" type="button" data-v3-race="${escapeHtml(raceKey(race))}" data-class="${escapeHtml(cls.name)}" style="--v73-class:${escapeHtml(cls.color)};--v73-class-soft:${rgba(cls.color,.045)};--v73-class-occupied:${rgba(cls.color,.18)};--v73-class-edge:${rgba(cls.color,.16)}" title="${escapeHtml(title)}">${marks}</button></td>`;
      }).join("");

      const runClass=race.faction==="Horde"?"v75-horde-run":race.faction==="Allianz"?"v75-alliance-run":"";
      const startClass=factionStart?` v75-${race.faction==="Horde"?"horde":race.faction==="Allianz"?"alliance":"neutral"}-start`:"";
      const endClass=factionEnd?` v75-${race.faction==="Horde"?"horde":race.faction==="Allianz"?"alliance":"neutral"}-end`:"";
      const meta=`<div class="cell-label">${factionWord(race.faction)}${race.custom?' <span class="v75-custom-word">· Custom</span>':""}</div>`;
      const raceCell=`<td class="v713-matrix-filter-link" data-v713-race="${escapeHtml(raceKey(race))}" role="button" tabindex="0" title="${escapeHtml(race.name)} (${escapeHtml(race.faction)}) in der Charakterliste anzeigen" aria-label="${escapeHtml(race.name)} (${escapeHtml(race.faction)}) in der Charakterliste anzeigen">${escapeHtml(race.name)}${meta}</td>`;
      const sums=`<td class="v75-sum-cell v75-sum-existing"><strong>${rowStats.existing}</strong></td><td class="v75-sum-cell v75-sum-planned"><strong>${rowStats.planned}</strong></td><td class="v75-sum-cell v75-sum-total"><strong>${rowStats.total}</strong></td>`;
      return `<tr class="${runClass}${startClass}${endClass}">${raceCell}${cells}${sums}</tr>`;
    }).join("");

    function footerRow(faction,metric,label,cssClass){
      const classCells=classes.map((cls,i)=>{
        const s=classStats(list,cls.name,faction);
        return `<td class="v75-footer-number${classStarts.has(i)?" v73-armor-start":""}" title="${escapeHtml(cls.name)} · ${label}">${s[metric]}</td>`;
      }).join("");
      const total=overallStats(list,faction)[metric];
      return `<tr class="v75-footer-row ${cssClass}"><td class="v75-footer-label">${faction?`${factionWord(faction)} · ${label}`:`Gesamt · ${label}`}</td>${classCells}<td class="v75-footer-side v75-side-existing">${metric==="existing"?total:""}</td><td class="v75-footer-side v75-side-planned">${metric==="planned"?total:""}</td><td class="v75-footer-side v75-side-total">${metric==="total"?total:""}</td></tr>`;
    }

    const footer=`<tfoot>${footerRow("Horde","existing","Erstellt","v75-footer-horde")}${footerRow("Horde","planned","Geplant","v75-footer-horde")}${footerRow("Horde","total","Gesamt","v75-footer-horde")}${footerRow("Allianz","existing","Erstellt","v75-footer-alliance")}${footerRow("Allianz","planned","Geplant","v75-footer-alliance")}${footerRow("Allianz","total","Gesamt","v75-footer-alliance")}${footerRow("","total","Gesamt","v75-footer-overall")}</tfoot>`;

    table.classList.add("v723-forever-matrix");
    table.style.minWidth=`${150 + classes.length*38 + 3*56}px`;
    table.innerHTML=head+`<tbody>${body}</tbody>`+footer;
  }

  const previousRenderMatrix=renderMatrix;
  renderMatrix=function(...args){
    const table=document.querySelector("#raceClassMatrix");
    if(mode()!=="forever"){
      table?.classList.remove("v723-forever-matrix");
      table?.style.removeProperty("min-width");
      return previousRenderMatrix.apply(this,args);
    }
    renderForeverMatrix();
  };

  const style=document.createElement("style");
  style.textContent=`
    #raceClassMatrix.v723-forever-matrix{table-layout:fixed!important}
    #raceClassMatrix.v723-forever-matrix th:first-child,
    #raceClassMatrix.v723-forever-matrix tbody td:first-child,
    #raceClassMatrix.v723-forever-matrix tfoot td:first-child{
      width:150px!important;min-width:150px!important;max-width:150px!important;
    }
    #raceClassMatrix.v723-forever-matrix th.v75-class-head,
    #raceClassMatrix.v723-forever-matrix tbody td:not(:first-child):not(.v75-sum-cell),
    #raceClassMatrix.v723-forever-matrix tfoot td.v75-footer-number{
      width:38px!important;min-width:38px!important;max-width:38px!important;
    }
    #raceClassMatrix.v723-forever-matrix .v75-sum-head,
    #raceClassMatrix.v723-forever-matrix .v75-sum-cell,
    #raceClassMatrix.v723-forever-matrix tfoot .v75-footer-side{
      width:56px!important;min-width:56px!important;max-width:56px!important;
    }
  `;
  document.head.appendChild(style);

  if(mode()==="forever") renderMatrix();
  const brand=document.querySelector(".brand-sub");
  if(brand)brand.textContent=mode()==="forever"?`WoW Forever · ${VERSION}`:`WoW Retail · 12.1 · ${VERSION}`;
})();
