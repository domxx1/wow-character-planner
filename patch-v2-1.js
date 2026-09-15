/* v0.2.1 JSON import hotfix. Keeps personal roster data outside the public repository. */
(() => {
  const input = document.querySelector('#jsonImport');
  if (!input) return;

  const raceMap = new Map([
    ['orc','Orcs'],['untoter','Untote'],['taure','Tauren'],['troll','Trolle'],
    ['blutelf','Blutelfen'],['goblin','Goblins'],['nachtelf','Nachtelfen'],['gnom','Gnome'],
    ['mensch','Menschen'],['zwerg','Zwerge'],['leerenelf','Leerenelfen'],['gilnear','Worgen'],
    ['hochberg-taure','Hochbergtauren'],['nachtgeborener','Nachtgeborene'],['maghar',"Orcs der Mag'har"],
    ["mag'har","Orcs der Mag'har"],['zandalari','Zandalaritrolle'],['dunkeleisen-zwerg','Dunkeleisenzwerge'],
    ['mecha-gnom','Mechagnome'],['lichtgeschmiedeter','Lichtgeschmiedete Draenei'],
    ['kultiraner','Kul Tiraner'],['pandare','Pandaren'],['irdener','Irdene']
  ]);

  function normalize(row) {
    row = row && typeof row === 'object' ? row : {};
    let race = String(row.race ?? row.volk ?? '').trim();
    let faction = String(row.faction ?? row.fraktion ?? '').trim();
    let variant = String(row.variant ?? row.variante ?? '').trim();
    const suffix = race.match(/^(.*) \((Horde|Allianz)\)$/);
    if (suffix) { race = suffix[1]; if (!faction) faction = suffix[2]; }
    const lower = race.toLocaleLowerCase('de');
    if (lower === "man'ari" || lower === 'man’ari') { race = 'Draenei'; variant ||= "Man'ari"; }
    else if (lower === 'astraler') { race = ''; variant ||= 'Astraler'; }
    else if (lower === 'untoter elf') { race = ''; variant ||= 'Untoter Elf'; }
    else race = raceMap.get(lower) || race;
    const profession = value => {
      const p = String(value ?? '').trim();
      return p.toLocaleLowerCase('de') === 'juwelier' ? 'Juwelierskunst' : p;
    };
    return {
      id: String(row.id ?? '').trim() || uid(),
      name: String(row.name ?? '').trim(),
      race,
      variant,
      faction: faction || 'Neutral',
      className: String(row.className ?? row.klasse ?? '').trim(),
      gender: String(row.gender ?? row.geschlecht ?? '').trim(),
      profession1: profession(row.profession1 ?? row['Beruf 1']),
      profession2: profession(row.profession2 ?? row['Beruf 2']),
      status: String(row.status ?? 'Aktiv').trim() || 'Aktiv',
      realm: String(row.realm ?? row.server ?? '').trim(),
      midnight: String(row.midnight ?? '').trim(),
      notes: String(row.notes ?? row.notizen ?? '').trim()
    };
  }

  input.addEventListener('change', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '').replace(/^\uFEFF/, '').trim();
        if (!text) throw new Error('Die gewählte Datei ist leer.');
        const parsed = JSON.parse(text);
        const raw = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.characters)
            ? parsed.characters
            : Array.isArray(parsed?.data?.characters)
              ? parsed.data.characters
              : null;
        if (!Array.isArray(raw)) throw new Error("Keine Charakterliste gefunden. Erwartet wird ein Array oder ein Objekt mit 'characters'.");

        const imported = raw.filter(row => row && typeof row === 'object').map(normalize)
          .filter(c => c.name || c.status === 'Geplant');
        if (raw.length && !imported.length) {
          throw new Error(`${raw.length} Datensätze wurden gelesen, aber keiner enthielt verwertbare Charakterdaten.`);
        }

        let added = 0, updated = 0;
        imported.forEach(c => {
          const key = `${(c.name || '').toLocaleLowerCase('de')}|${c.className}|${c.race}|${c.faction}`;
          let idx = c.id ? characters.findIndex(x => x.id === c.id) : -1;
          if (idx < 0) idx = characters.findIndex(x => `${(x.name || '').toLocaleLowerCase('de')}|${x.className}|${x.race}|${x.faction}` === key);
          if (idx >= 0) { characters[idx] = { ...characters[idx], ...c, id: characters[idx].id || c.id }; updated++; }
          else { characters.push(c); added++; }
        });

        saveCharacters();
        setView('characters');
        const msg = updated ? `${added} neu, ${updated} aktualisiert` : `${added} Charaktere importiert`;
        toast(msg);
      } catch (err) {
        alert(`JSON-Import fehlgeschlagen (${file.name}): ${err.message}`);
      } finally {
        input.value = '';
      }
    };
    reader.onerror = () => {
      alert(`JSON-Import fehlgeschlagen (${file.name}): Die Datei konnte nicht gelesen werden.`);
      input.value = '';
    };
    reader.readAsText(file, 'utf-8');
  }, true);

  const brandSub = document.querySelector('.brand-sub');
  if (brandSub) brandSub.textContent = 'WoW Retail · 12.1 · 0.2.1';
})();
