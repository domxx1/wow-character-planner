/* v0.3.1 — variant-aware private plan import hotfix. */
(() => {
  const VERSION = "0.3.1";
  const REMIX_STORAGE_KEY = "wowCharacterPlanner.remix.v1";

  const raceAlias = new Map([
    ["orc","Orcs"],["orcs","Orcs"],["untoter","Untote"],["untote","Untote"],["taure","Tauren"],["tauren","Tauren"],
    ["troll","Trolle"],["trolle","Trolle"],["blutelf","Blutelfen"],["blutelfen","Blutelfen"],["goblin","Goblins"],["goblins","Goblins"],
    ["nachtelf","Nachtelfen"],["nachtelfen","Nachtelfen"],["gnom","Gnome"],["gnome","Gnome"],["mensch","Menschen"],["menschen","Menschen"],
    ["zwerg","Zwerge"],["zwerge","Zwerge"],["leerenelf","Leerenelfen"],["leerenelfen","Leerenelfen"],["gilnear","Worgen"],
    ["hochberg-taure","Hochbergtauren"],["hochbergtauren","Hochbergtauren"],["nachtgeborener","Nachtgeborene"],["nachtgeborene","Nachtgeborene"],
    ["maghar","Orcs der Mag'har"],["mag'har","Orcs der Mag'har"],["orcs der mag'har","Orcs der Mag'har"],
    ["zandalari","Zandalaritrolle"],["zandalaritrolle","Zandalaritrolle"],["dunkeleisen-zwerg","Dunkeleisenzwerge"],["dunkeleisenzwerge","Dunkeleisenzwerge"],
    ["mecha-gnom","Mechagnome"],["mechagnome","Mechagnome"],["lichtgeschmiedeter","Lichtgeschmiedete Draenei"],["lichtgeschmiedete draenei","Lichtgeschmiedete Draenei"],
    ["kultiraner","Kul Tiraner"],["kul tiraner","Kul Tiraner"],["pandare","Pandaren"],["pandaren","Pandaren"],["irdener","Irdene"],["irdene","Irdene"]
  ]);

  function normalizeRace(raw="", faction="", variant="") {
    let race=String(raw||"").trim();
    let f=String(faction||"").trim();
    let v=String(variant||"").trim();
    const suffix=race.match(/^(.*) \((Horde|Allianz)\)$/);
    if(suffix){ race=suffix[1]; if(!f) f=suffix[2]; }
    const lower=race.toLocaleLowerCase("de");
    if(lower==="man'ari"||lower==="man’ari"){ race="Draenei"; v=v||"Man'ari"; }
    else if(lower==="amani"){ race="Trolle"; v=v||"Amani"; f=f||"Horde"; }
    else if(lower==="astraler"||lower==="astrale"){ race=""; v=v||"Astraler"; }
    else if(lower==="untoter elf"){ race=""; v=v||"Untoter Elf"; }
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
      race:n.race, variant:n.variant, faction:n.faction,
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

  function keyOf(c){
    return [c.name||"",c.race||"",c.variant||"",c.faction||"",c.className||"",c.status||"",c.remixEvent||""]
      .map(v=>String(v).trim().toLocaleLowerCase("de")).join("|");
  }

  function persistRemix(){
    try{
      const map={};
      characters.forEach(c=>{ if(c.id&&c.remixEvent) map[c.id]=c.remixEvent; });
      localStorage.setItem(REMIX_STORAGE_KEY,JSON.stringify(map));
    }catch{}
  }

  function mergeImported(imported){
    let added=0,updated=0;
    imported.forEach(c=>{
      let idx=c.id?characters.findIndex(x=>x.id===c.id):-1;
      if(idx<0) idx=characters.findIndex(x=>keyOf(x)===keyOf(c));
      if(idx>=0){ characters[idx]={...characters[idx],...c,id:characters[idx].id||c.id}; updated++; }
      else { characters.push(c); added++; }
    });
    persistRemix();
    saveCharacters();
    setView("characters");
    if(typeof renderAll==="function") renderAll();
    const remixFilter=document.querySelector("#filterRemix");
    if(remixFilter){
      const keep=remixFilter.value;
      const base=["TBC","WotLK","Cata","MoP","WoD","Legion","BfA","SL","DF","TWW","Midnight"];
      const values=[...new Set([...base,...characters.map(c=>c.remixEvent).filter(Boolean)])];
      remixFilter.innerHTML='<option value="">Alle Remix-Events</option>'+values.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
      if(values.includes(keep)) remixFilter.value=keep;
    }
    toast(updated?`${added} neu, ${updated} aktualisiert`:`${added} Charaktere importiert`);
  }

  /* Replace JSON import once more so variants such as Amani remain separate plans. */
  const oldJson=document.querySelector("#jsonImport");
  if(oldJson){
    const fresh=oldJson.cloneNode(true);
    oldJson.replaceWith(fresh);
    fresh.addEventListener("change",e=>{
      const file=e.target.files?.[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=()=>{
        try{
          const parsed=JSON.parse(String(reader.result||"").replace(/^\uFEFF/,""));
          const raw=Array.isArray(parsed)?parsed:parsed?.characters;
          if(!Array.isArray(raw)) throw new Error("Keine Charakterliste gefunden.");
          const imported=raw.map(normalizeRow).filter(c=>c.name||c.status==="Geplant");
          mergeImported(imported);
        }catch(err){ alert(`JSON-Import fehlgeschlagen (${file.name}): ${err.message}`); }
        finally{ fresh.value=""; }
      };
      reader.readAsText(file,"utf-8");
    });
  }

  const brandSub=document.querySelector(".brand-sub");
  if(brandSub) brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
})();
