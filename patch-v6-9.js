/* v0.6.9 — Remix label cleanup and compact people-group toggle. */
(() => {
  const VERSION = "0.6.9";

  function remixLabel(value) {
    const event = String(value || "").trim();
    if (!event) return "";
    return /\bRemix\b/i.test(event) ? event : `${event} Remix`;
  }

  function fixRemixLabels(root = document) {
    root.querySelectorAll?.(".character-row[data-id]").forEach(row => {
      const id = row.getAttribute("data-id");
      const c = characters.find(x => String(x.id) === String(id));
      const badge = row.querySelector(".remix-badge");
      if (badge && c?.remixEvent) badge.textContent = remixLabel(c.remixEvent);
    });

    root.querySelectorAll?.(".v3-remix").forEach(el => {
      const parts = String(el.textContent || "").split("·").map(v => v.trim()).filter(Boolean);
      if (parts.length) el.textContent = parts.map(remixLabel).join(" · ");
    });

    root.querySelectorAll?.("[title]").forEach(el => {
      const title = el.getAttribute("title") || "";
      const next = title.replace(/Erweiterung Remix:\s*([^,;)]+)/g, (_, value) => remixLabel(value.trim()));
      if (next !== title) el.setAttribute("title", next);
    });
  }

  function removePeopleToggleExplanation() {
    const tools = document.querySelector("#v67PeopleTools");
    if (!tools) return;
    tools.querySelectorAll(".muted").forEach(el => el.remove());
  }

  const previousCharacterRow = characterRow;
  characterRow = function(c, compact = false) {
    const html = previousCharacterRow(c, compact);
    if (!c?.remixEvent) return html;
    return html.replace(/Erweiterung Remix:\s*([^<]+)/g, remixLabel(c.remixEvent));
  };

  const previousRenderDashboard = renderDashboard;
  renderDashboard = function() {
    previousRenderDashboard();
    removePeopleToggleExplanation();
    fixRemixLabels(document.querySelector("#dashboard") || document);
  };

  const previousRenderCharacters = renderCharacters;
  renderCharacters = function() {
    previousRenderCharacters();
    fixRemixLabels(document.querySelector("#characters") || document);
  };

  const previousRenderMatrix = renderMatrix;
  renderMatrix = function() {
    previousRenderMatrix();
    fixRemixLabels(document.querySelector("#matrix") || document);
  };

  const style = document.createElement("style");
  style.textContent = `#v67PeopleTools{gap:0}`;
  document.head.appendChild(style);

  removePeopleToggleExplanation();
  fixRemixLabels(document);
  renderAll();

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
