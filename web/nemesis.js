/* ==== BEGIN NEMESIS PROTOCOL — injected block, delete to the END marker to revert ==== */
/* NEMESIS PROTOCOL — an adaptive hostile intelligence for the combat tracker.
 *
 * WHAT THIS IS, SAID PLAINLY. The tracker is one HTML file opened off a disk
 * with no network, so this cannot be a language model and does not pretend to
 * be one. It is an online statistical learner: it watches every exchange the
 * party actually resolves, builds recency-weighted conditional models of how
 * they fight, and searches the tracker's OWN action and retaliation tables for
 * the reply with the best expected value. Everything it recommends is arrived
 * at from numbers this file already uses -- RETAL_DMG_MULT, MITIGATION_CFG,
 * AVOID, STRIKEBACK -- rather than from a table of guesses written alongside.
 * That is the whole design: the AI reasons with the game's real mechanics, so
 * when it says a defence beats an action, it is right for the reason the rules
 * say it is right.
 *
 * WHY IT IS A NEMESIS SYSTEM AND NOT A DIFFICULTY SLIDER. Memory lives in its
 * own localStorage key, not in the engagement. A nemesis that fought the party
 * last session still knows them this session; it remembers who hurt it, what
 * killed it, and which defence that one player always reaches for. Levelling
 * does not merely raise its numbers -- it changes HOW IT THINKS, and each step
 * is a named cognitive faculty rather than a multiplier. See LEVELS below.
 *
 * IT NEVER TOUCHES THE FIGHT. This block reads state and recommends; it does
 * not roll, apply damage, or move a unit. The GM stays the one who decides.
 * That is deliberate -- a tracker that starts playing itself stops being a
 * tracker -- and it is also what makes the block safe to delete.
 */
