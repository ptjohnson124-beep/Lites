/* ==== BEGIN LEDGER EXTENSION 46 — SAVE AND LOAD, injected block, delete to the END marker to revert ==== */
/* KEEPING WHAT HAPPENS AT THE TABLE.
 *
 * Almost nothing in this file survives a reload. WAVELENGTHS, SKILL_TREES,
 * APOC_RESOURCES, APOC_CHARACTERS, the day counter and the game log are all
 * plain in-memory objects seeded from source every time the page opens; only
 * the guest book and a couple of small flags were ever written to storage. So
 * a session's worth of raised wavelengths, unlocked nodes, spent rations and
 * logged games is gone the moment the tab closes. Every edit button in the
 * Ledger has been writing to water.
 *
 * This adds two buttons on the menu: one writes the whole mutable state to a
 * JSON file, the other reads one back.
 *
 * Two rules it holds to.
 *
 * LOADING MERGES, IT NEVER REPLACES. Entries are matched by id and updated in
 * place; anything the save does not mention is left exactly as it is. So a
 * save taken before a session that added six new connections can still be
 * loaded afterwards without deleting them, which is the way this actually
 * gets used -- somebody restores last week's numbers onto this week's roster.
 *
 * PORTRAITS ARE NOT USER DATA AND ARE NOT SAVED. They are baked in by the
 * injector, they are 2.5 MB of base64, and including them would make every
 * save a third the size of the Ledger itself for no gain. The loader never
 * writes the field either, so loading an old save cannot blank a face that
 * has since been added.
 */
