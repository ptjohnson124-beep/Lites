/* ==== BEGIN BLACKBOX FIXES — injected block, delete to the END marker to revert ==== */
/* THREE BUGS, EACH FIXED AT THE ONE PLACE IT ACTUALLY HAPPENS.
 *
 * Every fix here WRAPS a function rather than replacing it. The tracker is
 * fifty thousand lines and several blocks already wrap these same functions;
 * this one loads last, so its wrapper is the outermost -- everyone else runs
 * first and this corrects the result.
 *
 * ---------------------------------------------------------------------------
 * 1. AIMING AT A GRAFT KILLED THE WHOLE UNIT
 *
 * applyDamageToTarget did this, on both the hostile and the party path:
 *
 *     if (graftIdx >= 0 && target.grafts[graftIdx])
 *        target.grafts[graftIdx].hp -= Math.round(dmg / 2);
 *     damage(target, dmg);            // the FULL hit, again, to the body
 *
 * So a called shot at an arm dealt half the damage to the arm AND the whole of
 * it to the body -- and the called shot carries a 1.25x multiplier, so aiming
 * at a graft was strictly WORSE for the person being shot than aiming at their
 * chest. 150% of a boosted hit, every time.
 *
 * On a unit whose grafts are wired into its body it was worse still, because
 * damage() then ran drainThroughGrafts(), which walks the graft list AGAIN and
 * drains it to soak what is about to hit core integrity. The same graft paid
 * twice out of one hit and the body paid in full on top.
 *
 * A called shot now lands IN the graft. Damage fills the graft first; only what
 * exceeds what the graft had left carries on into the body, and that overflow
 * is halved, because a limb that has already taken a hit apart is not the same
 * as a clean hit to the chest. Destroying a graft still hurts -- the overflow
 * from a big hit on a nearly-dead graft goes through -- it just no longer kills
 * someone through their own prosthetic.
 *
 * Nothing else changes. A hit with no called shot (graftIdx < 0) takes exactly
 * the path it always took, including drainThroughGrafts for the chassis units
 * that are meant to soak that way.
 *
 * ---------------------------------------------------------------------------
 * 2. ACTIONS AND RETALIATIONS THAT NEVER WENT DOWN
 *
 * Not a display bug -- eight actions genuinely never charged anything. Found by
 * walking every `if (act === "...")` branch in resolve() and checking which
 * ones return before reaching the shared cost block:
 *
 *     maphide, mapscrap_pickup, mapscrap_throw, mapthrowunit,
 *     mapattackterrain, mapindex, ventmode, granularread
 *
 * Every one of them does something real -- Vent Mode hits the entire opposing
 * side, Throw Unit does knockback and fall damage, Hide gives 5% HP back -- and
 * all eight were free. The six map actions were the whole Battle Map feature,
 * so a table using the map was playing with unlimited actions without knowing.
 *
 * The ninth was on the other side of the exchange: an inline retaliation spends
 * from the Retaliation pool in an if/else chain whose final branch reads
 *
 *     else if (retaliating && selectedInlineRetalType !== "revengine")
 *
 * -- correct for revengine itself, which pays a Special instead, but only when
 * the retaliator is on the party's side. A HOSTILE retaliating with Rev is told
 * it cannot, and then pays nothing at all, having still been a retaliation.
 *
 * Fixed by charging each of those where they happen, and then backed by a
 * guarantee: resolve() and enemyRetaliation() are wrapped, the pools are read
 * before and after, and an action that resolved without moving anything is
 * charged one. The guarantee is the safety net, not the mechanism -- it only
 * fires when the actor genuinely acted, so a rejected action ("no target",
 * "not enough MF") still costs nothing, which is what makes it safe to leave on.
 *
 * ---------------------------------------------------------------------------
 * 3. THE HERETIC'S FLOWER NEVER TOOK THE BODY
 *
 * THE FLOWER TAKES ROOT said, in its own log line, "real, complete transfer --
 * mind and engine both, into the new vessel". What it actually did was set
 * soulEngineType to "mental", flip the target's side, and kill the Heretic.
 * The vessel kept its own name, its own stats, its own specs and its own
 * faction: a possessed unit that was simply the same character now fighting for
 * the other team, with a different Soul Engine type. Nothing moved house.
 *
 * It now takes the body, and the split is the obvious one:
 *
 *   THE MIND MOVES  -- name and identity, faction and sub-type, level, PMF, MF,
 *                      SOUL, PREC, ATK, the Soul Engine, the lite attunement,
 *                      elite standing, and every custom spec. specsFor() reads
 *                      a unit's spec list off its NAME, faction and sub, so
 *                      moving those three is what actually hands the Heretic's
 *                      abilities to the thing now wearing the vessel.
 *
 *   THE BODY STAYS  -- HP and its layers, exo, integrity, every graft, EVA,
 *                      POW, DEF, carried gear, and whatever conditions were
 *                      already on it. The flower took a body; it did not bring
 *                      one with it.
 *
 * The vessel's whole pre-possession state is kept on the unit as .flowerHost,
 * so a table that wants to undo it, or to write what happens if the flower is
 * cut out later, has the person who used to be there written down rather than
 * overwritten. window.blackboxFixes.unpossess(unit) puts them back.
 */
