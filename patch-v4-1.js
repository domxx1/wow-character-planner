/* v0.4.1 — Level/specialization metadata, realm filter and profile completeness helper. */
(() => {
  const VERSION = "0.4.1";

  const safeAvatar = value => {
    const s=String(value||"").trim();
    return /^data:image\/(?:png|jpe?g|webp);base64,/i.test(s)||/^https?:\/\//i.test(s)?s:"";
  };
  const armoryLink = c => typeof window.wowCharacterPlannerArmoryLink === "function" ? window.wowCharacterPlannerArmoryLink(c) : "";

  characters.forEach(c=>{
    const parsed=Number.parseInt(c.level,10);
    c.level=Number.isFinite(parsed)&&parsed>0?parsed:"";
    c.specialization=String(c.specialization||c.spec||"").trim();
  });

  /* Editor fields */
  if(!$("#charLevel")){
    const realmField=$("#charRealm")?.closest(".field");
    const levelField=document.createElement("label");
    levelField.className="field";
    levelField.innerHTML='<span>Level</span><input id="charLevel" type="number" inputmode="numeric" min="1" max="90" placeholder="optional">';
    realmField?.insertAdjacentElement("beforebegin",levelField);

    const specField=document.createElement("label");
    specField.className="field";
    specField.innerHTML='<span>Spezialisierung</span><input id="charSpecialization" maxlength="40" placeholder="z. B. Feuer, Furor, Tierherrschaft">';
    levelField.insertAdjacentElement("afterend",specField);
  }

  /* Realm filter */
  if(!$("#filterRealm")){
    const anchor=$("#filterRemix")||$("#filterStatus");
    const select=document.createElement("select");
    select.id="filterRealm"; select.className="control";
    select.innerHTML='<option value="">Alle Server</option>';
    anchor?.insertAdjacentElement("afterend",select);
    select.addEventListener("change",()=>renderCharacters());
  }

  function refreshRealmFilter(){
    const el=$("#filterRealm"); if(!el)return;
    const keep=el.value;
    const realms=[...new Set(characters.map(c=>String(c.realm||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
    el.innerHTML='<option value="">Alle Server</option><option value="__missing">Server fehlt</option>'+realms.map(r=>`<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");
    if(keep==="__missing"||realms.includes(keep))el.value=keep;
  }

  /* Profile completeness card */
  if(!$("#v41ProfileStatus")){
    const grid=$("#settings .settings-grid");
    const panel=document.createElement("article");
    panel.id="v41ProfileStatus"; panel.className="panel";
    panel.innerHTML='<div class="panel-head"><div><div class="eyebrow">PROFILE</div><h3>Vollständigkeit</h3></div></div><div id="v41ProfileStatusBody" class="v41-profile-status"></div>';
    grid?.insertAdjacentElement("afterbegin",panel);
  }

  const style=document.createElement("style");
  style.textContent=`
    .v41-meta{color:var(--muted);font-size:.78rem;margin-top:.15rem}.v41-meta strong{color:var(--text);font-weight:600}
    .v41-profile-status{display:grid;gap:10px}.v41-profile-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .v41-profile-stat{padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.025)}
    .v41-profile-stat b{display:block;font-size:1.25rem}.v41-profile-stat small{color:var(--muted)}
    .v41-missing{color:var(--muted);font-size:.82rem;line-height:1.5}.v41-missing button{margin:.18rem .25rem .18rem 0}
    @media(max-width:640px){.v41-profile-summary{grid-template-columns:1fr 1fr}.v41-profile-stat:last-child{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  function activeNamed(){return characters.filter(c=>c.status!=="Geplant"&&String(c.name||"").trim());}
  function refreshProfileStatus(){
    const body=$("#v41ProfileStatusBody"); if(!body)return;
    const active=activeNamed();
    const missingRealm=active.filter(c=>!String(c.realm||"").trim());
    const missingAvatar=active.filter(c=>!safeAvatar(c.avatarUrl));
    const complete=active.filter(c=>String(c.realm||"").trim()&&safeAvatar(c.avatarUrl));
    const names=[...new Set([...missingRealm,...missingAvatar].map(c=>c.name))].sort((a,b)=>a.localeCompare(b,"de"));
    body.innerHTML=`<div class="v41-profile-summary">
      <div class="v41-profile-stat"><b>${complete.length}</b><small>vollständig</small></div>
      <div class="v41-profile-stat"><b>${missingRealm.length}</b><small>Server fehlt</small></div>
      <div class="v41-profile-stat"><b>${missingAvatar.length}</b><small>Bild fehlt</small></div>
    </div>${names.length?`<div class="v41-missing"><strong>Noch offen:</strong><br>${names.map(n=>`<button class="btn btn-ghost v41-find-profile" data-name="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("")}</div>`:'<div class="muted">Alle aktiven Charakterprofile sind vollständig.</div>'}`;
  }

  document.addEventListener("click",e=>{
    const btn=e.target.closest(".v41-find-profile"); if(!btn)return;
    const name=btn.dataset.name||"";
    $("#searchInput").value=name;
    if($("#filterRealm"))$("#filterRealm").value="";
    setView("characters"); renderCharacters();
  });

  /* Search + realm filter */
  getFilteredCharacters=function(){
    const q=$("#searchInput").value.trim().toLocaleLowerCase("de");
    const fac=$("#filterFaction").value,cls=$("#filterClass").value,stat=$("#filterStatus").value;
    const remix=$("#filterRemix")?.value||"",realm=$("#filterRealm")?.value||"";
    return characters.filter(c=>{
      const hay=[c.name,c.race,c.variant,c.faction,c.className,c.gender,c.profession1,c.profession2,c.realm,c.level,c.specialization,c.midnight,c.remixEvent,c.notes].join(" ").toLocaleLowerCase("de");
      const realmOk=!realm||(realm==="__missing"?!String(c.realm||"").trim():c.realm===realm);
      return(!q||hay.includes(q))&&(!fac||c.faction===fac)&&(!cls||c.className===cls)&&(!stat||c.status===stat)&&(!remix||c.remixEvent===remix)&&realmOk;
    }).sort((a,b)=>(a.name||"Unbenannt").localeCompare(b.name||"Unbenannt","de"));
  };

  /* Editor open/save */
  const previousOpen=openCharacter;
  openCharacter=function(id=null,preset={}){
    previousOpen(id,preset);
    const c=id?characters.find(x=>x.id===id):null;
    $("#charLevel").value=c?.level||preset.level||"";
    $("#charSpecialization").value=c?.specialization||preset.specialization||"";
  };

  $("#characterForm").removeEventListener("submit",submitCharacter);
  submitCharacter=function(e){
    e.preventDefault();
    const id=$("#charId").value;
    const selected=RACES.find(r=>(r.key||`${r.name}|${r.faction}`)===$("#charRace").value);
    const levelRaw=Number.parseInt($("#charLevel").value,10);
    const data={
      id:id||uid(),name:$("#charName").value.trim(),race:selected?.name||"",variant:$("#charVariant").value.trim(),faction:selected?.faction||$("#charFaction").value,
      className:$("#charClass").value,gender:$("#charGender").value,profession1:$("#charProfession1").value,profession2:$("#charProfession2").value,status:$("#charStatus").value,
      level:Number.isFinite(levelRaw)&&levelRaw>0?Math.min(90,levelRaw):"",specialization:$("#charSpecialization").value.trim(),
      realm:$("#charRealm").value.trim(),region:$("#charRegion")?.value||"eu",midnight:$("#charMidnight").value,remixEvent:$("#charRemix")?.value.trim()||"",
      avatarUrl:safeAvatar($("#charAvatar")?.value),armoryUrl:"",notes:$("#charNotes").value.trim()
    };
    if(!data.name&&data.status!=="Geplant"){toast("Für aktive Charaktere ist ein Name erforderlich");return;}
    if(id){const idx=characters.findIndex(c=>c.id===id);characters[idx]=data;}else characters.push(data);
    $("#characterDialog").close(); saveCharacters(); renderAll(); toast(id?"Charakter aktualisiert":"Charakter angelegt");
  };
  $("#characterForm").addEventListener("submit",submitCharacter);

  /* Character rows */
  characterRow=function(c,compact=false){
    const ci=classInfo(c.className),name=c.name||"Unbenannt",raceLabel=c.race||(c.variant?"Volk offen":"Nicht zugeordnet");
    const avatar=safeAvatar(c.avatarUrl),armory=armoryLink(c);
    const visual=avatar?`<img class="v4-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}">`:`<div class="class-orb" style="--class:${ci.color}">${escapeHtml((c.className||"?").slice(0,1))}</div>`;
    const profile=[c.level?`Level ${escapeHtml(String(c.level))}`:"",c.specialization?escapeHtml(c.specialization):""].filter(Boolean).join(" · ");
    return `<div class="character-row" data-id="${c.id}">
      <div class="character-main">${visual}<div>
        <div class="character-name">${escapeHtml(name)}${c.remixEvent?`<span class="remix-badge">Remix ${escapeHtml(c.remixEvent)}</span>`:""}</div>
        <div class="character-sub">${escapeHtml(raceLabel)}${c.variant?` · ${escapeHtml(c.variant)}`:""} · ${escapeHtml(c.className)}</div>
        ${profile?`<div class="v41-meta"><strong>${profile}</strong></div>`:""}
        ${c.realm?`<div class="v4-server">${escapeHtml(c.realm)} · ${(c.region||"eu").toUpperCase()}</div>`:""}
      </div></div>
      <div class="character-cell"><div class="cell-label">Fraktion</div><span class="badge ${c.faction==="Horde"?"horde":c.faction==="Allianz"?"allianz":""}">${escapeHtml(c.faction)}</span></div>
      <div class="character-cell"><div class="cell-label">Berufe</div>${escapeHtml([c.profession1,c.profession2].filter(Boolean).join(" · ")||"–")}</div>
      ${compact?"":`<div class="character-cell hide-md"><div class="cell-label">Status</div><span class="badge ${c.status==="Geplant"?"geplant":""}">${escapeHtml(c.status||"Aktiv")}</span></div>`}
      <div class="row-actions">${armory?`<a class="btn btn-ghost v4-armory-btn" href="${escapeHtml(armory)}" target="_blank" rel="noopener noreferrer">Arsenal ↗</a>`:""}<button class="icon-btn edit-character" data-id="${c.id}" title="Bearbeiten">✎</button></div>
    </div>`;
  };

  /* CSV export now includes the new metadata. JSON export already serializes all fields. */
  const oldCsvExport=$("#exportCsv");
  if(oldCsvExport){
    const fresh=oldCsvExport.cloneNode(true); oldCsvExport.replaceWith(fresh);
    fresh.addEventListener("click",()=>{
      const headers=["Name","Volk","Variante","Fraktion","Klasse","Geschlecht","Level","Spezialisierung","Beruf 1","Beruf 2","Midnight","Remix-Event","Status","Server","Region","Bild-URL","Arsenal-Link","Notizen"];
      const rows=characters.map(c=>[c.name,c.race,c.variant,c.faction,c.className,c.gender,c.level||"",c.specialization||"",c.profession1,c.profession2,c.midnight,c.remixEvent||"",c.status,c.realm,c.region||"eu",c.avatarUrl||"",armoryLink(c),c.notes]);
      const text="\uFEFF"+[headers,...rows].map(r=>r.map(csvEscape).join(";")).join("\r\n");
      downloadBlob(text,"wow-charaktere.csv","text/csv;charset=utf-8");
    });
  }

  const previousRenderAll=renderAll;
  renderAll=function(){refreshRealmFilter();previousRenderAll();refreshProfileStatus();};

  const brandSub=document.querySelector(".brand-sub"); if(brandSub)brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
  renderAll();
})();