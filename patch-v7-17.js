/* v0.7.17 — Final Retail/Forever isolation audit fixes. */
(() => {
  const VERSION = "0.7.17";
  const RETAIL_GROUP_KEY = "wowCharacterPlanner.peopleGroups.v1";
  const FOREVER_GROUP_KEY = "wowCharacterPlanner.forever.peopleGroups.v1";
  const RETAIL_CHARACTER_KEY = "wowCharacterPlanner.retail.characters.v1";
  const LEGACY_REMIX_KEY = "wowCharacterPlanner.remix.v1";
  const LEGACY_RICH_KEY = "wowCharacterPlanner.richProfile.v1";

  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : "retail";

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  /* Older compatibility patches still read these shared backup keys during boot.
     Keep them Retail-only so Forever can never leak back into Retail on reload. */
  function refreshLegacyRetailMirrors() {
    const retail = readArray(RETAIL_CHARACTER_KEY);
    const remix = {};
    const rich = [];
    retail.forEach(c => {
      if (c?.id && c?.remixEvent) remix[c.id] = c.remixEvent;
      if (!c?.id && !c?.name) return;
      const entry = {id:c.id || "",name:c.name || "",className:c.className || ""};
      ["avatarUrl","imageUrl","image","armoryUrl","region","level","specialization","spec","remixEvent"].forEach(field => {
        const value = c?.[field];
        if (value !== undefined && value !== null && String(value) !== "") entry[field] = value;
      });
      rich.push(entry);
    });
    localStorage.setItem(LEGACY_REMIX_KEY,JSON.stringify(remix));
    localStorage.setItem(LEGACY_RICH_KEY,JSON.stringify(rich));
  }

  const previousSaveCharacters = saveCharacters;
  saveCharacters = function(...args) {
    const result = previousSaveCharacters.apply(this,args);
    refreshLegacyRetailMirrors();
    return result;
  };
  refreshLegacyRetailMirrors();

  /* v0.7.7 predates game modes and its group-click handler reads the Retail group
     key. During a Forever group click we expose the Forever groups only for the
     synchronous event dispatch, then restore the Retail value immediately. */
  let restoreTimer = 0;
  function bridgeForeverGroupsForEvent(e) {
    if (mode() !== "forever") return;
    if (!e.target?.closest?.("#v67PeopleCoverage .v67-group-row")) return;
    const old = localStorage.getItem(RETAIL_GROUP_KEY);
    const forever = localStorage.getItem(FOREVER_GROUP_KEY) || "[]";
    localStorage.setItem(RETAIL_GROUP_KEY,forever);
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
      restoreTimer = 0;
      if (old === null) localStorage.removeItem(RETAIL_GROUP_KEY);
      else localStorage.setItem(RETAIL_GROUP_KEY,old);
    },0);
  }
  document.addEventListener("click",bridgeForeverGroupsForEvent,true);
  document.addEventListener("keydown",e => {
    if (e.key === "Enter" || e.key === " ") bridgeForeverGroupsForEvent(e);
  },true);

  const brand = document.querySelector(".brand-sub");
  if (brand) brand.textContent = mode() === "forever" ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
})();
