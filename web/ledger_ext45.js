/* ==== BEGIN LEDGER EXTENSION 45 — RUNG COUNT, injected block, delete to the END marker to revert ==== */
/* HOW MANY RUNGS A WAVELENGTH HAS.
 *
 * Ten was baked in seven different places: the dots, the "x/10" on the card,
 * the same on the detail tag, the ladder itself, the guard on the raise
 * button, the label on that button, and the ceiling inside raiseWavelength.
 * A connection that should top out at three had ten rungs and seven of them
 * said "Locked." forever.
 *
 * Each connection now carries its own rungCount, editable from the detail
 * view, one to twenty. Everything above reads that number instead of ten.
 *
 * Done by WRAPPING and then correcting the DOM rather than by replacing the
 * renderers, because three other blocks already wrap these functions -- the
 * rung tasks hang off renderWLDetailContent, the wave-type seeding off
 * openWLDetail, the branch choice off raiseWavelength. Replacing any of them
 * would silently drop whichever block got there first. This one loads last,
 * so its wrapper is outermost: everyone else draws, then this adjusts.
 *
 * Lowering the count never destroys anything. The rung entries stay in the
 * array and simply stop being drawn, so a connection cut from ten to three
 * and later restored to ten still has all ten buffs and hooks it always had.
 */
