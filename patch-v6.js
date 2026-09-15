/* v0.6.0 — Google Sheets cloud sync settings. */
(() => {
  const VERSION = "0.6.0";
  const CONFIG_KEY = "wowCharacterPlanner.googleSheets.v1";
  let config = {};
  try { config = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}"); } catch { config = {}; }
  config.clientId = config.clientId || "";
  config.spreadsheetId = config.spreadsheetId || "";
  config.sheetName = config.sheetName || "App_Daten";

  function extractId(value) {
    const text = String(value || "").trim();
    const match = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : text;
  }

  const grid = document.querySelector("#settings .settings-grid");
  if (grid && !document.querySelector("#v6CloudSync")) {
    const panel = document.createElement("article");
    panel.id = "v6CloudSync";
    panel.className = "panel";
    panel.innerHTML = `
      <div class="panel-head"><div><div class="eyebrow">CLOUD SYNC</div><h3>Google Sheets</h3></div></div>
      <p class="muted">Google Sheets kann als private zentrale Datenquelle für deine Geräte verwendet werden.</p>
      <div class="form-grid">
        <label class="field field-full"><span>Google OAuth Client-ID</span><input id="v6ClientId" autocomplete="off" placeholder="…apps.googleusercontent.com"></label>
        <label class="field field-full"><span>Google-Sheet-URL oder Spreadsheet-ID</span><input id="v6Spreadsheet" autocomplete="off" placeholder="https://docs.google.com/spreadsheets/d/…"></label>
        <label class="field"><span>App-Tabellenblatt</span><input id="v6SheetName" value="App_Daten"></label>
      </div>
      <div class="modal-actions"><button id="v6SaveConfig" type="button" class="btn btn-secondary">Einstellungen speichern</button></div>
      <div id="v6SyncStatus" class="muted">Noch nicht verbunden.</div>
    `;
    grid.insertAdjacentElement("afterbegin", panel);
    document.querySelector("#v6ClientId").value = config.clientId;
    document.querySelector("#v6Spreadsheet").value = config.spreadsheetId;
    document.querySelector("#v6SheetName").value = config.sheetName;
    document.querySelector("#v6SaveConfig").addEventListener("click", () => {
      config.clientId = document.querySelector("#v6ClientId").value.trim();
      config.spreadsheetId = extractId(document.querySelector("#v6Spreadsheet").value);
      config.sheetName = document.querySelector("#v6SheetName").value.trim() || "App_Daten";
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      document.querySelector("#v6Spreadsheet").value = config.spreadsheetId;
      toast("Google-Sheets-Einstellungen gespeichert");
    });
  }

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
