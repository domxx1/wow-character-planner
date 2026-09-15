/* v0.4.0 — Server, current Blizzard Armory links and private/local character portraits. */
(() => {
  const VERSION = "0.4.0";
  const REGION_OPTIONS = [
    ["eu","Europa"],["us","Amerika & Ozeanien"],["kr","Korea"],["tw","Taiwan"]
  ];

  function safeAvatarUrl(value="") {
    const s=String(value||"").trim();
    if(/^data:image\/(?:png|jpe?g|webp);base64,/i.test(s)) return s;
    if(/^https?:\/\//i.test(s)) return s;
    return "";
  }
  function slug(value="") {
    return String(value||"")
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .toLocaleLowerCase("de")
      .replace(/[’']/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"");
  }
  function armoryLink(c={}) {
    if(c.armoryUrl && /^https?:\/\//i.test(c.armoryUrl)) return c.armoryUrl;
    if(!c.name || !c.realm) return "";
    const region=(c.region||"eu").toLocaleLowerCase();
    const realm=slug(c.realm);
    if(!realm) return "";
    const name=encodeURIComponent(String(c.name).toLocaleLowerCase("de"));
    return `https://worldofwarcraft.blizzard.com/de-de/worldsoul/${region}/armory/character/${realm}/${name}`;
  }
  window.wowCharacterPlannerArmoryLink=armoryLink;

  // Migrate existing local records without changing personal data.
  characters.forEach(c=>{
    c.region=String(c.region||"eu").toLocaleLowerCase();
    c.avatarUrl=safeAvatarUrl(c.avatarUrl||c.imageUrl||c.image||"");
    c.armoryUrl=String(c.armoryUrl||"").trim();
  });

  // Add Region and image controls to the existing editor.
  if(!$("#charRegion")) {
    const realmField=$("#charRealm")?.closest(".field");
    const regionField=document.createElement("label");
    regionField.className="field";
    regionField.innerHTML=`<span>Region</span><select id="charRegion">${REGION_OPTIONS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select>`;
    realmField?.insertAdjacentElement("afterend",regionField);

    const avatarField=document.createElement("div");
    avatarField.className="field field-full v4-avatar-field";
    avatarField.innerHTML=`
      <span>Charakterbild</span>
      <div class="v4-avatar-editor">
        <div id="charAvatarPreview" class="v4-avatar-preview"><span>?</span></div>
        <div class="v4-avatar-inputs">
          <input id="charAvatar" type="url" inputmode="url" placeholder="Bild-URL (optional)">
          <label class="btn btn-ghost v4-file-btn">Bild auswählen<input id="charAvatarFile" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
          <button id="clearAvatar" type="button" class="btn btn-ghost">Bild entfernen</button>
          <small>Lokale Bilder werden verkleinert und nur in deinen App-Daten gespeichert.</small>
        </div>
      </div>`;
    $("#charNotes")?.closest(".field")?.insertAdjacentElement("beforebegin",avatarField);

    const armoryBox=document.createElement("div");
    armoryBox.className="field field-full v4-armory-box";
    armoryBox.innerHTML='<span>Arsenal</span><a id="charArmoryPreview" class="btn btn-ghost v4-armory-preview hidden" target="_blank" rel="noopener noreferrer">Arsenal öffnen ↗</a><small id="charArmoryHint">Name und Server eintragen, dann wird der Link automatisch erzeugt.</small>';
    avatarField.insertAdjacentElement("beforebegin",armoryBox);
  }

  const style=document.createElement("style");
  style.textContent=`
    .v4-avatar{width:48px;height:48px;border-radius:8px;object-fit:cover;flex:0 0 auto;border:1px solid rgba(255,255,255,.14);background:#101722}
    .v4-avatar-editor{display:flex;gap:12px;align-items:flex-start}.v4-avatar-preview{width:88px;height:88px;border-radius:10px;overflow:hidden;display:grid;place-items:center;flex:0 0 auto;background:#101722;border:1px solid rgba(255,255,255,.15);font-size:1.4rem}.v4-avatar-preview img{width:100%;height:100%;object-fit:cover}
    .v4-avatar-inputs{display:grid;gap:8px;flex:1;min-width:0}.v4-file-btn{justify-content:center;cursor:pointer}.v4-avatar-inputs small,.v4-armory-box small{color:var(--muted);font-size:.75rem}
    .v4-armory-preview{width:max-content;text-decoration:none}.v4-server{color:var(--muted);font-size:.78rem;margin-top:.18rem}.v4-armory-btn{text-decoration:none;white-space:nowrap}
    @media(max-width:640px){.v4-avatar-editor{align-items:center}.v4-avatar-preview{width:72px;height:72px}.v4-armory-btn{padding:.4rem .55rem;font-size:.72rem}}
  `;
  document.head.appendChild(style);

  function setAvatarPreview(url) {
    const box=$("#charAvatarPreview"); if(!box)return;
    const safe=safeAvatarUrl(url);
    box.innerHTML=safe?`<img src="${escapeHtml(safe)}" alt="Charakterbild">`:'<span>?</span>';
  }
  function refreshArmoryPreview() {
    const a=$("#charArmoryPreview"), hint=$("#charArmoryHint"); if(!a)return;
    const url=armoryLink({name:$("#charName")?.value.trim(),realm:$("#charRealm")?.value.trim(),region:$("#charRegion")?.value||"eu"});
    a.classList.toggle("hidden",!url);
    if(url)a.href=url;
    if(hint)hint.textContent=url?"Der Link wird automatisch aus Region, Server und Name erzeugt.":"Name und Server eintragen, dann wird der Link automatisch erzeugt.";
  }
  $("#charName")?.addEventListener("input",refreshArmoryPreview);
  $("#charRealm")?.addEventListener("input",refreshArmoryPreview);
  $("#charRegion")?.addEventListener("change",refreshArmoryPreview);
  $("#charAvatar")?.addEventListener("input",e=>setAvatarPreview(e.target.value));
  $("#clearAvatar")?.addEventListener("click",()=>{$("#charAvatar").value="";$("#charAvatarFile").value="";setAvatarPreview("");});
  $("#charAvatarFile")?.addEventListener("change",e=>{
    const file=e.target.files?.[0]; if(!file)return;
    if(!/^image\/(png|jpeg|webp)$/i.test(file.type)){toast("Bitte PNG, JPG oder WebP auswählen");return;}
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const max=192, scale=Math.min(1,max/Math.max(img.width,img.height));
        const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
        const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        const data=canvas.toDataURL("image/jpeg",.84);
        $("#charAvatar").value=data;setAvatarPreview(data);
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });

  // Extend the editor open/save path.
  const v3OpenCharacter=openCharacter;
  openCharacter=function(id=null,preset={}) {
    v3OpenCharacter(id,preset);
    const c=id?characters.find(x=>x.id===id):null;
    $("#charRegion").value=c?.region||preset.region||"eu";
    $("#charAvatar").value=c?.avatarUrl||preset.avatarUrl||"";
    setAvatarPreview($("#charAvatar").value);
    refreshArmoryPreview();
  };

  $("#characterForm").removeEventListener("submit",submitCharacter);
  submitCharacter=function(e){
    e.preventDefault();
    const id=$("#charId").value;
    const selected=RACES.find(r=>(r.key||`${r.name}|${r.faction}`)===$("#charRace").value);
    const data={
      id:id||uid(),name:$("#charName").value.trim(),race:selected?.name||"",variant:$("#charVariant").value.trim(),faction:selected?.faction||$("#charFaction").value,
      className:$("#charClass").value,gender:$("#charGender").value,profession1:$("#charProfession1").value,profession2:$("#charProfession2").value,status:$("#charStatus").value,
      realm:$("#charRealm").value.trim(),region:$("#charRegion").value||"eu",midnight:$("#charMidnight").value,remixEvent:$("#charRemix")?.value.trim()||"",
      avatarUrl:safeAvatarUrl($("#charAvatar").value),armoryUrl:"",notes:$("#charNotes").value.trim()
    };
    if(!data.name&&data.status!=="Geplant"){toast("Für aktive Charaktere ist ein Name erforderlich");return;}
    if(id){const idx=characters.findIndex(c=>c.id===id);characters[idx]=data;}else characters.push(data);
    $("#characterDialog").close();saveCharacters();if(typeof refreshRemixFilter==="function")refreshRemixFilter();toast(id?"Charakter aktualisiert":"Charakter angelegt");
  };
  $("#characterForm").addEventListener("submit",submitCharacter);

  // Richer character rows with portrait, server and Armory action.
  characterRow=function(c,compact=false){
    const ci=classInfo(c.className),name=c.name||"Unbenannt",raceLabel=c.race||(c.variant?"Volk offen":"Nicht zugeordnet");
    const avatar=safeAvatarUrl(c.avatarUrl);const armory=armoryLink(c);
    const visual=avatar?`<img class="v4-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}">`:`<div class="class-orb" style="--class:${ci.color}">${escapeHtml((c.className||"?").slice(0,1))}</div>`;
    return `<div class="character-row" data-id="${c.id}">
      <div class="character-main">${visual}<div>
        <div class="character-name">${escapeHtml(name)}${c.remixEvent?`<span class="remix-badge">Remix ${escapeHtml(c.remixEvent)}</span>`:""}</div>
        <div class="character-sub">${escapeHtml(raceLabel)}${c.variant?` · ${escapeHtml(c.variant)}`:""} · ${escapeHtml(c.className)}</div>
        ${c.realm?`<div class="v4-server">${escapeHtml(c.realm)} · ${(c.region||"eu").toUpperCase()}</div>`:""}
      </div></div>
      <div class="character-cell"><div class="cell-label">Fraktion</div><span class="badge ${c.faction==="Horde"?"horde":c.faction==="Allianz"?"allianz":""}">${escapeHtml(c.faction)}</span></div>
      <div class="character-cell"><div class="cell-label">Berufe</div>${escapeHtml([c.profession1,c.profession2].filter(Boolean).join(" · ")||"–")}</div>
      ${compact?"":`<div class="character-cell hide-md"><div class="cell-label">Status</div><span class="badge ${c.status==="Geplant"?"geplant":""}">${escapeHtml(c.status||"Aktiv")}</span></div>`}
      <div class="row-actions">${armory?`<a class="btn btn-ghost v4-armory-btn" href="${escapeHtml(armory)}" target="_blank" rel="noopener noreferrer" title="Im Blizzard-Arsenal öffnen">Arsenal ↗</a>`:""}<button class="icon-btn edit-character" data-id="${c.id}" title="Bearbeiten">✎</button></div>
    </div>`;
  };

  // v4 importer: retains server, region and images and updates known IDs/names instead of duplicating them.
  function normalizeV4(row={}){
    const c={...row};
    c.id=String(c.id||"").trim()||uid();c.name=String(c.name??c.Name??"").trim();
    c.race=String(c.race??c.Volk??c.volk??"").trim();c.variant=String(c.variant??c.Variante??c.variante??"").trim();
    c.faction=String(c.faction??c.Fraktion??c.fraktion??"Neutral").trim()||"Neutral";c.className=String(c.className??c.Klasse??c.klasse??"").trim();
    c.gender=String(c.gender??c.Geschlecht??c.geschlecht??"").trim();c.profession1=String(c.profession1??c["Beruf 1"]??"").trim();c.profession2=String(c.profession2??c["Beruf 2"]??"").trim();
    c.status=String(c.status??c.Status??"Aktiv").trim()||"Aktiv";c.realm=String(c.realm??c.Server??c.server??"").trim();c.region=String(c.region??c.Region??"eu").trim().toLocaleLowerCase()||"eu";
    c.midnight=String(c.midnight??c.Midnight??"").trim();c.remixEvent=String(c.remixEvent??c.Remix??c["Remix-Event"]??"").trim();
    c.avatarUrl=safeAvatarUrl(c.avatarUrl??c.imageUrl??c.Bild??c["Bild-URL"]??"");c.armoryUrl=String(c.armoryUrl??c["Arsenal-Link"]??"").trim();c.notes=String(c.notes??c.Notizen??"").trim();
    return c;
  }
  function mergeV4(list){let added=0,updated=0;list.forEach(c=>{
    let idx=c.id?characters.findIndex(x=>x.id===c.id):-1;
    if(idx<0&&c.name){const hits=characters.map((x,i)=>({x,i})).filter(o=>(o.x.name||"").localeCompare(c.name,"de",{sensitivity:"base"})===0);if(hits.length===1)idx=hits[0].i;}
    if(idx<0){const key=`${c.name.toLocaleLowerCase("de")}|${c.className}|${c.race}|${c.variant}|${c.faction}|${c.status}|${c.remixEvent}`;idx=characters.findIndex(x=>`${(x.name||"").toLocaleLowerCase("de")}|${x.className}|${x.race}|${x.variant||""}|${x.faction}|${x.status}|${x.remixEvent||""}`===key);}
    if(idx>=0){characters[idx]={...characters[idx],...c,id:characters[idx].id||c.id};updated++;}else{characters.push(c);added++;}
  });saveCharacters();renderAll();setView("characters");toast(updated?`${added} neu, ${updated} aktualisiert`:`${added} Charaktere importiert`);}

  const oldJson=$("#jsonImport");if(oldJson){const fresh=oldJson.cloneNode(true);oldJson.replaceWith(fresh);fresh.addEventListener("change",e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(String(r.result||"").replace(/^\uFEFF/,""));const raw=Array.isArray(p)?p:p?.characters;if(!Array.isArray(raw))throw new Error("Keine Charakterliste gefunden.");mergeV4(raw.map(normalizeV4).filter(c=>c.name||c.status==="Geplant"));}catch(err){alert(`JSON-Import fehlgeschlagen (${file.name}): ${err.message}`);}finally{fresh.value="";}};r.readAsText(file,"utf-8");});}

  const oldCsv=$("#csvImport");if(oldCsv){const fresh=oldCsv.cloneNode(true);oldCsv.replaceWith(fresh);fresh.addEventListener("change",e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const rows=parseCSV(r.result);if(rows.length<2)throw new Error("Keine Datenzeilen gefunden.");const h=rows[0].map(normHeader),ix=(...n)=>h.findIndex(x=>n.includes(x)),at=(row,i)=>i>=0?(row[i]||"").trim():"";const m={name:ix("name"),race:ix("volk","rasse"),variant:ix("variante","konzept"),faction:ix("fraktion"),cls:ix("klasse"),gender:ix("geschlecht"),p1:ix("beruf 1","beruf1"),p2:ix("beruf 2","beruf2"),realm:ix("server","realm"),region:ix("region"),midnight:ix("midnight"),remix:ix("remix","remix-event","remix event"),status:ix("status"),avatar:ix("bild","bild-url","avatar","avatar-url"),armory:ix("arsenal-link","armory","armory-url"),notes:ix("notizen","notiz")};if(m.race<0||m.cls<0)throw new Error("Mindestens Volk und Klasse müssen vorhanden sein.");const list=rows.slice(1).map(row=>normalizeV4({name:at(row,m.name),race:at(row,m.race),variant:at(row,m.variant),faction:at(row,m.faction),className:at(row,m.cls),gender:at(row,m.gender),profession1:at(row,m.p1),profession2:at(row,m.p2),realm:at(row,m.realm),region:at(row,m.region)||"eu",midnight:at(row,m.midnight),remixEvent:at(row,m.remix),status:at(row,m.status)||"Aktiv",avatarUrl:at(row,m.avatar),armoryUrl:at(row,m.armory),notes:at(row,m.notes)})).filter(c=>c.name||c.status==="Geplant");mergeV4(list);}catch(err){alert(`CSV-Import fehlgeschlagen (${file.name}): ${err.message}`);}finally{fresh.value="";}};r.readAsText(file,"utf-8");});}

  const csvBtn=$("#exportCsv");if(csvBtn){const fresh=csvBtn.cloneNode(true);csvBtn.replaceWith(fresh);fresh.addEventListener("click",()=>{const headers=["Name","Volk","Variante","Fraktion","Klasse","Geschlecht","Beruf 1","Beruf 2","Server","Region","Arsenal-Link","Bild-URL","Midnight","Remix-Event","Status","Notizen"];const rows=characters.map(c=>[c.name,c.race,c.variant,c.faction,c.className,c.gender,c.profession1,c.profession2,c.realm,c.region||"eu",armoryLink(c),c.avatarUrl||"",c.midnight,c.remixEvent||"",c.status,c.notes]);const text="\uFEFF"+[headers,...rows].map(row=>row.map(csvEscape).join(";")).join("\r\n");downloadBlob(text,"wow-charaktere.csv","text/csv;charset=utf-8");});}
  const jsonBtn=$("#exportJson");if(jsonBtn){const fresh=jsonBtn.cloneNode(true);jsonBtn.replaceWith(fresh);fresh.addEventListener("click",()=>downloadBlob(JSON.stringify({version:4,exportedAt:new Date().toISOString(),characters},null,2),"wow-charakterplaner-backup.json","application/json"));}

  const brandSub=document.querySelector(".brand-sub");if(brandSub)brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
  saveCharacters();renderAll();
})();
