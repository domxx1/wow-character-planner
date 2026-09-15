const STORAGE_KEY = "wowCharacterPlanner.characters.v1";

const CLASSES = [
  {name:"Krieger", armor:"Platte", color:"#C69B6D"},
  {name:"Paladin", armor:"Platte", color:"#F48CBA"},
  {name:"Jäger", armor:"Kette", color:"#AAD372"},
  {name:"Schurke", armor:"Leder", color:"#FFF468"},
  {name:"Priester", armor:"Stoff", color:"#FFFFFF"},
  {name:"Todesritter", armor:"Platte", color:"#C41E3A"},
  {name:"Schamane", armor:"Kette", color:"#0070DD"},
  {name:"Magier", armor:"Stoff", color:"#3FC7EB"},
  {name:"Hexenmeister", armor:"Stoff", color:"#8788EE"},
  {name:"Mönch", armor:"Leder", color:"#00FF98"},
  {name:"Druide", armor:"Leder", color:"#FF7C0A"},
  {name:"Dämonenjäger", armor:"Leder", color:"#A330C9"},
  {name:"Rufer", armor:"Kette", color:"#33937F"}
];

const RACES = [
  {name:"Orc", faction:"Horde"},
  {name:"Untote", faction:"Horde"},
  {name:"Tauren", faction:"Horde"},
  {name:"Troll", faction:"Horde"},
  {name:"Blutelfen", faction:"Horde"},
  {name:"Goblins", faction:"Horde"},
  {name:"Nachtgeborene", faction:"Horde"},
  {name:"Hochbergtauren", faction:"Horde"},
  {name:"Mag'har", faction:"Horde"},
  {name:"Zandalaritrolle", faction:"Horde"},
  {name:"Vulpera", faction:"Horde"},
  {name:"Pandaren (Horde)", faction:"Horde"},
  {name:"Dracthyr (Horde)", faction:"Horde"},
  {name:"Haranir (Horde)", faction:"Horde"},
  {name:"Menschen", faction:"Allianz"},
  {name:"Zwerge", faction:"Allianz"},
  {name:"Nachtelfen", faction:"Allianz"},
  {name:"Gnome", faction:"Allianz"},
  {name:"Draenei", faction:"Allianz"},
  {name:"Worgen", faction:"Allianz"},
  {name:"Leerenelfen", faction:"Allianz"},
  {name:"Lichtgeschmiedete Draenei", faction:"Allianz"},
  {name:"Dunkeleisenzwerge", faction:"Allianz"},
  {name:"Kul Tiraner", faction:"Allianz"},
  {name:"Mechagnome", faction:"Allianz"},
  {name:"Pandaren (Allianz)", faction:"Allianz"},
  {name:"Dracthyr (Allianz)", faction:"Allianz"},
  {name:"Haranir (Allianz)", faction:"Allianz"}
];

const PROFESSIONS = [
  "", "Alchemie", "Bergbau", "Ingenieurskunst", "Inschriftenkunde", "Juwelierskunst",
  "Kräuterkunde", "Kürschnerei", "Lederverarbeitung", "Schmiedekunst",
  "Schneiderei", "Verzauberkunst"
];

const DEMO = [
  {name:"Aelira", race:"Blutelfen", faction:"Horde", className:"Magier", gender:"weiblich", profession1:"Schneiderei", profession2:"Verzauberkunst", status:"Aktiv", realm:"", midnight:"Ja", notes:""},
  {name:"Brom", race:"Zwerge", faction:"Allianz", className:"Paladin", gender:"männlich", profession1:"Bergbau", profession2:"Schmiedekunst", status:"Aktiv", realm:"", midnight:"", notes:""},
  {name:"Shalara", race:"Haranir (Horde)", faction:"Horde", className:"Druide", gender:"weiblich", profession1:"Kräuterkunde", profession2:"Alchemie", status:"Geplant", realm:"", midnight:"Geplant", notes:""}
];

