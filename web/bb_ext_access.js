/* ==== BEGIN BLACKBOX ACCESS — injected block, delete to the END marker to revert ==== */
/* FIVE PIECES OF FRICTION, EACH REMOVED WHERE IT ACTUALLY BITES.
 *
 * None of this changes a rule. Every one of these reaches for something the
 * tracker already does and puts it within one action instead of five.
 *
 * ---------------------------------------------------------------------------
 * 1. THE FINDER — one search box over everything a unit can do
 *
 * The Action dropdown holds about ninety entries across nine optgroups, the
 * spec list is per-character and can run past forty, and the retaliation grid
 * is seventy-three tiles of prose. Three separate haystacks, no search in any
 * of them, and the answer to "what can she actually do right now" was to
 * scroll all three.
 *
 * The finder searches all three at once, by label AND by description, and each
 * row says whether the selected unit can actually take it -- green, amber for
 * a stat shortfall, red with the reason. Clicking a row selects it: an action
 * lands in the Action dropdown, a spec selects MF Spec and then that spec, a
 * retaliation clicks its own tile in whichever grid is live. Press / to jump
 * to it from anywhere.
 *
 * 2. A SEARCH BAR ON THE RETALIATION GRIDS
 *
 * Both of them -- the inline one inside the exchange, and the preemptive one
 * below. Filters the tiles in place, matching label and description. This is
 * the same filter as the finder's, sitting where the grid is, because during
 * a live exchange nobody wants to look up the page.
 *
 * 3. THE NEMESIS RECOMMENDS ON HOVER, AND ASKS IF IT MAY REACT ON ITS OWN
 *
 * The nemesis panel already ranks every action and every guard and shows the
 * top of each. That ranking is now on the options themselves: hover any action
 * or retaliation while a watching nemesis is the one acting or defending and
 * it says where that choice sits in its own ranking and why. Its top three are
 * starred.
 *
 * AUTO-REACT is a question, asked once per nemesis, the first time an attack
 * is pointed at it with Target Retaliates checked: may it pick its own guard?
 * Say yes and every retaliation it makes is chosen off its own read of the
 * party -- the same scoring the panel shows, so it is never a black box, and
 * it is logged with its reason each time. Say no and nothing changes. Either
 * answer is remembered and can be flipped from the banner.
 *
 * 4. A DEPLOYED CHARACTER IS OFFERED THEIR SAVED BUILD -- ALL OF THEM
 *
 * The file already asked, but only for the FIRST unit needing it per redraw,
 * only on an exact name match, and only ever offering the newest preset with
 * no way to reach an older one. Deploy four characters at once and three were
 * skipped until something else happened to redraw the page.
 *
 * Now every newly-fielded unit is queued and offered in turn; the match also
 * catches "Kevanna #2" out of a squad split and a body renamed by possession;
 * and when a character has several saved builds, all of them are offered.
 *
 * 5. COLE'S STORY-END BUILD, SAVED
 *
 * Seeded as a preset the first time this file is opened, so it is on the list
 * next to any build made by hand: his roster loadout plus the STORY-END
 * MESH-RENDER shotgun and the STORY-END VANGUARD PLATE already worn, with the
 * plate's real +6 DEF and +45 max HP applied exactly as the equip spec applies
 * them, and its equipped flag set so taking it off in play reverts correctly.
 * It is seeded ONCE, by id: edit it, rename it, delete it, and it stays gone.
 *
 * 6. FIELD SETUP — deploy, split and give them their own bar in one form
 *
 * The old sequence to put six of something on the table as six separate bodies
 * with their own Integrity was: deploy, type the count, press SPLIT, then open
 * each of the six and pick a pool out of a dropdown, then set the pool's
 * ceiling. Six units, nine or ten interactions, every single fight.
 *
 * One form now: what, how many, split or not, own bar or shared. Plus two
 * buttons for a field that is already set up wrong -- SPLIT EVERY SQUAD, and
 * ONE BAR PER NAME, which gives every distinct hostile name its own Integrity
 * pool in a single press.
 */
