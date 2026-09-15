/* v0.6.0 — Google Sheets cloud sync for the private character planner. */
(() => {
  const VERSION = "0.6.0";
  const CONFIG_KEY = "wowCharacterPlanner.googleSheets.v1";
  const LOCAL_REV_KEY = "wowCharacterPlanner.localRevision.v1";
  const CLOUD_REV_KEY = "wowCharacterPlanner.cloudRevision.v1";
  const DISCOVERY_DOC = "https://sheets.googleapis.com/$discovery/rest?version=v4";
  const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

  let config = {};
  try { config = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}"); } catch { config = {}; }
  config.clientId = config.clientId || "";
  config.spreadsheetId = config.spreadsheetId || "";
  config.sheetName = config.sheetName || "App_Daten";
  config.autoSync = config.autoSync !== false;

  let tokenClient = null;
  let googleConnected = false;
  let applyingCloud = false;
  let autoTimer = null;

  function extractId(value) {
    const text = String(value || "").trim();
    const match = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : text;
  }
  function cleanSheetName(value) {
    return (String(value || "App_Daten").trim().replace(/[\\/?*\[\]:]/g,"_") || "App_Daten");
  }
  function nowIso() { return new Date().toISOString(); }
  function getLocalRevision() { return localStorage.getItem(LOCAL_REV_KEY) || ""; }
  function getCloudRevision() { return localStorage.getItem(CLOUD_REV_KEY) || ""; }
  function setBothRevisions(value) {
    localStorage.setItem(LOCAL_REV_KEY, value || "");
    localStorage.setItem(CLOUD_REV_KEY, value || "");
  }
  function setLocalRevision(value=nowIso()) { localStorage.setItem(LOCAL_REV_KEY, value); }
  function saveConfig() { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); }
  function safeImage(value) {
    const s = String(value || "").trim();
    return /^https:\/\//i.test(s) ? s : "";
  }

  if (!getLocalRevision() && characters.length) setLocalRevision();

  const oldSaveCharacters = saveCharacters;
  saveCharacters = function() {
    if (!applyingCloud) setLocalRevision();
    oldSaveCharacters();
    if (!applyingCloud && config.autoSync && googleConnected && config.spreadsheetId) {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => syncNow(true).catch(()=>{}), 1600);
    }
  };

  function status(text, kind="") {
    const el = document.querySelector("#v6SyncStatus");
    if (!el) return;
    el.textContent = text;
    el.dataset.kind = kind;
  }

  function loadScript(src, marker) {
    return new Promise((resolve,reject) => {
      if (document.querySelector(`script[data-${marker}="1"]`)) {
        const check = setInterval(() => {
          if ((marker === "gis" && window.google?.accounts?.oauth2) || (marker === "gapi" && window.gapi?.client)) {
            clearInterval(check); resolve();
          }
        }, 50);
        setTimeout(() => { clearInterval(check); reject(new Error("Google-Bibliothek konnte nicht geladen werden.")); }, 10000);
        return;
      }
      const s=document.createElement("script");
      s.src=src; s.async=true; s.defer=true; s.setAttribute(`data-${marker}`,"1");
      s.onload=resolve; s.onerror=()=>reject(new Error("Google-Bibliothek konnte nicht geladen werden."));
      document.head.appendChild(s);
    });
  }

  async function initGoogleLibraries() {
    await Promise.all([
      loadScript("https://apis.google.com/js/api.js","gapi"),
      loadScript("https://accounts.google.com/gsi/client","gis")
    ]);
    await new Promise(resolve => gapi.load("client", resolve));
    await gapi.client.init({discoveryDocs:[DISCOVERY_DOC]});
  }

  async function connectGoogle(promptMode="consent") {
    if (!config.clientId) throw new Error("Bitte zuerst die Google OAuth Client-ID speichern.");
    await initGoogleLibraries();
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:SCOPES,callback:()=>{}});
    }
    return new Promise((resolve,reject) => {
      tokenClient.callback = response => {
        if (response?.error) return reject(new Error(response.error_description || response.error));
        if (!response?.access_token) return reject(new Error("Google hat kein Zugriffstoken geliefert."));
        gapi.client.setToken({access_token:response.access_token});
        googleConnected = true;
        updateButtons();
        status("Google verbunden · bereit zum Synchronisieren", "ok");
        resolve();
      };
      tokenClient.requestAccessToken({prompt:promptMode});
    });
  }

  function updateButtons() {
    const connect=document.querySelector("#v6Connect");
    const sync=document.querySelector("#v6SyncNow");
    if (connect) connect.textContent = googleConnected ? "Google verbunden" : "Mit Google verbinden";
    if (sync) sync.disabled = !googleConnected || !config.spreadsheetId;
  }

  function rowHeaders() {
    return ["ID","Name","Volk","Variante","Fraktion","Klasse","Geschlecht","Level","Spezialisierung","Beruf 1","Beruf 2","Server","Region","Status","Erweiterung Remix","Midnight","Bild URL","Arsenal Link","Notizen","Aktualisiert"];
  }
  function rowFromCharacter(c, revision) {
    const armory = typeof window.wowCharacterPlannerArmoryLink === "function" ? window.wowCharacterPlannerArmoryLink(c) : (c.armoryUrl||"");
    return [c.id||"",c.name||"",c.race||"",c.variant||"",c.faction||"",c.className||"",c.gender||"",c.level||"",c.specialization||c.spec||"",c.profession1||"",c.profession2||"",c.realm||"",c.region||"eu",c.status||"Aktiv",c.remixEvent||"",c.midnight||"",safeImage(c.avatarUrl||c.imageUrl||c.image),armory||"",c.notes||"",revision];
  }
  function characterFromRow(row=[]) {
    const v=i=>String(row[i]??"").trim();
    const lvl=Number.parseInt(v(7),10);
    return {id:v(0)||uid(),name:v(1),race:v(2),variant:v(3),faction:v(4)||"Neutral",className:v(5),gender:v(6),level:Number.isFinite(lvl)&&lvl>0?lvl:"",specialization:v(8),profession1:v(9),profession2:v(10),realm:v(11),region:v(12)||"eu",status:v(13)||"Aktiv",remixEvent:v(14),midnight:v(15),avatarUrl:v(16),armoryUrl:v(17),notes:v(18),syncUpdatedAt:v(19)};
  }
  function cloudComparable(c) {
    return {id:c.id||"",name:c.name||"",race:c.race||"",variant:c.variant||"",faction:c.faction||"",className:c.className||"",gender:c.gender||"",level:c.level||"",specialization:c.specialization||c.spec||"",profession1:c.profession1||"",profession2:c.profession2||"",realm:c.realm||"",region:c.region||"eu",status:c.status||"Aktiv",remixEvent:c.remixEvent||"",midnight:c.midnight||"",avatarUrl:safeImage(c.avatarUrl||c.imageUrl||c.image),notes:c.notes||""};
  }
  function fingerprint(list) {
    return JSON.stringify(list.map(cloudComparable).sort((a,b)=>(a.id||a.name).localeCompare(b.id||b.name,"de")));
  }

  async function ensureSheet() {
    const result = await gapi.client.sheets.spreadsheets.get({spreadsheetId:config.spreadsheetId,fields:"sheets.properties"});
    const name=cleanSheetName(config.sheetName);
    const exists=(result.result.sheets||[]).some(s=>s.properties?.title===name);
    if (!exists) await gapi.client.sheets.spreadsheets.batchUpdate({spreadsheetId:config.spreadsheetId,resource:{requests:[{addSheet:{properties:{title:name}}}]}});
    config.sheetName=name; saveConfig();
  }
  function range(part) {
    const n=cleanSheetName(config.sheetName).replace(/'/g,"''");
    return `'${n}'!${part}`;
  }

  async function readCloud() {
    await ensureSheet();
    const response=await gapi.client.sheets.spreadsheets.values.get({spreadsheetId:config.spreadsheetId,range:range("A1:T")});
    const rows=response.result.values||[];
    if (!rows.length || String(rows[0]?.[0]||"")!=="ID") return {revision:"",characters:[]};
    const meta=rows[1]||[];
    const hasMeta=String(meta[0]||"")==="__META__";
    const revision=hasMeta?String(meta[19]||""):"";
    const start=hasMeta?2:1;
    return {revision,characters:rows.slice(start).filter(r=>String(r[0]||r[1]||"").trim()).map(characterFromRow)};
  }

  async function writeCloud() {
    await ensureSheet();
    const revision=nowIso();
    await gapi.client.sheets.spreadsheets.values.clear({spreadsheetId:config.spreadsheetId,range:range("A:T")});
    const meta=["__META__","Cloud Sync v0.6.0",...Array(17).fill(""),revision];
    await gapi.client.sheets.spreadsheets.values.update({spreadsheetId:config.spreadsheetId,range:range("A1:T"),valueInputOption:"RAW",resource:{majorDimension:"ROWS",values:[rowHeaders(),meta,...characters.map(c=>rowFromCharacter(c,revision))]}});
    setBothRevisions(revision);
    status(`Cloud gespeichert · ${characters.length} Datensätze`,"ok");
  }

  function applyCloud(cloud) {
    const localById=new Map(characters.filter(c=>c.id).map(c=>[c.id,c]));
    const localByName=new Map(characters.filter(c=>c.name).map(c=>[`${c.name.toLocaleLowerCase("de")}|${c.className||""}`,c]));
    const incoming=cloud.characters.map(remote=>{
      const local=localById.get(remote.id)||localByName.get(`${(remote.name||"").toLocaleLowerCase("de")}|${remote.className||""}`);
      if (!remote.avatarUrl && local?.avatarUrl) remote.avatarUrl=local.avatarUrl;
      return remote;
    });
    applyingCloud=true;
    try {
      characters=incoming;
      setBothRevisions(cloud.revision||nowIso());
      oldSaveCharacters();
      renderAll();
    } finally { applyingCloud=false; }
    status(`Cloud geladen · ${characters.length} Datensätze`,"ok");
  }

  async function syncNow(silent=false) {
    if (!googleConnected) {
      if (silent) return;
      await connectGoogle("consent");
    }
    if (!config.spreadsheetId) throw new Error("Bitte die Google-Sheet-URL oder Spreadsheet-ID eintragen.");
    status("Synchronisierung läuft …","busy");
    const cloud=await readCloud();
    if (!cloud.characters.length && characters.length) return writeCloud();
    if (cloud.characters.length && !characters.length) return applyCloud(cloud);
    if (!cloud.characters.length && !characters.length) return writeCloud();

    const known=getCloudRevision(), localRev=getLocalRevision(), remoteRev=cloud.revision||"";
    if (!known) {
      if (fingerprint(cloud.characters)===fingerprint(characters)) {
        setBothRevisions(remoteRev||nowIso()); status("Cloud und Gerät sind bereits identisch","ok"); return;
      }
      const useCloud=confirm("Auf diesem Gerät und in Google Sheets liegen unterschiedliche Daten vor.\n\nOK = Daten aus Google Sheets laden\nAbbrechen = lokale Daten nach Google Sheets hochladen");
      return useCloud?applyCloud(cloud):writeCloud();
    }
    const localDirty=!!localRev&&localRev>known;
    const remoteDirty=!!remoteRev&&remoteRev>known;
    if (localDirty&&remoteDirty) {
      const useCloud=confirm("Die Daten wurden auf diesem Gerät UND in Google Sheets geändert.\n\nOK = Cloud-Version verwenden\nAbbrechen = lokale Version verwenden");
      return useCloud?applyCloud(cloud):writeCloud();
    }
    if (remoteDirty) return applyCloud(cloud);
    if (localDirty) return writeCloud();
    status("Alles aktuell","ok");
  }

  const grid=document.querySelector("#settings .settings-grid");
  if (grid && !document.querySelector("#v6CloudSync")) {
    const panel=document.createElement("article");
    panel.id="v6CloudSync"; panel.className="panel";
    panel.innerHTML=`
      <div class="panel-head"><div><div class="eyebrow">CLOUD SYNC</div><h3>Google Sheets</h3></div></div>
      <p class="muted">Dein privates Google Sheet wird zur zentralen Datenquelle für Pixel, PC und weitere Geräte.</p>
      <div class="form-grid">
        <label class="field field-full"><span>Google OAuth Client-ID</span><input id="v6ClientId" autocomplete="off" placeholder="…apps.googleusercontent.com"></label>
        <label class="field field-full"><span>Google-Sheet-URL oder Spreadsheet-ID</span><input id="v6Spreadsheet" autocomplete="off" placeholder="https://docs.google.com/spreadsheets/d/…"></label>
        <label class="field"><span>App-Tabellenblatt</span><input id="v6SheetName"></label>
        <label class="field"><span>Automatisch synchronisieren</span><select id="v6AutoSync"><option value="1">Ja</option><option value="0">Nein</option></select></label>
      </div>
      <div class="v6-actions">
        <button id="v6SaveConfig" type="button" class="btn btn-secondary">Einstellungen speichern</button>
        <button id="v6Connect" type="button" class="btn btn-secondary">Mit Google verbinden</button>
        <button id="v6SyncNow" type="button" class="btn btn-primary">Jetzt synchronisieren</button>
      </div>
      <div class="v6-actions"><button id="v6Pull" type="button" class="btn btn-ghost">Cloud → Gerät</button><button id="v6Push" type="button" class="btn btn-ghost">Gerät → Cloud</button></div>
      <div id="v6SyncStatus" class="v6-status">Noch nicht verbunden.</div>
      <p class="v6-note">HTTPS-Bild-URLs werden synchronisiert. Lokal eingebettete Portraitbilder bleiben auf dem jeweiligen Gerät; Google-Drive-Bildsync kommt als nächster Schritt.</p>`;
    grid.insertAdjacentElement("afterbegin",panel);

    document.querySelector("#v6ClientId").value=config.clientId;
    document.querySelector("#v6Spreadsheet").value=config.spreadsheetId;
    document.querySelector("#v6SheetName").value=config.sheetName;
    document.querySelector("#v6AutoSync").value=config.autoSync?"1":"0";

    document.querySelector("#v6SaveConfig").addEventListener("click",()=>{
      config.clientId=document.querySelector("#v6ClientId").value.trim();
      config.spreadsheetId=extractId(document.querySelector("#v6Spreadsheet").value);
      config.sheetName=cleanSheetName(document.querySelector("#v6SheetName").value);
      config.autoSync=document.querySelector("#v6AutoSync").value==="1";
      saveConfig(); document.querySelector("#v6Spreadsheet").value=config.spreadsheetId; updateButtons(); toast("Google-Sheets-Einstellungen gespeichert");
    });
    document.querySelector("#v6Connect").addEventListener("click",async()=>{try{await connectGoogle("consent");}catch(e){status(e.message,"error");}});
    document.querySelector("#v6SyncNow").addEventListener("click",async()=>{try{await syncNow(false);}catch(e){status(e.message,"error");}});
    document.querySelector("#v6Pull").addEventListener("click",async()=>{try{if(!googleConnected)await connectGoogle("consent");const cloud=await readCloud();if(!cloud.characters.length)return status("In Google Sheets sind noch keine App-Daten vorhanden.","idle");if(confirm(`${cloud.characters.length} Cloud-Datensätze auf dieses Gerät übernehmen?`))applyCloud(cloud);}catch(e){status(e.message,"error");}});
    document.querySelector("#v6Push").addEventListener("click",async()=>{try{if(!googleConnected)await connectGoogle("consent");if(confirm(`${characters.length} lokale Datensätze nach Google Sheets schreiben?`))await writeCloud();}catch(e){status(e.message,"error");}});
  }

  const style=document.createElement("style");
  style.textContent=`.v6-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.v6-status{margin-top:12px;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:9px;color:var(--muted);font-size:.82rem}.v6-status[data-kind="ok"]{color:#a7ddb3;border-color:rgba(89,180,112,.32)}.v6-status[data-kind="error"]{color:#f0a8a8;border-color:rgba(210,76,76,.32)}.v6-note{font-size:.72rem;color:var(--muted);line-height:1.45;margin:.8rem 0 0}@media(max-width:640px){.v6-actions .btn{flex:1 1 auto}}`;
  document.head.appendChild(style);

  updateButtons();
  const brandSub=document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
})();
