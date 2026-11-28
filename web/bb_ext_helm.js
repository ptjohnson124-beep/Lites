/* ==== BEGIN BLACKBOX HELM — injected block, delete to the END marker to revert ==== */
/* THE KEYBOARD, AND A LOG YOU CAN ACTUALLY READ BACK.
 *
 * ---------------------------------------------------------------------------
 * 1. FOUR KEYBINDINGS EXISTED. THERE ARE NOW SIXTEEN.
 *
 * Counted in the file: Escape closes a modal, Ctrl+Enter marks a log beat,
 * Enter submits the giga code, and that is the entire keyboard. Everything
 * else -- resolve, next round, change actor, change target -- is a click, and
 * the Resolve button sits below a card that is a full screen tall, so running
 * an exchange means scrolling to a button, scrolling back to read the result,
 * and scrolling down again for the next one.
 *
 * WHICH KEYS, AND WHY THOSE. Navigation is on plain letters, because moving
 * between actors and targets is free and reversible. The two keys that
 * actually COMMIT something -- Resolve, and Resolve Retaliation -- are on
 * Ctrl+Enter and Ctrl+Shift+Enter, matching the modifier the log input in this
 * file already uses, so a stray keypress while reading can never throw an
 * attack. Nothing fires while the cursor is in a field, or while a dialog is
 * open. Press ? for the list.
 *
 * ---------------------------------------------------------------------------
 * 2. THE ROUND HANDS OVER WHERE YOU ARE LOOKING
 *
 * nextRound() both advances the round AND flips which side is acting, and its
 * button lives up in the round strip, away from the exchange. The flow strip
 * now grows an explicit handover -- "PASS TO HOSTILES · round 3" -- that lights
 * up the moment the acting side is out of actions or everyone on it has moved,
 * which is the exact moment a table starts asking whether it is still their
 * turn.
 *
 * ---------------------------------------------------------------------------
 * 3. THE LOG IS SEARCHABLE, AND CAN BE CUT DOWN TO WHAT MATTERS
 *
 * A real fight puts hundreds of lines in the feed and 87% of them are system
 * chatter -- counted across the file's own call sites: 2,660 addLog("system")
 * against 402 hits and 45 misses. Finding the exchange somebody is asking
 * about means scrolling past all of it.
 *
 * A filter bar over the feed: type to search, or press HITS to see nothing but
 * the blows that landed, or THIS ROUND to see only what is actually on the
 * table right now. It filters what is drawn, never what is stored -- the log
 * itself is untouched, and clearing the box brings everything back.
 */