(function () {
 "use strict";
 if (window.__bbAccess) return;
 window.__bbAccess = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
 const eng = () => T(() => G("S").eng, null);
 const log = (m) => T(() => G("addLog")("system", m));
 const gate = () => window.blackboxGate || null;

 /* =====================================================================
    SECTION 1 — THE FINDER
    ===================================================================== */

 let tab = "all", query = "", onlyCan = false;

 function actorUnit() {
  const e = eng(); if (!e) return null;
  return e.units.find(u => u.id === ($("resActor") || {}).value) || null;
 }
 /* Whoever the live retaliation grid is actually about: the attack's target
    while the inline box is open, otherwise the preemptive Retaliator. Getting
    this wrong would rank a guard against the wrong unit's read. */
 function defenderUnit() {
  const e = eng(); if (!e) return null;
  const inlineOpen = $("inlineRetalBox") && $("inlineRetalBox").style.display !== "none";
  const id = inlineOpen ? ($("resTarget") || {}).value : ($("retActor") || {}).value;
  return e.units.find(u => u.id === id) || null;
 }
 function inlineOpen() {
  const b = $("inlineRetalBox");
  return !!(b && b.style.display !== "none");
 }

 function verdict(u, act) {
  const g = gate();
  if (!g || !u) return { level: "ok", why: "" };
  return T(() => g.check(u, act), { level: "ok", why: "" });
 }

 /* ---- the nemesis's own ranking, read through its public surface ---- */
 const nem = () => window.nemesis || null;
 function watching(u) {
  const n = nem(); if (!n || !u || !u.name) return null;
  const d = T(() => n.dossier(u.name), null);
  return (d && d.watching) ? d : null;
 }
 function rankMap(u, which) {
  const n = nem(), d = watching(u);
  if (!n || !d) return null;
  const list = T(() => (which === "off" ? n.offence(u.name) : n.defence(u.name)), null);
  if (!list || !list.length) return null;
  const m = Object.create(null);
  list.forEach((r, i) => { m[r.id] = { rank: i + 1, row: r }; });
  return { map: m, level: d.level, name: d.name || u.name };
 }
 function nemNote(rk, id, which) {
  if (!rk || !rk.map[id]) return "";
  const e = rk.map[id], r = e.row;
  const head = "NEMESIS L" + rk.level + " ranks this #" + e.rank + " of the " +
   (which === "off" ? "attacks" : "guards") + " it can see. ";
  if (which === "off")
   return head + "It expects about " + Math.round((r.through || 0) * 100) +
    "% of this to get through what they usually guard with" +
    (r.risk > 0.05 ? ", against a real risk of being struck back." : ".");
  return head + "It expects this to stop about " + Math.round((r.stopped || 0) * 100) +
   "% of what they usually throw" + (r.back > 0.05 ? ", and to hurt them on the way." : ".");
 }

 /* ---- the three haystacks, read live so nothing here goes stale ---- */
 function actionRows() {
  const sel = $("resAction"); if (!sel) return [];
  const u = actorUnit(), rk = rankMap(u, "off");
  const rows = [];
  Array.from(sel.querySelectorAll("option")).forEach(o => {
   const grp = o.parentNode && o.parentNode.tagName === "OPTGROUP"
     ? o.parentNode.label.replace(/[─\s]+/g, " ").trim() : "";
   const v = verdict(u, o.value);
   rows.push({
    kind: "act", key: o.value, label: o.textContent, sub: grp,
    hay: (o.textContent + " " + grp).toLowerCase(),
    level: v.level, why: v.why,
    star: rk && rk.map[o.value] && rk.map[o.value].rank <= 3 ? rk.map[o.value].rank : 0,
    note: nemNote(rk, o.value, "off")
   });
  });
  return rows;
 }
 function specRows() {
  const u = actorUnit(); if (!u) return [];
  const f = G("specsFor");
  const list = T(() => f ? f(u) : [], []) || [];
  const TYPE = T(() => G("SPEC_TYPE_LABEL"), null) || {};
  return list.map((s, i) => ({
   kind: "spec", key: String(i), label: (s.icon ? s.icon + " " : "") + s.n,
   sub: "MF −" + (s.mf || 0) + (s.type && s.type !== "attack" ? " · " + (TYPE[s.type] || s.type) : "") + (s.bypass ? " · bypass" : ""),
   hay: ((s.n || "") + " " + (s.d || "") + " " + (s.type || "")).toLowerCase(),
   level: (s.mf || 0) > (u.mf ?? 90) ? "strain" : "ok",
   why: (s.mf || 0) > (u.mf ?? 90) ? u.name + " has " + (u.mf ?? 90) + " MF against a " + s.mf + " cost." : "",
   desc: s.d || "", star: 0, note: ""
  }));
 }
 function retalRows() {
  const d = defenderUnit(); if (!d) return [];
  const f = G("visibleRetalTypes");
  const list = T(() => f ? f(d) : [], []) || [];
  const rk = rankMap(d, "def");
  return list.map(t => ({
   kind: "ret", key: t.id, label: t.label, sub: "for " + d.name,
   hay: ((t.label || "") + " " + (t.desc || "")).toLowerCase(),
   level: "ok", why: "", desc: t.desc || "",
   star: rk && rk.map[t.id] && rk.map[t.id].rank <= 3 ? rk.map[t.id].rank : 0,
   note: nemNote(rk, t.id, "def")
  }));
 }

 function matches(row, toks) {
  for (let i = 0; i < toks.length; i++) if (row.hay.indexOf(toks[i]) < 0) return false;
  return true;
 }

 function buildFinder() {
  const card = document.querySelector(".card.resolve");
  if (!card) return null;
  let box = $("bbFind");
  if (box) return box;
  box = document.createElement("div");
  box.id = "bbFind";
  box.className = "bbfind";
  box.innerHTML =
   '<div class="bbfind-bar">' +
    '<input id="bbFindIn" class="bbfind-in" placeholder="find an action, spec or retaliation…   ( / )" autocomplete="off">' +
    '<div class="bbfind-tabs">' +
     ['all|ALL', 'act|ACTIONS', 'spec|SPECS', 'ret|RETALIATIONS'].map(s => {
      const p = s.split("|");
      return '<button class="bbfind-tab' + (p[0] === "all" ? " on" : "") + '" data-ftab="' + p[0] + '">' + p[1] + '</button>';
     }).join("") +
    '</div>' +
    '<label class="bbfind-only"><input type="checkbox" id="bbFindOnly"> only what they can do</label>' +
   '</div>' +
   '<div class="bbfind-list" id="bbFindList"></div>';
  const anchor = $("quickActBar");
  if (anchor && anchor.parentNode === card) card.insertBefore(box, anchor);
  else card.insertBefore(box, card.firstChild);

  $("bbFindIn").addEventListener("input", e => { query = e.target.value; paintFinder(); });
  $("bbFindOnly").addEventListener("change", e => { onlyCan = e.target.checked; paintFinder(); });
  box.querySelectorAll("[data-ftab]").forEach(b => b.onclick = () => {
   tab = b.dataset.ftab;
   box.querySelectorAll("[data-ftab]").forEach(x => x.classList.toggle("on", x.dataset.ftab === tab));
   paintFinder();
  });
  return box;
 }

 function paintFinder() {
  if (!buildFinder()) return;
  const host = $("bbFindList"); if (!host) return;
  const toks = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let rows = [];
  if (tab === "all" || tab === "act") rows = rows.concat(actionRows());
  if (tab === "all" || tab === "spec") rows = rows.concat(specRows());
  if (tab === "all" || tab === "ret") rows = rows.concat(retalRows());
  rows = rows.filter(r => matches(r, toks));
  if (onlyCan) rows = rows.filter(r => r.level !== "deny");

  if (!rows.length) {
   host.innerHTML = '<div class="bbfind-none">nothing matches “' + esc(query) + '”' +
     (onlyCan ? ' among what this unit can actually do' : '') + '.</div>';
   return;
  }
  const KIND = { act: "ACT", spec: "SPEC", ret: "GUARD" };
  host.innerHTML = rows.slice(0, 400).map(r => {
   const title = [r.why, r.note, r.desc].filter(Boolean).join("\n\n");
   return '<div class="bbfind-row ' + r.level + '" data-fk="' + r.kind + '" data-fv="' + esc(r.key) + '"' +
    (title ? ' title="' + esc(title) + '"' : "") + '>' +
    '<span class="kd ' + r.kind + '">' + KIND[r.kind] + '</span>' +
    '<span class="lb">' + (r.star ? '<i class="st" title="the nemesis ranks this #' + r.star + '">★</i>' : "") + esc(r.label) + '</span>' +
    '<span class="wy">' +
      (r.sub ? '<span class="sb">' + esc(r.sub) + '</span>' : "") +
      (r.level === "deny" ? (r.sub ? " · " : "") + "can’t — " + esc(shortWhy(r.why))
        : r.level === "strain" ? (r.sub ? " · " : "") + "strained — " + esc(shortWhy(r.why)) : "") +
    '</span>' +
    '</div>';
  }).join("");
  host.querySelectorAll("[data-fk]").forEach(el => el.onclick = () => pick(el.dataset.fk, el.dataset.fv));
 }
 function shortWhy(w) {
  if (!w) return "";
  const i = w.indexOf(": ");
  const s = i >= 0 ? w.slice(i + 2) : w;
  return s.length > 78 ? s.slice(0, 76) + "…" : s;
 }

 function pick(kind, key) {
  if (kind === "act") {
   const sel = $("resAction"); if (!sel) return;
   sel.value = key;
   sel.dispatchEvent(new Event("change"));
   T(() => G("renderResExtra")());
   T(() => G("updChance")());
   T(() => G("renderQuickBar")());
   paintFinder();
   return;
  }
  if (kind === "spec") {
   const sel = $("resAction"); if (!sel) return;
   sel.value = "spec";
   sel.dispatchEvent(new Event("change"));
   T(() => G("renderResExtra")());
   const sp = $("specSel");
   if (sp) { sp.value = key; sp.dispatchEvent(new Event("change")); }
   T(() => G("updChance")());
   T(() => G("renderQuickBar")());
   paintFinder();
   return;
  }
  if (kind === "ret") {
   /* Click the tracker's own tile rather than writing its state variable —
      the tile's handler is where the chance readout gets refreshed. */
   const gridId = inlineOpen() ? "inlineRetalTypeGrid" : "retalTypeGrid";
   const attr = inlineOpen() ? "data-irt" : "data-rt";
   const tile = document.querySelector("#" + gridId + " [" + attr + '="' + key + '"]');
   if (tile) { tile.click(); T(() => tile.scrollIntoView({ block: "nearest" })); }
   else T(() => G("toast")("That guard isn't offered to this unit right now."));
   paintFinder();
  }
 }

 document.addEventListener("keydown", (ev) => {
  if (ev.key !== "/" || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const t = ev.target, tag = t && t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
  if (document.querySelector(".bbmodal.show") ||
      (document.getElementById("confirmBg") || { classList: { contains: () => false } }).classList.contains("show")) return;
  const inp = $("bbFindIn");
  if (!inp) return;
  ev.preventDefault();
  inp.focus(); inp.select();
  T(() => inp.scrollIntoView({ block: "center", behavior: "smooth" }));
 });

 /* =====================================================================
    SECTION 2 — A SEARCH BAR ON EACH RETALIATION GRID
    ===================================================================== */

 const RFILTER = { retalTypeGrid: "", inlineRetalTypeGrid: "" };

 function attachRetalSearch(gridId) {
  const grid = $(gridId); if (!grid) return;
  const id = "bbRetSearch_" + gridId;
  if ($(id)) return;
  const wrap = document.createElement("div");
  wrap.className = "bbret-search";
  wrap.innerHTML = '<input id="' + id + '" placeholder="search retaliations — parry, block, ranged, engine…" autocomplete="off">' +
    '<span class="ct" id="' + id + '_ct"></span>';
  grid.parentNode.insertBefore(wrap, grid);
  $(id).addEventListener("input", e => { RFILTER[gridId] = e.target.value; applyRetalFilter(gridId); });
 }

 function applyRetalFilter(gridId) {
  const grid = $(gridId); if (!grid) return;
  const q = (RFILTER[gridId] || "").trim().toLowerCase();
  const toks = q.split(/\s+/).filter(Boolean);
  const d = defenderUnit();
  const rk = rankMap(d, "def");
  const attr = gridId === "inlineRetalTypeGrid" ? "irt" : "rt";
  let shown = 0, total = 0;
  Array.from(grid.children).forEach(el => {
   total++;
   const hay = (el.textContent || "").toLowerCase();
   const ok = toks.every(t => hay.indexOf(t) >= 0);
   el.style.display = ok ? "" : "none";
   if (ok) shown++;
   /* The nemesis's read, on the tile itself, where the choice is made. */
   const id2 = el.getAttribute("data-" + attr);
   if (rk && id2) {
    const note = nemNote(rk, id2, "def");
    if (note) el.setAttribute("title", note);
    const r = rk.map[id2];
    el.classList.toggle("bbret-star", !!(r && r.rank <= 3));
   } else {
    el.classList.remove("bbret-star");
   }
  });
  const ct = $("bbRetSearch_" + gridId + "_ct");
  if (ct) ct.textContent = q ? shown + " of " + total : "";
 }

 function refreshRetalSearch() {
  ["retalTypeGrid", "inlineRetalTypeGrid"].forEach(id => {
   attachRetalSearch(id);
   const inp = $("bbRetSearch_" + id);
   if (inp && inp.value !== RFILTER[id]) inp.value = RFILTER[id];
   applyRetalFilter(id);
  });
 }
 ["renderRetalTypeGrid", "renderInlineRetalGrid"].forEach(fn => T(() => {
  const orig = window[fn];
  if (typeof orig !== "function") return;
  window[fn] = function () { const r = orig.apply(this, arguments); T(refreshRetalSearch); return r; };
 }));

 /* =====================================================================
    SECTION 3 — THE NEMESIS ASKS WHETHER IT MAY REACT ON ITS OWN
    ===================================================================== */

 const AR_KEY = "bb_autoreact_v1";
 let AR = T(() => JSON.parse(localStorage.getItem(AR_KEY) || "{}"), {}) || {};
 const arSave = () => T(() => localStorage.setItem(AR_KEY, JSON.stringify(AR)));
 const asked = new Set();     // one modal per nemesis per session, no more

 function nkey(n) { return String(n || "").toLowerCase().trim(); }

 function autoReactBanner() {
  const box = $("inlineRetalBox");
  if (!box) return;
  const old = $("bbAutoReact");
  const d = inlineOpen() ? defenderUnit() : null;
  const dos = d ? watching(d) : null;
  if (!dos) { if (old) old.remove(); return; }
  const k = nkey(d.name);
  const on = AR[k] === true;
  const html =
   '<span class="dot"></span><b>' + esc(d.name) + '</b> is a watching nemesis (L' + dos.level + '). ' +
   (AR[k] === undefined
     ? 'Should it choose its own guard?'
     : (on ? 'It picks its own guard — the choice and the reasoning are logged each time.'
           : 'It is not reacting on its own; pick its guard below.')) +
   '<span class="bbar-btns">' +
    '<button class="btn tiny' + (on ? " gd" : "") + '" data-arset="1">' + (on ? "AUTO-REACT ON" : "let it react") + '</button>' +
    '<button class="btn tiny' + (AR[k] === false ? " cr" : "") + '" data-arset="0">I\'ll pick</button>' +
   '</span>';
  let b = old;
  if (!b) {
   b = document.createElement("div");
   b.id = "bbAutoReact";
   b.className = "bbar";
   box.insertBefore(b, box.firstChild);
  }
  b.innerHTML = html;
  b.querySelectorAll("[data-arset]").forEach(el => el.onclick = () => {
   AR[k] = el.dataset.arset === "1"; arSave();
   log("[NEMESIS] " + d.name + (AR[k] ? " will choose its own reactions from now on." : " will not react on its own — its guard is picked by hand."));
   autoReactBanner();
  });

  /* The prompt itself, once per nemesis per session, so the question is
     actually ASKED rather than only sitting on the page waiting to be seen. */
  const cbg = $("confirmBg");
  const confirmBusy = !!(cbg && cbg.classList.contains("show"));
  if (AR[k] === undefined && !asked.has(k) && !confirmBusy) {
   asked.add(k);
   T(() => G("openConfirm")(
    "Auto-react — " + d.name,
    d.name + " is a watching nemesis at level " + dos.level + ". Let it choose its own retaliation each time it is attacked? " +
    "It will pick using the same read the nemesis panel shows, and every choice is logged with its reasoning. You can change this at any time from the banner.",
    () => { AR[k] = true; arSave(); log("[NEMESIS] " + d.name + " will choose its own reactions."); autoReactBanner(); }
   ));
   /* openConfirm has no cancel callback, so a dismissed prompt simply leaves
      the question open on the banner rather than silently answering it. */
  }
 }

 /* Chooses the guard the nemesis itself rates highest AMONG THE TILES ACTUALLY
    OFFERED — its ranking covers every retaliation the tracker knows, and
    visibleRetalTypes has already thrown out the ones this unit can't reach. */
 function autoPickGuard() {
  if (!inlineOpen()) return;
  const chk = $("targetRetaliatesChk");
  if (!chk || !chk.checked) return;
  const d = defenderUnit(); if (!d) return;
  const dos = watching(d); if (!dos) return;
  if (AR[nkey(d.name)] !== true) return;
  const n = nem(); if (!n) return;
  const ranked = T(() => n.defence(d.name), null);
  if (!ranked || !ranked.length) return;
  const grid = $("inlineRetalTypeGrid"); if (!grid) return;
  for (let i = 0; i < ranked.length; i++) {
   const tile = grid.querySelector('[data-irt="' + ranked[i].id + '"]');
   if (!tile) continue;
   if (!tile.classList.contains("sel")) {
    tile.click();
    const r = ranked[i];
    log("[NEMESIS] " + d.name + " chooses " + r.label.replace(/^\[[^\]]*\]\s*/, "") +
        " on its own — it expects that to stop about " + Math.round((r.stopped || 0) * 100) +
        "% of what this party throws" +
        (r.back > 0.05 ? ", and it is picking this one for what comes back as much as for what it stops" : "") + ".");
   }
   return;
  }
 }

 T(() => {
  const orig = window.resolve;
  if (typeof orig !== "function") return;
  window.resolve = function () { T(autoPickGuard); return orig.apply(this, arguments); };
 });

 /* =====================================================================
    SECTION 4 — EVERY NEW ARRIVAL IS OFFERED THEIR SAVED BUILD
    ===================================================================== */

 /* The equip spec sets this and reads it back to know whether to revert, so a
    build saved with the plate on has to carry it or the plate can never come
    off again. SETUP_FIELDS is the tracker's own list; adding to it means the
    file's own Save/Load Setup buttons carry the flag too. */
 T(() => {
  const F = G("SETUP_FIELDS");
  if (F && F.indexOf("storyEndVanguardEquipped") < 0) F.push("storyEndVanguardEquipped");
 });

 const loadPresets = () => T(() => G("loadPresets")(), []) || [];
 const savePresets = (l) => T(() => G("savePresets")(l));

 /* Exactly the match Load Setup makes by hand, plus the two cases it misses:
    a squad split ("Kevanna #2") and a body renamed by possession, both of
    which keep the character's name as a prefix. */
 function presetsFor(u) {
  if (!u || !u.name) return [];
  const n = String(u.name);
  return loadPresets().filter(p => p && p.baseName &&
    (n === p.baseName || n.indexOf(p.baseName + " ") === 0 || n.indexOf(p.baseName + " #") === 0));
 }

 const queue = [];
 let asking = false;

 function applyPreset(u, p) {
  const F = G("SETUP_FIELDS") || [];
  F.forEach(f => {
   if (p.data[f] === null || p.data[f] === undefined) return;
   T(() => { u[f] = JSON.parse(JSON.stringify(p.data[f])); });
  });
  T(() => G("save")());
  T(() => G("render")());
  T(() => G("toast")('Loaded "' + p.name + '" onto ' + u.name + "."));
  log("[SETUP] " + u.name + " deployed with the saved build \"" + p.name + "\".");
 }

 function drain() {
  if (asking) return;
  const job = queue.shift();
  if (!job) return;
  const e = eng();
  const u = e && e.units.find(x => x.id === job.id);
  if (!u) { drain(); return; }
  const ps = presetsFor(u);
  if (!ps.length) { drain(); return; }
  asking = true;
  openSetupOffer(u, ps, () => { asking = false; drain(); });
 }

 function openSetupOffer(u, ps, done) {
  let bg = $("bbSetupBg");
  if (!bg) {
   bg = document.createElement("div");
   bg.id = "bbSetupBg";
   bg.className = "bbmodal";
   bg.innerHTML = '<div class="bbmodal-box"><h3 id="bbSetupTitle"></h3>' +
     '<div class="bbmodal-sub" id="bbSetupSub"></div>' +
     '<div id="bbSetupList"></div>' +
     '<div class="bbmodal-btns"><button class="btn tiny" id="bbSetupSkip">Deploy them as they are</button></div></div>';
   document.body.appendChild(bg);
  }
  $("bbSetupTitle").textContent = "Saved build — " + u.name;
  $("bbSetupSub").textContent = ps.length === 1
   ? "There is a saved build for " + u.name + ". Load it onto the unit just fielded? Stats, gear and grafts are applied; name, id and side are left alone."
   : "There are " + ps.length + " saved builds for " + u.name + ". Load one onto the unit just fielded?";
  $("bbSetupList").innerHTML = ps.slice().reverse().map((p, i) =>
    '<button class="bbsetup-opt" data-bbp="' + (ps.length - 1 - i) + '"><b>' + esc(p.name) + '</b>' +
    '<span>' + esc(summarise(p)) + '</span></button>').join("");
  $("bbSetupList").querySelectorAll("[data-bbp]").forEach(b => b.onclick = () => {
   applyPreset(u, ps[+b.dataset.bbp]); close();
  });
  $("bbSetupSkip").onclick = close;
  bg.classList.add("show");
  function close() { bg.classList.remove("show"); T(done); }
 }
 function summarise(p) {
  const d = p.data || {};
  const bits = [];
  if (d.hpMax) bits.push(d.hpMax + " HP");
  ["pow", "prec", "soul"].forEach(k => { if (d[k] != null) bits.push(k.toUpperCase() + " " + d[k]); });
  if (d.equipped && d.equipped.length) bits.push(d.equipped.length + " pieces of gear");
  if (d.grafts && d.grafts.length) bits.push(d.grafts.length + " grafts");
  return bits.join(" · ");
 }

 /* Takes over the file's own one-at-a-time version. render() calls this by
    name, so replacing the global replaces what render() reaches. */
 window.checkForSavedSetup = function () {
  const e = eng(); if (!e || !e.units) return;
  e.units.forEach(u => {
   if (u.setupPromptShown || !u.name) return;
   u.setupPromptShown = true;
   if (presetsFor(u).length) queue.push({ id: u.id });
  });
  drain();
 };

 /* ---- SECTION 5 — Cole's STORY-END build, seeded once ---- */

 const COLE_PRESET_ID = "bb-cole-storyend";
 const PLATE = {
  name: "STORY-END — VANGUARD PLATE — captured, re-keyed Anti-Rover issue",
  cat: "armor", weaponType: "melee", damageType: "blunt", hp: 90, hpMax: 90, dmgMult: 1
 };
 const SHOTGUN = {
  name: "STORY-END MESH-RENDER — biofluid corrosive shotgun",
  cat: "weapon", weaponType: "ranged", damageType: "corruption", hp: 75, hpMax: 75, dmgMult: 1
 };
 function seedColePreset() {
  const list = loadPresets();
  /* Seeded by ID, once, ever. Renaming or deleting it keeps it deleted —
     this must never grow back over an edit somebody made on purpose. */
  if (list.some(p => p && p.id === COLE_PRESET_ID)) return;
  const seeded = T(() => JSON.parse(localStorage.getItem("bb_cole_seeded") || "0"), 0);
  if (seeded) return;
  const R = G("ROSTER");
  const cole = R && R.find(r => r.name === "Cole Fairwind Vellusan");
  if (!cole) return;
  const F = G("SETUP_FIELDS") || [];
  const data = {};
  F.forEach(f => { T(() => { data[f] = (cole[f] === undefined) ? null : JSON.parse(JSON.stringify(cole[f])); }); });

  data.equipped = (data.equipped || []).slice();
  if (!data.equipped.some(it => it.name && it.name.indexOf("STORY-END MESH-RENDER") >= 0))
   data.equipped.push(JSON.parse(JSON.stringify(SHOTGUN)));
  if (!data.equipped.some(it => it.name && it.name.indexOf("STORY-END — VANGUARD PLATE") >= 0)) {
   data.equipped.push(JSON.parse(JSON.stringify(PLATE)));
   /* The same numbers the [EQUIP] spec applies, so the toggle reverts cleanly. */
   data.def = (data.def == null ? 5 : data.def) + 6;
   data.hpMax = (data.hpMax || 240) + 45;
   data.hp = (data.hp || data.hpMax);
  }
  data.storyEndVanguardEquipped = true;

  list.push({ id: COLE_PRESET_ID, name: "COLE — STORY-END (plate + mesh-render)",
              baseName: "Cole Fairwind Vellusan", data: data });
  savePresets(list);
  T(() => localStorage.setItem("bb_cole_seeded", "1"));
  log("[SETUP] Saved a build for Cole — \"COLE — STORY-END (plate + mesh-render)\": his roster loadout with the " +
      "STORY-END MESH-RENDER shotgun and the STORY-END VANGUARD PLATE worn (+6 DEF, +45 max HP). " +
      "It is on the Load Setup list and is offered whenever he is fielded.");
 }
 T(seedColePreset);

 /* =====================================================================
    SECTION 6 — FIELD SETUP IN ONE FORM
    ===================================================================== */

 function tplChoices() {
  const out = [];
  const R = G("ROSTER") || [], A = G("ALLY_TPL") || [], E = G("ENEMY_TPL") || [];
  R.forEach((r, i) => out.push({ v: "roster:" + i, g: "Party Roster", n: r.name, side: "team" }));
  A.forEach((a, i) => out.push({ v: "ally:" + i, g: a.g || "Allies", n: a.name, side: "team" }));
  E.forEach((t, i) => out.push({ v: "enemy:" + i, g: t.g || "Hostiles", n: t.name + (t.count > 1 ? " (×" + t.count + ")" : ""), side: "enemy" }));
  return out;
 }

 function makeUnitFrom(v) {
  const p = v.split(":"), i = +p[1];
  if (p[0] === "roster") return T(() => G("cloneRoster")((G("ROSTER") || [])[i].name), null);
  if (p[0] === "ally") return T(() => G("cloneAllyTpl")((G("ALLY_TPL") || [])[i]), null);
  return T(() => G("cloneEnemyTpl")((G("ENEMY_TPL") || [])[i]), null);
 }

 function fieldDeploy(v, n, split, barName, side) {
  const e = eng(); if (!e) return;
  n = Math.max(1, Math.min(40, Math.round(n || 1)));
  const made = [];
  if (split) {
   for (let i = 0; i < n; i++) {
    const u = makeUnitFrom(v); if (!u) continue;
    u.side = side;
    u.count = 1;
    if (n > 1) u.name = u.name + " #" + (i + 1);
    made.push(u);
   }
  } else {
   const u = makeUnitFrom(v); if (!u) return;
   u.side = side;
   u.count = n;
   made.push(u);
  }
  if (!made.length) { T(() => G("toast")("Nothing to deploy.")); return; }

  const bar = (barName || "").trim();
  made.forEach(u => {
   if (side === "enemy" && bar) u.integPool = bar;
   e.units.push(u);
   T(() => G("assignInitialMapPosition")(u, e));
  });
  if (side === "enemy" && bar) {
   /* A brand-new pool starts full at its own ceiling rather than at a flat
      100 — poolCeiling is level-scaled, and a bar that starts below its
      ceiling reads as a squad that took damage before the fight began. */
   const ceil = T(() => G("poolCeiling")(e, bar), 100) || 100;
   T(() => G("setPoolInteg")(e, bar, ceil));
   /* The bar's CAP is not set here on purpose: renderForces recomputes it
      from the units standing on the pool every draw and would overwrite
      anything written now. Only the current reading is seeded, at the
      ceiling, so a fresh squad does not arrive already bloodied. */
  }
  log("[FIELD SETUP] " + made.length + " × " + made[0].name.replace(/ #\d+$/, "") + " fielded on the " +
      (side === "enemy" ? "hostile" : "party") + " side" +
      (split && n > 1 ? " as " + n + " individually-targetable bodies" : (n > 1 ? " as one squad of " + n : "")) +
      (side === "enemy" && bar ? ", drawing from its own Integrity bar \"" + bar + "\"" : "") + ".");
  T(() => G("save")());
  T(() => G("render")());
  T(() => G("toast")(made.length + " deployed."));
 }

 function splitEverySquad() {
  const e = eng(); if (!e) return;
  const ids = e.units.filter(u => u.side === "enemy" && (+u.count || 1) > 1).map(u => u.id);
  if (!ids.length) { T(() => G("toast")("No multi-count hostiles to split.")); return; }
  ids.forEach(id => T(() => G("splitSquad")(id)));
  T(() => G("toast")(ids.length + " squad(s) split."));
 }

 /* Every distinct hostile NAME gets its own bar. The base name is the name
    with a squad-split suffix taken off, so six bodies out of one split stay
    on one bar together rather than getting six bars of their own. */
 function oneBarPerName() {
  const e = eng(); if (!e) return;
  const hostiles = e.units.filter(u => u.side === "enemy");
  const base = (u) => String(u.name).replace(/\s*#\d+$/, "").trim();
  const names = [...new Set(hostiles.map(base))];
  if (names.length < 2) { T(() => G("toast")("Only one kind of hostile is fielded — a second bar would have nothing on it.")); return; }
  names.forEach(n => {
   hostiles.filter(u => base(u) === n).forEach(u => { u.integPool = n; });
   const ceil = T(() => G("poolCeiling")(e, n), 100) || 100;
   T(() => G("setPoolIntegMax")(e, n, ceil));
   const cur = T(() => G("poolInteg")(e, n), null);
   if (cur == null || cur > ceil) T(() => G("setPoolInteg")(e, n, ceil));
  });
  log("[FIELD SETUP] " + names.length + " Integrity bars — one per hostile name: " + names.join(", ") +
      ". Damage to one group no longer drains the others.");
  T(() => G("save")());
  T(() => G("render")());
 }

 function openField() {
  let bg = $("bbFieldBg");
  if (!bg) {
   bg = document.createElement("div");
   bg.id = "bbFieldBg";
   bg.className = "bbmodal";
   bg.innerHTML =
    '<div class="bbmodal-box wide"><h3>Field Setup</h3>' +
    '<div class="bbmodal-sub">Deploy, split into separate bodies, and give them their own Integrity bar — in one press instead of ten.</div>' +
    '<div class="bbfield-row"><label>What</label><select id="bbFieldTpl"></select></div>' +
    '<div class="bbfield-row"><label>Side</label><select id="bbFieldSide">' +
      '<option value="enemy">Hostile</option><option value="team">Party / ally</option></select></div>' +
    '<div class="bbfield-row"><label>How many</label><input id="bbFieldN" value="1"></div>' +
    '<div class="bbfield-row"><label class="chk"><input type="checkbox" id="bbFieldSplit" checked> ' +
      'Separate, individually-targetable bodies <i>(off = one squad sharing a count)</i></label></div>' +
    '<div class="bbfield-row"><label>Own Integrity bar</label><input id="bbFieldBar" placeholder="leave empty to share the default bar"></div>' +
    '<div class="bbmodal-btns">' +
      '<button class="btn tiny cy" id="bbFieldGo">Deploy ▸</button>' +
      '<button class="btn tiny" id="bbFieldClose">Close</button></div>' +
    '<div class="bbfield-rule"></div>' +
    '<div class="bbmodal-sub">Already deployed and set up wrong:</div>' +
    '<div class="bbmodal-btns">' +
      '<button class="btn tiny" id="bbFieldSplitAll">SPLIT EVERY SQUAD</button>' +
      '<button class="btn tiny" id="bbFieldBars">ONE BAR PER NAME</button></div>' +
    '</div>';
   document.body.appendChild(bg);
   bg.addEventListener("click", ev => { if (ev.target === bg) bg.classList.remove("show"); });
   $("bbFieldClose").onclick = () => bg.classList.remove("show");
   $("bbFieldGo").onclick = () => {
    fieldDeploy($("bbFieldTpl").value, +$("bbFieldN").value, $("bbFieldSplit").checked,
                $("bbFieldBar").value, $("bbFieldSide").value);
    bg.classList.remove("show");
   };
   $("bbFieldSplitAll").onclick = () => { splitEverySquad(); bg.classList.remove("show"); };
   $("bbFieldBars").onclick = () => { oneBarPerName(); bg.classList.remove("show"); };
  }
  const sel = $("bbFieldTpl");
  const groups = {};
  tplChoices().forEach(c => { (groups[c.g] = groups[c.g] || []).push(c); });
  sel.innerHTML = Object.keys(groups).map(g =>
    '<optgroup label="' + esc(g) + '">' + groups[g].map(c =>
      '<option value="' + c.v + '" data-side="' + c.side + '">' + esc(c.n) + '</option>').join("") + '</optgroup>').join("");
  sel.onchange = () => {
   const o = sel.options[sel.selectedIndex];
   if (o) $("bbFieldSide").value = o.getAttribute("data-side") || "enemy";
  };
  sel.onchange();
  bg.classList.add("show");
 }

 function mountFieldButton() {
  const anchor = $("btnAddEnemy");
  if (!anchor || $("bbFieldBtn")) return;
  const b = document.createElement("button");
  b.id = "bbFieldBtn";
  b.className = "btn tiny gd";
  b.style.marginLeft = "6px";
  b.textContent = "[SETUP] Field Setup";
  b.title = "Deploy, split into separate bodies and assign an Integrity bar in one form";
  b.onclick = openField;
  anchor.parentNode.insertBefore(b, anchor.nextSibling);
 }

 /* =====================================================================
    WIRING
    ===================================================================== */

 function repaint() {
  T(buildFinder);
  T(paintFinder);
  T(refreshRetalSearch);
  T(autoReactBanner);
  T(mountFieldButton);
 }
 T(() => {
  const orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function () { const r = orig.apply(this, arguments); T(repaint); return r; };
 });
 ["resActor", "resTarget", "resAction", "retActor", "targetRetaliatesChk"].forEach(id => T(() => {
  const el = $(id);
  if (el) el.addEventListener("change", () => T(repaint));
 }));

 const css = document.createElement("style");
 css.textContent = `
 .bbfind{border:1px solid var(--line,#1c2839);background:rgba(255,255,255,.02);margin:0 0 10px;
  font-family:var(--mono,ui-monospace,monospace)}
 .bbfind-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:7px 9px;
  border-bottom:1px solid var(--line,#1c2839)}
 .bbfind-in{flex:1 1 240px;min-width:180px;background:rgba(0,0,0,.3);border:1px solid var(--line,#1c2839);
  color:#dde5f0;font:inherit;font-size:11px;padding:5px 8px}
 .bbfind-in:focus{outline:none;border-color:#39d3e8}
 .bbfind-tabs{display:flex;gap:3px}
 .bbfind-tab{background:transparent;border:1px solid var(--line,#1c2839);color:#5b6a7e;
  font:inherit;font-size:8.5px;letter-spacing:.1em;padding:4px 7px;cursor:pointer}
 .bbfind-tab.on{color:#39d3e8;border-color:rgba(57,211,232,.5);background:rgba(57,211,232,.08)}
 .bbfind-only{font-size:9px;color:#8194aa;display:flex;align-items:center;gap:4px;cursor:pointer}
 .bbfind-list{max-height:212px;overflow-y:auto}
 .bbfind-none{padding:10px;font-size:10px;color:#5b6a7e}
 /* Two lines, not four columns. The finder lives in the Resolve card, which is
    a narrow column on every layout the tracker uses — four columns turned every
    label into an ellipsis. Name on top, the small print underneath. */
 .bbfind-row{display:grid;grid-template-columns:40px minmax(0,1fr);gap:2px 8px;
  padding:5px 9px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04)}
 .bbfind-row:hover{background:rgba(57,211,232,.07)}
 .bbfind-row .kd{grid-row:1 / span 2;align-self:start;margin-top:2px;
  font-size:8px;letter-spacing:.08em;color:#5b6a7e;border:1px solid var(--line,#1c2839);
  text-align:center;padding:1px 0}
 .bbfind-row .kd.act{color:#39d3e8} .bbfind-row .kd.spec{color:#ffd873} .bbfind-row .kd.ret{color:#a678e0}
 .bbfind-row .lb{font-size:11px;color:#dde5f0;line-height:1.35}
 .bbfind-row .lb .st{color:#ffd873;font-style:normal;margin-right:4px}
 .bbfind-row .sb{font-size:9px;color:#5b6a7e}
 .bbfind-row .wy{font-size:9px;color:#8194aa;line-height:1.35}
 .bbfind-row .sb:empty,.bbfind-row .wy:empty{display:none}
 .bbfind-row.deny .lb{color:#8a9099;text-decoration:line-through;text-decoration-color:rgba(224,70,76,.6)}
 .bbfind-row.deny .wy{color:#e0464c}
 .bbfind-row.strain .wy{color:#ffd873}
 .bbret-search{display:flex;align-items:center;gap:7px;margin:0 0 6px}
 .bbret-search input{flex:1;background:rgba(0,0,0,.3);border:1px solid var(--line,#1c2839);color:#dde5f0;
  font-family:var(--mono,ui-monospace,monospace);font-size:10.5px;padding:4px 7px}
 .bbret-search input:focus{outline:none;border-color:#a678e0}
 .bbret-search .ct{font-size:9px;color:#5b6a7e;font-family:var(--mono,ui-monospace,monospace);min-width:56px}
 .retalopt.bbret-star{box-shadow:inset 2px 0 0 #ffd873}
 .bbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:7px 10px;margin:0 0 9px;
  border:1px solid rgba(166,120,224,.4);background:rgba(166,120,224,.07);
  font-family:var(--mono,ui-monospace,monospace);font-size:10px;color:#c2cedd}
 .bbar b{color:#a678e0}
 .bbar .dot{width:6px;height:6px;border-radius:50%;background:#a678e0}
 .bbar .bbar-btns{margin-left:auto;display:flex;gap:5px}
 .bbmodal{position:fixed;inset:0;background:rgba(2,6,12,.78);z-index:9000;display:none;
  align-items:center;justify-content:center;padding:20px}
 .bbmodal.show{display:flex}
 .bbmodal-box{background:#0b1119;border:1px solid var(--line,#1c2839);max-width:480px;width:100%;
  padding:16px 18px;font-family:var(--mono,ui-monospace,monospace);max-height:86vh;overflow-y:auto}
 .bbmodal-box.wide{max-width:560px}
 .bbmodal-box h3{margin:0 0 6px;font-size:13px;color:#dde5f0;letter-spacing:.06em}
 .bbmodal-sub{font-size:10px;color:#8194aa;line-height:1.5;margin:0 0 12px}
 .bbmodal-btns{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
 .bbsetup-opt{display:block;width:100%;text-align:left;background:rgba(255,255,255,.03);
  border:1px solid var(--line,#1c2839);color:#dde5f0;font:inherit;padding:8px 10px;margin:0 0 6px;cursor:pointer}
 .bbsetup-opt:hover{border-color:#39d3e8;background:rgba(57,211,232,.08)}
 .bbsetup-opt b{display:block;font-size:11px;margin-bottom:2px}
 .bbsetup-opt span{font-size:9px;color:#5b6a7e}
 .bbfield-row{display:flex;align-items:center;gap:9px;margin:0 0 8px}
 .bbfield-row>label{font-size:9px;letter-spacing:.1em;color:#8194aa;min-width:110px}
 .bbfield-row>label.chk{min-width:0;display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:0}
 .bbfield-row>label.chk i{color:#5b6a7e;font-style:normal;font-size:9px}
 .bbfield-row select,.bbfield-row input{flex:1;background:rgba(0,0,0,.3);border:1px solid var(--line,#1c2839);
  color:#dde5f0;font:inherit;font-size:10.5px;padding:5px 7px}
 .bbfield-rule{height:1px;background:var(--line,#1c2839);margin:14px 0 12px}
 .bbfind-list{scrollbar-width:thin}
 `;
 document.head.appendChild(css);

 T(repaint);
 setTimeout(() => T(repaint), 600);

 window.blackboxAccess = {
  find: (q) => { query = q || ""; const i = $("bbFindIn"); if (i) i.value = query; paintFinder(); },
  repaint: repaint,
  autoReact: AR,
  setAutoReact: (name, on) => { AR[nkey(name)] = !!on; arSave(); repaint(); },
  fieldSetup: openField,
  splitEverySquad: splitEverySquad,
  oneBarPerName: oneBarPerName,
  seedCole: () => { T(() => localStorage.removeItem("bb_cole_seeded")); seedColePreset(); }
 };
 log("[ACCESS] Finder is live — press / to search every action, spec and retaliation at once. " +
     "Retaliation grids have their own search. Field Setup deploys, splits and assigns Integrity bars in one form.");
})();
/* ================= END BLACKBOX ACCESS ========================= */
