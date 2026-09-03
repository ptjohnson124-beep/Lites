/* ==== BEGIN BLACKBOX ZIGGY'S NEST — injected block, delete to the END marker to revert ==== */
/* HE CAN CALL THEM OUT, AND HE CAN SEE WHAT HE HAS FIRST.
 *
 * Ziggy could already TAME a nest creature the party was fighting (CALL OFF
 * THE SWARM), but he had no way to bring his own. This adds the other half: a
 * brood he actually keeps, a look at it before he commits, and one creature out
 * onto the field per call.
 *
 * THE COUNT COMES FIRST. That is the point of the spec rather than a nicety --
 * the panel opens on the roster, showing how many of each insect he has left,
 * what each one is, and what it costs him, and nothing is spent until he picks
 * one. Backing out returns the action and the MF, because a look at the nest is
 * not a turn.
 *
 * The three are the tracker's own hostile templates, cloned through
 * cloneEnemyTpl and flipped to his side, so a deployed drone is a REAL unit
 * with the real stats, kit and resistances the nest fights with -- not a token
 * with a name:
 *
 *   Trap-Jaw Ant Drone       lvl 20 · 140 integ · atk 26 · eva 16 · heavy pincer
 *   Sickle-Ant Drone         lvl 16 · 100 integ · atk 22 · eva 26 · paired scythes
 *   Centipede-Fused Horror   lvl 30 · 220 integ · atk 34 · eva 18 · the strongest
 *
 * The brood is stock, not summoning from nowhere: deploying spends one, and it
 * does not come back on its own. A creature TAMED with CALL OFF THE SWARM can
 * be taken into the nest from this panel, which is how the stock refills and
 * what makes the two specs one loop rather than two unrelated buttons.
 *
 * The counts are the GM's to set. Every row has +/- and the whole thing lives
 * on the unit, so it saves and loads with everything else.
 */