(function () {
 "use strict";
 if (window.__bbFixes) return;
 window.__bbFixes = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const log = (m) => T(() => G("addLog")("system", m));

 /* ---- 1. CALLED SHOTS LAND IN THE GRAFT ------------------------------- */
 T(() => {
  const orig = window.applyDamageToTarget;
  if (typeof orig !== "function") return;
  window.applyDamageToTarget = function (e, attacker, target, dmg, graftIdx, actKind) {
   const g = (graftIdx >= 0 && target && target.grafts) ? target.grafts[graftIdx] : null;
   if (!g || !(dmg > 0)) return orig.apply(this, arguments);

   const had = Math.max(0, g.hp || 0);
   const into = Math.min(had, dmg);
   g.hp = Math.max(0, had - into);
   /* Only the overflow reaches the body, and only half of it. */
   const spill = Math.round((dmg - into) * 0.5);

   log("[CALLED SHOT] " + attacker.name + " puts it into " + (g.n || "the graft") +
       " — " + into + " of " + dmg + " absorbed there (" + g.hp + "/" +
       (g.hpMax || "?") + " left" + (g.hp <= 0 && had > 0 ? ", DESTROYED" : "") + ")" +
       (spill > 0 ? ", " + spill + " carries through into " + target.name + "."
                  : ". Nothing reaches the body."));

   if (spill <= 0) {
    /* The graft ate the hit whole. The exchange still happened -- everything
       else the original does on a landed hit (pressure, cyber gain, the
       attacker's damage tally) is skipped along with the body damage, which
       is right: none of it touched them. */
    T(() => { if (attacker) attacker.dmgDone = (attacker.dmgDone || 0) + dmg; });
    return false;
   }
   /* graftIdx is passed as -1 now: this call has already paid the graft. */
   return orig.call(this, e, attacker, target, spill, -1, actKind);
  };
 });

 /* ---- 2. AN ACTION ALWAYS COSTS AN ACTION ----------------------------- */
 const pools = () => T(() => G("S").eng.pools, null);
 const bank = () => { const p = pools(); return p ? (p.battle.used + p.retal.used + p.special.used) : -1; };

 function charge(actorSide, n, why) {
  const e = T(() => G("S").eng, null);
  if (!e || !e.pools) return false;
  const p = (actorSide === e.acting) ? e.pools.battle : e.pools.retal;
  const label = (actorSide === e.acting) ? "Battle Action" : "Retaliation";
  const left = p.max - p.used;
  p.used = Math.min(p.max, p.used + n);
  log("[ACTIONS] " + why + " — " + (left < n ? "charged what was left of " : "") +
      n + " " + label + (n === 1 ? "" : "s") + " spent (" +
      Math.max(0, p.max - p.used) + "/" + p.max + " left).");
  return true;
 }

 /* The eight that never charged. Named rather than inferred, so an action
    added later is not silently taxed by a rule it was never written for. */
 const FREE_ACTIONS = {
  maphide: 1, mapscrap_pickup: 1, mapscrap_throw: 1, mapthrowunit: 1,
  mapattackterrain: 1, mapindex: 1, ventmode: 1, granularread: 1
 };

 T(() => {
  const orig = window.resolve;
  if (typeof orig !== "function") return;
  window.resolve = function () {
   const before = bank();
   const act = T(() => document.getElementById("resAction").value, "");
   const actor = T(() => {
    const e = G("S").eng, id = document.getElementById("resActor").value;
    return e.units.find(u => u.id === id) || null;
   }, null);
   const outEl = T(() => document.getElementById("resOut"), null);
   const r = orig.apply(this, arguments);
   const after = bank();
   if (before < 0 || after < 0 || !actor) return r;
   if (after > before) return r;                       // it charged itself

   /* Did anything actually happen? A branch that bailed out says so in the
      result box, and a refused action must stay free. */
   const refused = !!(outEl && /res-out miss/.test(outEl.className || "") &&
                      /^(No |Not enough|Pick |Both units|.* is (Stunned|Disassociated|marked SKIP)|.* has no |.* isn't |.* needs |.* lacks )/i
                      .test(outEl.textContent || ""));
   if (refused) return r;
   const cost = FREE_ACTIONS[act] || 1;
   charge(actor.side, cost, actor.name + " — " + act);
   T(() => G("renderEcon")());
   return r;
  };
 });

 T(() => {
  const orig = window.enemyRetaliation;
  if (typeof orig !== "function") return;
  window.enemyRetaliation = function () {
   const before = bank();
   const r0 = T(() => {
    const e = G("S").eng, id = document.getElementById("retActor").value;
    return e.units.find(u => u.id === id) || null;
   }, null);
   const outEl = T(() => document.getElementById("retOut"), null);
   const r = orig.apply(this, arguments);
   const after = bank();
   if (before < 0 || after < 0 || !r0) return r;
   if (after > before) return r;
   const refused = !!(outEl && /res-out miss/.test(outEl.className || ""));
   if (refused) return r;
   const e = T(() => G("S").eng, null);
   if (e) { e.pools.retal.used = Math.min(e.pools.retal.max, e.pools.retal.used + 1);
            log("[ACTIONS] " + r0.name + " retaliates — 1 Retaliation spent (" +
                Math.max(0, e.pools.retal.max - e.pools.retal.used) + "/" +
                e.pools.retal.max + " left)."); }
   T(() => G("renderEcon")());
   return r;
  };
 });

 /* ---- 3. THE FLOWER TAKES THE BODY ------------------------------------ */
 /* Which fields belong to the mind and which to the body. Everything not
    named here stays with the vessel, because a field nobody thought about is
    far more likely to describe a body than a personality. */
 const MIND = ["name", "g", "sub", "cat", "ico", "role", "d", "level", "lvl", "elite",
               "pmf", "mf", "soul", "prec", "atk", "tech",
               "soulEngineType", "soulEngineTypeSecondary", "soulEngineElement",
               "lite", "codexImprint", "codexVariant", "customSpecs",
               "dtypeResist", "gearBio"];

 function takeTheBody(host, flower) {
  if (!host || !flower || host.flowerHost) return false;
  const keep = {};
  MIND.forEach(k => { keep[k] = host[k]; });
  host.flowerHost = { at: T(() => G("S").eng.round, 0), was: keep, wasName: host.name };
  MIND.forEach(k => {
   if (flower[k] === undefined) return;
   host[k] = (k === "customSpecs" || k === "dtypeResist")
    ? T(() => JSON.parse(JSON.stringify(flower[k])), flower[k])
    : flower[k];
  });
  /* The name becomes the HERETIC'S ALONE, and the body's name moves to the
     role line. Not cosmetic: specsFor() picks a spec list by searching the
     unit's name for a known character key, so a name reading "Vesspaa — in Rio
     Lalin" still matched Rio and handed the possessed body Rio's specs
     alongside Vesspaa's. Checked in the running app rather than assumed --
     it did exactly that. The role line is read by nothing. */
  host.name = flower.name;
  host.role = "wearing " + (host.flowerHost.wasName || "a taken body") + "'s body";
  host.possessedByFlower = flower.name;
  T(() => G("pushStatus")(host, "Possessed", 99));
  host.soulEngineType = "mental";
  return true;
 }

 T(() => {
  const orig = window.applyAttackSpecBonus;
  if (typeof orig !== "function") return;
  window.applyAttackSpecBonus = function (s, actor, target, primaryDmg, primaryDefeated) {
   const was = !!(target && target.flowerCorrupted);
   const r = orig.apply(this, arguments);
   if (!target || !actor || was || !target.flowerCorrupted) return r;
   /* The original has already flipped the side and put the Heretic down. All
      that was missing is the part its own log line promised. */
   if (takeTheBody(target, actor)) {
    log("[THE FLOWER TAKES ROOT] The transfer is real and complete. " +
        target.flowerHost.wasName + "'s body keeps its HP, its exo, its grafts and " +
        "its footwork — everything else standing there is " + actor.name +
        ": the level, the frequency, the Soul Engine, and every spec they had. " +
        "Whatever " + target.flowerHost.wasName + " could do, they can't do it now.");
    T(() => G("render")());
   }
   return r;
  };
 });

 window.blackboxFixes = {
  takeTheBody: takeTheBody,
  unpossess: (u) => {
   if (!u || !u.flowerHost) return false;
   Object.keys(u.flowerHost.was).forEach(k => { u[k] = u.flowerHost.was[k]; });
   delete u.possessedByFlower; delete u.flowerCorrupted; delete u.flowerHost;
   log("[THE FLOWER] cut out of " + u.name + ". They are themselves again.");
   T(() => G("render")());
   return true;
  },
  charge: charge
 };
})();
/* ================= END BLACKBOX FIXES ========================= */