(function () {
 "use strict";
 if (window.__nemesisLoaded) return;
 window.__nemesisLoaded = true;

 /* ---- 0. GUARDS ------------------------------------------------------
    Everything here reads the tracker's own globals. If a future version of
    the tracker renames one, this block must go quiet rather than throw --
    a broken AI panel that takes the tracker down with it is far worse than
    no AI panel. Every entry point is wrapped, and `alive` latches false on
    the first sign that the ground has moved. */
 let alive = true;
 const T = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };

 /* READING THE TRACKER'S TABLES, which is harder than it looks and was wrong
    for one build. The tracker declares them with `const` at the top level of a
    classic script, and a top-level `const` creates a LEXICAL global: reachable
    as a bare identifier, never as a property of window. Every `window.
    RETAL_TYPES` in the first version was undefined, and because every lookup
    here is guarded, nothing threw -- the whole defensive half of the AI simply
    ran on fallbacks and recommended nothing, quietly.

    new Function() compiles in global scope, so it can see those bindings. */
 const G = (name) => T(() => (new Function("return typeof " + name +
   '!=="undefined" ? ' + name + " : null"))(), null);

 /* Four of the lists this needs are declared INSIDE a function in the tracker
    and are not globals at all, so no amount of scope trickery reaches them.
    They are lifted out of the tracker's source at injection time instead --
    tools/inject_nemesis.py parses them and substitutes them here -- so they
    stay true to the file rather than being a copy typed alongside it that
    silently rots the first time a retaliation is reclassified. */
 const LIFTED = __TABLES__;

 /* ---- 1. VOCABULARY --------------------------------------------------
    Read from the tracker at runtime, never copied. The action list is the
    84 <option>s of #resAction and the defence list is RETAL_TYPES, so a
    house rule that adds an action gets learned the moment it is added
    without a line changing here. */
 const ACTS = () => T(() => Array.from(document.getElementById("resAction").options)
   .filter(o => o.value).map(o => ({ id: o.value, label: o.text.trim() })), []);
 const ACT_LABEL = (id) => T(() => (ACTS().find(a => a.id === id) || {}).label || id, id);
 const RETALS = () => T(() => (G("RETAL_TYPES") || []).map(r => ({ id: r.id, label: r.label })), []);
 const RETAL_LABEL = (id) => T(() => (RETALS().find(r => r.id === id) || {}).label || id, id);

 /* How a defence behaves, taken from the tracker's own numbers rather than
    described again here. Three families, and the difference between them is
    the whole of the counter-picking below:
      AVOID      — negates the hit outright, but only if it connects at all
      BLOCK      — always eats a share, mitigation from MITIGATION_CFG
      STRIKEBACK — takes the hit and returns RETAL_DMG_MULT of it
    A type in none of them is a special case the AI declines to model, which
    is better than modelling it wrong. */
 function retalClass(id) {
  const AV = LIFTED.AVOID || [], SB = LIFTED.STRIKEBACK || [];
  const AVT = LIFTED.AVOIDANCE_TYPES || [];
  if (AV.indexOf(id) >= 0 || AVT.indexOf(id) >= 0) return "avoid";
  const MIT = G("MITIGATION_CFG");
  if (MIT && MIT[id]) return "block";
  if (SB.indexOf(id) >= 0 || (LIFTED.STRIKEBACK_TYPES || []).indexOf(id) >= 0) return "strikeback";
  return "other";
 }
 const retalMit = (id) => T(() => (G("MITIGATION_CFG")[id] || {}).mit || 0, 0);
 const retalHitBack = (id) => T(() => G("RETAL_DMG_MULT")[id] || 0, 0);

 /* Actions grouped by the shape of the threat they present, which is what a
    defence actually answers. Derived from the option TEXT the tracker writes
    -- the labels carry their own tags ([COMBO], multi-target, PWR-based) --
    so this classifies 84 actions without an 84-line table that would rot the
    first time one was reworded. */
 function actShape(id, label) {
  const L = (label || "").toLowerCase();
  if (/aoe|every unit|multi-target|mass /.test(L)) return "aoe";
  if (/flurry|combo|multi-ranged|shots in succession|escalating/.test(L)) return "multi";
  if (/ranged|shot|blitz/.test(L)) return "ranged";
  if (/grab|throw|slam|knockdown|disarm/.test(L)) return "grapple";
  if (/mental|taunt|humiliate|daze|disorient|scan/.test(L)) return "mind";
  if (/heavy|overdrive|vital|pressure|docswing/.test(L)) return "heavy";
  if (/engine|lite|spec|virus|frequency|codex|signature/.test(L)) return "exotic";
  return "direct";
 }

 /* Expected fraction of an attack that GETS THROUGH a defence, by shape.
    This is the one judgement table in the file, and it is small on purpose:
    each number says how well that family of defence copes with that shape of
    attack, and the per-type numbers underneath it are the tracker's. */
 const THROUGH = {
  avoid:      { direct: .25, multi: .60, ranged: .35, grapple: .55, mind: .70, heavy: .20, exotic: .55, aoe: .80 },
  block:      { direct: .55, multi: .70, ranged: .60, grapple: .75, mind: .85, heavy: .80, exotic: .75, aoe: .70 },
  strikeback: { direct: .70, multi: .85, ranged: .80, grapple: .70, mind: .80, heavy: .90, exotic: .80, aoe: .90 },
  other:      { direct: .70, multi: .75, ranged: .75, grapple: .75, mind: .75, heavy: .80, exotic: .70, aoe: .85 }
 };

 /* ---- 2. LEVELS ------------------------------------------------------
    A level is a way of thinking, not a stat block. Each rung switches on a
    faculty the rung below does not have, and the labels are what the panel
    shows the GM so they can say out loud what the thing is doing.

      decay   how fast old observations stop counting. A low-level nemesis
              weights a fight from six sessions ago the same as tonight's; a
              high-level one notices you changed tactics two rounds ago.
      noise   how far off the best answer it is willing to land. This is the
              single biggest difference in play: a Wary nemesis often picks
              the second- or third-best reply, which reads as a thug making a
              reasonable mistake rather than a computer being wrong.
      ctx     whether it conditions on context — what you open with, and what
              you reach for after being hurt — or only on flat frequency.
      depth   how many of your likely replies it plans against.
      recall  how many distinct behaviours it can hold at once.
 */
 const LEVELS = [
  { n: 1,  name: "DORMANT",     decay: .995, noise: .85, ctx: 0, depth: 1, recall: 2,
    note: "Fights on instinct. Notices nothing on purpose." },
  { n: 2,  name: "WARY",        decay: .99,  noise: .65, ctx: 0, depth: 1, recall: 3,
    note: "Has started to notice which way you move." },
  { n: 3,  name: "WATCHFUL",    decay: .98,  noise: .48, ctx: 0, depth: 1, recall: 4,
    note: "Counts what you do. Still answers the last thing, not the next." },
  { n: 4,  name: "READING",     decay: .97,  noise: .34, ctx: 1, depth: 1, recall: 5,
    note: "Reads your opening move separately from the rest of the round." },
  { n: 5,  name: "ADAPTIVE",    decay: .955, noise: .24, ctx: 1, depth: 2, recall: 6,
    note: "Answers what you are about to do, and plans past your first reply." },
  { n: 6,  name: "PREDICTIVE",  decay: .94,  noise: .16, ctx: 1, depth: 2, recall: 8,
    note: "Knows what you reach for when you are hurt." },
  { n: 7,  name: "EXPLOITING",  decay: .93,  noise: .10, ctx: 1, depth: 2, recall: 10,
    note: "Aims at the defence you never pick." },
  { n: 8,  name: "ANTICIPATING",decay: .92,  noise: .06, ctx: 1, depth: 3, recall: 12,
    note: "Plays the round, not the exchange." },
  { n: 9,  name: "APEX",        decay: .91,  noise: .03, ctx: 1, depth: 3, recall: 16,
    note: "Holds every habit any of you has shown it." },
  { n: 10, name: "NEMESIS",     decay: .90,  noise: .01, ctx: 1, depth: 3, recall: 24,
    note: "It has your number. Change how you fight or lose." }
 ];
 const lvl = (n) => LEVELS[Math.max(0, Math.min(LEVELS.length - 1, (n | 0) - 1))];

 /* ---- 3. MEMORY ------------------------------------------------------
    Its own localStorage key, and that is the point. S is wiped by a new
    engagement; a nemesis that forgot you between fights would be a
    difficulty setting wearing a name. This survives Reset System, survives
    a fresh log, and is keyed by unit NAME rather than id because ids are
    regenerated every time a unit is fielded.

    Shape:
      nem[name] = { name, level, xp, fights, kills, deaths,
                    seen  : { actId: weight }            flat frequency
                    open  : { actId: weight }            round openers
                    hurt  : { actId: weight }            replies to being hurt
                    def   : { retalId: weight }          defences chosen
                    defOk : { retalId: weight }          defences that worked
                    per   : { unitName: {seen, def, dmgTo, dmgFrom} }
                    grudge: { unitName: weight }
                    scars : [ {act, by, round} ]
                    adapt : [ id ]                       earned faculties
                    log   : [ short strings for the dossier ] }
 */
 const KEY = "wings_nemesis_v1";
 let NEM = { v: 1, nem: {} };
 function memLoad() {
  try { const r = localStorage.getItem(KEY); if (r) { const p = JSON.parse(r); if (p && p.nem) NEM = p; } }
  catch (e) { /* a corrupt key is a fresh start, not a crash */ }
 }
 function memSave() { try { localStorage.setItem(KEY, JSON.stringify(NEM)); } catch (e) {} }
 const nkey = (name) => String(name || "").trim().toLowerCase();

 function dossier(name) {
  const k = nkey(name);
  if (!NEM.nem[k]) NEM.nem[k] = {
   name: name, level: 1, xp: 0, fights: 0, kills: 0, deaths: 0,
   seen: {}, open: {}, hurt: {}, def: {}, defOk: {},
   per: {}, grudge: {}, scars: [], adapt: [], log: []
  };
  return NEM.nem[k];
 }

 /* A decayed counter. Every observation ages what came before it by the
    nemesis's own decay, so the model tracks the party's CURRENT habits
    rather than their lifetime average -- which is the difference between a
    nemesis that adapts and a nemesis that has merely seen a lot. */
 function bump(tbl, key, d, amt) {
  if (!key) return;
  for (const k in tbl) tbl[k] *= d;
  tbl[key] = (tbl[key] || 0) + (amt === undefined ? 1 : amt);
  for (const k in tbl) if (tbl[k] < 0.01) delete tbl[k];
 }
 const total = (tbl) => { let s = 0; for (const k in tbl) s += tbl[k]; return s; };
 function dist(tbl) {
  const s = total(tbl); if (!s) return {};
  const o = {}; for (const k in tbl) o[k] = tbl[k] / s; return o;
 }

 /* ---- 4. OBSERVATION -------------------------------------------------
    The tracker resolves an exchange inside functions far too large and far
    too branchy to instrument line by line -- resolve() alone runs to
    thousands of lines of special cases. So nothing is instrumented. The
    exchange is observed the way a person watching the table would: snapshot
    who has what before, let the tracker do whatever it does, snapshot after,
    and read the difference.

    That is not a shortcut. It is the only approach that cannot be broken by
    a rule the tracker adds later, because HP going down is HP going down
    however the tracker got there. */
 function snap() {
  return T(() => {
   const o = {};
   (S.eng.units || []).forEach(u => {
    o[u.id] = { hp: u.hp | 0, pmf: u.pmf | 0,
                taken: u.recentDmgTaken | 0, done: u.dmgDone | 0, hits: u.hitsThisTurn | 0,
                down: !!u.down, dead: !!u.dead, name: u.name, side: u.side };
   });
   o.__eng = { integ: T(() => S.eng.enemyInteg | 0, 0) };
   return o;
  }, {});
 }

 /* HOW DAMAGE IS ACTUALLY SEEN, which took a browser probe to get right.
    The obvious reading -- watch unit.hp -- works for the party and reads zero
    forever for hostiles, because in this tracker HOSTILES HAVE NO PER-UNIT HP.
    A hit on one lands on the shared enemyInteg pool instead, and the unit
    itself records it in recentDmgTaken. The first version watched hp alone,
    so it learned what the party DID perfectly well and never once noticed
    anyone being hurt: no grudges, no scars, no ledger. It looked like it was
    working, which is the dangerous kind of broken.

    Three counters, and all three are cumulative, so the signal is the DELTA:
      hp              falls when a party unit is hurt
      recentDmgTaken  rises when anyone is hurt, hostiles included
      dmgDone         rises on whoever dealt it
    Taking the max of the first two means one rule covers both sides without
    asking which side a unit is on. */
 function hurtOf(b, a) {
  if (!b || !a) return 0;
  return Math.max(0, Math.max(b.hp - a.hp, a.taken - b.taken));
 }
 const dealtOf = (b, a) => (!b || !a) ? 0 : Math.max(0, a.done - b.done);

 let lastRound = -1, roundOpened = false, lastHurt = {};

 function observe(before, after, meta) {
  if (!alive) return null;
  return T(() => {
   const e = S.eng;
   const ev = { round: e.round, act: meta.act, retal: meta.retal,
                actorName: meta.actorName, targetName: meta.targetName,
                actorSide: meta.actorSide, dmgOut: 0, dmgBack: 0, changed: [] };
   for (const id in after) {
    if (id === "__eng") continue;
    const a = after[id], b = before[id]; if (!b) continue;
    const hurt = hurtOf(b, a), dealt = dealtOf(b, a);
    if (hurt > 0 || dealt > 0 || a.down !== b.down || a.dead !== b.dead)
     ev.changed.push({ name: a.name, side: a.side, hurt: hurt, dealt: dealt,
                       dead: a.dead && !b.dead, down: a.down && !b.down });
    if (a.name === meta.targetName) ev.dmgOut += hurt;
    if (a.name === meta.actorName) ev.dmgBack += hurt;
   }
   // the shared hostile pool is the fallback signal: a hit that moved it
   // landed on someone even if no per-unit counter caught it.
   const poolHit = Math.max(0, (before.__eng ? before.__eng.integ : 0) - (after.__eng ? after.__eng.integ : 0));
   if (!ev.dmgOut && poolHit > 0 && meta.actorSide === "team") ev.dmgOut = poolHit;
   ev.landed = ev.dmgOut > 0;
   ev.struckBack = ev.dmgBack > 0;
   return ev;
  }, null);
 }

 /* Fold one observed exchange into every nemesis on the opposing side. A
    hostile learns from what the PARTY did to anyone, not only from what was
    done to it -- a nemesis standing next to the one you hit still saw you
    do it. That is why a second fight against the same squad feels different
    even if you never touched this one. */
 function learn(ev) {
  if (!ev || !alive) return;
  T(() => {
   const e = S.eng;
   const partyActed = ev.actorSide === "team";
   const hostiles = (e.units || []).filter(u => u.side === "enemy" && !u.dead);
   hostiles.forEach(u => {
    const d = dossier(u.name);
    if (!d.watching) return;                       // only promoted units learn
    const L = lvl(d.level), dk = L.decay;
    const per = (n) => (d.per[nkey(n)] = d.per[nkey(n)] || { seen: {}, def: {}, dmgTo: 0, dmgFrom: 0 });

    if (partyActed && ev.act) {
     bump(d.seen, ev.act, dk);
     if (!roundOpened) bump(d.open, ev.act, dk);
     if (lastHurt[nkey(ev.actorName)]) bump(d.hurt, ev.act, dk);
     const p = per(ev.actorName); bump(p.seen, ev.act, dk);
     if (ev.dmgOut > 0) p.dmgTo += ev.dmgOut;
    }
    if (!partyActed && ev.retal) {                 // the party DEFENDED
     bump(d.def, ev.retal, dk);
     if (!ev.landed) bump(d.defOk, ev.retal, dk);
     const p = per(ev.targetName); bump(p.def, ev.retal, dk);
    }
    // grudge: whoever actually hurt this nemesis, weighted by how much
    ev.changed.forEach(c => {
     if (nkey(c.name) === nkey(u.name) && c.hurt > 0 && partyActed) {
      d.grudge[nkey(ev.actorName)] = (d.grudge[nkey(ev.actorName)] || 0) + c.hurt;
      per(ev.actorName).dmgFrom += c.hurt;
      if (c.dead || c.down) {                                 // it went down to this
       d.deaths++;
       d.scars.push({ act: ev.act, by: ev.actorName, round: ev.round });
       if (d.scars.length > 8) d.scars.shift();
       note(d, "Killed by " + (ev.actorName || "?") + " using " + ACT_LABEL(ev.act) + ".");
      }
     }
    });
    checkAdapt(d);
   });
   lastHurt = {};
   ev.changed.forEach(c => { if (c.hurt > 0) lastHurt[nkey(c.name)] = 1; });
   roundOpened = true;
  });
 }

 function note(d, s) { d.log.unshift("R" + T(() => S.eng.round, "?") + " · " + s); if (d.log.length > 14) d.log.pop(); }

 /* ---- 5. ADAPTATIONS -------------------------------------------------
    Earned, not granted. Each one has a condition the party themselves have
    to satisfy by fighting a certain way, and each one changes the search
    below rather than adding a number. A nemesis with READ tilts hard toward
    beating the thing you keep doing; one with SCARRED refuses to be killed
    the same way twice. The GM reads these out; that is the nemesis system's
    whole pleasure. */
 const ADAPTS = [
  { id: "read",     name: "READ",      need: (d) => topOf(d.seen, 1)[0] && topOf(d.seen, 1)[0][1] >= 6,
    line: (d) => "has read your habit — " + ACT_LABEL(topOf(d.seen, 1)[0][0]) },
  { id: "guardwise",name: "GUARD-WISE",need: (d) => topOf(d.def, 1)[0] && topOf(d.def, 1)[0][1] >= 5,
    line: (d) => "knows your guard — " + RETAL_LABEL(topOf(d.def, 1)[0][0]) },
  { id: "scarred",  name: "SCARRED",   need: (d) => d.scars.length >= 1,
    line: (d) => "will not die to " + ACT_LABEL(d.scars[d.scars.length - 1].act) + " twice" },
  { id: "grudge",   name: "GRUDGE",    need: (d) => topOf(d.grudge, 1)[0] && topOf(d.grudge, 1)[0][1] >= 25,
    line: (d) => "wants " + nameOf(topOf(d.grudge, 1)[0][0]) + " specifically" },
  { id: "opener",   name: "OPENER",    need: (d) => total(d.open) >= 5 && lvl(d.level).ctx,
    line: (d) => "knows how you start a round" },
  { id: "pressure", name: "PRESSURE",  need: (d) => total(d.hurt) >= 5 && lvl(d.level).ctx,
    line: (d) => "knows what you reach for when you are hurt" },
  { id: "veteran",  name: "VETERAN",   need: (d) => d.fights >= 3,
    line: (d) => "has survived you " + d.fights + " times" }
 ];
 function checkAdapt(d) {
  ADAPTS.forEach(a => {
   if (d.adapt.indexOf(a.id) >= 0) return;
   if (d.adapt.length >= lvl(d.level).recall) return;
   if (T(() => a.need(d), false)) {
    d.adapt.push(a.id);
    note(d, "ADAPTED — " + a.name + ": " + T(() => a.line(d), ""));
    d.xp += 20;
    T(() => addLog("system", "[NEMESIS] " + d.name + " adapts — " + a.name + ": " + a.line(d) + "."));
   }
  });
 }
 const has = (d, id) => d.adapt.indexOf(id) >= 0;
 function topOf(tbl, n) {
  return Object.keys(tbl).map(k => [k, tbl[k]]).sort((a, b) => b[1] - a[1]).slice(0, n || 5);
 }
 function nameOf(k) { return T(() => { const u = (S.eng.units || []).find(x => nkey(x.name) === k); return u ? u.name : k; }, k); }

 /* ---- 6. PREDICTION --------------------------------------------------
    What is the party about to do? Blend three models by how much the
    nemesis is capable of using: flat frequency always, and -- only once it
    is high enough to condition on context -- the opener table at the top of
    a round and the hurt table when it just took damage. Below level 4 the
    context tables are collected but not consulted, which is exactly what
    makes a low-level nemesis feel like it is a step behind. */
 function predictAct(d, unitName) {
  const L = lvl(d.level);
  const flat = dist(d.seen);
  const p = d.per[nkey(unitName)];
  const personal = p ? dist(p.seen) : {};
  const out = {};
  const add = (src, w) => { for (const k in src) out[k] = (out[k] || 0) + src[k] * w; };
  add(flat, 1);
  if (Object.keys(personal).length) add(personal, has(d, "read") ? 1.6 : 1.0);
  if (L.ctx) {
   if (!roundOpened && total(d.open)) add(dist(d.open), has(d, "opener") ? 1.4 : .8);
   if (justHurtSomeone() && total(d.hurt)) add(dist(d.hurt), has(d, "pressure") ? 1.4 : .8);
  }
  const s = total(out); if (!s) return {};
  for (const k in out) out[k] /= s;
  return out;
 }
 function justHurtSomeone() { return Object.keys(lastHurt).length > 0; }

 function predictDef(d, unitName) {
  const p = d.per[nkey(unitName)];
  const personal = p ? dist(p.def) : {};
  const flat = dist(d.def);
  const out = {};
  const add = (src, w) => { for (const k in src) out[k] = (out[k] || 0) + src[k] * w; };
  add(flat, 1);
  if (Object.keys(personal).length) add(personal, has(d, "guardwise") ? 1.8 : 1.0);
  const s = total(out); if (!s) return {};
  for (const k in out) out[k] /= s;
  return out;
 }

 /* Confidence — how much this is worth listening to. Reported honestly and
    prominently, because a recommendation from four observations dressed up
    as certainty is worse than no recommendation. */
 function confidence(d) {
  const n = total(d.seen) + total(d.def);
  const c = 1 - Math.exp(-n / 14);
  return Math.max(0, Math.min(1, c * (0.55 + 0.045 * d.level)));
 }

 /* ---- 7. RECOMMENDATION ----------------------------------------------
    OFFENCE. Score every action the tracker offers by what is expected to
    survive the defence the target is predicted to raise. An action's threat
    is its own shape plus its cost, and what gets through is one minus the
    party's chance of answering it well -- summed over their whole predicted
    defence distribution, not just their favourite.

    The exploit term is the part that makes a high-level nemesis frightening:
    it adds value for attacking through a defence the party has NEVER shown,
    because an unpractised guard is the one they will fumble. */
 const SHAPE_THREAT = { direct: 1.0, multi: 1.15, ranged: .95, grapple: .85, mind: .7, heavy: 1.35, exotic: 1.2, aoe: 1.3 };

 function scoreOffence(d, targetName) {
  const acts = ACTS(); if (!acts.length) return [];
  const pdef = predictDef(d, targetName);
  const defKeys = Object.keys(pdef);
  const L = lvl(d.level);
  const seenDef = total(d.def);
  return acts.map(a => {
   const shape = actShape(a.id, a.label);
   let through = 0;
   if (!defKeys.length) through = 0.65;            // no data: assume an average guard
   else defKeys.forEach(r => { through += pdef[r] * (THROUGH[retalClass(r)] || THROUGH.other)[shape]; });
   let score = (SHAPE_THREAT[shape] || 1) * through;
   // punishing the guard they never raise
   if (has(d, "guardwise") && seenDef > 4) {
    const worst = defKeys.length ? Math.min.apply(null, defKeys.map(r => (THROUGH[retalClass(r)] || THROUGH.other)[shape])) : .5;
    score += (1 - worst) * 0.25 * (d.level / 10);
   }
   // a strike-back defence makes heavy commitment expensive
   let risk = 0;
   defKeys.forEach(r => { if (retalClass(r) === "strikeback") risk += pdef[r] * retalHitBack(r); });
   score -= risk * (shape === "heavy" || shape === "multi" ? .35 : .18);
   // scars: it will not walk into what killed it
   if (has(d, "scarred") && d.scars.some(s => actShape(s.act, ACT_LABEL(s.act)) === shape)) score *= .8;
   return { id: a.id, label: a.label, shape: shape, score: score, through: through, risk: risk };
  }).sort((x, y) => y.score - x.score);
 }

 /* DEFENCE. Mirror image: predict what they will throw, then score every
    retaliation the tracker offers by how much of that gets stopped, plus
    what comes back. RETAL_DMG_MULT is the tracker's own return-damage
    table, so a Counter really is worth more here than a Block for the
    reason the rules say. */
 function scoreDefence(d, attackerName) {
  const rs = RETALS(); if (!rs.length) return [];
  const pact = predictAct(d, attackerName);
  const keys = Object.keys(pact);
  return rs.map(r => {
   const cls = retalClass(r.id);
   let stopped = 0;
   if (!keys.length) stopped = 1 - THROUGH[cls].direct;
   else keys.forEach(a => { stopped += pact[a] * (1 - (THROUGH[cls] || THROUGH.other)[actShape(a, ACT_LABEL(a))]); });
   const back = retalHitBack(r.id) * (cls === "strikeback" ? 1 : .4);
   let score = stopped * 1.0 + back * .45;
   if (cls === "block") score += retalMit(r.id) * .3;
   return { id: r.id, label: r.label, cls: cls, score: score, stopped: stopped, back: back };
  }).sort((x, y) => y.score - x.score);
 }

 /* TARGET. Grudge is the nemesis system's signature: it goes for whoever
    hurt it, and it goes harder the higher its level. Below that it simply
    picks the softest target, which is what an ordinary hostile does. */
 function scoreTargets(d) {
  return T(() => {
   const e = S.eng;
   return (e.units || []).filter(u => u.side === "team" && !u.dead && !u.benched).map(u => {
    const frail = 1 - Math.max(0, Math.min(1, (u.hp || 0) / Math.max(1, u.hpMax || 1)));
    const g = (d.grudge[nkey(u.name)] || 0);
    const gN = g / Math.max(1, topOf(d.grudge, 1)[0] ? topOf(d.grudge, 1)[0][1] : 1);
    const w = has(d, "grudge") ? .55 + .04 * d.level : .18;
    return { name: u.name, id: u.id, score: frail * (1 - w) + gN * w, frail: frail, grudge: g };
   }).sort((a, b) => b.score - a.score);
  }, []);
 }

 /* Noise. The single most important thing for making this playable: a
    lower-level nemesis does not pick the worst answer, it picks a NEARBY
    answer. Sampling from the top of the ranked list with a width set by
    level gives a Wary nemesis that makes ordinary mistakes and a Nemesis
    that does not, without ever making either behave randomly. */
 function pick(list, d) {
  if (!list.length) return null;
  const L = lvl(d.level);
  const span = Math.max(1, Math.round(list.length * L.noise * .25));
  const i = Math.floor(Math.pow(Math.random(), 1 / (1 - L.noise * .8 + .2)) * span);
  return list[Math.min(list.length - 1, Math.max(0, i))];
 }

 /* ---- 8. THE PANEL ---------------------------------------------------
    Built in script and inserted before the battle map, with its own style
    block. It shows its reasoning rather than only its answer -- what it
    thinks you will do, how sure it is, and why the recommendation follows
    -- because a GM has to be able to disagree with it. */
 const css = document.createElement("style");
 css.textContent = `
 .nem-panel{background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:10px 11px;margin-bottom:14px}
 .nem-head{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:8px}
 .nem-title{font-family:var(--hud);font-size:13px;letter-spacing:.06em;color:var(--crim)}
 .nem-sub{font-family:var(--mono);font-size:9px;color:var(--dim)}
 .nem-grid{display:grid;grid-template-columns:210px 1fr;gap:10px}
 @media(max-width:900px){.nem-grid{grid-template-columns:1fr}}
 .nem-roster{border:1px solid var(--line2);border-radius:2px;padding:6px;max-height:330px;overflow:auto}
 .nem-row{display:flex;align-items:center;gap:6px;padding:4px 5px;cursor:pointer;border:1px solid transparent;font-family:var(--mono);font-size:10px}
 .nem-row:hover{border-color:var(--line2)}
 .nem-row.sel{border-color:var(--crim);background:rgba(224,70,76,.08)}
 .nem-row .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .nem-lv{font-family:var(--mono);font-size:9px;color:var(--gold);white-space:nowrap}
 .nem-dot{width:7px;height:7px;border-radius:50%;flex:none}
 .nem-body{border:1px solid var(--line2);border-radius:2px;padding:9px 10px;min-height:150px}
 .nem-cards{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:9px}
 @media(max-width:760px){.nem-cards{grid-template-columns:1fr}}
 .nem-card{border:1px solid var(--line2);border-radius:2px;padding:7px 8px;background:#0a0f16}
 .nem-card h4{font-family:var(--mono);font-size:9px;letter-spacing:.12em;color:var(--dim);margin:0 0 4px}
 .nem-pick{font-family:var(--hud);font-size:13px;color:var(--cyan);line-height:1.25}
 .nem-card.def .nem-pick{color:var(--vio)}
 .nem-why{font-family:var(--mono);font-size:9px;color:var(--dim);margin-top:4px;line-height:1.45}
 .nem-bars{margin-top:7px}
 .nem-bar{display:flex;align-items:center;gap:6px;margin:2px 0;font-family:var(--mono);font-size:9px}
 .nem-bar .lb{width:186px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dim)}
 .nem-bar.hd .lb{width:auto;color:var(--cyan);letter-spacing:.1em;font-size:8.5px}
 .nem-bar.hd.d .lb{color:var(--vio)}
 .nem-bar .tr{flex:1;height:6px;background:#141d29;position:relative}
 .nem-bar .tr i{position:absolute;left:0;top:0;bottom:0;background:var(--cyan);display:block}
 .nem-bar.d .tr i{background:var(--vio)}
 .nem-bar .vv{width:34px;text-align:right;color:var(--dim)}
 .nem-tags{display:flex;flex-wrap:wrap;gap:4px;margin:7px 0}
 .nem-tag{font-family:var(--mono);font-size:8.5px;letter-spacing:.08em;border:1px solid var(--gold);color:var(--gold);padding:2px 5px;border-radius:2px}
 .nem-tag.sc{border-color:var(--crim);color:var(--crim)}
 .nem-conf{font-family:var(--mono);font-size:9px;color:var(--dim)}
 .nem-conf b{color:var(--gold)}
 .nem-log{margin-top:8px;border-top:1px dashed var(--line);padding-top:6px;font-family:var(--mono);font-size:9px;color:var(--dim);line-height:1.5;max-height:96px;overflow:auto}
 .nem-empty{font-family:var(--mono);font-size:10px;color:var(--dim);padding:14px 4px;line-height:1.6}
 .nem-btns{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
 `;
 document.head.appendChild(css);

 const panel = document.createElement("div");
 panel.className = "nem-panel";
 panel.id = "nemesisPanel";
 panel.innerHTML =
  '<div class="nem-head">' +
   '<span class="nem-title">NEMESIS PROTOCOL</span>' +
   '<span class="nem-sub" id="nemSub">no hostile is watching yet</span>' +
   '<span style="margin-left:auto;display:flex;gap:5px">' +
    '<button class="btn tiny" id="nemWatchAll">Watch all hostiles</button>' +
    '<button class="btn tiny cr" id="nemForget">Forget everything</button>' +
   '</span>' +
  '</div>' +
  '<div class="nem-grid">' +
   '<div class="nem-roster" id="nemRoster"></div>' +
   '<div class="nem-body" id="nemBody"></div>' +
  '</div>';

 const anchor = document.getElementById("battleMapPanel") || document.getElementById("spriteFeedPanel");
 if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor);
 else document.body.appendChild(panel);

 let selected = null;

 function bar(label, v, cls) {
  return '<div class="nem-bar ' + (cls || "") + '"><span class="lb">' + esc(label) + '</span>' +
         '<span class="tr"><i style="width:' + Math.round(v * 100) + '%"></i></span>' +
         '<span class="vv">' + Math.round(v * 100) + '%</span></div>';
 }
 function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

 function renderRoster() {
  const host = document.getElementById("nemRoster"); if (!host) return;
  const hostiles = T(() => (S.eng.units || []).filter(u => u.side === "enemy"), []);
  if (!hostiles.length) { host.innerHTML = '<div class="nem-empty">No hostiles fielded.</div>'; return; }
  host.innerHTML = hostiles.map(u => {
   const d = dossier(u.name);
   const on = !!d.watching;
   return '<div class="nem-row' + (selected === nkey(u.name) ? " sel" : "") + '" data-nem="' + esc(nkey(u.name)) + '">' +
    '<span class="nem-dot" style="background:' + (on ? "var(--crim)" : "#33404f") + '"></span>' +
    '<span class="nm" style="color:' + (on ? "var(--txt)" : "var(--dim)") + '">' + esc(u.name) + '</span>' +
    '<span class="nem-lv">' + (on ? "L" + d.level + " " + lvl(d.level).name : "—") + '</span></div>';
  }).join("");
  host.querySelectorAll("[data-nem]").forEach(el => el.onclick = () => { selected = el.dataset.nem; renderAll(); });
 }

 function renderBody() {
  const host = document.getElementById("nemBody"); if (!host) return;
  const hostiles = T(() => (S.eng.units || []).filter(u => u.side === "enemy"), []);
  const u = hostiles.find(x => nkey(x.name) === selected) || hostiles[0];
  if (!u) { host.innerHTML = '<div class="nem-empty">Field a hostile, then promote it to a nemesis. It will start reading the party from the next exchange.</div>'; return; }
  selected = nkey(u.name);
  const d = dossier(u.name);

  if (!d.watching) {
   host.innerHTML = '<div class="nem-empty"><b>' + esc(u.name) + '</b> is not watching.<br>' +
    'Promote it and it begins learning how this party fights — what they open with, ' +
    'what they reach for when hurt, which guard they always raise — and carries that ' +
    'knowledge between engagements.</div>' +
    '<div class="nem-btns"><button class="btn tiny cr" id="nemPromote">Promote to Nemesis</button></div>';
   const b = document.getElementById("nemPromote");
   if (b) b.onclick = () => { d.watching = true; d.fights++; memSave();
     T(() => addLog("system", "[NEMESIS] " + u.name + " is watching. It will remember this."));
     renderAll(); };
   return;
  }

  const L = lvl(d.level);
  const conf = confidence(d);
  const tgts = scoreTargets(d);
  const mark = tgts[0];
  const off = scoreOffence(d, mark ? mark.name : null);
  const def = scoreDefence(d, mark ? mark.name : null);
  const chosenOff = pick(off, d), chosenDef = pick(def, d);
  const pact = predictAct(d, mark ? mark.name : null);
  const pdef = predictDef(d, mark ? mark.name : null);

  const topActs = topOf(pact, 4), topDefs = topOf(pdef, 4);

  host.innerHTML =
   '<div class="nem-cards">' +
    '<div class="nem-card"><h4>RECOMMENDED ACTION</h4>' +
     '<div class="nem-pick">' + esc(chosenOff ? chosenOff.label.replace(/\s*\(.*$/, "") : "—") + '</div>' +
     '<div class="nem-why">' + esc(whyOffence(d, chosenOff, mark, pdef)) + '</div></div>' +
    '<div class="nem-card def"><h4>RECOMMENDED DEFENCE</h4>' +
     '<div class="nem-pick">' + esc(chosenDef ? chosenDef.label.replace(/^\[[^\]]*\]\s*/, "") : "—") + '</div>' +
     '<div class="nem-why">' + esc(whyDefence(d, chosenDef, pact)) + '</div></div>' +
   '</div>' +
   '<div class="nem-conf">LEVEL <b>' + d.level + " · " + L.name + '</b> — ' + esc(L.note) +
     '  ·  confidence <b>' + Math.round(conf * 100) + '%</b> from ' + Math.round(total(d.seen) + total(d.def)) +
     ' observations  ·  mark: <b>' + esc(mark ? mark.name : "—") + '</b></div>' +
   (d.adapt.length ? '<div class="nem-tags">' + d.adapt.map(id => {
      const a = ADAPTS.find(x => x.id === id);
      return '<span class="nem-tag' + (id === "scarred" ? " sc" : "") + '">' + esc(a ? a.name : id) + '</span>';
    }).join("") + '</div>' : "") +
   '<div class="nem-bars"><div class="nem-bar hd"><span class="lb">EXPECTS THE PARTY TO</span></div>' +
    (topActs.length ? topActs.map(t => bar(ACT_LABEL(t[0]).replace(/\s*\(.*$/, ""), t[1])).join("")
                    : '<div class="nem-why">nothing observed yet</div>') +
    '<div class="nem-bar hd d" style="margin-top:7px"><span class="lb">EXPECTS THEM TO GUARD WITH</span></div>' +
    (topDefs.length ? topDefs.map(t => bar(RETAL_LABEL(t[0]).replace(/^\[[^\]]*\]\s*/, ""), t[1], "d")).join("")
                    : '<div class="nem-why">nothing observed yet</div>') +
   '</div>' +
   '<div class="nem-btns">' +
    '<button class="btn tiny" id="nemLvUp">Level up →</button>' +
    '<button class="btn tiny" id="nemLvDn">← Level down</button>' +
    '<button class="btn tiny gd" id="nemSpeak">Speak</button>' +
    '<button class="btn tiny cr" id="nemDrop">Stop watching</button>' +
   '</div>' +
   (d.log.length ? '<div class="nem-log">' + d.log.map(esc).join("<br>") + '</div>' : "");

  const bind = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  bind("nemLvUp", () => { d.level = Math.min(10, d.level + 1); memSave();
    T(() => addLog("system", "[NEMESIS] " + d.name + " → L" + d.level + " " + lvl(d.level).name + " — " + lvl(d.level).note)); renderAll(); });
  bind("nemLvDn", () => { d.level = Math.max(1, d.level - 1); memSave(); renderAll(); });
  bind("nemDrop", () => { d.watching = false; memSave(); renderAll(); });
  bind("nemSpeak", () => { T(() => addLog("voice", "[" + d.name + "] " + taunt(d, mark))); });
 }

 /* The reasoning text. Written from the same numbers the score used, so it
    cannot drift away from the recommendation it is explaining. */
 function whyOffence(d, o, mark, pdef) {
  if (!o) return "No action list available.";
  const keys = Object.keys(pdef);
  const guard = keys.length ? RETAL_LABEL(topOf(pdef, 1)[0][0]).replace(/^\[[^\]]*\]\s*/, "") : null;
  let s = "Expects " + (mark ? mark.name : "the target") + " to answer with " + (guard || "an unknown guard") + ". ";
  s += Math.round(o.through * 100) + "% of a " + o.shape + " attack is expected to get through it";
  if (o.risk > .15) s += ", against " + Math.round(o.risk * 100) + "% return damage risk";
  s += ".";
  if (has(d, "grudge") && mark && mark.grudge > 0) s += " It wants " + mark.name + " for " + Math.round(mark.grudge) + " damage owed.";
  return s;
 }
 function whyDefence(d, r, pact) {
  if (!r) return "No retaliation list available.";
  const keys = Object.keys(pact);
  const likely = keys.length ? ACT_LABEL(topOf(pact, 1)[0][0]).replace(/\s*\(.*$/, "") : null;
  let s = likely ? "Most likely incoming: " + likely + " (" + Math.round(topOf(pact, 1)[0][1] * 100) + "%). " : "No read on the incoming attack yet. ";
  s += "This stops about " + Math.round(r.stopped * 100) + "% of what it expects";
  if (r.back > 0) s += " and returns " + Math.round(r.back * 100) + "% of it";
  s += ".";
  return s;
 }

 function taunt(d, mark) {
  const L = lvl(d.level);
  if (d.level <= 2) return "Come on, then.";
  if (has(d, "grudge") && mark) return "You. I remember what you did.";
  if (has(d, "scarred")) return "Not the same way. Not twice.";
  if (has(d, "read")) { const t = topOf(d.seen, 1)[0]; return "You always " + ACT_LABEL(t[0]).replace(/\s*\(.*$/, "").toLowerCase() + ". Always."; }
  if (has(d, "guardwise")) { const t = topOf(d.def, 1)[0]; return "Raise it again. I know where it ends."; }
  return "I have been watching.";
 }

 function renderAll() { T(renderRoster); T(renderBody); T(updSub); }
 function updSub() {
  const el = document.getElementById("nemSub"); if (!el) return;
  const n = Object.keys(NEM.nem).filter(k => NEM.nem[k].watching).length;
  el.textContent = n ? (n + " hostile" + (n > 1 ? "s" : "") + " reading the party · memory persists between engagements")
                     : "no hostile is watching yet";
 }

 T(() => {
  document.getElementById("nemWatchAll").onclick = () => {
   (S.eng.units || []).filter(u => u.side === "enemy").forEach(u => { const d = dossier(u.name); if (!d.watching) { d.watching = true; d.fights++; } });
   memSave(); T(() => addLog("system", "[NEMESIS] every hostile on the field is watching.")); renderAll();
  };
  document.getElementById("nemForget").onclick = () => {
   if (!confirm("Erase every nemesis memory — levels, grudges, scars and everything learned about the party?")) return;
   NEM = { v: 1, nem: {} }; memSave(); renderAll();
  };
 });

 /* ---- 9. WIRING ------------------------------------------------------
    The same trick the sprite panel needs, and for the same reason: both
    buttons were bound with onclick long before this block runs, so
    reassigning the function name rebinds every internal caller and does
    nothing at all for the two buttons a person actually presses. They have
    to be re-bound by hand. */
 function wrap(fnName, elId, side) {
  const orig = window[fnName];
  if (typeof orig !== "function") return;
  window[fnName] = function () {
   const before = snap();
   const meta = T(() => {
    const e = S.eng;
    const actorEl = document.getElementById(side === "team" ? "resActor" : "retActor");
    const targetEl = document.getElementById(side === "team" ? "resTarget" : "retTarget");
    const a = (e.units || []).find(u => u.id === (actorEl && actorEl.value));
    const t = (e.units || []).find(u => u.id === (targetEl && targetEl.value));
    return {
     act: side === "team" ? T(() => document.getElementById("resAction").value, null) : null,
     retal: side === "team" ? G("selectedInlineRetalType") : G("selectedRetalType"),
     actorName: a && a.name, targetName: t && t.name,
     actorSide: a && a.side
    };
   }, {});
   const r = orig.apply(this, arguments);
   T(() => {
    if (S.eng.round !== lastRound) { lastRound = S.eng.round; roundOpened = false; }
    const ev = observe(before, snap(), meta);
    if (ev) { learn(ev); memSave(); renderAll(); }
   });
   return r;
  };
  const el = document.getElementById(elId);
  if (el) el.onclick = window[fnName];
 }

 memLoad();
 wrap("resolveGroup", "btnResolve", "team");
 wrap("enemyRetaliation", "btnRetal", "enemy");

 /* Re-render when the board does, so the roster follows units being fielded
    and benched without this block having to poll for it. */
 T(() => {
  const origRender = window.render;
  if (typeof origRender === "function") {
   window.render = function () { const r = origRender.apply(this, arguments); T(renderAll); return r; };
  }
 });

 renderAll();

 /* A small console surface, for the same reason the sprite panel has one:
    when a GM says "it isn't learning", the answer has to be inspectable. */
 window.nemesis = {
  get memory() { return NEM; },
  dossier: (name) => NEM.nem[nkey(name)] || null,
  offence: (name) => scoreOffence(dossier(name), (scoreTargets(dossier(name))[0] || {}).name).slice(0, 8),
  defence: (name) => scoreDefence(dossier(name), (scoreTargets(dossier(name))[0] || {}).name).slice(0, 8),
  predict: (name, who) => predictAct(dossier(name), who),
  forget: () => { NEM = { v: 1, nem: {} }; memSave(); renderAll(); }
 };
})();
/* ================= END NEMESIS PROTOCOL ========================= */
