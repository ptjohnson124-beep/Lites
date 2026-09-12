/* ==== BEGIN BLACKBOX READY — injected block, delete to the END marker to revert ==== */
/* SEVENTY-ONE THINGS THAT CAN BE SPENT, AND NOWHERE TO SEE ANY OF THEM.
 *
 * Counted by walking every property assignment in the file: 71 distinct
 * once-per-encounter, once-per-round and cooldown flags. signatureUsed,
 * codexActiveUsed, fieldMedicUsed, loomShieldUsed, crucibleBreathUsed,
 * seismicSlamCooldown, kerenzikovCooldown, relicShardCooldown, and sixty-odd
 * more. Exactly ONE of them is surfaced anywhere in the interface -- the Lite
 * Signature, which has a reset button on the unit card.
 *
 * So the way a table finds out that Yaviel's Field Medic is gone is by
 * choosing it, pressing Resolve, and being told. The decision was already
 * made on a false picture of what was available, and the alternative that
 * should have been chosen instead is now being chosen a beat late, with the
 * round's shape already set by the wrong assumption.
 *
 * WHAT WAS CHECKED AND ISN'T BROKEN. The first read of this looked like a
 * reset bug -- sixteen flags named *ThisRound that nextRound() never clears.
 * It is not a bug: each of them is cleared in its own character's tick
 * handler, which the round change runs. Statuses count down and expire
 * correctly too, and field effects announce themselves when they lift. The
 * problem here is only that none of it can be SEEN before it matters.
 *
 * ---------------------------------------------------------------------------
 * HOW THE PANEL FINDS THEM
 *
 * By reading the unit's own properties and keeping the ones whose names end
 * in Used, ThisRound or Cooldown -- not from a list typed in here. A list
 * would be wrong the first time somebody adds an ability, and this file gets
 * abilities added to it constantly. Add crucibleBreathUsed tomorrow under a
 * new name and it appears in the panel the moment it is first set, with no
 * edit here.
 *
 * The value decides the wording, because these flags are not all the same
 * shape: a boolean is SPENT, a Cooldown number is rounds remaining, and a
 * counter like mapMovesUsedThisRound is a count of what has been used this
 * round rather than a lockout. Calling all three "spent" would be a lie in
 * two of the three cases.
 *
 * ---------------------------------------------------------------------------
 * AND THE SHOT ITSELF
 *
 * The tracker knows the distance to the target, the attacker's effective
 * weapon range, what being past it costs, and whether the target is standing
 * in cover. It computes all of it inside applyDamageToTarget and reports it in
 * the log AFTERWARDS -- "[BATTLE MAP — OUT OF RANGE] Cole is 5 tiles out (1
 * effective) — 14 dmg lost to distance." Useful, and a round too late to do
 * anything with.
 *
 * The same three numbers are read here, through the file's own gridDistance(),
 * weaponRangeOf() and terrainAt(), and shown BEFORE the button is pressed,
 * with the same 1 − over×0.18 falloff floored at 0.25 that the damage path
 * uses. If those move, this moves with them.
 */
