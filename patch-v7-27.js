/* v0.7.27 — Keep expansion abbreviations in the matrix; remove only the word Remix. */
(() => {
  const VERSION = "0.7.27";

  function cleanRemixWording(text) {
    return String(text || "")
      .replace(/Erweiterung\s+Remix\s*:/gi, "Erweiterung:")
      .replace(/\bRemix\b/gi, "")
      .replace(/\s+([,.)])/g, "$1")
      .replace(/([:(])\s+/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function restoreExpansionAbbreviations() {
    const matrix = document.querySelector("#matrix");
    if (!matrix) return;

    /* Older renderers already create .v3-remix with values such as
       "MoP Remix". Keep the expansion abbreviation and strip only the word. */
    matrix.querySelectorAll(".v3-remix").forEach(el => {
      el.textContent = cleanRemixWording(el.textContent);
    });

    matrix.querySelectorAll("#raceClassMatrix [title]").forEach(el => {
      const title = el.getAttribute("title");
      if (title && /remix/i.test(title)) el.setAttribute("title", cleanRemixWording(title));
    });

    const intro = matrix.querySelector(".matrix-intro p");
    if (intro) intro.textContent = "x = vorhandener Charakter, y = geplanter Charakter. Steht bei y eine Erweiterungsabkürzung, ist der Charakter für diese Erweiterung geplant.";

    const legend = matrix.querySelector(".legend");
    if (legend) legend.innerHTML = '<span><b class="v725-x">x</b> vorhanden</span><span><b class="v725-y">y</b> geplant</span><span><b class="v725-y">y · MoP</b> Erweiterung</span>';
  }

  const previousRenderMatrix = renderMatrix;
  renderMatrix = function(...args) {
    const result = previousRenderMatrix.apply(this,args);
    restoreExpansionAbbreviations();
    return result;
  };

  const style = document.createElement("style");
  style.textContent = `
    /* v0.7.25 hid the complete expansion marker. Show it again; only its wording
       is cleaned by this patch. */
    #matrix .v3-remix{display:block!important}
  `;
  document.head.appendChild(style);

  restoreExpansionAbbreviations();

  const brand = document.querySelector(".brand-sub");
  if (brand) {
    const forever = typeof window.wowCharacterPlannerGameMode === "function" && window.wowCharacterPlannerGameMode() === "forever";
    brand.textContent = forever ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
  }
})();
