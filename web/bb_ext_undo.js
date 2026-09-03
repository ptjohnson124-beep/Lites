/* ==== BEGIN BLACKBOX UNDO — injected block, delete to the END marker to revert ==== */
/* THERE WAS NO WAY BACK FROM ANYTHING.
 *
 * Fifty thousand lines, several hundred buttons, and not one undo. A misread
 * dropdown resolves a Heavy Strike from the wrong unit; a mistyped Integrity
 * figure wipes a squad's bar; a stray click kills a hostile the fiction needed
 * alive. The tracker's own text says it out loud in one place -- "Delete
 * Archived Log: this can't be undone" -- and it is just as true of everything
 * else. The only recovery was a save slot made before the mistake, which
 * nobody makes before a mistake.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS HOOKS save() AND NOT THE ACTIONS
 *
 * The obvious build is to wrap resolve(), enemyRetaliation(), splitSquad() and
 * so on, and snapshot before each. That was tried on paper and thrown out: the
 * gate block had to enumerate NINE separate places an action is spent, and
 * spending an action is only one of the ways this file changes state. Editing
 * a stat, retyping a name, dragging an Integrity slider, assigning a pool,
 * knocking a group down, adding a graft, importing gear -- none of those go
 * through an action at all, and each would have needed its own wrapper, with
 * the next one somebody adds silently uncovered.
 *
 * There is exactly one thing every single mutation in this file already does:
 * it calls save(). So save() is where the history is kept. One hook, and
 * nothing can change without being recorded -- including code written after
 * this block, which is the whole point.
 *
 * HOW IT KEEPS THE BEFORE-STATE. save() runs AFTER the change, so a snapshot
 * taken there is the wrong side of it. Instead the last known state is held in
 * a string; when save() fires and the engagement no longer matches it, THAT
 * held string is the before-state and goes on the stack. The cost is one
 * JSON.stringify of the engagement per save -- strictly less than what save()
 * already spends stringifying the whole of S, archives included.
 *
 * WHAT AN ENTRY IS CALLED. Whatever the log said. addLog() writes the line and
 * then calls save(), so the newest log line at push time is a description of
 * the thing being recorded, written by the code that did it: "Kevanna lands
 * Bite for 34 dmg" rather than "action". A change that logged nothing is
 * called an edit, which is what it was.
 *
 * COALESCING. One resolve writes six log lines and calls save() six times.
 * The rule is ONE GESTURE, ONE STEP: saves are folded together while they
 * belong to the same burst, and a burst closes 150ms after the last save in
 * it. Everything a single click does -- including whatever it schedules on a
 * timer immediately afterwards -- is inside that burst, so one Resolve is one
 * undo and holding a −10 button down is one undo rather than eleven. Two
 * deliberate clicks are hundreds of milliseconds apart and stay two steps.
 *
 * The first shape tried was a window measured from the FIRST save of a burst
 * rather than the last, and it was wrong in a way worth recording: two real
 * gestures a third of a second apart -- pressing Begin Engagement and then
 * Resolve -- landed in the same window and became one undo, so stepping back
 * from the attack also un-started the fight.
 *
 * SCOPE, HONESTLY. This restores the ENGAGEMENT -- units, pools, round, log,
 * Integrity, the map. It does not restore the archive, the save slots, or the
 * nemesis's memory, all of which live outside S.eng in storage of their own.
 * Undoing an exchange therefore leaves the nemesis still knowing it happened.
 * That is a deliberate line: rolling a nemesis's memory back would mean
 * rolling back its levels and grudges from every other fight in the same file.
 */