let characters = loadCharacters();
let currentView = "dashboard";

const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }

function loadCharacters(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveCharacters(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  const s=$("#saveState");
  s.textContent="Gespeichert";
  setTimeout(()=>s.textContent="Lokal gespeichert",900);
  renderAll();
}
function toast(msg){
  const t=$("#toast");
  t.textContent=msg; t.classList.add("show");
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>t.classList.remove("show"),2200);
}
function escapeHtml(v=""){
  return String(v).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function classInfo(name){ return CLASSES.find(c=>c.name===name) || {color:"#64748b",armor:"–"}; }

function initSelects(){
  $("#filterClass").innerHTML='<option value="">Alle Klassen</option>'+CLASSES.map(c=>`<option>${c.name}</option>`).join("");
  $("#charClass").innerHTML=CLASSES.map(c=>`<option>${c.name}</option>`).join("");
  $("#charRace").innerHTML=RACES.map(r=>`<option data-faction="${r.faction}">${r.name}</option>`).join("");
  const profOpts=PROFESSIONS.map(p=>`<option value="${p}">${p||"–"}</option>`).join("");
  $("#charProfession1").innerHTML=profOpts;
  $("#charProfession2").innerHTML=profOpts;
}

function setView(view){
  currentView=view;
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===view));
  $$(".nav-btn,.bottom-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const titles={dashboard:"Übersicht",characters:"Charaktere",matrix:"Rasse × Klasse",professions:"Berufe",settings:"Einstellungen"};
  $("#viewTitle").textContent=titles[view]||"Charakterplaner";
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderAll(){
  renderDashboard();
  renderCharacters();
  renderMatrix();
  renderProfessions();
}

function renderDashboard(){
  $("#statCharacters").textContent=characters.length;
  $("#statHorde").textContent=characters.filter(c=>c.faction==="Horde").length;
  $("#statAlliance").textContent=characters.filter(c=>c.faction==="Allianz").length;
  $("#statPlanned").textContent=characters.filter(c=>c.status==="Geplant").length;

  const max=Math.max(1,...CLASSES.map(cls=>characters.filter(c=>c.className===cls.name).length));
  $("#classCoverage").innerHTML=CLASSES.map(cls=>{
    const count=characters.filter(c=>c.className===cls.name).length;
    return `<div class="coverage-row">
      <span class="coverage-name">${cls.name}</span>
      <span class="progress"><i style="width:${(count/max)*100}%;background:${cls.color}"></i></span>
      <span class="coverage-count">${count}</span>
    </div>`;
  }).join("");

  const armors=["Stoff","Leder","Kette","Platte"];
  $("#armorCoverage").innerHTML=armors.map(a=>{
    const count=characters.filter(c=>classInfo(c.className).armor===a).length;
    return `<div class="armor-card"><span>${a}</span><strong>${count}</strong></div>`;
  }).join("");

  const recent=[...characters].slice(-5).reverse();
  $("#recentCharacters").innerHTML=recent.length?recent.map(c=>characterRow(c,true)).join(""):emptyState("Noch keine Charaktere","Lege deinen ersten Charakter an oder importiere deine bestehende CSV.");
}

function getFilteredCharacters(){
  const q=$("#searchInput").value.trim().toLocaleLowerCase("de");
  const fac=$("#filterFaction").value, cls=$("#filterClass").value, stat=$("#filterStatus").value;
  return characters.filter(c=>{
    const hay=[c.name,c.race,c.faction,c.className,c.gender,c.profession1,c.profession2,c.realm,c.midnight,c.notes].join(" ").toLocaleLowerCase("de");
    return (!q||hay.includes(q)) && (!fac||c.faction===fac) && (!cls||c.className===cls) && (!stat||c.status===stat);
  }).sort((a,b)=>a.name.localeCompare(b.name,"de"));
}
function renderCharacters(){
  if(!$("#searchInput")) return;
  const list=getFilteredCharacters();
  $("#characterCount").textContent=`${list.length} von ${characters.length} Charakteren`;
  $("#characterList").innerHTML=list.length?list.map(c=>characterRow(c,false)).join(""):emptyState("Keine Treffer","Passe deine Filter an oder lege einen neuen Charakter an.");
}
function emptyState(title,desc){ return `<div class="empty-state"><strong>${title}</strong>${desc}</div>`; }
function characterRow(c,compact=false){
  const ci=classInfo(c.className);
  return `<div class="character-row" data-id="${c.id}">
    <div class="character-main">
      <div class="class-orb" style="--class:${ci.color}">${escapeHtml((c.className||"?").slice(0,1))}</div>
      <div>
        <div class="character-name">${escapeHtml(c.name)}</div>
        <div class="character-sub">${escapeHtml(c.race)} · ${escapeHtml(c.className)}</div>
      </div>
    </div>
    <div class="character-cell"><div class="cell-label">Fraktion</div><span class="badge ${c.faction==="Horde"?"horde":c.faction==="Allianz"?"allianz":""}">${escapeHtml(c.faction)}</span></div>
    <div class="character-cell"><div class="cell-label">Berufe</div>${escapeHtml([c.profession1,c.profession2].filter(Boolean).join(" · ")||"–")}</div>
    ${compact?"":`<div class="character-cell hide-md"><div class="cell-label">Status</div><span class="badge ${c.status==="Geplant"?"geplant":""}">${escapeHtml(c.status||"Aktiv")}</span></div>`}
    <div class="row-actions"><button class="icon-btn edit-character" data-id="${c.id}" title="Bearbeiten">✎</button></div>
  </div>`;
}

function renderMatrix(){
  const table=$("#raceClassMatrix");
  const head=`<thead><tr><th>Volk</th>${CLASSES.map(c=>`<th><span class="matrix-class"><i style="--class:${c.color}"></i>${c.name}</span></th>`).join("")}</tr></thead>`;
  const body=RACES.map(r=>{
    const cells=CLASSES.map(cls=>{
      const matches=characters.filter(c=>c.race===r.name&&c.className===cls.name);
      const active=matches.filter(c=>c.status!=="Geplant").length;
      const planned=matches.filter(c=>c.status==="Geplant").length;
      const state=active?"has":planned?"planned":"";
      const label=matches.length?matches.length:"＋";
      const title=matches.length?matches.map(c=>`${c.name} (${c.status||"Aktiv"})`).join(", "):`${r.name} · ${cls.name} planen`;
      return `<td><button class="matrix-cell ${state}" data-race="${escapeHtml(r.name)}" data-class="${escapeHtml(cls.name)}" title="${escapeHtml(title)}"><span class="count">${label}</span></button></td>`;
    }).join("");
    return `<tr><td>${escapeHtml(r.name)}<div class="cell-label">${r.faction}</div></td>${cells}</tr>`;
  }).join("");
  table.innerHTML=head+`<tbody>${body}</tbody>`;
}

function renderProfessions(){
  const counts={};
  PROFESSIONS.filter(Boolean).forEach(p=>counts[p]=[]);
  characters.forEach(c=>{
    [c.profession1,c.profession2].filter(Boolean).forEach(p=>{
      if(!counts[p]) counts[p]=[];
      counts[p].push(c.name);
    });
  });
  $("#professionCoverage").innerHTML=Object.entries(counts).map(([p,names])=>`<div class="prof-card"><span>${p}</span><strong>${names.length}</strong></div>`).join("");
  $("#professionCharacters").innerHTML=Object.entries(counts).map(([p,names])=>`<div class="prof-block"><strong>${p}</strong><div class="prof-names">${names.length?names.map(escapeHtml).join(", "):"Noch niemand zugewiesen"}</div></div>`).join("");
}

function openCharacter(id=null,preset={}){
  const c=id?characters.find(x=>x.id===id):null;
  $("#modalTitle").textContent=c?"Charakter bearbeiten":"Charakter planen";
  $("#charId").value=c?.id||"";
  $("#charName").value=c?.name||"";
  $("#charRace").value=c?.race||preset.race||RACES[0].name;
  $("#charFaction").value=c?.faction||preset.faction||RACES.find(r=>r.name===(preset.race||RACES[0].name))?.faction||"Horde";
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
}
function submitCharacter(e){
  e.preventDefault();
  const id=$("#charId").value;
  const data={
    id:id||uid(),
    name:$("#charName").value.trim(),
    race:$("#charRace").value,
    faction:$("#charFaction").value,
    className:$("#charClass").value,
    gender:$("#charGender").value,
    profession1:$("#charProfession1").value,
    profession2:$("#charProfession2").value,
    status:$("#charStatus").value,
    realm:$("#charRealm").value.trim(),
    midnight:$("#charMidnight").value,
    notes:$("#charNotes").value.trim()
  };
  if(!data.name) return;
  if(id){
    const idx=characters.findIndex(c=>c.id===id);
    characters[idx]=data;
  }else characters.push(data);
  $("#characterDialog").close();
  saveCharacters();
  toast(id?"Charakter aktualisiert":"Charakter angelegt");
}
function deleteCurrent(){
  const id=$("#charId").value;
  const c=characters.find(x=>x.id===id);
  if(!c) return;
  if(confirm(`„${c.name}“ wirklich löschen?`)){
    characters=characters.filter(x=>x.id!==id);
    $("#characterDialog").close();
    saveCharacters();
    toast("Charakter gelöscht");
  }
}

function parseCSV(text){
  text=text.replace(/^\uFEFF/,"");
  const first=text.split(/\r?\n/)[0]||"";
  const sep=(first.match(/;/g)||[]).length >= (first.match(/,/g)||[]).length ? ";" : ",";
  const rows=[];
  let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(ch===sep&&!quoted){row.push(cell);cell="";}
    else if((ch==="\n"||ch==="\r")&&!quoted){
      if(ch==="\r"&&text[i+1]==="\n") i++;
      row.push(cell);cell="";
      if(row.some(v=>v.trim()!=="")) rows.push(row);
      row=[];
    }else cell+=ch;
  }
  row.push(cell); if(row.some(v=>v.trim()!=="")) rows.push(row);
  return rows;
}
function normHeader(s){return s.trim().toLowerCase().replace(/\s+/g," ");}
function importCSV(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const rows=parseCSV(reader.result);
      if(rows.length<2) throw new Error("Keine Datenzeilen gefunden.");
      const headers=rows[0].map(normHeader);
      const idx=(...names)=>headers.findIndex(h=>names.includes(h));
      const map={
        name:idx("name"),race:idx("volk","rasse"),faction:idx("fraktion"),className:idx("klasse"),
        gender:idx("geschlecht"),profession1:idx("beruf 1","beruf1"),profession2:idx("beruf 2","beruf2"),
        midnight:idx("midnight"),status:idx("status"),realm:idx("server","realm"),notes:idx("notizen","notiz")
      };
      if(map.name<0||map.race<0||map.className<0) throw new Error("Mindestens Name, Volk und Klasse müssen vorhanden sein.");
      const imported=rows.slice(1).map(r=>({
        id:uid(),
        name:(r[map.name]||"").trim(),
        race:(r[map.race]||"").trim(),
        faction:map.faction>=0?(r[map.faction]||"").trim():"",
        className:(r[map.className]||"").trim(),
        gender:map.gender>=0?(r[map.gender]||"").trim():"",
        profession1:map.profession1>=0?(r[map.profession1]||"").trim():"",
        profession2:map.profession2>=0?(r[map.profession2]||"").trim():"",
        midnight:map.midnight>=0?(r[map.midnight]||"").trim():"",
        status:map.status>=0?(r[map.status]||"").trim()||"Aktiv":"Aktiv",
        realm:map.realm>=0?(r[map.realm]||"").trim():"",
        notes:map.notes>=0?(r[map.notes]||"").trim():""
      })).filter(c=>c.name);
      imported.forEach(c=>{
        if(!c.faction) c.faction=RACES.find(x=>x.name===c.race)?.faction||"Neutral";
      });
      characters.push(...imported);
      saveCharacters();
      toast(`${imported.length} Charaktere importiert`);
      setView("characters");
    }catch(err){alert("CSV-Import fehlgeschlagen: "+err.message);}
    $("#csvImport").value="";
  };
  reader.readAsText(file,"utf-8");
}
function csvEscape(v){
  const s=String(v??"");
  return /[;"\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}
function exportCSV(){
  const headers=["Name","Volk","Fraktion","Klasse","Geschlecht","Beruf 1","Beruf 2","Midnight","Status","Server","Notizen"];
  const rows=characters.map(c=>[c.name,c.race,c.faction,c.className,c.gender,c.profession1,c.profession2,c.midnight,c.status,c.realm,c.notes]);
  const text="\uFEFF"+[headers,...rows].map(r=>r.map(csvEscape).join(";")).join("\r\n");
  downloadBlob(text,"wow-charaktere.csv","text/csv;charset=utf-8");
}
function exportJSON(){
  downloadBlob(JSON.stringify({version:1,exportedAt:new Date().toISOString(),characters},null,2),"wow-charakterplaner-backup.json","application/json");
}
function downloadBlob(text,name,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type}));
  a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

