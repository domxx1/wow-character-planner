/* v0.7.2 — Make remembered GitHub token persistence and connection state explicit. */
(() => {
  const VERSION = "0.7.2";
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";

  const $ = selector => document.querySelector(selector);

  function localToken() { return localStorage.getItem(TOKEN_LOCAL_KEY) || ""; }
  function sessionToken() { return sessionStorage.getItem(TOKEN_SESSION_KEY) || ""; }
  function getToken() { return sessionToken() || localToken(); }

  function getConfig() {
    try {
      return {repo:"domxx1/wow-character-planner-data",branch:"main",...JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}")};
    } catch {
      return {repo:"domxx1/wow-character-planner-data",branch:"main"};
    }
  }

  function setGithubStatus(text,state="") {
    const el=$("#v6GithubStatus");
    if(!el) return;
    el.textContent=text;
    el.dataset.state=state;
  }

  function ensureTokenStateUi() {
    const input=$("#v6Token");
    if(!input) return;
    let note=$("#v72TokenState");
    if(!note) {
      note=document.createElement("small");
      note.id="v72TokenState";
      note.className="v72-token-state";
      input.insertAdjacentElement("afterend",note);
    }
    const hasLocal=!!localToken();
    const hasSession=!!sessionToken();
    const remember=$("#v6Remember");
    if(hasLocal) {
      if(remember) remember.checked=true;
      input.placeholder="Token ist auf diesem Gerät gespeichert";
      note.textContent="Token gespeichert · wird aus Sicherheitsgründen nicht erneut im Feld angezeigt.";
      note.dataset.state="ok";
    } else if(hasSession) {
      input.placeholder="Token ist für diese Sitzung gespeichert";
      note.textContent="Token nur für diese Sitzung gespeichert. „Token auf diesem Gerät merken“ aktivieren, um ihn dauerhaft zu speichern.";
      note.dataset.state="session";
    } else {
      input.placeholder="github_pat_…";
      note.textContent="Kein Token gespeichert.";
      note.dataset.state="missing";
    }
    const mediaButton=$("#v70FetchAll");
    if(mediaButton) mediaButton.disabled=!getToken();
  }

  function captureTokenBeforeAction() {
    const input=$("#v6Token");
    const remember=$("#v6Remember");
    const typed=String(input?.value||"").trim();
    const existing=getToken();
    const token=typed||existing;
    if(!token) return;
    if(remember?.checked) {
      localStorage.setItem(TOKEN_LOCAL_KEY,token);
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
    } else {
      sessionStorage.setItem(TOKEN_SESSION_KEY,token);
      localStorage.removeItem(TOKEN_LOCAL_KEY);
    }
  }

  async function verifyStoredConnection() {
    const token=getToken();
    ensureTokenStateUi();
    if(!token) {
      setGithubStatus("Kein GitHub-Token gespeichert.","warning");
      return;
    }
    const config=getConfig();
    setGithubStatus("Gespeicherter Token wird geprüft …","working");
    try {
      const response=await fetch(`https://api.github.com/repos/${config.repo}`,{
        cache:"no-store",
        headers:{
          "Accept":"application/vnd.github+json",
          "Authorization":`Bearer ${token}`,
          "X-GitHub-Api-Version":"2022-11-28"
        }
      });
      if(!response.ok) {
        if(response.status===401) throw new Error("Der gespeicherte GitHub-Token ist ungültig oder abgelaufen.");
        if(response.status===404) throw new Error("Repository nicht gefunden oder der Token hat keinen Zugriff.");
        throw new Error(`GitHub-Verbindung fehlgeschlagen (HTTP ${response.status}).`);
      }
      const repo=await response.json();
      setGithubStatus(`Verbunden mit ${repo.full_name}. ${repo.private?"Privates Repository":"Achtung: Repository ist öffentlich!"}`,repo.private?"ok":"warning");
    } catch(err) {
      setGithubStatus(err?.message||"GitHub-Verbindung konnte nicht geprüft werden.","error");
    }
  }

  const actionIds=new Set(["v6Test","v6Pull","v6Push","v6Sync"]);
  $("#v6GithubSync")?.addEventListener("click",event=>{
    const button=event.target?.closest?.("button");
    if(!button) return;
    if(actionIds.has(button.id)) {
      captureTokenBeforeAction();
      setTimeout(ensureTokenStateUi,50);
    }
    if(button.id==="v6Forget") {
      setTimeout(()=>{
        ensureTokenStateUi();
        setGithubStatus("Kein GitHub-Token gespeichert.","warning");
      },50);
    }
  },true);

  $("#v6Remember")?.addEventListener("change",event=>{
    const remember=!!event.target.checked;
    const typed=String($("#v6Token")?.value||"").trim();
    const token=typed||getToken();
    if(token) {
      if(remember) {
        localStorage.setItem(TOKEN_LOCAL_KEY,token);
        sessionStorage.removeItem(TOKEN_SESSION_KEY);
      } else {
        sessionStorage.setItem(TOKEN_SESSION_KEY,token);
        localStorage.removeItem(TOKEN_LOCAL_KEY);
      }
    }
    ensureTokenStateUi();
  });

  $("#v6Token")?.addEventListener("input",()=>{
    const note=$("#v72TokenState");
    if(note && $("#v6Token").value) {
      note.textContent="Neuer Token eingegeben · wird beim nächsten GitHub-Vorgang gespeichert.";
      note.dataset.state="working";
    }
  });

  const style=document.createElement("style");
  style.textContent=`
    .v72-token-state{display:block;margin-top:6px;color:var(--muted);font-size:.72rem;line-height:1.4}
    .v72-token-state[data-state="ok"]{color:#86d49a}
    .v72-token-state[data-state="working"]{color:#e3bd62}
    .v72-token-state[data-state="missing"]{color:var(--muted)}
    #v70FetchAll:disabled{opacity:.5;cursor:not-allowed;filter:none}
  `;
  document.head.appendChild(style);

  ensureTokenStateUi();
  setTimeout(verifyStoredConnection,250);

  window.addEventListener("pageshow",()=>setTimeout(verifyStoredConnection,150));
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible") setTimeout(verifyStoredConnection,150);
  });

  const brandSub=$(".brand-sub");
  if(brandSub) brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
})();