(function () {
 "use strict";
 if (window.__bbUndo) return;
 window.__bbUndo = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

 const CAP = 40;                 // entries
 const CAP_BYTES = 8 * 1024 * 1024;
 const GRACE = 150;              // ms of quiet that ends a burst

 let past = [];      // {json, label, t}   json is the state BEFORE that step
 let future = [];    // {json, label}
 let lastKnown = null;
 let busy = false;   // set while we are the ones writing, so we don't record ourselves
 let bytes = 0;
 let burst = false;      // a gesture is still writing
 let graceTimer = null;

 const engJson = () => T(() => JSON.stringify(G("S").eng), null);

 /* The newest log line, stripped of its bracket tag, as the name of the step.
    This is the log's own wording rather than a re-description, so it stays
    right when the file's wording changes. */
 function labelNow() {
  const e = T(() => G("S").eng, null);
  const l = e && e.log && e.log.length ? e.log[e.log.length - 1] : null;
  if (!l || !l.text) return "an edit";
  let s = String(l.text).replace(/^\[[^\]]{1,28}\]\s*/, "").trim();
  if (s.length > 74) s = s.slice(0, 72) + "…";
  return s || "an edit";
 }

 function trim() {
  while (past.length > CAP || bytes > CAP_BYTES) {
   const gone = past.shift();
   if (!gone) break;
   bytes -= gone.json.length;
  }
 }

 function record() {
  if (busy) return;
  const cur = engJson();
  if (cur === null || cur === lastKnown) return;
  const top = past[past.length - 1];
  if (burst && top) {
   /* Same gesture still writing. The entry already holds the right
      before-state; only its name is refreshed, to the latest thing logged. */
   top.label = labelNow();
  } else {
   if (lastKnown !== null) {
    past.push({ json: lastKnown, label: labelNow(), t: Date.now() });
    bytes += lastKnown.length;
    trim();
   }
   future.length = 0;
   burst = true;
  }
  if (graceTimer) clearTimeout(graceTimer);
  graceTimer = setTimeout(() => { burst = false; graceTimer = null; }, GRACE);
  lastKnown = cur;
  paint();
 }

 /* Replacing S.eng wholesale is the file's own move -- loading an archived
    engagement does exactly this -- so nothing downstream is holding a
    reference that this breaks. */
 function restore(json) {
  const S_ = G("S");
  if (!S_) return false;
  let parsed = null;
  T(() => { parsed = JSON.parse(json); });
  if (!parsed) return false;
  busy = true;
  S_.eng = parsed;
  lastKnown = json;
  T(() => G("save")());
  T(() => G("render")());
  busy = false;
  return true;
 }

 function undo() {
  if (!past.length) { T(() => G("toast")("Nothing left to undo.")); return; }
  const cur = engJson();
  const step = past.pop();
  bytes -= step.json.length;
  if (!restore(step.json)) { past.push(step); bytes += step.json.length; return; }
  future.push({ json: cur, label: step.label });
  burst = false;
  T(() => G("toast")("Undid: " + step.label));
  paint();
 }
 function redo() {
  if (!future.length) { T(() => G("toast")("Nothing to redo.")); return; }
  const cur = engJson();
  const step = future.pop();
  if (!restore(step.json)) { future.push(step); return; }
  past.push({ json: cur, label: step.label, t: Date.now() });
  bytes += cur.length;
  trim();
  burst = false;
  T(() => G("toast")("Redid: " + step.label));
  paint();
 }

 T(() => {
  const orig = window.save;
  if (typeof orig !== "function") return;
  window.save = function () { const r = orig.apply(this, arguments); T(record); return r; };
 });

 /* ---- the control, and the keys ---- */
 function paint() {
  let bar = $("bbUndoBar");
  if (!bar) {
   bar = document.createElement("div");
   bar.id = "bbUndoBar";
   bar.className = "bbundo";
   bar.innerHTML =
    '<button class="bbundo-b" id="bbUndoGo" title="Ctrl+Z">↶</button>' +
    '<span class="bbundo-t" id="bbUndoTxt"></span>' +
    '<button class="bbundo-b" id="bbRedoGo" title="Ctrl+Shift+Z">↷</button>';
   document.body.appendChild(bar);
   $("bbUndoGo").onclick = undo;
   $("bbRedoGo").onclick = redo;
  }
  const top = past[past.length - 1];
  $("bbUndoGo").disabled = !past.length;
  $("bbRedoGo").disabled = !future.length;
  $("bbUndoGo").title = past.length ? "Undo: " + top.label + "   (Ctrl+Z)" : "Nothing to undo";
  $("bbRedoGo").title = future.length ? "Redo: " + future[future.length - 1].label + "   (Ctrl+Shift+Z)" : "Nothing to redo";
  $("bbUndoTxt").textContent = past.length ? past.length + " step" + (past.length === 1 ? "" : "s") : "no history";
  bar.classList.toggle("empty", !past.length && !future.length);
 }

 document.addEventListener("keydown", (ev) => {
  if (!(ev.ctrlKey || ev.metaKey) || String(ev.key).toLowerCase() !== "z") return;
  const t = ev.target, tag = t && t.tagName;
  /* A text field's own undo is the right behaviour inside a text field. */
  if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) return;
  ev.preventDefault();
  if (ev.shiftKey) redo(); else undo();
 });

 const css = document.createElement("style");
 css.textContent = `
 .bbundo{position:fixed;left:14px;bottom:14px;z-index:8000;display:flex;align-items:center;gap:2px;
  padding:3px;border:1px solid var(--line,#1c2839);background:rgba(8,13,20,.92);
  font-family:var(--mono,ui-monospace,monospace);backdrop-filter:blur(3px)}
 .bbundo.empty{opacity:.4}
 .bbundo-b{background:transparent;border:1px solid transparent;color:#dde5f0;font:inherit;
  font-size:15px;line-height:1;padding:4px 9px;cursor:pointer}
 .bbundo-b:hover:not(:disabled){border-color:#39d3e8;color:#39d3e8}
 .bbundo-b:disabled{color:#33404f;cursor:default}
 .bbundo-t{font-size:8.5px;letter-spacing:.08em;color:#5b6a7e;padding:0 3px;min-width:52px;text-align:center}
 @media (max-width:640px){.bbundo{left:8px;bottom:8px}.bbundo-t{display:none}}
 `;
 document.head.appendChild(css);

 T(() => { lastKnown = engJson(); });
 T(paint);

 window.blackboxUndo = {
  undo: undo, redo: redo,
  depth: () => past.length,
  list: () => past.map(p => p.label),
  bytes: () => bytes,
  clear: () => { past = []; future = []; bytes = 0; lastKnown = engJson(); paint(); }
 };
 T(() => G("addLog")("system",
  "[UNDO] Ctrl+Z steps back through anything that changed the engagement — a resolve, a stat edit, a " +
  "knockdown, an Integrity figure typed wrong. Ctrl+Shift+Z puts it back. Up to " + CAP + " steps. " +
  "The archive, the save slots and the nemesis's memory are outside the engagement and are not rolled back."));
})();
/* ================= END BLACKBOX UNDO ========================= */
