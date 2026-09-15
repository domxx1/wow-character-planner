/* v0.3.0 — Remix planning, filtering and matrix states. Personal roster data stays local. */
(() => {
  const VERSION = "0.3.0";
  const REMIX_STORAGE_KEY = "wowCharacterPlanner.remix.v1";
  const REMIX_OPTIONS = ["TBC","WotLK","Cata","MoP","WoD","Legion","BfA","SL","DF","TWW","Midnight"];

  const raceAlias = new Map([
    ["orc","Orcs"],["untoter","Untote"],["taure","Tauren"],["troll","Trolle"],
    ["blutelf","Blutelfen"],["goblin","Goblins"],["nachtelf","Nachtelfen"],["gnom","Gnome"],
    ["mensch","Menschen"],["zwerg","Zwerge"],["leerenelf","Leerenelfen"],["gilnear","Worgen"],
    ["hochberg-taure","Hochbergtauren"],["nachtgeborener","Nachtgeborene"],["maghar","Orcs der Mag'har"],
    ["mag'har","Orcs der Mag'har"],["zandalari","Zandalaritrolle"],["dunkeleisen-zwerg","Dunkeleisenzwerge"],
    ["mecha-gnom","Mechagnome"],["lichtgeschmiedeter","Lichtgeschmiedete Draenei"],
    ["kultiraner","Kul Tiraner"],["pandare","Pandaren"],["irdener","Irdene"]
  ]);

  function loadRemixMap(){
    try { return JSON.parse(localStorage.getItem(REMIX_STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function persistRemixMap(){
    const map={};
    characters.forEach(c=>{ if(c.id && c.remixEvent) map[c.id]=c.remixEvent; });
    localStorage.setItem(REMIX_STORAGE_KEY,JSON.stringify(map));
  }
  const storedRemix=loadRemixMap();
  characters.forEach(c=>{ c.remixEvent=String(c.remixEvent||storedRemix[c.id]||"").trim(); });

  const previousSave=saveCharacters;
  saveCharacters=function(){ persistRemixMap(); previousSave(); };

  function normalizeRace(raw="", faction="", variant=""){
    let race=String(raw||"").trim();
    let f=String(faction||"").trim();
    let v=String(variant||"").trim();
    const suffix=race.match(/^(.*) \((Horde|Allianz)\)$/);
    if(suffix){ race=suffix[1]; if(!f)f=suffix[2]; }
    const lower=race.toLocaleLowerCase("de");
    if(lower==="man'ari"||lower==="man’ari"){race="Draenei";v=v||"Man'ari";}
    else if(lower==="astraler"){race="";v=v||"Astraler";}
    else if(lower==="untoter elf"){race="";v=v||"Untoter Elf";}
    else race=raceAlias.get(lower)||race;
    return {race,faction:f||"Neutral",variant:v};
  }
  function normalizeProfession(value=""){
    const p=String(value||"").trim();
    return p.toLocaleLowerCase("de")==="juwelier"?"Juwelierskunst":p;
  }
  function normalizeRow(row={}){
    const n=normalizeRace(row.race??row.volk??row.Volk,row.faction??row.fraktion??row.Fraktion,row.variant??row.variante??row.Variante);
    return {
      id:String(row.id??"").trim()||uid(),
      name:String(row.name??row.Name??"").trim(),
      race:n.race,variant:n.variant,faction:n.faction,
      className:String(row.className??row.klasse??row.Klasse??"").trim(),
      gender:String(row.gender??row.geschlecht??row.Geschlecht??"").trim(),
      profession1:normalizeProfession(row.profession1??row["Beruf 1"]??""),
      profession2:normalizeProfession(row.profession2??row["Beruf 2"]??""),
      status:String(row.status??row.Status??"Aktiv").trim()||"Aktiv",
      realm:String(row.realm??row.server??row.Server??"").trim(),
      midnight:String(row.midnight??row.Midnight??"").trim(),
      remixEvent:String(row.remixEvent??row.remix??row.Remix??row["Remix-Event"]??"").trim(),
      notes:String(row.notes??row.notizen??row.Notizen??"").trim()
    };
  }
  function mergeImported(imported){
    let added=0,updated=0;
    imported.forEach(c=>{
      const byId=c.id?characters.findIndex(x=>x.id===c.id):-1;
      const key=`${(c.name||"").toLocaleLowerCase("de")}|${c.className}|${c.race}|${c.faction}|${c.status}|${c.remixEvent}`;
      const byKey=characters.findIndex(x=>`${(x.name||"").toLocaleLowerCase("de")}|${x.className}|${x.race}|${x.faction}|${x.status}|${x.remixEvent||""}`===key);
      const idx=byId>=0?byId:byKey;
      if(idx>=0){characters[idx]={...characters[idx],...c,id:characters[idx].id||c.id};updated++;}
      else{characters.push(c);added++;}
    });
    saveCharacters();setView("characters");
    toast(updated?`${added} neu, ${updated} aktualisiert`:`${added} Charaktere importiert`);
  }

  /* UI field */
  if(!$("#charRemix")){
    const midnight=$("#charMidnight")?.closest(".field");
    const field=document.createElement("label");
    field.className="field";
    field.innerHTML='<span>Remix-Event</span><input id="charRemix" list="remixEvents" maxlength="24" placeholder="z. B. MoP, WoD oder BfA"><datalist id="remixEvents">'+REMIX_OPTIONS.map(x=>`<option value="${x}"></option>`).join("")+'</datalist>';
    (midnight||$("#charStatus")?.closest(".field"))?.insertAdjacentElement("afterend",field);
  }

  if(!$("#filterRemix")){
    const status=$("#filterStatus");
    const select=document.createElement("select");
    select.id="filterRemix";select.className="control";
    status?.insertAdjacentElement("afterend",select);
    select.addEventListener("change",renderCharacters);
  }

  function refreshRemixFilter(){
    const el=$("#filterRemix");if(!el)return;
    const keep=el.value;
    const values=[...new Set([...REMIX_OPTIONS,...characters.map(c=>c.remixEvent).filter(Boolean)])];
    el.innerHTML='<option value="">Alle Remix-Events</option>'+values.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
    if(values.includes(keep))el.value=keep;
  }

  /* Small v3 UI additions */
  const style=document.createElement("style");
  style.textContent=`
    .remix-badge{display:inline-flex;align-items:center;gap:.25rem;margin-left:.35rem;padding:.12rem .42rem;border:1px solid rgba(212,175,55,.38);border-radius:999px;color:#e8c96a;font-size:.72rem;white-space:nowrap}
    .matrix-cell.v3-both{box-shadow:inset 0 0 0 2px rgba(212,175,55,.55)}
    .matrix-cell .v3-marks{display:flex;justify-content:center;align-items:center;gap:.22rem;font-weight:800;line-height:1}
    .matrix-cell .v3-x{color:#d9e2ef}.matrix-cell .v3-y{color:#e7bd48}.matrix-cell .v3-remix{display:block;margin-top:.18rem;font-size:.56rem;color:#e7bd48;line-height:1;white-space:nowrap}
  `;
  document.head.appendChild(style);

  getFilteredCharacters=function(){
    const q=$("#searchInput").value.trim().toLocaleLowerCase("de");
    const fac=$("#filterFaction").value,cls=$("#filterClass").value,stat=$("#filterStatus").value,remix=$("#filterRemix")?.value||"";
    return characters.filter(c=>{
      const hay=[c.name,c.race,c.variant,c.faction,c.className,c.gender,c.profession1,c.profession2,c.realm,c.midnight,c.remixEvent,c.notes].join(" ").toLocaleLowerCase("de");
      return(!q||hay.includes(q))&&(!fac||c.faction===fac)&&(!cls||c.className===cls)&&(!stat||c.status===stat)&&(!remix||c.remixEvent===remix);
    }).sort((a,b)=>(a.name||"Unbenannt").localeCompare(b.name||"Unbenannt","de"));
  };

  characterRow=function(c,compact=false){
    const ci=classInfo(c.className),name=c.name||"Unbenannt",raceLabel=c.race||(c.variant?"Volk offen":"Nicht zugeordnet");
    return `<div class="character-row" data-id="${c.id}">
      <div class="character-main"><div class="class-orb" style="--class:${ci.color}">${escapeHtml((c.className||"?").slice(0,1))}</div><div>
        <div class="character-name">${escapeHtml(name)}${c.remixEvent?`<span class="remix-badge">Remix ${escapeHtml(c.remixEvent)}</span>`:""}</div>
        <div class="character-sub">${escapeHtml(raceLabel)}${c.variant?` · ${escapeHtml(c.variant)}`:""} · ${escapeHtml(c.className)}</div>
      </div></div>
      <div class="character-cell"><div class="cell-label">Fraktion</div><span class="badge ${c.faction==="Horde"?"horde":c.faction==="Allianz"?"allianz":""}">${escapeHtml(c.faction)}</span></div>
      <div class="character-cell"><div class="cell-label">Berufe</div>${escapeHtml([c.profession1,c.profession2].filter(Boolean).join(" · ")||"–")}</div>
      ${compact?"":`<div class="character-cell hide-md"><div class="cell-label">Status</div><span class="badge ${c.status==="Geplant"?"geplant":""}">${escapeHtml(c.status||"Aktiv")}</span></div>`}
      <div class="row-actions"><button class="icon-btn edit-character" data-id="${c.id}" title="Bearbeiten">✎</button></div>
    </div>`;
  };

  renderMatrix=function(){
    const table=$("#raceClassMatrix");
    const head=`<thead><tr><th>Volk</th>${CLASSES.map(c=>`<th><span class="matrix-class"><i style="--class:${c.color}"></i>${c.name}</span></th>`).join("")}</tr></thead>`;
    const body=RACES.map(r=>{
      const raceName=r.name,fac=r.faction,key=r.key||`${r.name}|${r.faction}`;
      const cells=CLASSES.map(cls=>{
        const matches=characters.filter(c=>c.race===raceName&&c.faction===fac&&c.className===cls.name);
        const active=matches.filter(c=>c.status!=="Geplant");
        const planned=matches.filter(c=>c.status==="Geplant");
        const remix=[...new Set(planned.map(c=>c.remixEvent).filter(Boolean))];
        const state=active.length&&planned.length?"v3-both":active.length?"has":planned.length?"planned":"";
        const marks=matches.length?`<span class="v3-marks">${active.length?`<span class="v3-x">x${active.length>1?active.length:""}</span>`:""}${planned.length?`<span class="v3-y">y${planned.length>1?planned.length:""}</span>`:""}</span>${remix.length?`<small class="v3-remix">${escapeHtml(remix.join(" · "))}</small>`:""}`:'<span class="count">＋</span>';
        const title=matches.length?matches.map(c=>`${c.name||"Unbenannt"} (${c.status||"Aktiv"}${c.remixEvent?`, Remix ${c.remixEvent}`:""})`).join(", "):`${raceName} · ${fac} · ${cls.name} planen`;
        return `<td><button class="matrix-cell ${state}" data-v3-race="${escapeHtml(key)}" data-class="${escapeHtml(cls.name)}" title="${escapeHtml(title)}">${marks}</button></td>`;
      }).join("");
      return `<tr><td>${escapeHtml(raceName)}<div class="cell-label">${fac}</div></td>${cells}</tr>`;
    }).join("");
    table.innerHTML=head+`<tbody>${body}</tbody>`;
  };

  const matrixText=$("#matrix .matrix-intro p");
  if(matrixText)matrixText.textContent="x = vorhandener Charakter, y = geplanter Charakter. Steht bei y eine Erweiterungsabkürzung, ist der Charakter für dieses Remix-Event geplant.";
  const legend=$("#matrix .legend");
  if(legend)legend.innerHTML='<span><b style="color:#d9e2ef">x</b> vorhanden</span><span><b style="color:#e7bd48">y</b> geplant</span><span><b style="color:#e7bd48">y · MoP</b> Remix-Planung</span>';

  openCharacter=function(id=null,preset={}){
    const c=id?characters.find(x=>x.id===id):null;
    $("#modalTitle").textContent=c?"Charakter bearbeiten":"Charakter planen";
    $("#charId").value=c?.id||"";$("#charName").value=c?.name||"";
    const raceName=c?.race||preset.race||"",faction=c?.faction||preset.faction||"Horde";
    const race=RACES.find(r=>r.name===raceName&&r.faction===faction);
    $("#charRace").value=race?.key||"";$("#charVariant").value=c?.variant||"";$("#charFaction").value=faction;
    $("#charClass").value=c?.className||preset.className||CLASSES[0].name;$("#charGender").value=c?.gender||"";
    $("#charStatus").value=c?.status||"Geplant";$("#charProfession1").value=c?.profession1||"";$("#charProfession2").value=c?.profession2||"";
    $("#charRealm").value=c?.realm||"";$("#charMidnight").value=c?.midnight||"";$("#charRemix").value=c?.remixEvent||preset.remixEvent||"";$("#charNotes").value=c?.notes||"";
    $("#deleteCharacter").classList.toggle("hidden",!c);$("#characterDialog").showModal();
  };

  $("#characterForm").removeEventListener("submit",submitCharacter);
  submitCharacter=function(e){
    e.preventDefault();const id=$("#charId").value;const selected=RACES.find(r=>(r.key||`${r.name}|${r.faction}`)===$("#charRace").value);
    const data={id:id||uid(),name:$("#charName").value.trim(),race:selected?.name||"",variant:$("#charVariant").value.trim(),faction:selected?.faction||$("#charFaction").value,
      className:$("#charClass").value,gender:$("#charGender").value,profession1:$("#charProfession1").value,profession2:$("#charProfession2").value,status:$("#charStatus").value,
      realm:$("#charRealm").value.trim(),midnight:$("#charMidnight").value,remixEvent:$("#charRemix").value.trim(),notes:$("#charNotes").value.trim()};
    if(!data.name&&data.status!=="Geplant"){toast("Für aktive Charaktere ist ein Name erforderlich");return;}
    if(id){const idx=characters.findIndex(c=>c.id===id);characters[idx]=data;}else characters.push(data);
    $("#characterDialog").close();saveCharacters();refreshRemixFilter();toast(id?"Charakter aktualisiert":"Charakter angelegt");
  };
  $("#characterForm").addEventListener("submit",submitCharacter);

  /* Replace import inputs so older listeners cannot discard v3 fields. */
  const oldJson=$("#jsonImport");
  if(oldJson){
    const fresh=oldJson.cloneNode(true);oldJson.replaceWith(fresh);
    fresh.addEventListener("change",e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result||"").replace(/^\uFEFF/,""));const raw=Array.isArray(parsed)?parsed:parsed?.characters;if(!Array.isArray(raw))throw new Error("Keine Charakterliste gefunden.");const imported=raw.map(normalizeRow).filter(c=>c.name||c.status==="Geplant");mergeImported(imported);}catch(err){alert(`JSON-Import fehlgeschlagen (${file.name}): ${err.message}`);}finally{fresh.value="";}};reader.readAsText(file,"utf-8");});
  }
  const oldCsv=$("#csvImport");
  if(oldCsv){
    const fresh=oldCsv.cloneNode(true);oldCsv.replaceWith(fresh);
    fresh.addEventListener("change",e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const rows=parseCSV(reader.result);if(rows.length<2)throw new Error("Keine Datenzeilen gefunden.");const headers=rows[0].map(normHeader);const idx=(...names)=>headers.findIndex(h=>names.includes(h));const at=(r,i)=>i>=0?(r[i]||"").trim():"";const m={name:idx("name"),race:idx("volk","rasse"),variant:idx("variante","variante / konzept","konzept"),faction:idx("fraktion"),className:idx("klasse"),gender:idx("geschlecht"),p1:idx("beruf 1","beruf1"),p2:idx("beruf 2","beruf2"),midnight:idx("midnight"),remix:idx("remix","remix-event","remix event"),status:idx("status"),realm:idx("server","realm"),notes:idx("notizen","notiz")};if(m.race<0||m.className<0)throw new Error("Mindestens Volk und Klasse müssen vorhanden sein.");const imported=rows.slice(1).map(r=>normalizeRow({name:at(r,m.name),race:at(r,m.race),variant:at(r,m.variant),faction:at(r,m.faction),className:at(r,m.className),gender:at(r,m.gender),profession1:at(r,m.p1),profession2:at(r,m.p2),midnight:at(r,m.midnight),remixEvent:at(r,m.remix),status:at(r,m.status)||"Aktiv",realm:at(r,m.realm),notes:at(r,m.notes)})).filter(c=>c.name||c.status==="Geplant");mergeImported(imported);}catch(err){alert(`CSV-Import fehlgeschlagen (${file.name}): ${err.message}`);}finally{fresh.value="";}};reader.readAsText(file,"utf-8");});
  }

  /* Replace export buttons to include Remix-Event. */
  const csvBtn=$("#exportCsv");
  if(csvBtn){const fresh=csvBtn.cloneNode(true);csvBtn.replaceWith(fresh);fresh.addEventListener("click",()=>{const headers=["Name","Volk","Variante","Fraktion","Klasse","Geschlecht","Beruf 1","Beruf 2","Midnight","Remix-Event","Status","Server","Notizen"];const rows=characters.map(c=>[c.name,c.race,c.variant,c.faction,c.className,c.gender,c.profession1,c.profession2,c.midnight,c.remixEvent||"",c.status,c.realm,c.notes]);const text="\uFEFF"+[headers,...rows].map(r=>r.map(csvEscape).join(";")).join("\r\n");downloadBlob(text,"wow-charaktere.csv","text/csv;charset=utf-8");});}
  const jsonBtn=$("#exportJson");
  if(jsonBtn){const fresh=jsonBtn.cloneNode(true);jsonBtn.replaceWith(fresh);fresh.addEventListener("click",()=>downloadBlob(JSON.stringify({version:3,exportedAt:new Date().toISOString(),characters},null,2),"wow-charakterplaner-backup.json","application/json"));}

  document.addEventListener("click",e=>{
    const cell=e.target.closest(".matrix-cell[data-v3-race]");if(!cell)return;e.preventDefault();e.stopImmediatePropagation();
    const race=RACES.find(r=>(r.key||`${r.name}|${r.faction}`)===cell.dataset.v3Race);if(!race)return;
    const matches=characters.filter(c=>c.race===race.name&&c.faction===race.faction&&c.className===cell.dataset.class);
    if(matches.length===1)openCharacter(matches[0].id);
    else if(matches.length>1){$("#searchInput").value=`${race.name} ${cell.dataset.class}`;$("#filterClass").value=cell.dataset.class;$("#filterFaction").value=race.faction;setView("characters");renderCharacters();}
    else openCharacter(null,{race:race.name,faction:race.faction,className:cell.dataset.class});
  },true);

  const brandSub=document.querySelector(".brand-sub");if(brandSub)brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
  refreshRemixFilter();persistRemixMap();renderAll();
})();