(function () {
 "use strict";
 if (window.__ledgerExt45) return;
 window.__ledgerExt45 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

 const MIN = 1, MAX = 20;
 const shared = () => (G("WAVELENGTH_RUNGS") || []);
 const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

 function countOf(c) {
  const dflt = shared().length || 10;
  return clamp(Math.round(Number(c && c.rungCount) || dflt), MIN, MAX);
 }
 function titleOf(c, i) {
  const own = c && c.rungNames && c.rungNames[i];
  return own || shared()[i] || ("Rung " + (i + 1));
 }
 function activeConn() {
  return T(() => {
   const list = G("connectionsFor")(G("currentUser")) || [];
   return list.find(x => x.id === G("activeWLPerson")) || null;
  }, null);
 }

 /* Every place the number ten was written into a string.
    The NAME has to be rewritten too, not just the numbers: the Ledger reads it
    out of WAVELENGTH_RUNGS[level - 1], which is undefined past the tenth and
    falls back to "Signal Found" -- so a connection standing at 13/13 was
    labelled with the name of rung one. */
 function relabel(el, c, level, total) {
  if (!el) return;
  const nm = titleOf(c, level - 1);
  const t = el.textContent;
  el.textContent = /—/.test(t)
   ? t.replace(/\b\d+\s*\/\s*\d+\s*—.*$/, level + "/" + total + " — " + nm)
   : t.replace(/\b\d+\s*\/\s*\d+/, level + "/" + total);
 }
 function fixDots(wrap, level, total) {
  if (!wrap) return;
  wrap.innerHTML = "";
  for (let i = 1; i <= total; i++) {
   const s = document.createElement("span");
   s.className = "wl-dot" + (i <= level ? " filled" : "");
   wrap.appendChild(s);
  }
 }

 /* ---- the list of cards ------------------------------------------------
    Matched to connections BY INDEX, because renderWLList draws them straight
    down connectionsFor's array and the names on screen are not unique enough
    to key on -- two lists can hold the same person. */
 function fixList() {
  const grid = $("wlListGrid");
  if (!grid) return;
  const conns = T(() => G("connectionsFor")(G("currentUser")) || [], []);
  const cards = [...grid.querySelectorAll(".wl-card")];
  if (cards.length !== conns.length) return;
  cards.forEach((card, i) => {
   const c = conns[i], total = countOf(c);
   if (total === 10 && c.level <= shared().length) return;
   fixDots(card.querySelector(".wl-dots"), c.level, total);
   relabel(card.querySelector(".wl-card-level-label"), c, c.level, total);
  });
 }

 /* ---- the detail view -------------------------------------------------- */
 function rungNode(c, i, editing) {
  const lvl = i + 1, reached = lvl <= c.level;
  const d = (c.rungs && c.rungs[i]) || { buff: "Not written yet.", hook: "Not written yet." };
  const div = document.createElement("div");
  div.className = "wl-rung" + (reached ? " reached" : " locked");
  div.style.setProperty("--wl-c", c.color);
  const head = '<div class="wl-rung-num">RUNG ' + lvl + '</div>' +
   '<div class="wl-rung-title chalk">' + esc(titleOf(c, i)) + '</div>';
  if (reached && editing) {
   /* A rung past the shared ladder has no name of its own until someone
      gives it one, so the field to do that appears exactly there. */
   const named = i >= shared().length
    ? '<label class="wl-form-label" style="margin-top:0;">Rung name</label>' +
      '<input class="wl-form-input lx45-name" data-rung="' + i + '" value="' +
      esc(titleOf(c, i)) + '">'
    : '';
   div.innerHTML = head + '<div class="wl-rung-box">' + named +
    '<label class="wl-form-label"' + (named ? '' : ' style="margin-top:0;"') + '>Buff</label>' +
    '<textarea class="wl-form-input wl-edit-buff" data-rung="' + i + '" rows="2">' +
      esc(d.buff) + '</textarea>' +
    '<label class="wl-form-label">Hook</label>' +
    '<textarea class="wl-form-input wl-edit-hook" data-rung="' + i + '" rows="2">' +
      esc(d.hook) + '</textarea></div>';
  } else {
   div.innerHTML = head + '<div class="wl-rung-box">' +
    '<div class="wl-rung-buff"><b>Buff:</b> ' + (reached ? esc(d.buff) : "Locked.") + '</div>' +
    '<div class="wl-rung-hook"><b>Hook:</b> ' + (reached ? esc(d.hook) : "Locked.") + '</div>' +
    '</div>';
  }
  return div;
 }

 function setCount(c, n) {
  const total = clamp(Math.round(n), MIN, MAX);
  c.rungCount = total;
  c.rungs = c.rungs || [];
  /* Grow the array to match, never shrink it: a rung that stops being drawn
     keeps whatever was written on it. */
  while (c.rungs.length < total)
   c.rungs.push({ buff: "Not written yet.", hook: "Not written yet." });
  if (c.level > total) c.level = total;
  T(() => G("renderWLDetailContent")(c));
  T(() => G("renderWLList")());
  T(() => G("showToast")(esc(c.name) + " — ladder is " + total +
    " rung" + (total === 1 ? "" : "s") + " now."));
 }

 function countBar(c) {
  const bar = document.createElement("div");
  bar.className = "lx45-bar";
  bar.innerHTML =
   '<span class="lbl">RUNGS ON THIS LADDER</span>' +
   '<button class="lx45-btn" id="lx45Down">−</button>' +
   '<input class="lx45-num" id="lx45Num" type="number" min="' + MIN + '" max="' + MAX +
     '" value="' + countOf(c) + '">' +
   '<button class="lx45-btn" id="lx45Up">+</button>' +
   '<span class="note">fewer hides the rungs past it — nothing written is lost</span>';
  T(() => { bar.querySelector("#lx45Down").onclick = () => setCount(c, countOf(c) - 1); });
  T(() => { bar.querySelector("#lx45Up").onclick = () => setCount(c, countOf(c) + 1); });
  T(() => {
   const n = bar.querySelector("#lx45Num");
   n.onchange = () => setCount(c, Number(n.value));
  });
  return bar;
 }

 function fixDetail() {
  const c = activeConn();
  const ladder = $("wlLadder");
  if (!c || !ladder) return;
  const total = countOf(c), editing = !!G("wlEditMode");

  relabel(document.querySelector("#screen-wavelength .wl-detail-level-tag"), c, c.level, total);

  const rungs = [...ladder.querySelectorAll(".wl-rung")];
  const raise = ladder.querySelector(".wl-raise-btn");
  const raiseWrap = raise ? raise.parentNode : null;

  for (let i = total; i < rungs.length; i++) rungs[i].remove();
  for (let i = rungs.length; i < total; i++) {
   const node = rungNode(c, i, editing);
   if (raiseWrap) ladder.insertBefore(node, raiseWrap);
   else ladder.appendChild(node);
  }

  /* The button the Ledger drew assumed a ceiling of ten, so it is present
     when it should not be and absent when it should. Both are corrected. */
  if (raiseWrap && c.level >= total) raiseWrap.remove();
  if (!raiseWrap && c.level < total && !editing) {
   const w = document.createElement("div");
   w.style.textAlign = "center";
   const b = document.createElement("button");
   b.className = "wl-raise-btn";
   b.style.setProperty("--wl-c", c.color);
   b.textContent = "Raise To " + (c.level + 1) + "/" + total + " — " + titleOf(c, c.level);
   b.onclick = () => T(() => G("raiseWavelength")(c.id));
   w.appendChild(b);
   ladder.appendChild(w);
  } else if (raiseWrap && c.level < total) {
   raise.textContent = "Raise To " + (c.level + 1) + "/" + total + " — " + titleOf(c, c.level);
  }

  /* Rebuilt every time rather than left in place. Leaving it alone looked
     fine and was wrong twice over: it survived leaving edit mode, and its
     buttons stayed closed over the PREVIOUS connection, so opening someone
     else and pressing + would quietly edit the person you had just left. */
  const old = document.querySelector(".lx45-bar");
  if (old) old.remove();
  if (editing) ladder.parentNode.insertBefore(countBar(c), ladder);
 }

 /* Rung names for the rungs past the shared ladder are saved alongside the
    buffs and hooks the Ledger already saves. */
 T(() => {
  const orig = window.saveWLEdits;
  if (typeof orig !== "function") return;
  window.saveWLEdits = function () {
   const c = activeConn();
   if (c) document.querySelectorAll(".lx45-name").forEach(inp => {
    const i = Number(inp.dataset.rung), v = inp.value.trim();
    if (!v) return;
    c.rungNames = c.rungNames || [];
    c.rungNames[i] = v;
   });
   return orig.apply(this, arguments);
  };
 });

 /* The ceiling inside raiseWavelength is a hard ten. Wrapped so a ladder of
    three stops at three -- and so a ladder of fifteen is not stopped at ten. */
 T(() => {
  const orig = window.raiseWavelength;
  if (typeof orig !== "function") return;
  window.raiseWavelength = function (id) {
   const c = T(() => (G("connectionsFor")(G("currentUser")) || []).find(x => x.id === id), null);
   if (!c) return orig.apply(this, arguments);
   const total = countOf(c);
   if (c.level >= total) {
    T(() => G("showToast")(esc(c.name) + " is already at the top of this ladder — " +
      total + "/" + total + "."));
    return;
   }
   if (c.level >= 10) {                    // past what the original will do
    c.level += 1;
    T(() => G("openWLDetail")(id));
    T(() => G("showToast")(esc(c.name) + " — now at " + c.level + "/" + total +
      ", " + titleOf(c, c.level - 1) + "."));
    return;
   }
   return orig.apply(this, arguments);
  };
 });

 ["renderWLDetailContent", "openWLDetail"].forEach(fn => T(() => {
  const orig = window[fn];
  if (typeof orig !== "function") return;
  window[fn] = function () {
   const r = orig.apply(this, arguments);
   T(fixDetail);
   return r;
  };
 }));
 T(() => {
  const orig = window.renderWLList;
  if (typeof orig !== "function") return;
  window.renderWLList = function () {
   const r = orig.apply(this, arguments);
   T(fixList);
   return r;
  };
 });

 const css = document.createElement("style");
 css.textContent = `
 .lx45-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  margin:14px 16px 4px;padding:9px 12px;border:1px dashed var(--line);
  background:rgba(255,255,255,.03)}
 .lx45-bar .lbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.12em;
  color:var(--sage)}
 .lx45-bar .note{font-family:var(--font-mono);font-size:9px;color:var(--faint);
  flex:1 1 200px}
 .lx45-btn{font-family:var(--font-display);font-size:14px;line-height:1;width:26px;height:26px;
  border:1px solid var(--line);background:#151220;color:var(--paper);cursor:pointer}
 .lx45-btn:hover{border-color:var(--sage);color:var(--sage)}
 .lx45-num{width:56px;text-align:center;font-family:var(--font-mono);font-size:12px;
  background:var(--wood2);border:1px solid var(--line);color:var(--paper);padding:4px}
 `;
 document.head.appendChild(css);

 window.ledgerRungs = { countOf: countOf, setCount: setCount };
})();
/* ================= END LEDGER EXTENSION 45 ========================= */