(function () {
 "use strict";
 if (window.__bbReady) return;
 window.__bbReady = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
 const eng = () => T(() => G("S").eng, null);

 const FLAG = /(Used|ThisRound|Cooldown)$/;

 /* seismicSlamCooldown -> "Seismic Slam", crucibleBreathUsed -> "Crucible
    Breath". The suffix carries the meaning and is dropped from the name,
    because it is said in the value column instead. */
 function humanise(k) {
  const base = k.replace(FLAG, "").replace(/Used$/, "");
  const words = base.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
 }

 /* One row per spent-or-counting flag. A flag at its resting value -- false,
    0, absent -- is not shown at all: the panel is a list of what is GONE, and
    padding it with forty "still available" lines would bury that. */
 function flagsOf(u) {
  const out = [];
  if (!u) return out;
  Object.keys(u).forEach(k => {
   if (!FLAG.test(k)) return;
   const v = u[k];
   if (v === false || v === null || v === undefined || v === 0) return;
   if (typeof v === "object") return;
   let kind, note;
   if (k.slice(-8) === "Cooldown") {
    kind = "cd";
    note = (typeof v === "number") ? v + " round" + (v === 1 ? "" : "s") + " to go" : "cooling";
   } else if (k.slice(-9) === "ThisRound") {
    kind = "rd";
    note = (v === true) ? "used this round" : v + " this round";
   } else {
    kind = "sp";
    note = (v === true) ? "spent this encounter" : String(v);
   }
   out.push({ k: k, label: humanise(k), kind: kind, note: note });
  });
  /* Cooldowns first — they come back on their own and the number matters.
     Then encounter-spends, then this-round counters. */
  const order = { cd: 0, sp: 1, rd: 2 };
  return out.sort((a, b) => (order[a.kind] - order[b.kind]) || a.label.localeCompare(b.label));
 }

 function statusesOf(u) {
  return ((u && u.statuses) || []).map(s => ({
   n: s.n,
   /* 999 and up is how this file spells "for the rest of the fight". */
   left: (typeof s.roundsLeft === "number")
     ? (s.roundsLeft >= 90 ? "standing" : s.roundsLeft + " rd")
     : ""
  }));
 }

 /* ---- the shot: distance, falloff, cover, read from the file's own maths ---- */
 function shot() {
  const e = eng();
  if (!e) return null;
  const a = e.units.find(u => u.id === ($("resActor") || {}).value);
  const t = e.units.find(u => u.id === ($("resTarget") || {}).value);
  if (!a || !t || a.id === t.id) return null;
  if (a.mapX == null || t.mapX == null) return null;
  const gd = G("gridDistance"), wr = G("weaponRangeOf"), ta = G("terrainAt");
  if (!gd || !wr) return null;
  const dist = T(() => gd(a, t), null);
  const rng = T(() => wr(a), null);
  if (dist == null || rng == null) return null;
  /* The same falloff applyDamageToTarget applies, written the same way, so
     the preview and the hit cannot disagree. */
  const over = Math.max(0, dist - rng);
  const mult = over > 0 ? Math.max(0.25, 1 - over * 0.18) : 1;
  const cell = ta ? T(() => ta(e, t.mapX, t.mapY), null) : null;
  const cover = !!(cell && cell.type === "cover");
  /* WHICH weapon set that reach, because the answer surprises people.
     weaponRangeOf takes the FIRST item in equipped[] with cat "weapon" and
     reads its weaponType -- so a character carrying a sword before a rifle
     has a reach of 1 even while shooting, and everything past one tile is
     taking the distance penalty. That is the tracker's rule, not something
     changed here; naming the weapon is what makes the number explain
     itself, and reordering the gear is what changes it. */
  const eq = (a.equipped || []).find(it => it && it.cat === "weapon") || (a.equipped || [])[0] || null;
  return { attacker: a.name, target: t.name, dist: dist, rng: rng, over: over,
           mult: mult, cover: cover, from: eq ? eq.name : null, type: eq ? eq.weaponType : null,
           a: a, t: t };
 }

 /* ---------------------------------------------------------------------- */

 function paint() {
  const card = document.querySelector(".card.resolve");
  if (!card) return;
  let box = $("bbReady");
  if (!box) {
   box = document.createElement("div");
   box.id = "bbReady";
   box.className = "bbrdy";
   const anchor = $("resOut");
   if (anchor && anchor.parentNode === card) card.insertBefore(box, anchor);
   else card.appendChild(box);
  }
  const e = eng();
  const u = e && e.units.find(x => x.id === ($("resActor") || {}).value);
  if (!u) { box.innerHTML = ""; return; }

  const fl = flagsOf(u), st = statusesOf(u), sh = shot();

  const shotHtml = !sh ? "" :
   '<div class="bbrdy-shot' + (sh.over > 0 ? " far" : "") + '">' +
    '<span class="cap">THE SHOT</span>' +
    '<b>' + sh.dist + '</b> tile' + (sh.dist === 1 ? "" : "s") + ' out · reach <b>' + sh.rng + '</b>' +
    (sh.from ? ' <span class="src" title="Reach comes from the first weapon in this unit\u2019s gear list — reorder the gear to change it.">from ' +
      esc(String(sh.from).split(" — ")[0]) + (sh.type ? ", " + esc(sh.type) : "") + '</span>' : "") +
    (sh.over > 0
      ? ' · <span class="warn">' + sh.over + ' past it — damage ×' + sh.mult.toFixed(2) + '</span>'
      : ' · <span class="good">in reach</span>') +
    (sh.cover ? ' · <span class="warn">' + esc(sh.t.name) + ' is in cover, ×0.85</span>' : "") +
   '</div>';

  const flagHtml = !fl.length
   ? '<div class="bbrdy-none">nothing spent — every once-per-encounter and cooldown ability is available.</div>'
   : '<div class="bbrdy-rows">' + fl.map(f =>
      '<span class="bbrdy-f ' + f.kind + '" title="' + esc(f.k) + '">' +
       '<i>' + esc(f.label) + '</i>' + esc(f.note) + '</span>').join("") + '</div>';

  const stHtml = !st.length ? "" :
   '<div class="bbrdy-rows st">' + st.map(s =>
     '<span class="bbrdy-s">' + esc(s.n) + (s.left ? ' <i>' + esc(s.left) + '</i>' : "") + '</span>').join("") + '</div>';

  box.innerHTML =
   shotHtml +
   '<div class="bbrdy-head"><span class="cap">' + esc(String(u.name).slice(0, 26)).toUpperCase() + ' — ALREADY SPENT</span>' +
    (fl.some(f => f.kind === "sp") ? '<button class="btn tiny" id="bbRdyReset" title="Clears every once-per-encounter flag on this unit. Cooldowns and this-round counters are left alone — they clear themselves.">[NEW ENCOUNTER]</button>' : "") +
   '</div>' +
   flagHtml + stHtml;

  const rb = $("bbRdyReset");
  if (rb) rb.onclick = () => resetEncounter(u);
 }

 /* The file already offers this for the Lite Signature alone, and the wording
    there -- "resets for the new encounter" -- is the same idea. This does it
    for every once-per-encounter flag the unit is actually carrying. Cooldowns
    and this-round counters are deliberately untouched: those come back on
    their own, and clearing them would hand out a free round. */
 function resetEncounter(u) {
  const gone = [];
  Object.keys(u).forEach(k => {
   if (k.slice(-4) !== "Used" || k.slice(-13) === "UsedThisRound") return;
   if (u[k] === false || u[k] === null || u[k] === undefined || u[k] === 0) return;
   if (typeof u[k] === "object") return;
   gone.push(humanise(k));
   u[k] = (typeof u[k] === "number") ? 0 : false;
  });
  if (!gone.length) { T(() => G("toast")("Nothing was spent.")); return; }
  T(() => G("addLog")("system", "[NEW ENCOUNTER] " + u.name + " gets back " + gone.length +
    " once-per-encounter ability" + (gone.length === 1 ? "" : "s") + " — " + gone.join(", ") + "."));
  T(() => G("save")());
  T(() => G("render")());
 }

 T(() => {
  const orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function () { const r = orig.apply(this, arguments); T(paint); return r; };
 });
 ["resActor", "resTarget", "resAction"].forEach(id => T(() => {
  const el = $(id);
  if (el) el.addEventListener("change", () => T(paint));
 }));

 const css = document.createElement("style");
 css.textContent = `
 .bbrdy{margin:0 0 9px;font-family:var(--mono,ui-monospace,monospace)}
 .bbrdy-shot{border:1px solid var(--line,#1c2839);background:rgba(255,255,255,.02);
  padding:6px 10px;margin:0 0 7px;font-size:10px;color:#8194aa}
 .bbrdy-shot.far{border-color:rgba(232,177,58,.4);background:rgba(232,177,58,.06)}
 .bbrdy-shot b{color:#dde5f0}
 .bbrdy-shot .good{color:#6fce88}
 .bbrdy-shot .warn{color:#ffd873}
 .bbrdy-shot .src{color:#5b6a7e}
 .bbrdy .cap{font-size:8.5px;letter-spacing:.13em;color:#5b6a7e;margin-right:9px}
 .bbrdy-head{display:flex;align-items:center;gap:8px;margin:0 0 5px}
 .bbrdy-head .btn{margin-left:auto}
 .bbrdy-none{font-size:9.5px;color:#5b6a7e;padding:1px 0 3px}
 .bbrdy-rows{display:flex;flex-wrap:wrap;gap:4px}
 .bbrdy-rows.st{margin-top:5px}
 .bbrdy-f{font-size:9px;padding:3px 7px;border:1px solid var(--line,#1c2839);color:#8194aa}
 .bbrdy-f i{font-style:normal;color:#dde5f0;margin-right:6px}
 .bbrdy-f.cd{border-color:rgba(57,211,232,.38);color:#39d3e8}
 .bbrdy-f.cd i{color:#7ee6f5}
 .bbrdy-f.sp{border-color:rgba(224,70,76,.38);color:#e0464c}
 .bbrdy-f.sp i{color:#f08a8e}
 .bbrdy-f.rd{border-color:rgba(232,177,58,.32);color:#c9a15a}
 .bbrdy-f.rd i{color:#ffd873}
 .bbrdy-s{font-size:9px;padding:3px 7px;border:1px solid rgba(166,120,224,.34);color:#c9a6ff}
 .bbrdy-s i{font-style:normal;color:#8194aa;margin-left:5px}
 `;
 document.head.appendChild(css);
 T(paint);
 setTimeout(() => T(paint), 600);

 window.blackboxReady = {
  spent: (name) => {
   const e = eng(); if (!e) return [];
   const u = e.units.find(x => String(x.name).indexOf(name) >= 0);
   return u ? flagsOf(u) : [];
  },
  /* The unit objects are dropped from the console view — a shot report that
     prints two entire units is unreadable, and the names are the useful part. */
  shot: () => { const r = shot(); if (!r) return null;
    const c = Object.assign({}, r); delete c.a; delete c.t; return c; },
  reset: (name) => {
   const e = eng(); if (!e) return;
   const u = e.units.find(x => String(x.name).indexOf(name) >= 0);
   if (u) resetEncounter(u);
  },
  repaint: paint
 };
 T(() => G("addLog")("system",
  "[READY] The Resolve card now shows what the selected unit has already spent — once-per-encounter " +
  "abilities, live cooldowns and this-round counters, found by reading the unit rather than from a list, " +
  "so a new ability appears here on its own. It also reads the distance, weapon reach and cover before the " +
  "shot instead of reporting them in the log afterwards."));
})();
/* ================= END BLACKBOX READY ========================= */
