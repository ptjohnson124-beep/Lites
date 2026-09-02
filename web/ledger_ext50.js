/* ==== BEGIN LEDGER EXTENSION 50 — SET THE RUNG DIRECTLY, injected block, delete to the END marker to revert ==== */
/* TYPE THE NUMBER INSTEAD OF CLIMBING TO IT.
 *
 * A connection's level could only ever go UP, and only ONE AT A TIME, through
 * the raise button. Nothing in the Ledger could set it. So a GM importing a
 * character who is already at seven had to press Raise seven times and eat
 * seven toasts, and a connection that should come back DOWN -- a bond that
 * broke, a number typed in wrong, a session that got undone -- had no way back
 * at all short of editing the source.
 *
 * The tag that reads "3/10 — Signal Found" is now the control. Click it and the
 * number becomes a field: type 7, press Enter, the connection stands at 7/10.
 * The same setter also appears as a row in the edit bar, next to the one that
 * sets how many rungs the ladder has, because that is where somebody looks
 * when they are already changing the shape of a ladder.
 *
 * The pair reads the way it should: block 45 sets the DENOMINATOR, this sets
 * the NUMERATOR, and both clamp against each other -- the number offered here
 * can never exceed this connection's own rung count, whether that is three or
 * twenty, and lowering the count already drags the level down with it.
 *
 * ZERO IS A REAL VALUE. The bottom of the range is 0, not 1: a connection that
 * is on the list but has not started climbing is a genuine state, and it was
 * unreachable before because the ladder only counted up from wherever it was
 * seeded. At zero the tag reads "0/10 — Not on the ladder yet" rather than
 * naming rung one, which is what the Ledger's own label does with a level of
 * zero, since it reads the name out of WAVELENGTH_RUNGS[level - 1].
 *
 * One thing it deliberately skips: the raise button's ceremony. Raising by one
 * goes through raiseWavelength, which announces the new rung by name and lets
 * every block hooked to it react; setting the number here is a correction to
 * the record rather than a moment at the table, so it changes the level, says
 * so once, and redraws. Use the button when the rung is being EARNED.
 *
 * Nothing here replaces a renderer. This block loads last, so its wrappers sit
 * outside block 45's, block 47's and block 23's; every one of them draws first
 * and this adjusts the finished page.
 */
