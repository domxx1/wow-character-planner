/* v0.2.0 compatibility/data patch — appended to app.js by the service worker. */
(() => {
  const V2_RACES = [
    {key:"Orcs|Horde",name:"Orcs",faction:"Horde"},
    {key:"Untote|Horde",name:"Untote",faction:"Horde"},
    {key:"Tauren|Horde",name:"Tauren",faction:"Horde"},
    {key:"Trolle|Horde",name:"Trolle",faction:"Horde"},
    {key:"Blutelfen|Horde",name:"Blutelfen",faction:"Horde"},
    {key:"Goblins|Horde",name:"Goblins",faction:"Horde"},
    {key:"Pandaren|Horde",name:"Pandaren",faction:"Horde"},
    {key:"Dracthyr|Horde",name:"Dracthyr",faction:"Horde"},
    {key:"Nachtgeborene|Horde",name:"Nachtgeborene",faction:"Horde"},
    {key:"Hochbergtauren|Horde",name:"Hochbergtauren",faction:"Horde"},
    {key:"Orcs der Mag'har|Horde",name:"Orcs der Mag'har",faction:"Horde"},
    {key:"Zandalaritrolle|Horde",name:"Zandalaritrolle",faction:"Horde"},
    {key:"Vulpera|Horde",name:"Vulpera",faction:"Horde"},
    {key:"Irdene|Horde",name:"Irdene",faction:"Horde"},
    {key:"Haranir|Horde",name:"Haranir",faction:"Horde"},
    {key:"Menschen|Allianz",name:"Menschen",faction:"Allianz"},
    {key:"Zwerge|Allianz",name:"Zwerge",faction:"Allianz"},
    {key:"Nachtelfen|Allianz",name:"Nachtelfen",faction:"Allianz"},
    {key:"Gnome|Allianz",name:"Gnome",faction:"Allianz"},
    {key:"Draenei|Allianz",name:"Draenei",faction:"Allianz"},
    {key:"Worgen|Allianz",name:"Worgen",faction:"Allianz"},
    {key:"Pandaren|Allianz",name:"Pandaren",faction:"Allianz"},
    {key:"Dracthyr|Allianz",name:"Dracthyr",faction:"Allianz"},
    {key:"Leerenelfen|Allianz",name:"Leerenelfen",faction:"Allianz"},
    {key:"Lichtgeschmiedete Draenei|Allianz",name:"Lichtgeschmiedete Draenei",faction:"Allianz"},
    {key:"Dunkeleisenzwerge|Allianz",name:"Dunkeleisenzwerge",faction:"Allianz"},
    {key:"Kul Tiraner|Allianz",name:"Kul Tiraner",faction:"Allianz"},
    {key:"Mechagnome|Allianz",name:"Mechagnome",faction:"Allianz"},
    {key:"Irdene|Allianz",name:"Irdene",faction:"Allianz"},
    {key:"Haranir|Allianz",name:"Haranir",faction:"Allianz"}
  ];

  const V2_RACE_MAP = new Map([
    ["orc","Orcs"],["untoter","Untote"],["taure","Tauren"],["troll","Trolle"],
    ["blutelf","Blutelfen"],["goblin","Goblins"],["nachtelf","Nachtelfen"],["gnom","Gnome"],
    ["mensch","Menschen"],["zwerg","Zwerge"],["leerenelf","Leerenelfen"],["gilnear","Worgen"],
    ["hochberg-taure","Hochbergtauren"],["nachtgeborener","Nachtgeborene"],["maghar","Orcs der Mag'har"],
    ["mag'har","Orcs der Mag'har"],["zandalari","Zandalaritrolle"],["dunkeleisen-zwerg","Dunkeleisenzwerge"],
    ["mecha-gnom","Mechagnome"],["lichtgeschmiedeter","Lichtgeschmiedete Draenei"],
    ["kultiraner","Kul Tiraner"],["pandare","Pandaren"],["irdener","Irdene"]
  ]);

  function v2CanonicalRace(raw="", faction="", variant="") {
    let race=String(raw||"").trim();
    let v=String(variant||"").trim();
    const suffix=race.match(/^(.*) \((Horde|Allianz)\)$/);
    if(suffix){ race=suffix[1]; if(!faction) faction=suffix[2]; }
    const lower=race.toLocaleLowerCase("de");
    if(lower==="man'ari" || lower==="man’ari"){ race="Draenei"; v=v||"Man'ari"; }
    else if(lower==="astraler"){ race=""; v=v||"Astraler"; }
    else if(lower==="untoter elf"){ race=""; v=v||"Untoter Elf"; }
    else race=V2_RACE_MAP.get(lower)||race;
    return {race,faction,variant:v};
  }
  function v2Profession(raw=""){
    const p=String(raw||"").trim();
    return p.toLocaleLowerCase("de")==="juwelier"?"Juwelierskunst":p;
  }
  function v2Normalize(c={}){
    const norm=v2CanonicalRace(c.race||c.volk||"",c.faction||c.fraktion||"",c.variant||c.variante||"");
    return {
      id:c.id||uid(), name:String(c.name||"").trim(), race:norm.race, variant:norm.variant,
      faction:norm.faction||"Neutral", className:String(c.className||c.klasse||"").trim(),
      gender:String(c.gender||c.geschlecht||"").trim(), profession1:v2Profession(c.profession1||c["Beruf 1"]||""),
      profession2:v2Profession(c.profession2||c["Beruf 2"]||""), status:String(c.status||"Aktiv").trim()||"Aktiv",
      realm:String(c.realm||c.server||"").trim(), midnight:String(c.midnight||"").trim(), notes:String(c.notes||c.notizen||"").trim()
    };
  }
  function v2RaceKey(race,faction){ return V2_RACES.find(r=>r.name===race&&r.faction===faction)?.key||""; }
  function v2DisplayName(c){ return c.name||"Unbenannt"; }

  // Upgrade in-memory data and the official race catalog without publishing personal roster data.
  RACES.splice(0,RACES.length,...V2_RACES);
  characters=characters.map(v2Normalize);

  // Add the optional variant field to the existing dialog.
  const raceField=$("#charRace")?.closest(".field");
  if(raceField && !$("#charVariant")){
    const label=document.createElement("label");
    label.className="field";
    label.innerHTML='<span>Variante / Konzept</span><input id="charVariant" maxlength="60" placeholder="z. B. Man\'ari">';
    raceField.insertAdjacentElement("afterend",label);
  }
  $("#charName")?.removeAttribute("required");
  $("#charRace")?.removeAttribute("required");

  // Add JSON import next to the existing CSV import.
  if(!$("#jsonImport")){
    const csvInput=$("#csvImport");
    const csvLabel=csvInput?.closest("label");
    if(csvLabel){
      const label=document.createElement("label");
      label.className="btn btn-secondary file-btn";
      label.innerHTML='JSON importieren<input id="jsonImport" type="file" accept=".json,application/json">';
      csvLabel.insertAdjacentElement("afterend",label);
    }
  }
  const brandSub=document.querySelector(".brand-sub");
  if(brandSub) brandSub.textContent="WoW Retail · 12.1 · 0.2.0";
  const settingsText=$("#settings .panel .muted");
  if(settingsText) settingsText.textContent="CSV/JSON-Import unterstützt deine Charakterplanung. Bekannte ältere Schreibweisen werden soweit eindeutig auf offizielle deutsche WoW-Bezeichnungen normalisiert; Sonderformen bleiben als Variante erhalten.";
  const matrixText=$("#matrix .matrix-intro p");
  if(matrixText) matrixText.textContent="Die Matrix verwendet die offiziellen spielbaren Völker. Fraktionsneutrale Völker werden getrennt nach Horde und Allianz geführt; Varianten/Konzepte bleiben am Charakter erhalten.";

  function v2InitSelects(){
    $("#filterClass").innerHTML='<option value="">Alle Klassen</option>'+CLASSES.map(c=>`<option>${c.name}</option>`).join("");
    $("#charClass").innerHTML=CLASSES.map(c=>`<option>${c.name}</option>`).join("");
    const dup=new Set(V2_RACES.filter((r,i,a)=>a.findIndex(x=>x.name===r.name)!==i).map(r=>r.name));
    $("#charRace").innerHTML='<option value="">Nicht zugeordnet</option>'+V2_RACES.map(r=>`<option value="${escapeHtml(r.key)}">${escapeHtml(r.name)}${dup.has(r.name)?` — ${r.faction}`:""}</option>`).join("");
    const profOpts=PROFESSIONS.map(p=>`<option value="${p}">${p||"–"}</option>`).join("");
    $("#charProfession1").innerHTML=profOpts;
    $("#charProfession2").innerHTML=profOpts;
  }

  getFilteredCharacters=function(){
    const q=$("#searchInput").value.trim().toLocaleLowerCase("de");
    const fac=$("#filterFaction").value, cls=$("#filterClass").value, stat=$("#filterStatus").value;
    return characters.filter(c=>{
      const hay=[c.name,c.race,c.variant,c.faction,c.className,c.gender,c.profession1,c.profession2,c.realm,c.midnight,c.notes].join(" ").toLocaleLowerCase("de");
      return (!q||hay.includes(q))&&(!fac||c.faction===fac)&&(!cls||c.className===cls)&&(!stat||c.status===stat);
    }).sort((a,b)=>v2DisplayName(a).localeCompare(v2DisplayName(b),"de"));
  };

  characterRow=function(c,compact=false){
    const ci=classInfo(c.className);
    const raceLabel=c.race||(c.variant?"Volk offen":"Nicht zugeordnet");
    return `<div class="character-row" data-id="${c.id}">
      <div class="character-main"><div class="class-orb" style="--class:${ci.color}">${escapeHtml((c.className||"?").slice(0,1))}</div><div>
        <div class="character-name">${escapeHtml(v2DisplayName(c))}</div>
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
    const body=V2_RACES.map(r=>{
      const cells=CLASSES.map(cls=>{
        const matches=characters.filter(c=>c.race===r.name&&c.faction===r.faction&&c.className===cls.name);
        const active=matches.filter(c=>c.status!=="Geplant").length;
        const planned=matches.filter(c=>c.status==="Geplant").length;
        const state=active?"has":planned?"planned":"";
        const label=matches.length?matches.length:"＋";
        const title=matches.length?matches.map(c=>`${v2DisplayName(c)} (${c.status||"Aktiv"})`).join(", "):`${r.name} · ${r.faction} · ${cls.name} planen`;
        return `<td><button class="matrix-cell ${state}" data-v2-race="${escapeHtml(r.key)}" data-class="${escapeHtml(cls.name)}" title="${escapeHtml(title)}"><span class="count">${label}</span></button></td>`;
      }).join("");
      return `<tr><td>${escapeHtml(r.name)}<div class="cell-label">${r.faction}</div></td>${cells}</tr>`;
    }).join("");
    table.innerHTML=head+`<tbody>${body}</tbody>`;
  };

  openCharacter=function(id=null,preset={}){
    const c=id?characters.find(x=>x.id===id):null;
    $("#modalTitle").textContent=c?"Charakter bearbeiten":"Charakter planen";
    $("#charId").value=c?.id||"";
    $("#charName").value=c?.name||"";
    const raceName=c?.race||preset.race||"";
    const faction=c?.faction||preset.faction||"Horde";
    $("#charRace").value=v2RaceKey(raceName,faction);
    $("#charVariant").value=c?.variant||"";
    $("#charFaction").value=faction;
    $("#charClass").value=c?.className||preset.className||CLASSES[0].name;
    $("#charGender").value=c?.gender||"";
    $("#charStatus").value=c?.status||"Geplant";
    $("#charProfession1").value=c?.profession1||"";
    $("#charProfession2").value=c?.profession2||"";
    $("#charRealm").value=c?.realm||"";
    $("#charMidnight").value=c?.midnight||"";
    $("#charNotes").value=c?.notes||"";
    $("#deleteCharacter").classList.toggle("hidden",!c);
    $("#characterDialog").showModal();
  };

  const oldSubmit=submitCharacter;
  $("#characterForm").removeEventListener("submit",oldSubmit);
  submitCharacter=function(e){
    e.preventDefault();
    const id=$("#charId").value;
    const selected=V2_RACES.find(r=>r.key===$("#charRace").value);
    const data={id:id||uid(),name:$("#charName").value.trim(),race:selected?.name||"",variant:$("#charVariant").value.trim(),
      faction:selected?.faction||$("#charFaction").value,className:$("#charClass").value,gender:$("#charGender").value,
      profession1:$("#charProfession1").value,profession2:$("#charProfession2").value,status:$("#charStatus").value,
      realm:$("#charRealm").value.trim(),midnight:$("#charMidnight").value,notes:$("#charNotes").value.trim()};
    if(!data.name&&data.status!=="Geplant"){toast("Für aktive Charaktere ist ein Name erforderlich");return;}
    if(id){const idx=characters.findIndex(c=>c.id===id);characters[idx]=data;}else characters.push(data);
    $("#characterDialog").close();saveCharacters();toast(id?"Charakter aktualisiert":"Charakter angelegt");
  };
  $("#characterForm").addEventListener("submit",submitCharacter);

  importCSV=function(file){
    const reader=new FileReader();
    reader.onload=()=>{try{
      const rows=parseCSV(reader.result);if(rows.length<2)throw new Error("Keine Datenzeilen gefunden.");
      const headers=rows[0].map(normHeader);const idx=(...names)=>headers.findIndex(h=>names.includes(h));
      const map={name:idx("name"),race:idx("volk","rasse"),variant:idx("variante","variante / konzept","konzept"),faction:idx("fraktion"),className:idx("klasse"),gender:idx("geschlecht"),profession1:idx("beruf 1","beruf1"),profession2:idx("beruf 2","beruf2"),midnight:idx("midnight"),status:idx("status"),realm:idx("server","realm"),notes:idx("notizen","notiz")};
      if(map.name<0||map.race<0||map.className<0)throw new Error("Mindestens Name, Volk und Klasse müssen als Spalten vorhanden sein.");
      const imported=rows.slice(1).map(r=>v2Normalize({name:(r[map.name]||"").trim(),race:(r[map.race]||"").trim(),variant:map.variant>=0?(r[map.variant]||"").trim():"",faction:map.faction>=0?(r[map.faction]||"").trim():"",className:(r[map.className]||"").trim(),gender:map.gender>=0?(r[map.gender]||"").trim():"",profession1:map.profession1>=0?(r[map.profession1]||"").trim():"",profession2:map.profession2>=0?(r[map.profession2]||"").trim():"",midnight:map.midnight>=0?(r[map.midnight]||"").trim():"",status:map.status>=0?(r[map.status]||"").trim()||"Aktiv":"Aktiv",realm:map.realm>=0?(r[map.realm]||"").trim():"",notes:map.notes>=0?(r[map.notes]||"").trim():""})).filter(c=>c.name||c.status==="Geplant");
      characters.push(...imported);saveCharacters();toast(`${imported.length} Charaktere importiert`);setView("characters");
    }catch(err){alert("CSV-Import fehlgeschlagen: "+err.message);}$("#csvImport").value="";};reader.readAsText(file,"utf-8");
  };

  function v2ImportJSON(file){
    const reader=new FileReader();reader.onload=()=>{try{
      const parsed=JSON.parse(reader.result);const raw=Array.isArray(parsed)?parsed:parsed.characters;
      if(!Array.isArray(raw))throw new Error("Keine Charakterliste gefunden.");
      const imported=raw.map(v2Normalize).filter(c=>c.name||c.status==="Geplant");
      characters.push(...imported);saveCharacters();toast(`${imported.length} Charaktere importiert`);setView("characters");
    }catch(err){alert("JSON-Import fehlgeschlagen: "+err.message);}$("#jsonImport").value="";};reader.readAsText(file,"utf-8");
  }
  $("#jsonImport")?.addEventListener("change",e=>{if(e.target.files[0])v2ImportJSON(e.target.files[0]);});

  const oldExportCsv=exportCSV, oldExportJson=exportJSON;
  $("#exportCsv").removeEventListener("click",oldExportCsv);
  $("#exportJson").removeEventListener("click",oldExportJson);
  exportCSV=function(){
    const headers=["Name","Volk","Variante","Fraktion","Klasse","Geschlecht","Beruf 1","Beruf 2","Midnight","Status","Server","Notizen"];
    const rows=characters.map(c=>[c.name,c.race,c.variant,c.faction,c.className,c.gender,c.profession1,c.profession2,c.midnight,c.status,c.realm,c.notes]);
    const text="\uFEFF"+[headers,...rows].map(r=>r.map(csvEscape).join(";")).join("\r\n");downloadBlob(text,"wow-charaktere.csv","text/csv;charset=utf-8");
  };
  exportJSON=function(){downloadBlob(JSON.stringify({version:2,exportedAt:new Date().toISOString(),characters},null,2),"wow-charakterplaner-backup.json","application/json");};
  $("#exportCsv").addEventListener("click",exportCSV);$("#exportJson").addEventListener("click",exportJSON);

  // Neutral-race selector should set the chosen faction. The old listener harmlessly does nothing for the v2 keys.
  $("#charRace").addEventListener("change",()=>{const r=V2_RACES.find(x=>x.key===$("#charRace").value);if(r)$("#charFaction").value=r.faction;});

  // Handle matrix clicks before the legacy bubble listener sees them.
  document.addEventListener("click",e=>{
    const cell=e.target.closest(".matrix-cell[data-v2-race]");if(!cell)return;
    e.preventDefault();e.stopImmediatePropagation();
    const race=V2_RACES.find(r=>r.key===cell.dataset.v2Race);if(!race)return;
    const matches=characters.filter(c=>c.race===race.name&&c.faction===race.faction&&c.className===cell.dataset.class);
    if(matches.length===1)openCharacter(matches[0].id);
    else if(matches.length>1){$("#searchInput").value=`${race.name} ${cell.dataset.class}`;$("#filterClass").value=cell.dataset.class;$("#filterFaction").value=race.faction;setView("characters");renderCharacters();}
    else openCharacter(null,{race:race.name,faction:race.faction,className:cell.dataset.class});
  },true);

  // Persist the migration only when there is already local data, then rebuild UI with official labels.
  if(characters.length) localStorage.setItem(STORAGE_KEY,JSON.stringify(characters));
  v2InitSelects();renderAll();
})();
