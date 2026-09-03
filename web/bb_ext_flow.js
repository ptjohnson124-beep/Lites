/* ==== BEGIN BLACKBOX FLOW — injected block, delete to the END marker to revert ==== */
/* WHOSE ROUND IS IT, WHO HAS MOVED, AND WHAT JUST HAPPENED.
 *
 * The tracker already knows all of this and shows none of it in one place. The
 * round number is in one panel, the two action pools in another, whether a unit
 * has acted is nowhere at all -- it is on the unit as `acts`, counted across
 * the whole engagement, so it cannot answer the question a table actually asks
 * out loud twelve times a night: WHO HASN'T GONE YET?
 *
 * This is one strip that answers it. No new rules, no new state that matters:
 * it reads the engagement and draws it.
 *
 *   the round, and which side is acting
 *   both pools as pips, so "three actions left" is a glance not a subtraction
 *   every unit as a chip -- name, health, and how many times it has acted THIS
 *     round, with the ones who have not yet acted lit and the spent ones dimmed
 *   the last exchange, in the one line it deserves
 *
 * ACTS THIS ROUND is the only thing here that needs bookkeeping, and it is done
 * by subtraction rather than by a new counter: each unit's lifetime `acts` is
 * photographed when the round turns over, and the chip shows the difference. A
 * unit fielded mid-round starts from its own number, and nothing has to be
 * reset if a block somewhere else adds an action of its own -- the difference
 * is still right.
 *
 * The strip is also the honest place to see the accounting fix at work: if a
 * unit acts and its chip does not move, an action went unspent somewhere.
 */