(function () {
 "use strict";
 if (window.__bbNest) return;
 window.__bbNest = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const log = (m) => T(() => G("addLog")("system", m));
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

 const SPEC_NAME = "THE NEST ANSWERS";
 const MF_COST = 14;
 const BROOD = [
  { n: "Trap-Jaw Ant Drone", start: 4, line: "Heavy pincer, cable-tethered. The one you send to hold a line." },
  { n: "Sickle-Ant Drone", start: 3, line: "Paired scythe-arms, bare-footed. Fast, and not built to take a hit." },
  { n: "Centipede-Fused Horror", start: 1, line: "The strongest of the brood. He does not have many." }
 ];

 const isZiggy = (u) => !!(u && u.name && u.name.indexOf("Ziggy") >= 0);

 function stock(u) {
  if (!u.nestStock) {
   u.nestStock = {};
   BROOD.forEach(b => { u.nestStock[b.n] = b.start; });
  }
  BROOD.forEach(b => { if (typeof u.nestStock[b.n] !== "number") u.nestStock[b.n] = 0; });
  return u.nestStock;
 }

 /* The spec is appended to whatever specsFor already returns rather than being
    written into the character table, so it survives a rebuild of the file and
    cannot collide with a spec of the same name added later. */
 T(() => {
  const orig = window.specsFor;
  if (typeof orig !== "function") return;
  window.specsFor = function (u) {
   const list = orig.apply(this, arguments) || [];
   if (!isZiggy(u) || list.some(s => s && s.n === SPEC_NAME)) return list;
   return list.concat([{
    n: SPEC_NAME, mf: MF_COST, hit: 0, bypass: false, type: "utility", icon: "🐜",
    d: "Opens the nest. Shows how many of each insect he actually has left, then " +
       "sends ONE out to fight and defend him — a real unit with the brood's real " +
       "stats. Backing out costs nothing. Tamed creatures on the field can be " +
       "taken into the nest from here, which is the only way the stock refills."
   }]);
  };
 });

 /* ---- the panel ------------------------------------------------------- */
 let host = null;
 function shell() {
  if (host && host.isConnected) return host;
  host = document.createElement("div");
  host.id = "bbNestBg";
  host.className = "bbnest-bg";
  host.onclick = (ev) => { if (ev.target === host) close(false); };
  document.body.appendChild(host);
  return host;
 }
 function close(refund) {
  if (refund) refundCall();
  if (host) host.style.display = "none";
  open_ = null;
 }

 let open_ = null;          // { actor, mfSpent, actionCharged }
 function refundCall() {
  if (!open_) return;
  const e = T(() => G("S").eng, null);
  if (e && open_.actionCharged) {
   const p = (open_.actor.side === e.acting) ? e.pools.battle : e.pools.retal;
   p.used = Math.max(0, p.used - 1);
  }
  if (open_.mfSpent) open_.actor.mf = Math.min(100, (open_.actor.mf || 0) + open_.mfSpent);
  log("[THE NEST] " + open_.actor.name + " looks the brood over and closes the lid again — nothing spent.");
  open_ = null;
  T(() => G("render")());
 }

 function deployed(e, actor) {
  return (e.units || []).filter(u => u.summonedByZiggyId === actor.id && !u.dead);
 }

 function draw() {
  if (!open_) return;
  const e = T(() => G("S").eng, null);
  if (!e) return;
  const actor = open_.actor, st = stock(actor);
  const out = deployed(e, actor);
  const rows = BROOD.map(b => {
   const have = st[b.n] | 0;
   const onField = out.filter(u => u.name.indexOf(b.n) === 0).length;
   return '<div class="bbnest-row' + (have ? "" : " empty") + '">' +
    '<div class="bbnest-count"><button class="bbnest-pm" data-adj="' + esc(b.n) + '" data-d="-1">−</button>' +
     '<span class="n">' + have + '</span>' +
     '<button class="bbnest-pm" data-adj="' + esc(b.n) + '" data-d="1">+</button></div>' +
    '<div class="bbnest-who"><b>' + esc(b.n) + '</b><span>' + esc(b.line) + '</span>' +
     (onField ? '<em>' + onField + ' already out</em>' : '') + '</div>' +
    '<button class="bbnest-go" data-send="' + esc(b.n) + '"' + (have ? "" : " disabled") + '>' +
     (have ? "Send it out" : "None left") + '</button></div>';
  }).join("");

  /* A creature he tamed off the enemy side can be folded into the brood. */
  const takeable = (e.units || []).filter(u => u.tamedBy && !u.dead && u.side === actor.side &&
                                               BROOD.some(b => u.name.indexOf(b.n) === 0));
  const take = takeable.length
   ? '<div class="bbnest-take"><span class="cap">TAKE INTO THE NEST</span>' +
     takeable.map(u => '<button class="bbnest-tk" data-take="' + esc(u.id) + '">' +
       esc(u.name) + ' →</button>').join("") +
     '<span class="note">Tamed off the other side. Folding one in removes it from the field and adds it to the stock.</span></div>'
   : "";

  shell().style.display = "flex";
  host.innerHTML =
   '<div class="bbnest">' +
    '<div class="bbnest-top"><span class="t">THE NEST ANSWERS</span>' +
     '<span class="s">' + esc(actor.name) + ' — what is actually in there right now</span></div>' +
    '<div class="bbnest-rows">' + rows + '</div>' + take +
    '<div class="bbnest-foot">' +
     '<span class="note">Sending one out costs the action and ' + MF_COST +
      ' MF, already held. Backing out returns both.</span>' +
     '<button class="bbnest-close" data-close="1">Never mind</button>' +
    '</div>' +
   '</div>';

  host.querySelectorAll("[data-adj]").forEach(b => b.onclick = () => {
   const k = b.dataset.adj;
   st[k] = Math.max(0, Math.min(99, (st[k] | 0) + (+b.dataset.d)));
   T(() => G("save")()); draw();
  });
  host.querySelectorAll("[data-send]").forEach(b => b.onclick = () => send(b.dataset.send));
  host.querySelectorAll("[data-take]").forEach(b => b.onclick = () => takeIn(b.dataset.take));
  host.querySelector("[data-close]").onclick = () => close(true);
 }

 function send(name) {
  if (!open_) return;
  const e = T(() => G("S").eng, null);
  const actor = open_.actor, st = stock(actor);
  if (!e || (st[name] | 0) <= 0) return;
  const tpl = T(() => (G("ENEMY_TPL") || []).find(t => t.name === name), null);
  if (!tpl) { log("[THE NEST] No record for " + name + " — nothing came out."); return; }
  const u = T(() => G("cloneEnemyTpl")(tpl), null);
  if (!u) { log("[THE NEST] " + name + " would not clone — nothing came out."); return; }
  u.side = actor.side;
  u.hpMax = u.integMax || u.hpMax || 100;
  u.hp = u.hpMax;
  u.hpLayers = null;
  T(() => G("ensureHpLayers")(u));
  u.summonedByZiggy = actor.name;
  u.summonedByZiggyId = actor.id;
  e.units.push(u);
  st[name] = (st[name] | 0) - 1;
  open_ = null;                       // the call is paid for; no refund now
  close(false);
  log("[THE NEST ANSWERS] " + actor.name + " opens it and a " + name +
      " comes out onto his side — real stats, real kit, " + u.hp + " integrity. " +
      (st[name] | 0) + " left in the nest.");
  T(() => G("save")()); T(() => G("render")());
 }

 function takeIn(id) {
  const e = T(() => G("S").eng, null);
  if (!e || !open_) return;
  const u = (e.units || []).find(x => x.id === id);
  if (!u) return;
  const actor = open_.actor, st = stock(actor);
  const b = BROOD.find(x => u.name.indexOf(x.n) === 0);
  if (!b) return;
  st[b.n] = (st[b.n] | 0) + 1;
  e.units = e.units.filter(x => x.id !== id);
  log("[THE NEST] " + u.name + " goes into the nest rather than back to the swarm — " +
      actor.name + " now has " + st[b.n] + " of them. It leaves the field to do it.");
  T(() => G("save")()); T(() => G("render")());
  draw();
 }

 /* ---- entry point ----------------------------------------------------- */
 T(() => {
  const orig = window.applyCustomSpecEffect;
  if (typeof orig !== "function") return;
  window.applyCustomSpecEffect = function (s, actor, target, ratio) {
   if (!s || s.n !== SPEC_NAME || !actor) return orig.apply(this, arguments);
   /* resolve() has already taken the MF and the action by the time a spec
      effect runs, so both are recorded here and handed back if he backs out. */
   open_ = { actor: actor, mfSpent: MF_COST, actionCharged: true };
   T(draw);
   return;
  };
 });

 const css = document.createElement("style");
 css.textContent = `
 .bbnest-bg{position:fixed;inset:0;z-index:900;background:rgba(4,6,10,.72);
  display:none;align-items:center;justify-content:center;padding:22px}
 .bbnest{width:min(620px,94vw);max-height:86vh;overflow:auto;background:#0d121b;
  border:1px solid #1c2839;box-shadow:0 22px 60px rgba(0,0,0,.6)}
 .bbnest-top{padding:14px 18px 12px;border-bottom:1px solid #1c2839;background:#111825}
 .bbnest-top .t{display:block;font-family:var(--mono,monospace);font-size:12px;
  letter-spacing:.16em;color:#c6ff3d}
 .bbnest-top .s{display:block;font-size:11.5px;color:#8194aa;margin-top:4px}
 .bbnest-rows{display:flex;flex-direction:column}
 .bbnest-row{display:grid;grid-template-columns:104px 1fr auto;gap:12px;align-items:center;
  padding:12px 18px;border-bottom:1px solid #16202e}
 .bbnest-row.empty{opacity:.5}
 .bbnest-count{display:flex;align-items:center;gap:7px}
 .bbnest-count .n{font-family:var(--mono,monospace);font-size:19px;color:#dde5f0;
  min-width:26px;text-align:center;font-variant-numeric:tabular-nums}
 .bbnest-pm{width:22px;height:22px;line-height:1;border:1px solid #1c2839;background:#151f2c;
  color:#8194aa;cursor:pointer;font-size:13px}
 .bbnest-pm:hover{color:#c6ff3d;border-color:#c6ff3d}
 .bbnest-who b{display:block;font-size:13.5px;color:#dde5f0}
 .bbnest-who span{display:block;font-size:11.5px;color:#8194aa;line-height:1.45;margin-top:2px}
 .bbnest-who em{display:block;font-style:normal;font-size:10.5px;color:#f08a3a;margin-top:3px}
 .bbnest-go{font-family:var(--mono,monospace);font-size:10.5px;letter-spacing:.05em;
  padding:8px 13px;border:1px solid #1c2839;background:#151f2c;color:#dde5f0;cursor:pointer;
  white-space:nowrap}
 .bbnest-go:hover:not([disabled]){border-color:#c6ff3d;color:#c6ff3d}
 .bbnest-go[disabled]{opacity:.4;cursor:default}
 .bbnest-take{padding:12px 18px;border-bottom:1px solid #16202e;display:flex;
  flex-wrap:wrap;gap:8px;align-items:center}
 .bbnest-take .cap{font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.12em;
  color:#a678e0;flex:1 1 100%}
 .bbnest-tk{font-family:var(--mono,monospace);font-size:10px;padding:6px 10px;
  border:1px solid #2a2140;background:#181228;color:#c9a6ff;cursor:pointer}
 .bbnest-tk:hover{border-color:#a678e0}
 .bbnest-take .note{flex:1 1 100%;font-size:10.5px;color:#5b6a7e;line-height:1.45}
 .bbnest-foot{display:flex;align-items:center;gap:14px;padding:13px 18px;background:#111825}
 .bbnest-foot .note{flex:1;font-size:10.5px;color:#5b6a7e;line-height:1.45}
 .bbnest-close{font-family:var(--mono,monospace);font-size:10.5px;padding:8px 13px;
  border:1px solid #1c2839;background:#151f2c;color:#8194aa;cursor:pointer}
 .bbnest-close:hover{color:#e0464c;border-color:#e0464c}
 `;
 document.head.appendChild(css);

 window.blackboxNest = { stock: stock, BROOD: BROOD, open: (u) => { open_ = { actor: u, mfSpent: 0, actionCharged: false }; draw(); } };
})();
/* ================= END BLACKBOX ZIGGY'S NEST ========================= */
