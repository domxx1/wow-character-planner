/* v0.7.31 — Preserve untouched character fields while editing. */
(() => {
  const VERSION = "0.7.31";
  const form = document.querySelector("#characterForm");
  const dialog = document.querySelector("#characterDialog");
  if (!form || !dialog) return;

  const trackedIds = [
    "charName","charRace","charFaction","charClass","charGender",
    "charProfession1","charProfession2","charStatus","charLevel",
    "charSpecialization","charRealm","charRegion","charRemix",
    "charAvatar","charVariant","charNotes","charMidnight"
  ];

  const propById = {
    charName:"name",
    charFaction:"faction",
    charClass:"className",
    charGender:"gender",
    charProfession1:"profession1",
    charProfession2:"profession2",
    charStatus:"status",
    charLevel:"level",
    charSpecialization:"specialization",
    charRealm:"realm",
    charRegion:"region",
    charRemix:"remixEvent",
    charAvatar:"avatarUrl",
    charVariant:"variant",
    charNotes:"notes",
    charMidnight:"midnight"
  };

  let editingId = "";
  let baseline = new Map();
  let dirty = new Set();
  let restoring = false;
  let restoreQueued = false;

  function raceValueForRecord(record) {
    if (!record) return "";
    const race = RACES.find(r =>
      String(r?.name || "").localeCompare(String(record.race || ""),"de",{sensitivity:"base"}) === 0 &&
      (!record.faction || r?.faction === record.faction)
    ) || RACES.find(r => String(r?.name || "").localeCompare(String(record.race || ""),"de",{sensitivity:"base"}) === 0);
    return race ? (race.key || `${race.name}|${race.faction}`) : (document.querySelector("#charRace")?.value || "");
  }

  function ensureSelectValue(select, value) {
    const wanted = String(value ?? "");
    if ([...select.options].some(option => option.value === wanted)) {
      select.value = wanted;
      return;
    }
    const option = document.createElement("option");
    option.value = wanted;
    option.textContent = wanted;
    option.dataset.v731Preserved = "1";
    select.add(option);
    select.value = wanted;
  }

  function setControlValue(id, value) {
    const el = document.querySelector(`#${id}`);
    if (!el) return;
    const wanted = String(value ?? "");
    if (el instanceof HTMLSelectElement) ensureSelectValue(el,wanted);
    else el.value = wanted;
  }

  function buildBaseline(record) {
    const next = new Map();
    trackedIds.forEach(id => {
      const el = document.querySelector(`#${id}`);
      if (!el) return;
      if (id === "charRace") {
        next.set(id,raceValueForRecord(record));
        return;
      }
      const prop = propById[id];
      if (prop && record && record[prop] !== undefined && record[prop] !== null) {
        next.set(id,String(record[prop]));
      } else {
        next.set(id,String(el.value ?? ""));
      }
    });
    return next;
  }

  function restoreUntouched() {
    if (!editingId || !dialog.open || restoring) return;
    restoring = true;
    try {
      baseline.forEach((value,id) => {
        if (dirty.has(id)) return;
        /* A deliberately changed race may legitimately update its faction. */
        if (id === "charFaction" && dirty.has("charRace")) return;
        const el = document.querySelector(`#${id}`);
        if (!el || String(el.value ?? "") === String(value ?? "")) return;
        setControlValue(id,value);
      });
    } finally {
      restoring = false;
    }
  }

  function queueRestore() {
    if (restoreQueued || !editingId) return;
    restoreQueued = true;
    queueMicrotask(() => {
      restoreQueued = false;
      restoreUntouched();
    });
  }

  const previousOpenCharacter = openCharacter;
  openCharacter = function(id=null,preset={}) {
    const record = id ? characters.find(c => String(c.id) === String(id)) : null;
    const result = previousOpenCharacter.apply(this,arguments);

    editingId = record ? String(record.id) : "";
    dirty = new Set();
    baseline = record ? buildBaseline(record) : new Map();

    if (record) {
      /* Older race/class filtering can silently replace the selected class with
         the first allowed class (usually Krieger). Restore the stored value now,
         and again after the older zero-delay refresh handlers have run. */
      restoreUntouched();
      setTimeout(() => {
        restoreUntouched();
        baseline = buildBaseline(record);
      },0);
      setTimeout(restoreUntouched,25);
    }
    return result;
  };

  function markDirty(e) {
    const id = e.target?.id;
    if (!editingId || restoring || !trackedIds.includes(id)) return;
    if (e.isTrusted === false) return;
    dirty.add(id);

    if (id === "charRace") {
      /* v0.7.14 rebuilds the class dropdown after a race change. That must not
         count as a class edit and must never overwrite the stored class. */
      setTimeout(restoreUntouched,0);
      setTimeout(restoreUntouched,25);
    }
  }

  form.addEventListener("input",markDirty,true);
  form.addEventListener("change",markDirty,true);

  /* Rebuilding select options is exactly what used to reset Paladin etc. to the
     first option. Catch those DOM changes and restore fields the user did not edit. */
  const observer = new MutationObserver(queueRestore);
  observer.observe(form,{subtree:true,childList:true});

  /* Mouse/touch saves get one final consistency pass before the older handlers
     read the form. Retail form submission gets the same protection. */
  window.addEventListener("pointerdown",e => {
    if (e.target?.closest?.("#saveCharacter")) restoreUntouched();
  },true);
  form.addEventListener("submit",restoreUntouched,true);

  dialog.addEventListener("close",() => {
    editingId = "";
    baseline.clear();
    dirty.clear();
  });

  const brand = document.querySelector(".brand-sub");
  if (brand) {
    const forever = typeof window.wowCharacterPlannerGameMode === "function" && window.wowCharacterPlannerGameMode() === "forever";
    brand.textContent = forever ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
  }
})();