document.addEventListener("click",e=>{
  const viewBtn=e.target.closest("[data-view]");
  if(viewBtn) setView(viewBtn.dataset.view);
  if(e.target.closest("[data-action='add-character']")) openCharacter();
  if(e.target.closest("#quickAdd")) openCharacter();
  const edit=e.target.closest(".edit-character");
  if(edit) openCharacter(edit.dataset.id);
  const jump=e.target.closest("[data-jump]");
  if(jump) setView(jump.dataset.jump);
  const cell=e.target.closest(".matrix-cell");
  if(cell){
    const matches=characters.filter(c=>c.race===cell.dataset.race&&c.className===cell.dataset.class);
    if(matches.length===1) openCharacter(matches[0].id);
    else if(matches.length>1){
      $("#searchInput").value=`${cell.dataset.race} ${cell.dataset.class}`;
      $("#filterClass").value=cell.dataset.class;
      setView("characters"); renderCharacters();
    } else {
      const race=RACES.find(r=>r.name===cell.dataset.race);
      openCharacter(null,{race:cell.dataset.race,className:cell.dataset.class,faction:race?.faction||"Neutral"});
    }
  }
});

$("#characterForm").addEventListener("submit",submitCharacter);
$("#deleteCharacter").addEventListener("click",deleteCurrent);
$("#charRace").addEventListener("change",()=>{
  const race=RACES.find(r=>r.name===$("#charRace").value);
  if(race) $("#charFaction").value=race.faction;
});
["searchInput","filterFaction","filterClass","filterStatus"].forEach(id=>{
  $("#"+id).addEventListener(id==="searchInput"?"input":"change",renderCharacters);
});
$("#csvImport").addEventListener("change",e=>{ if(e.target.files[0]) importCSV(e.target.files[0]); });
$("#exportCsv").addEventListener("click",exportCSV);
$("#exportJson").addEventListener("click",exportJSON);
$("#loadDemo").addEventListener("click",()=>{
  characters.push(...DEMO.map(c=>({...c,id:uid()})));
  saveCharacters(); toast("Demo-Daten hinzugefügt");
});
$("#clearData").addEventListener("click",()=>{
  if(confirm("Wirklich alle lokal gespeicherten Charaktere löschen?")){
    characters=[]; saveCharacters(); toast("Daten gelöscht");
  }
});

initSelects();
renderAll();

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