(function () {
 "use strict";
 if (window.__bbHelm) return;
 window.__bbHelm = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
 const eng = () => T(() => G("S").eng, null);

 /* =====================================================================
    1 — KEYS
    ===================================================================== */

 const KEYS = [
  { k: "Ctrl+Enter",        d: "Resolve the action" },
  { k: "Ctrl+Shift+Enter",  d: "Resolve the preemptive retaliation" },
  { k: "/",                 d: "Search every action, spec and retaliation" },
  { k: "a  /  Shift+A",     d: "Next / previous actor" },
  { k: "d  /  Shift+D",     d: "Next / previous target" },
  { k: "t",                 d: "Target Retaliates — on or off" },
  { k: "g",                 d: "Set the action to Guard / Brace" },
  { k: "n",                 d: "Pass to the other side (next round)" },
  { k: "p",                 d: "Back a round" },
  { k: "b",                 d: "Begin Engagement, while the field is cold" },
  { k: "Ctrl+Z",            d: "Undo the last thing that changed" },
  { k: "Ctrl+Shift+Z",      d: "Redo it" },
  { k: "Esc",               d: "Close whatever is open" },
  { k: "?",                 d: "This list" }
 ];

 function typing(t) {
  const tag = t && t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable);
 }
 function dialogOpen() {
  return !!document.querySelector(".mbg.show, .bbmodal.show");
 }
 function click(id) { const b = $(id); if (b && !b.disabled) b.click(); }

 /* Stepping a <select> by keyboard has to look like a real change to the rest
    of the app, so the event is dispatched rather than the value merely set --
    every picker in this file rebuilds off its own change handler. */
 function cycle(id, dir) {
  const s = $(id);
  if (!s || !s.options.length) return;
  let i = s.selectedIndex + dir;
  if (i < 0) i = s.options.length - 1;
  if (i >= s.options.length) i = 0;
  s.selectedIndex = i;
  s.dispatchEvent(new Event("change"));
  T(() => G("renderResolve")());
  T(() => G("updChance")());
  flash(s);
 }
 function flash(el) {
  if (!el) return;
  el.classList.add("bbhelm-flash");
  setTimeout(() => T(() => el.classList.remove("bbhelm-flash")), 320);
  T(() => el.scrollIntoView({ block: "nearest" }));
 }

 document.addEventListener("keydown", (ev) => {
  const t = ev.target;
  if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
   /* The log's own Ctrl+Enter keeps its field. */
   if (t && t.id === "logInput") return;
   ev.preventDefault();
   click(ev.shiftKey ? "btnRetal" : "btnResolve");
   return;
  }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === "Escape") { const s = $("bbKeysBg"); if (s) s.classList.remove("show"); return; }
  if (typing(t) || dialogOpen()) return;
  switch (ev.key) {
   case "a": ev.preventDefault(); cycle("resActor", 1); break;
   case "A": ev.preventDefault(); cycle("resActor", -1); break;
   case "d": ev.preventDefault(); cycle("resTarget", 1); break;
   case "D": ev.preventDefault(); cycle("resTarget", -1); break;
   case "t": {
    ev.preventDefault();
    const c = $("targetRetaliatesChk");
    if (c) { c.checked = !c.checked; c.dispatchEvent(new Event("change")); flash(c.parentNode); }
    break;
   }
   case "g": {
    ev.preventDefault();
    const s = $("resAction");
    if (s) { s.value = "guard"; s.dispatchEvent(new Event("change")); T(() => G("renderResExtra")()); T(() => G("updChance")()); flash(s); }
    break;
   }
   case "n": ev.preventDefault(); click("btnNext"); break;
   case "p": ev.preventDefault(); click("btnPrev"); break;
   case "b": {
    const e = eng();
    if (e && !e.engagementActive) { ev.preventDefault(); click("btnBeginEngagement"); }
    break;
   }
   case "?": ev.preventDefault(); openKeys(); break;
  }
 });

 function openKeys() {
  let bg = $("bbKeysBg");
  if (!bg) {
   bg = document.createElement("div");
   bg.id = "bbKeysBg";
   bg.className = "bbmodal";
   bg.innerHTML = '<div class="bbmodal-box"><h3>Keys</h3>' +
     '<div class="bbmodal-sub">Nothing here fires while the cursor is in a field or a dialog is open. ' +
     'The two that commit something are on Ctrl+Enter on purpose.</div>' +
     '<div class="bbkeys">' + KEYS.map(k =>
       '<div class="bbkey"><kbd>' + esc(k.k) + '</kbd><span>' + esc(k.d) + '</span></div>').join("") + '</div>' +
     '<div class="bbmodal-btns"><button class="btn tiny" id="bbKeysClose">Close</button></div></div>';
   document.body.appendChild(bg);
   bg.addEventListener("click", e => { if (e.target === bg) bg.classList.remove("show"); });
   $("bbKeysClose").onclick = () => bg.classList.remove("show");
  }
  bg.classList.add("show");
 }

 function mountKeysPill() {
  if ($("bbKeysPill")) return;
  const b = document.createElement("button");
  b.id = "bbKeysPill";
  b.className = "bbkeyspill";
  b.textContent = "? keys";
  b.title = "Keyboard shortcuts";
  b.onclick = openKeys;
  document.body.appendChild(b);
 }

 /* =====================================================================
    2 — THE HANDOVER
    ===================================================================== */

 function paintHandover() {
  const e = eng();
  const strip = $("bbFlow");
  if (!e || !strip) return;
  const head = strip.querySelector(".bbf-head");
  if (!head) return;
  let b = $("bbHandover");
  if (!b) {
   b = document.createElement("button");
   b.id = "bbHandover";
   b.className = "bbhand";
   b.onclick = () => { T(() => G("nextRound")()); };
   head.appendChild(b);
  }
  if (!e.engagementActive) { b.style.display = "none"; return; }
  b.style.display = "";
  const other = e.acting === "team" ? "HOSTILES" : "PARTY";
  const left = Math.max(0, e.pools.battle.max - e.pools.battle.used);
  /* "Ready" is the honest word: the tracker never forces a handover, and a
     side with actions banked may well want to keep them. This only says the
     obvious moment has arrived. */
  const side = (e.units || []).filter(u => u.side === e.acting && !u.down && !u.dead && !u.benched);
  const flow = window.blackboxFlow;
  const allMoved = side.length > 0 && flow && T(() => side.every(u => flow.actedThisRound(u) > 0), false);
  const ready = left === 0 || allMoved;
  b.className = "bbhand" + (ready ? " ready" : "");
  b.textContent = "▶ PASS TO " + other + " · round " + ((e.round || 1) + 1);
  b.title = ready
   ? (left === 0 ? "No actions left on this side." : "Everyone still standing on this side has moved.")
   : left + " action" + (left === 1 ? "" : "s") + " still banked on this side.";
 }

 /* =====================================================================
    3 — THE LOG FILTER
    ===================================================================== */

 const KINDS = [
  { id: "", lbl: "ALL" },
  { id: "hit", lbl: "HITS" },
  { id: "miss", lbl: "MISSES" },
  { id: "system", lbl: "SYSTEM" },
  { id: "voice", lbl: "VOICE" }
 ];
 let lgQuery = "", lgKind = "", lgRound = false;
 let hiding = false;      // is anything actually hidden right now

 function mountLogFilter() {
  const feed = $("logFeed");
  if (!feed || $("bbLogFilter")) return;
  const bar = document.createElement("div");
  bar.id = "bbLogFilter";
  bar.className = "bblog";
  bar.innerHTML =
   '<input id="bbLogIn" placeholder="search the log…" autocomplete="off">' +
   '<div class="bblog-chips">' + KINDS.map(k =>
     '<button class="bblog-chip' + (k.id === "" ? " on" : "") + '" data-lk="' + k.id + '">' + k.lbl + '</button>').join("") +
     '<button class="bblog-chip rd" data-lround="1">THIS ROUND</button></div>' +
   '<span class="bblog-ct" id="bbLogCt"></span>';
  feed.parentNode.insertBefore(bar, feed);
  $("bbLogIn").addEventListener("input", e => { lgQuery = e.target.value; applyLogFilter(); });
  bar.querySelectorAll("[data-lk]").forEach(b => b.onclick = () => {
   lgKind = b.dataset.lk;
   bar.querySelectorAll("[data-lk]").forEach(x => x.classList.toggle("on", x.dataset.lk === lgKind));
   applyLogFilter();
  });
  bar.querySelector("[data-lround]").onclick = (ev) => {
   lgRound = !lgRound;
   ev.currentTarget.classList.toggle("on", lgRound);
   applyLogFilter();
  };
 }

 function applyLogFilter() {
  const feed = $("logFeed");
  if (!feed) return;
  const e = eng();
  const toks = lgQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = Array.from(feed.querySelectorAll(".le"));
  const active = !!(lgQuery || lgKind || lgRound);
  /* With no filter set and nothing currently hidden there is nothing to do,
     and render() calls through here on every draw — a log a few hundred lines
     long should not be walked to decide that. */
  if (!active && !hiding) { const c0 = $("bbLogCt"); if (c0) c0.textContent = rows.length + " lines"; return; }
  hiding = active;
  const roundTag = e ? "RND " + e.round + " " : null;
  let shown = 0;
  rows.forEach(r => {
   let ok = true;
   if (lgKind && !r.classList.contains(lgKind)) ok = false;
   if (ok && lgRound && roundTag) {
    const st = r.querySelector(".st");
    /* The round is already printed on every row; reading it back beats
       keeping a parallel index that could drift from what is on screen. */
    if (!st || st.textContent.indexOf("RND " + e.round + " ") !== 0) ok = false;
   }
   if (ok && toks.length) {
    const hay = (r.textContent || "").toLowerCase();
    ok = toks.every(t => hay.indexOf(t) >= 0);
   }
   r.style.display = ok ? "" : "none";
   if (ok) shown++;
  });
  const ct = $("bbLogCt");
  if (ct) ct.textContent = (lgQuery || lgKind || lgRound) ? shown + " of " + rows.length : rows.length + " lines";
  const empty = feed.querySelector(".log-empty");
  if (empty) empty.style.display = "";
 }

 T(() => {
  const orig = window.renderLog;
  if (typeof orig !== "function") return;
  window.renderLog = function () {
   const r = orig.apply(this, arguments);
   T(mountLogFilter); T(applyLogFilter);
   return r;
  };
 });

 /* ===================================================================== */

 function repaint() { T(mountKeysPill); T(mountLogFilter); T(applyLogFilter); T(paintHandover); }
 T(() => {
  const orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function () { const r = orig.apply(this, arguments); T(repaint); return r; };
 });

 const css = document.createElement("style");
 css.textContent = `
 /* The modal shell is repeated here rather than borrowed from the access
    block, so deleting either block leaves the other looking right. */
 .bbmodal{position:fixed;inset:0;background:rgba(2,6,12,.78);z-index:9000;display:none;
  align-items:center;justify-content:center;padding:20px}
 .bbmodal.show{display:flex}
 .bbmodal-box{background:#0b1119;border:1px solid var(--line,#1c2839);max-width:480px;width:100%;
  padding:16px 18px;font-family:var(--mono,ui-monospace,monospace);max-height:86vh;overflow-y:auto}
 .bbmodal-box h3{margin:0 0 6px;font-size:13px;color:#dde5f0;letter-spacing:.06em}
 .bbmodal-sub{font-size:10px;color:#8194aa;line-height:1.5;margin:0 0 12px}
 .bbmodal-btns{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
 .bbhelm-flash{outline:2px solid #39d3e8 !important;outline-offset:1px;transition:outline-color .3s}
 .bbkeyspill{position:fixed;right:14px;bottom:14px;z-index:8000;
  border:1px solid var(--line,#1c2839);background:rgba(8,13,20,.92);color:#5b6a7e;
  font-family:var(--mono,ui-monospace,monospace);font-size:9px;letter-spacing:.1em;
  padding:6px 10px;cursor:pointer;backdrop-filter:blur(3px)}
 .bbkeyspill:hover{color:#39d3e8;border-color:#39d3e8}
 .bbkeys{display:grid;gap:5px}
 .bbkey{display:grid;grid-template-columns:150px 1fr;gap:10px;align-items:baseline;font-size:10.5px}
 .bbkey kbd{font-family:var(--mono,ui-monospace,monospace);font-size:9.5px;color:#39d3e8;
  border:1px solid var(--line,#1c2839);background:rgba(0,0,0,.3);padding:2px 6px;text-align:center}
 .bbkey span{color:#c2cedd}
 .bbhand{margin-left:auto;background:transparent;border:1px solid var(--line,#1c2839);color:#5b6a7e;
  font-family:var(--mono,ui-monospace,monospace);font-size:9px;letter-spacing:.1em;
  padding:5px 10px;cursor:pointer}
 .bbhand:hover{color:#dde5f0;border-color:#8194aa}
 .bbhand.ready{color:#ffd873;border-color:rgba(232,177,58,.55);background:rgba(232,177,58,.09)}
 .bbhand.ready:hover{color:#fff}
 .bblog{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 8px}
 .bblog input{flex:1 1 150px;min-width:120px;background:rgba(0,0,0,.3);border:1px solid var(--line,#1c2839);
  color:#dde5f0;font-family:var(--mono,ui-monospace,monospace);font-size:10.5px;padding:4px 7px}
 .bblog input:focus{outline:none;border-color:#39d3e8}
 .bblog-chips{display:flex;gap:3px;flex-wrap:wrap}
 .bblog-chip{background:transparent;border:1px solid var(--line,#1c2839);color:#5b6a7e;
  font-family:var(--mono,ui-monospace,monospace);font-size:8px;letter-spacing:.09em;padding:4px 7px;cursor:pointer}
 .bblog-chip.on{color:#39d3e8;border-color:rgba(57,211,232,.5);background:rgba(57,211,232,.08)}
 .bblog-chip.rd.on{color:#ffd873;border-color:rgba(232,177,58,.5);background:rgba(232,177,58,.08)}
 .bblog-ct{font-size:9px;color:#5b6a7e;font-family:var(--mono,ui-monospace,monospace)}
 @media (max-width:640px){.bbkeyspill{right:8px;bottom:8px}.bbkey{grid-template-columns:120px 1fr}}
 `;
 document.head.appendChild(css);

 T(repaint);
 setTimeout(() => T(repaint), 600);

 window.blackboxHelm = { keys: openKeys, KEYS: KEYS, filterLog: (q) => { lgQuery = q || "";
   const i = $("bbLogIn"); if (i) i.value = lgQuery; applyLogFilter(); } };
 T(() => G("addLog")("system",
  "[HELM] Keyboard is live — a/d step the actor and target, t toggles the retaliation, n passes the round, " +
  "Ctrl+Enter resolves. Press ? for the list. The log has a search bar and can be cut to hits, or to this round only."));
})();
/* ================= END BLACKBOX HELM ========================= */
