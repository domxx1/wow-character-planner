/* v0.5.1-pre — Preserve rich local profile metadata across legacy normalization. */
(() => {
  const fields = ["avatarUrl","imageUrl","image","armoryUrl","region","level","specialization","spec","remixEvent"];
  window.__wowCharacterPlannerRichBackup = (Array.isArray(characters) ? characters : []).map(c => {
    const rich = {
      id: c.id || "",
      name: c.name || "",
      race: c.race || "",
      variant: c.variant || "",
      faction: c.faction || "",
      className: c.className || ""
    };
    fields.forEach(field => {
      const value = c?.[field];
      if (value !== undefined && value !== null && String(value) !== "") rich[field] = value;
    });
    return rich;
  });
})();