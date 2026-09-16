from pathlib import Path
import json

VERSION = "0.7.13"

base = Path("app.js").read_text(encoding="utf-8")
marker = "/* Load additive compatibility/features when app.js is served directly (no bundling service worker). */"
if marker in base:
    base = base.split(marker, 1)[0].rstrip() + "\n"

patches = [
    "patch-v2.js", "patch-v2-1.js", "patch-v3.js", "patch-v3-1.js",
    "patch-v4.js", "patch-v4-1.js", "patch-v5.js", "patch-v6.js",
    "patch-v6-1.js", "patch-v6-2.js", "patch-v6-3.js", "patch-v6-4.js",
    "patch-v6-5.js", "patch-v6-6.js", "patch-v6-7.js", "patch-v6-8.js",
    "patch-v6-9.js", "patch-v7.js", "patch-v7-1.js", "patch-v7-2.js",
    "patch-v7-3.js", "patch-v7-4.js", "patch-v7-5.js", "patch-v7-6.js",
    "patch-v7-7.js", "patch-v7-8.js", "patch-v7-9.js", "patch-v7-10.js",
    "patch-v7-11.js", "patch-v7-12.js", "patch-v7-13.js"
]
bundle = base + "\n\n" + "\n\n".join(Path(p).read_text(encoding="utf-8") for p in patches)
Path("bundle.js").write_text(bundle, encoding="utf-8")
Path("version.json").write_text(json.dumps({"version": VERSION}, ensure_ascii=False), encoding="utf-8")

index = Path("index.html").read_text(encoding="utf-8")
boot_head = f'''
  <style id="appBootStyle">
    body.app-booting {{ overflow:hidden; background:#0b0f14; }}
    body.app-booting > .app-shell,
    body.app-booting > .bottom-nav,
    body.app-booting > dialog,
    body.app-booting > .toast {{ visibility:hidden !important; }}
    #appBoot {{ position:fixed; inset:0; z-index:99999; display:grid; place-items:center; background:#0b0f14; color:#e5e7eb; font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }}
    #appBoot[hidden] {{ display:none !important; }}
    .app-boot-card {{ display:grid; justify-items:center; gap:14px; padding:24px; text-align:center; }}
    .app-boot-mark {{ width:54px; height:54px; border-radius:14px; display:grid; place-items:center; background:#111827; border:1px solid rgba(255,255,255,.12); font-weight:800; font-size:24px; }}
    .app-boot-spinner {{ width:26px;height:26px;border:3px solid rgba(255,255,255,.14);border-top-color:#d4af37;border-radius:50%;animation:appBootSpin .8s linear infinite; }}
    .app-boot-status {{ color:#9ca3af;font-size:.82rem; }}
    @keyframes appBootSpin {{ to {{ transform:rotate(360deg); }} }}
  </style>
  <script>
  (() => {{
    const CURRENT = {json.dumps(VERSION)};
    let checking = false;
    let last = 0;
    const cleanUrl = () => {{
      try {{
        const u = new URL(location.href);
        let changed = false;
        ["v","_u","_update","cachefix"].forEach(k => {{ if (u.searchParams.has(k)) {{ u.searchParams.delete(k); changed = true; }} }});
        if (changed) history.replaceState(null,"",u.pathname + (u.search ? u.search : "") + u.hash);
      }} catch {{}}
    }};
    const check = async force => {{
      const now = Date.now();
      if (checking || (!force && now-last < 15000)) return;
      checking = true; last = now;
      try {{
        const u = new URL("version.json", location.href);
        u.searchParams.set("_", String(now));
        const r = await fetch(u.href, {{cache:"no-store"}});
        if (!r.ok) return;
        const info = await r.json();
        const remote = String(info && info.version || "").trim();
        if (!remote || remote === CURRENT) return;
        const status = document.getElementById("appBootStatus");
        if (status) status.textContent = "Update " + remote + " wird geladen …";
        document.body && document.body.classList.add("app-booting");
        try {{ const reg = await navigator.serviceWorker?.getRegistration?.(); if (reg) await reg.update(); }} catch {{}}
        const next = new URL(location.href);
        next.searchParams.delete("v");
        next.searchParams.set("_u", String(Date.now()));
        location.replace(next.href);
      }} catch {{}} finally {{ checking = false; }}
    }};
    window.__APP_VERSION__ = CURRENT;
    window.__checkAppVersion = check;
    cleanUrl();
    window.addEventListener("pageshow", e => check(!!e.persisted));
    window.addEventListener("focus", () => check(false));
    document.addEventListener("visibilitychange", () => {{ if (document.visibilityState === "visible") check(false); }});
    window.addEventListener("online", () => check(true));
    setTimeout(() => check(true), 100);
  }})();
  </script>
'''

index = index.replace("</head>", boot_head + "</head>")
index = index.replace(
    "<body>",
    '<body class="app-booting">\n  <div id="appBoot" role="status" aria-live="polite"><div class="app-boot-card"><div class="app-boot-mark">W</div><div class="app-boot-spinner"></div><div id="appBootStatus" class="app-boot-status">Charakterplaner wird geladen …</div></div></div>'
)
index = index.replace('<script src="app.js"></script>', f'<script src="bundle.js?v={VERSION}"></script>')
Path("index.html").write_text(index, encoding="utf-8")