(function () {
 "use strict";
 if (window.__bbFlow) return;
 window.__bbFlow = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

 let baseline = {};      // unit id -> acts at the top of this round
 let lastRound = null;
 let lastLine = "";      // the most recent exchange, as the log worded it

 function eng() { return T(() => G("S").eng, null); }

 function rebase(e) {
  baseline = {};
  (e.units || []).forEach(u => { baseline[u.id] = u.acts || 0; });
  lastRound = e.round;
 }
 function actsThisRound(u) {
  const b = baseline[u.id];
  if (b === undefined) { baseline[u.id] = u.acts || 0; return 0; }
  return Math.max(0, (u.acts || 0) - b);
 }

 /* The last exchange, taken from the log as it was actually written rather
    than re-described here -- if the wording changes, this follows it. */
 T(() => {
  const orig = window.addLog;
  if (typeof orig !== "function") return;
  window.addLog = function (kind, text) {
   if ((kind === "hit" || kind === "miss") && text) lastLine = String(text);
   return orig.apply(this, arguments);
  };
 });

 function pips(pool, cls) {
  let s = "";
  for (let i = 0; i < pool.max; i++)
   s += '<i class="bbf-pip' + (i < pool.used ? " spent" : "") + ' ' + cls + '"></i>';
  return s;
 }

 function chip(u, e) {
  const hpMax = u.side === "team" ? (u.hpMax || 0) : (u.integMax || u.hpMax || 0);
  const hp = u.side === "team" ? (u.hp || 0) : null;
  const pct = (u.side === "team" && hpMax) ? Math.max(0, Math.min(100, Math.round(hp / hpMax * 100))) : null;
  const n = actsThisRound(u);
  const gone = u.down || u.dead || u.benched;
  const state = u.dead ? "dead" : u.down ? "down" : u.benched ? "benched" : u.skip ? "skip" : "";
  return '<div class="bbf-chip' + (n ? " acted" : "") + (gone ? " out" : "") + ' ' + u.side + '"' +
    ' title="' + esc(u.name) + (pct !== null ? " — " + pct + "% health" : "") +
    " — acted " + n + " time" + (n === 1 ? "" : "s") + ' this round">' +
   '<span class="nm">' + esc(String(u.name).split(" ")[0].slice(0, 13)) + '</span>' +
   (pct !== null ? '<span class="hp"><i style="width:' + pct + '%"></i></span>' : '<span class="hp none"></span>') +
   '<span class="ct">' + (state ? state.toUpperCase() : (n ? "×" + n : "—")) + '</span>' +
   '</div>';
 }

 function mount() {
  const e = eng();
  const anchor = document.getElementById("econ");
  if (!e || !anchor) return;
  let box = document.getElementById("bbFlow");
  if (!box) {
   box = document.createElement("div");
   box.id = "bbFlow";
   box.className = "bbf";
   anchor.parentNode.insertBefore(box, anchor);
  }
  if (lastRound !== e.round) rebase(e);

  const team = (e.units || []).filter(u => u.side === "team");
  const foes = (e.units || []).filter(u => u.side === "enemy");
  const waiting = (e.acting === "team" ? team : foes)
   .filter(u => !u.down && !u.dead && !u.benched && actsThisRound(u) === 0);
  const actingLabel = e.acting === "team" ? "PARTY" : "HOSTILES";

  box.innerHTML =
   '<div class="bbf-head">' +
    '<span class="bbf-rd">ROUND <b>' + (e.round || 1) + '</b></span>' +
    '<span class="bbf-act ' + e.acting + '">' + actingLabel + ' ACTING</span>' +
    '<span class="bbf-pool"><span class="lb">ACTIONS</span>' + pips(e.pools.battle, "b") +
     '<b>' + Math.max(0, e.pools.battle.max - e.pools.battle.used) + '</b></span>' +
    '<span class="bbf-pool"><span class="lb">RETALIATIONS</span>' + pips(e.pools.retal, "r") +
     '<b>' + Math.max(0, e.pools.retal.max - e.pools.retal.used) + '</b></span>' +
    '<span class="bbf-wait">' + (waiting.length
      ? "still to move: " + waiting.map(u => esc(String(u.name).split(" ")[0])).join(", ")
      : "everyone on the acting side has moved") + '</span>' +
   '</div>' +
   '<div class="bbf-cols">' +
    '<div class="bbf-col"><span class="cap t">PARTY</span><div class="bbf-chips">' +
     (team.length ? team.map(u => chip(u, e)).join("") : '<span class="none">nobody fielded</span>') +
    '</div></div>' +
    '<div class="bbf-col"><span class="cap h">HOSTILES</span><div class="bbf-chips">' +
     (foes.length ? foes.map(u => chip(u, e)).join("") : '<span class="none">nobody fielded</span>') +
    '</div></div>' +
   '</div>' +
   (lastLine ? '<div class="bbf-last"><span class="cap">LAST EXCHANGE</span>' + esc(lastLine) + '</div>' : "");
 }

 T(() => {
  const orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function () { const r = orig.apply(this, arguments); T(mount); return r; };
 });
 T(() => {
  const orig = window.nextRound;
  if (typeof orig !== "function") return;
  window.nextRound = function () {
   const r = orig.apply(this, arguments);
   const e = eng(); if (e) rebase(e);
   T(mount);
   return r;
  };
 });

 const css = document.createElement("style");
 css.textContent = `
 .bbf{border:1px solid var(--line,#1c2839);background:rgba(255,255,255,.02);margin:0 0 10px;
  font-family:var(--mono,ui-monospace,monospace)}
 .bbf-head{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:9px 13px;
  border-bottom:1px solid var(--line,#1c2839)}
 .bbf-rd{font-size:10px;letter-spacing:.14em;color:#8194aa}
 .bbf-rd b{color:#dde5f0;font-size:14px;margin-left:4px}
 .bbf-act{font-size:9.5px;letter-spacing:.14em;padding:3px 9px;border:1px solid}
 .bbf-act.team{color:#39d3e8;border-color:rgba(57,211,232,.45);background:rgba(57,211,232,.08)}
 .bbf-act.enemy{color:#e0464c;border-color:rgba(224,70,76,.45);background:rgba(224,70,76,.08)}
 .bbf-pool{display:flex;align-items:center;gap:4px}
 .bbf-pool .lb{font-size:8.5px;letter-spacing:.12em;color:#5b6a7e;margin-right:3px}
 .bbf-pool b{font-size:11px;color:#dde5f0;margin-left:4px;font-variant-numeric:tabular-nums}
 .bbf-pip{width:8px;height:8px;border-radius:50%;display:inline-block;border:1px solid}
 .bbf-pip.b{border-color:#39d3e8;background:#39d3e8}
 .bbf-pip.r{border-color:#a678e0;background:#a678e0}
 .bbf-pip.spent{background:transparent;opacity:.35}
 .bbf-wait{flex:1 1 240px;font-size:10px;color:#8194aa;text-align:right;line-height:1.4}
 .bbf-cols{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line,#1c2839)}
 .bbf-col{background:rgba(0,0,0,.12);padding:9px 13px 11px}
 .bbf-col .cap{display:block;font-size:8.5px;letter-spacing:.14em;margin-bottom:7px}
 .bbf-col .cap.t{color:#39d3e8} .bbf-col .cap.h{color:#e0464c}
 .bbf-chips{display:flex;flex-wrap:wrap;gap:6px}
 .bbf-chips .none{font-size:10px;color:#5b6a7e}
 .bbf-chip{display:grid;grid-template-columns:auto 34px auto;gap:6px;align-items:center;
  padding:4px 8px;border:1px solid var(--line,#1c2839);background:rgba(255,255,255,.03)}
 .bbf-chip.team{border-left:2px solid #39d3e8}
 .bbf-chip.enemy{border-left:2px solid #e0464c}
 .bbf-chip.acted{opacity:.52}
 .bbf-chip.out{opacity:.3;text-decoration:line-through}
 .bbf-chip .nm{font-size:10.5px;color:#dde5f0}
 .bbf-chip .hp{display:block;height:4px;background:rgba(255,255,255,.10);position:relative}
 .bbf-chip .hp i{position:absolute;inset:0 auto 0 0;background:#39d3e8}
 .bbf-chip.enemy .hp i{background:#e0464c}
 .bbf-chip .hp.none{background:repeating-linear-gradient(90deg,rgba(255,255,255,.12) 0 2px,transparent 2px 4px)}
 .bbf-chip .ct{font-size:9px;color:#8194aa;font-variant-numeric:tabular-nums}
 .bbf-last{padding:8px 13px;border-top:1px solid var(--line,#1c2839);font-size:10.5px;
  color:#c2cedd;line-height:1.45}
 .bbf-last .cap{font-size:8.5px;letter-spacing:.14em;color:#5b6a7e;margin-right:9px}
 @media (max-width:720px){.bbf-cols{grid-template-columns:1fr}.bbf-wait{text-align:left}}
 `;
 document.head.appendChild(css);

 T(mount);
 setTimeout(() => T(mount), 500);
 window.blackboxFlow = { redraw: mount, rebase: () => { const e = eng(); if (e) rebase(e); } };
})();
/* ================= END BLACKBOX FLOW ========================= */