(function () {
 "use strict";
 if (window.__ledgerExt50) return;
 window.__ledgerExt50 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

 const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
 const shared = () => (G("WAVELENGTH_RUNGS") || []);

 /* Block 45 already worked out how many rungs a connection has and what each
    one is called. Borrowed rather than reimplemented, so a change to the rung
    count is seen here immediately and there is only one such rule in the file. */
 const totalOf = (c) => T(() => window.ledgerRungs.countOf(c),
                          shared().length || 10) || (shared().length || 10);
 const nameOf = (c, i) => (c && c.rungNames && c.rungNames[i]) || shared()[i] || ("Rung " + (i + 1));

 function activeConn() {
  return T(() => {
   const list = G("connectionsFor")(G("currentUser")) || [];
   return list.find(x => x.id === G("activeWLPerson")) || null;
  }, null);
 }

 function label(c, level, total) {
  return level <= 0
   ? "0/" + total + " — Not on the ladder yet"
   : level + "/" + total + " — " + nameOf(c, level - 1);
 }

 /* The one place the level actually changes. Everything else in this block is
    a way of calling it. */
 function setLevel(c, n) {
  const total = totalOf(c);
  const want = clamp(Math.round(Number(n) || 0), 0, total);
  if (want === c.level) return;
  const from = c.level;
  c.level = want;
  T(() => G("renderWLDetailContent")(c));
  T(() => G("renderWLList")());
  T(() => G("showToast")(esc(c.name) + " — " + (want > from ? "raised" : "set back") +
    " to " + label(c, want, total) + "."));
 }

 /* ---- the tag itself --------------------------------------------------- */
 function armTag(c, total) {
  const tag = document.querySelector("#screen-wavelength .wl-detail-level-tag");
  if (!tag || tag.dataset.lx50) return;
  tag.dataset.lx50 = "1";
  tag.textContent = label(c, c.level, total);
  tag.title = "Click to set this connection's rung";
  tag.classList.add("lx50-tag");

  tag.onclick = () => {
   if (tag.querySelector("input")) return;
   const box = document.createElement("span");
   box.className = "lx50-inline";
   box.innerHTML = '<input type="number" min="0" max="' + total + '" value="' + c.level + '">' +
                   '<span class="of">/' + total + '</span>';
   tag.textContent = "";
   tag.appendChild(box);
   const inp = box.querySelector("input");
   inp.focus(); inp.select();
   let done = false;
   const commit = (ok) => {
    if (done) return;
    done = true;
    const v = Number(inp.value);
    /* Put the tag back BEFORE setting the level, not after. Typing the number
       that is already there is a real thing to do -- open the field, change
       your mind, click away -- and it changes nothing, so no redraw comes to
       clear the input for us. */
    tag.textContent = label(c, c.level, total);
    delete tag.dataset.lx50;
    if (ok && inp.value !== "") setLevel(c, v);
    T(fix);
   };
   inp.onkeydown = (ev) => {
    if (ev.key === "Enter") { ev.preventDefault(); commit(true); }
    if (ev.key === "Escape") { ev.preventDefault(); commit(false); }
   };
   inp.onblur = () => commit(true);
   /* The tag is inside the header, and the header's own click handlers should
      not also fire while somebody is typing a number into it. */
   box.onclick = (ev) => ev.stopPropagation();
  };
 }

 /* ---- the same thing as a row in the edit bar -------------------------- */
 function armBar(c, total) {
  const bar = document.querySelector(".lx45-bar");
  if (!bar || bar.querySelector(".lx50-row")) return;
  const row = document.createElement("div");
  row.className = "lx50-row";
  row.innerHTML =
   '<span class="lbl">STANDING AT</span>' +
   '<button class="lx45-btn" data-a="down">−</button>' +
   '<input class="lx45-num lx50-num" type="number" min="0" max="' + total + '" value="' + c.level + '">' +
   '<span class="lx50-of">/ ' + total + '</span>' +
   '<button class="lx45-btn" data-a="up">+</button>' +
   '<span class="note">set the rung outright — it can go down as well as up</span>';
  T(() => {
   const inp = row.querySelector(".lx50-num");
   inp.onchange = () => setLevel(c, inp.value);
   row.querySelectorAll("button").forEach(b => {
    b.onclick = (ev) => {
     ev.preventDefault();
     setLevel(c, c.level + (b.dataset.a === "up" ? 1 : -1));
    };
   });
  });
  bar.appendChild(row);
 }

 function fix() {
  const c = activeConn();
  if (!c || !$("wlLadder")) return;
  const total = totalOf(c);
  T(() => armTag(c, total));
  T(() => armBar(c, total));
 }

 ["renderWLDetailContent", "openWLDetail", "toggleWLEdit"].forEach(fn => T(() => {
  const orig = window[fn];
  if (typeof orig !== "function") return;
  window[fn] = function () {
   const r = orig.apply(this, arguments);
   T(fix);
   return r;
  };
 }));

 const css = document.createElement("style");
 css.textContent = `
 .lx50-tag{cursor:pointer;position:relative}
 .lx50-tag:hover{filter:brightness(1.12)}
 .lx50-tag::after{content:"✎";margin-left:7px;opacity:.55;font-size:10px}
 .lx50-tag:has(input)::after{content:none}
 .lx50-inline{display:inline-flex;align-items:center;gap:4px}
 .lx50-inline input{width:52px;text-align:center;font-family:var(--font-mono);font-size:11px;
  background:rgba(0,0,0,.35);border:1px solid rgba(0,0,0,.35);color:inherit;padding:1px 3px}
 .lx50-inline .of{font-family:var(--font-mono);font-size:11px}
 .lx50-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1 1 100%;
  margin-top:9px;padding-top:9px;border-top:1px dashed var(--line)}
 .lx50-row .lbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.12em;
  color:var(--sage)}
 .lx50-of{font-family:var(--font-mono);font-size:11px;color:var(--faint)}
 .lx50-row .note{font-family:var(--font-mono);font-size:9px;color:var(--faint);flex:1 1 180px}
 `;
 document.head.appendChild(css);

 setTimeout(() => T(fix), 400);
 window.ledgerLevel = { setLevel: setLevel, totalOf: totalOf };
})();
/* ================= END LEDGER EXTENSION 50 ========================= */