(function () {
 "use strict";
 if (window.__ledgerExt46) return;
 window.__ledgerExt46 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);

 const VERSION = 1;
 const SEP = " :: ";
 /* Every field on a connection that a person can change from inside the app.
    `chibi` is deliberately absent -- see the note above. */
 const CONN_FIELDS = ["name", "relation", "color", "level", "rungCount",
                      "rungNames", "rungs"];

 function snapshot() {
  const out = { format: "opus-ledger-save", version: VERSION,
                savedAt: new Date().toISOString(), wavelengths: {}, trees: {},
                apoc: {}, gameLog: null, storage: {} };

  const WL = G("WAVELENGTHS") || {};
  Object.keys(WL).forEach(who => {
   if (!Array.isArray(WL[who])) return;
   out.wavelengths[who] = WL[who].map(c => {
    const o = { id: c.id, name: c.name };
    CONN_FIELDS.forEach(k => { if (c[k] !== undefined) o[k] = c[k]; });
    return o;
   });
  });

  /* Trees travel as statuses keyed by branch and node NAME rather than by
     position, because the tree blocks push new nodes in and an index would
     start pointing at somebody else's perk the moment one did. */
  const ST = G("SKILL_TREES") || {};
  Object.keys(ST).forEach(who => {
   const t = ST[who];
   if (!t || !Array.isArray(t.branches)) return;
   const b = {};
   t.branches.forEach(br => {
    (br.nodes || []).forEach(n => {
     if (n && n.n) b[br.label + SEP + n.n] = n.status;
    });
   });
   out.trees[who] = b;
  });

  out.apoc = { resources: G("APOC_RESOURCES") || null,
               characters: G("APOC_CHARACTERS") || null,
               day: G("apocDay") };
  out.gameLog = G("GAME_LOG") || null;
  T(() => Object.keys(localStorage).forEach(k => { out.storage[k] = localStorage.getItem(k); }));
  return out;
 }

 function download(data) {
  const name = "opus_ledger_" + new Date().toISOString().slice(0, 10) + ".json";
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return name;
 }

 function restore(data) {
  if (!data || data.format !== "opus-ledger-save")
   throw new Error("that is not a Ledger save file");
  if (Number(data.version) > VERSION)
   throw new Error("that save was written by a newer Ledger (v" + data.version + ")");
  const tally = { conns: 0, missing: 0, nodes: 0, keys: 0 };

  const WL = G("WAVELENGTHS") || {};
  Object.keys(data.wavelengths || {}).forEach(who => {
   const live = WL[who];
   if (!Array.isArray(live)) return;
   (data.wavelengths[who] || []).forEach(saved => {
    const c = live.find(x => x && (x.id === saved.id ||
      (!saved.id && x.name === saved.name)));
    if (!c) { tally.missing++; return; }
    CONN_FIELDS.forEach(k => { if (saved[k] !== undefined) c[k] = saved[k]; });
    tally.conns++;
   });
  });

  const ST = G("SKILL_TREES") || {};
  Object.keys(data.trees || {}).forEach(who => {
   const t = ST[who];
   if (!t || !Array.isArray(t.branches)) return;
   const b = data.trees[who] || {};
   t.branches.forEach(br => {
    (br.nodes || []).forEach(n => {
     const k = br.label + SEP + n.n;
     if (b[k] !== undefined && n.status !== b[k]) { n.status = b[k]; tally.nodes++; }
    });
   });
  });

  /* Resources and rosters are merged key by key onto the live objects rather
     than swapped for the saved ones, so a field added to the Ledger since the
     save was written keeps its current value instead of becoming undefined. */
  const merge = (live, saved) => {
   if (!live || !saved) return;
   Object.keys(saved).forEach(k => {
    if (saved[k] && typeof saved[k] === "object" && live[k] && typeof live[k] === "object")
     merge(live[k], saved[k]);
    else live[k] = saved[k];
   });
  };
  T(() => merge(G("APOC_RESOURCES"), (data.apoc || {}).resources));
  T(() => merge(G("APOC_CHARACTERS"), (data.apoc || {}).characters));
  T(() => {
   const gl = G("GAME_LOG");
   if (Array.isArray(gl) && Array.isArray(data.gameLog)) {
    gl.length = 0;
    data.gameLog.forEach(x => gl.push(x));
   }
  });
  T(() => Object.keys(data.storage || {}).forEach(k => {
   localStorage.setItem(k, data.storage[k]); tally.keys++;
  }));

  /* Redraw whatever is on screen. */
  ["renderWLList", "renderApocResources", "renderApocCharacters",
   "renderGameLog"].forEach(f => T(() => G(f)()));
  T(() => {
   const scr = document.querySelector(".screen.active");
   if (scr && scr.id === "screen-skilltree" && typeof selectTreeChar === "function")
    selectTreeChar(G("activeTreeChar") || "cole");
  });
  return tally;
 }

 /* ---- the two buttons, on the menu ------------------------------------ */
 function mount() {
  const menu = $("screen-menu");
  if (!menu || $("lx46Bar")) return;
  const grid = menu.querySelector(".menu-cards");
  if (!grid) return;
  const bar = document.createElement("div");
  bar.className = "lx46-bar";
  bar.id = "lx46Bar";
  bar.innerHTML =
   '<span class="lbl">THIS FILE</span>' +
   '<button class="lx46-btn" id="lx46Save">Save to a file</button>' +
   '<button class="lx46-btn" id="lx46Load">Load a file</button>' +
   '<input type="file" id="lx46File" accept="application/json,.json" hidden>' +
   '<span class="note">Wavelengths, trees, supplies and the game log live in ' +
   'memory only — they are gone when the tab closes unless you save them. ' +
   'Loading merges onto what is here now; it never deletes anyone.</span>';
  grid.parentNode.insertBefore(bar, grid.nextSibling);

  $("lx46Save").onclick = () => T(() => {
   const nm = download(snapshot());
   T(() => G("showToast")("Saved as " + nm + "."));
  });
  $("lx46Load").onclick = () => $("lx46File").click();
  $("lx46File").onchange = (e) => {
   const f = e.target.files && e.target.files[0];
   if (!f) return;
   const r = new FileReader();
   r.onload = () => {
    let t;
    try { t = restore(JSON.parse(r.result)); }
    catch (err) { T(() => G("showToast")("Could not load that: " + err.message)); return; }
    T(() => G("showToast")("Loaded — " + t.conns + " connections, " + t.nodes +
      " tree nodes changed, " + t.keys + " stored keys" +
      (t.missing ? ", " + t.missing + " not found here" : "") + "."));
   };
   r.readAsText(f);
   e.target.value = "";
  };
 }

 const css = document.createElement("style");
 css.textContent = `
 .lx46-bar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;max-width:600px;
  margin:18px auto 0;padding:11px 13px;border:1px dashed var(--line);
  background:rgba(255,255,255,.03)}
 .lx46-bar .lbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.12em;
  color:var(--sage)}
 .lx46-bar .note{font-family:var(--font-mono);font-size:9px;line-height:1.45;
  color:var(--faint);flex:1 1 100%}
 .lx46-btn{font-family:var(--font-mono);font-size:10px;letter-spacing:.06em;
  padding:6px 11px;border:1px solid var(--line);background:#151220;color:var(--paper);
  cursor:pointer}
 .lx46-btn:hover{border-color:var(--sage);color:var(--sage)}
 `;
 document.head.appendChild(css);

 T(() => {
  const orig = window.openMenu;
  if (typeof orig === "function")
   window.openMenu = function () { const r = orig.apply(this, arguments); T(mount); return r; };
 });
 if (document.readyState === "loading") addEventListener("DOMContentLoaded", mount);
 mount();
 setTimeout(mount, 400);

 window.ledgerSave = { snapshot: snapshot, restore: restore };
})();
/* ================= END LEDGER EXTENSION 46 ========================= */
