/* v0.5.1-pre — Preserve rich local profile metadata before the legacy migration runs. */
(() => {
  try {
    const raw = localStorage.getItem("wowCharacterPlanner.characters.v1");
    const parsed = JSON.parse(raw || "[]");
    window.__wowCharacterPlannerRichBackup = Array.isArray(parsed) ? parsed : [];
  } catch {
    window.__wowCharacterPlannerRichBackup = [];
  }
})();