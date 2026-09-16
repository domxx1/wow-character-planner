/* v0.6.4 — Clean boot and automatic version checks for the installed PWA. */
(() => {
  const VERSION = "0.6.4";
  const CHECK_INTERVAL = 15000;
  let lastCheck = 0;
  let checking = false;

  function canonicalizeUrl() {
    try {
      const url = new URL(location.href);
      let changed = false;
      ["v","_u","_update","cachefix"].forEach(key => {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      });
      if (changed) history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
    } catch {}
  }

  async function checkForUpdate(force=false) {
    const now = Date.now();
    if (checking || (!force && now - lastCheck < CHECK_INTERVAL)) return;
    checking = true;
    lastCheck = now;
    try {
      const versionUrl = new URL("version.json", location.href);
      versionUrl.searchParams.set("_", String(now));
      const response = await fetch(versionUrl.href, {cache:"no-store"});
      if (!response.ok) return;
      const info = await response.json();
      const remote = String(info?.version || "").trim();
      if (!remote || remote === VERSION) return;

      const boot = document.querySelector("#appBootStatus");
      if (boot) boot.textContent = `Update ${remote} wird geladen …`;
      document.body.classList.add("app-booting");

      try {
        const reg = await navigator.serviceWorker?.getRegistration?.();
        if (reg) await reg.update();
      } catch {}

      const url = new URL(location.href);
      url.searchParams.delete("v");
      url.searchParams.set("_u", String(Date.now()));
      location.replace(url.href);
    } catch {
      /* Offline/current cache remains usable. */
    } finally {
      checking = false;
    }
  }

  function markReady() {
    document.body.classList.remove("app-booting");
    document.body.classList.add("app-ready");
    document.querySelector("#appBoot")?.setAttribute("hidden", "");
  }

  canonicalizeUrl();

  window.addEventListener("pageshow", e => checkForUpdate(!!e.persisted));
  window.addEventListener("focus", () => checkForUpdate(false));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate(false);
  });
  window.addEventListener("online", () => checkForUpdate(true));

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;

  renderAll();
  markReady();
  setTimeout(() => checkForUpdate(true), 250);
})();
