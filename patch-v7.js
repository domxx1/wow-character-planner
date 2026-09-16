/* v0.7.0 — Manual and bulk Blizzard character portrait retrieval via the private data repository. */
(() => {
  const VERSION = "0.7.0";
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";
  const TYPE_KEY = "wowCharacterPlanner.blizzardMediaType.v1";
  const REQUEST_PATH = "requests/blizzard-media.json";
  const STATUS_PATH = "data/blizzard-media-status.json";
  const POLL_MS = 2200;
  const POLL_TIMEOUT_MS = 180000;

  const $ = selector => document.querySelector(selector);

  function getToken() {
    return sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem(TOKEN_LOCAL_KEY) || "";
  }

  function getConfig() {
    try {
      return {
        repo: "domxx1/wow-character-planner-data",
        branch: "main",
        ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}")
      };
    } catch {
      return {repo: "domxx1/wow-character-planner-data", branch: "main"};
    }
  }

  function getImageType() {
    const value = localStorage.getItem(TYPE_KEY) || "inset";
    return ["avatar", "inset", "main-raw"].includes(value) ? value : "inset";
  }

  function setImageType(value) {
    const next = ["avatar", "inset", "main-raw"].includes(value) ? value : "inset";
    localStorage.setItem(TYPE_KEY, next);
    document.querySelectorAll("[data-v70-image-type]").forEach(select => {
      if (select.value !== next) select.value = next;
    });
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  function textToBase64(text) {
    return bytesToBase64(new TextEncoder().encode(text));
  }

  function base64ToText(base64) {
    const binary = atob(String(base64 || "").replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  async function ghRequest(url, options = {}) {
    const token = getToken();
    if (!token) throw new Error("GitHub-Token fehlt. Bitte zuerst den privaten GitHub-Sync einrichten.");
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (response.status === 404) return null;
    let body = null;
    try { body = await response.json(); } catch {}
    if (!response.ok) throw new Error(body?.message || `GitHub API: HTTP ${response.status}`);
    return body;
  }

  function contentUrl(path) {
    const config = getConfig();
    const safePath = String(path).split("/").map(encodeURIComponent).join("/");
    return `https://api.github.com/repos/${config.repo}/contents/${safePath}`;
  }

  async function requirePrivateRepo() {
    const config = getConfig();
    const repo = await ghRequest(`https://api.github.com/repos/${config.repo}`);
    if (!repo) throw new Error("Privates Daten-Repository nicht gefunden.");
    if (!repo.private) throw new Error("Blizzard-Profilbilder sind nur mit einem privaten Daten-Repository aktiviert.");
    return repo;
  }

  async function getJsonFile(path) {
    const config = getConfig();
    const file = await ghRequest(`${contentUrl(path)}?ref=${encodeURIComponent(config.branch || "main")}`);
    if (!file) return {file: null, value: null};
    let value = null;
    try { value = JSON.parse(base64ToText(file.content)); }
    catch { throw new Error(`${path} enthält kein gültiges JSON.`); }
    return {file, value};
  }

  async function putJsonFile(path, value, message) {
    const config = getConfig();
    const current = await getJsonFile(path);
    const body = {
      message,
      content: textToBase64(JSON.stringify(value, null, 2) + "\n"),
      branch: config.branch || "main"
    };
    if (current.file?.sha) body.sha = current.file.sha;
    return ghRequest(contentUrl(path), {method: "PUT", body: JSON.stringify(body)});
  }

  function requestId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function minimalCharacter(c) {
    return {
      id: String(c?.id || ""),
      name: String(c?.name || "").trim(),
      realm: String(c?.realm || "").trim(),
      region: String(c?.region || "eu").trim().toLowerCase() || "eu"
    };
  }

  function currentEditorCharacter() {
    return {
      id: String($("#charId")?.value || ""),
      name: String($("#charName")?.value || "").trim(),
      realm: String($("#charRealm")?.value || "").trim(),
      region: String($("#charRegion")?.value || "eu").trim().toLowerCase() || "eu"
    };
  }

  function setPanelStatus(text, error = false) {
    const el = $("#v70MediaStatus");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("v70-error", error);
  }

  function setSingleStatus(text, error = false) {
    const el = $("#v70SingleStatus");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("v70-error", error);
  }

  async function pollStatus(id, onProgress) {
    const started = Date.now();
    while (Date.now() - started < POLL_TIMEOUT_MS) {
      const {value} = await getJsonFile(STATUS_PATH);
      if (value?.requestId === id && value?.state && value.state !== "running") return value;
      if (typeof onProgress === "function") onProgress(Math.floor((Date.now() - started) / 1000));
      await new Promise(resolve => setTimeout(resolve, POLL_MS));
    }
    throw new Error("Die Blizzard-Abfrage läuft länger als erwartet. Sie kann im Hintergrund noch fertig werden.");
  }

  function applyMediaResults(status) {
    let changed = 0;
    const changedIds = new Set();
    (status?.results || []).forEach(result => {
      const c = characters.find(item => String(item.id) === String(result.id));
      if (!c || !result.avatarUrl) return;
      c.avatarUrl = result.avatarUrl;
      if (result.armoryUrl) c.armoryUrl = result.armoryUrl;
      changed++;
      changedIds.add(String(c.id));
    });
    if (changed) {
      saveCharacters();
      renderAll();
    }
    const currentId = String($("#charId")?.value || "");
    if (currentId && changedIds.has(currentId)) {
      const c = characters.find(item => String(item.id) === currentId);
      const input = $("#charAvatar");
      if (input && c?.avatarUrl) input.value = c.avatarUrl;
      const preview = $("#charAvatarPreview");
      if (preview && c?.avatarUrl) preview.innerHTML = `<img src="${escapeHtml(c.avatarUrl)}" alt="Charakterbild">`;
    }
    return changed;
  }

  function statusMessage(status) {
    if (!status) return "Keine Rückmeldung von der Blizzard-Abfrage.";
    const firstError = status.errors?.[0]?.message || "";
    if (status.state === "setup_required") return firstError || "Blizzard-API-Zugangsdaten sind noch nicht eingerichtet.";
    if (status.state === "error") return firstError || "Blizzard-Abfrage fehlgeschlagen.";
    const parts = [`${Number(status.success || 0)} aktualisiert`];
    if (status.skipped) parts.push(`${status.skipped} übersprungen`);
    if (status.failed) parts.push(`${status.failed} fehlgeschlagen`);
    return parts.join(" · ");
  }

  async function runRequest(mode, list, imageType, setStatus) {
    await requirePrivateRepo();
    const id = requestId();
    const payload = {
      version: 1,
      requestId: id,
      mode,
      imageType,
      requestedAt: new Date().toISOString(),
      characters: list
    };
    setStatus("Anfrage wird an GitHub übergeben …");
    await putJsonFile(REQUEST_PATH, payload, mode === "all" ? "Request all Blizzard character media" : "Request Blizzard character media");
    setStatus("Blizzard-Profilbilder werden abgerufen …");
    const result = await pollStatus(id, seconds => {
      if (seconds >= 8) setStatus(`Blizzard-Profilbilder werden abgerufen … ${seconds}s`);
    });
    const changed = applyMediaResults(result);
    const message = statusMessage(result);
    const isError = ["setup_required", "error"].includes(result.state);
    setStatus(message, isError);
    if (isError) throw new Error(message);
    return {result, changed};
  }

  function ensureSingleControls() {
    const root = $(".v4-avatar-inputs");
    if (!root || $("#v70SingleMedia")) return;
    const box = document.createElement("div");
    box.id = "v70SingleMedia";
    box.className = "v70-single-media";
    box.innerHTML = `
      <div class="v70-media-row">
        <select id="v70SingleImageType" class="control" data-v70-image-type aria-label="Blizzard-Bildtyp">
          <option value="inset">Porträt (Arsenal)</option>
          <option value="avatar">Avatar</option>
          <option value="main-raw">Ganzkörper</option>
        </select>
        <button id="v70FetchSingle" type="button" class="btn btn-secondary">Aus Blizzard laden</button>
      </div>
      <small id="v70SingleStatus" class="v70-status">Name und Server werden für die Blizzard-Abfrage verwendet.</small>`;
    root.appendChild(box);
    $("#v70SingleImageType").value = getImageType();
    $("#v70SingleImageType").addEventListener("change", e => setImageType(e.target.value));
    $("#v70FetchSingle").addEventListener("click", fetchSingle);
  }

  async function fetchSingle() {
    const button = $("#v70FetchSingle");
    const info = currentEditorCharacter();
    if (!info.id) { toast("Bitte den Charakter zuerst speichern"); return; }
    if (!info.name || !info.realm) { toast("Für die Blizzard-Abfrage werden Name und Server benötigt"); return; }
    if (button) button.disabled = true;
    try {
      const {result} = await runRequest("one", [info], getImageType(), setSingleStatus);
      if (result.success) toast("Profilbild aus dem Blizzard-Arsenal aktualisiert");
      else toast(statusMessage(result));
    } catch (err) {
      setSingleStatus(err.message || String(err), true);
      toast(err.message || String(err));
    } finally {
      if (button) button.disabled = false;
    }
  }

  function ensureBulkPanel() {
    const grid = $("#settings .settings-grid");
    if (!grid || $("#v70BlizzardMedia")) return;
    const panel = document.createElement("article");
    panel.id = "v70BlizzardMedia";
    panel.className = "panel";
    panel.innerHTML = `
      <div class="panel-head"><div><div class="eyebrow">BLIZZARD</div><h3>Profilbilder aus dem Arsenal</h3></div></div>
      <p class="muted">Ruft die aktuellen Charakterbilder über Blizzards Character-Media-API ab. Charaktere ohne Name oder Server werden übersprungen.</p>
      <div class="v70-bulk-row">
        <label class="field"><span>Bildtyp</span><select id="v70BulkImageType" class="control" data-v70-image-type><option value="inset">Porträt (Arsenal)</option><option value="avatar">Avatar</option><option value="main-raw">Ganzkörper</option></select></label>
        <button id="v70FetchAll" type="button" class="btn btn-primary">Alle Charakterbilder abrufen</button>
      </div>
      <div id="v70MediaStatus" class="muted v70-status">Für die sichere Blizzard-Anmeldung werden zwei Repository-Secrets im privaten Daten-Repository verwendet.</div>`;
    const sync = $("#v6GithubSync");
    if (sync) sync.insertAdjacentElement("afterend", panel);
    else grid.insertAdjacentElement("afterbegin", panel);
    $("#v70BulkImageType").value = getImageType();
    $("#v70BulkImageType").addEventListener("change", e => setImageType(e.target.value));
    $("#v70FetchAll").addEventListener("click", fetchAll);
  }

  async function fetchAll() {
    const button = $("#v70FetchAll");
    const list = characters.map(minimalCharacter);
    const eligible = list.filter(c => c.id && c.name && c.realm).length;
    if (!eligible) { toast("Kein Charakter mit Name und Server gefunden"); return; }
    if (!confirm(`${eligible} Charakterbilder jetzt bei Blizzard abrufen?`)) return;
    if (button) button.disabled = true;
    try {
      setPanelStatus(`${eligible} Charaktere werden vorbereitet …`);
      const {result} = await runRequest("all", list, getImageType(), setPanelStatus);
      toast(statusMessage(result));
    } catch (err) {
      setPanelStatus(err.message || String(err), true);
      toast(err.message || String(err));
    } finally {
      if (button) button.disabled = false;
    }
  }

  const previousOpenCharacter = openCharacter;
  openCharacter = function(id = null, preset = {}) {
    previousOpenCharacter(id, preset);
    ensureSingleControls();
    const status = $("#v70SingleStatus");
    if (status) {
      const c = id ? characters.find(item => item.id === id) : null;
      status.textContent = c?.avatarUrl ? "Vorhandenes Bild kann jederzeit erneut von Blizzard aktualisiert werden." : "Name und Server werden für die Blizzard-Abfrage verwendet.";
      status.classList.remove("v70-error");
    }
  };

  const style = document.createElement("style");
  style.textContent = `
    .v70-single-media{display:grid;gap:6px;padding-top:2px;border-top:1px solid rgba(255,255,255,.07)}
    .v70-media-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
    .v70-media-row .control{min-width:0}.v70-status{font-size:.74rem;line-height:1.4}.v70-error{color:#e27a7a!important}
    .v70-bulk-row{display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:10px;align-items:end;margin-top:12px}.v70-bulk-row .btn{min-height:42px}
    @media(max-width:640px){.v70-media-row,.v70-bulk-row{grid-template-columns:1fr}.v70-media-row .btn,.v70-bulk-row .btn{width:100%}}
  `;
  document.head.appendChild(style);

  ensureSingleControls();
  ensureBulkPanel();
  setImageType(getImageType());

  const brandSub = $(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
