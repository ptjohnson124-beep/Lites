/* ==== BEGIN BLACKBOX SPEC BRIDGE — injected block, delete to the END marker to revert ==== */
/* 165 SPECS THAT WERE WRITTEN, SHIPPED, AND NEVER ONCE RAN.
 *
 * resolve() sends a spec down one of two roads and they do not meet:
 *
 *   type "attack"  -> the attack lands, then applyAttackSpecBonus(s, ...)
 *   anything else  -> applyCustomSpecEffect(s, ...), and then `return`
 *
 * applyAttackSpecBonus holds implementations for a great many specs that are
 * DECLARED buff, debuff, heal, utility, mobility or summon. Every one of those
 * is on the wrong road. The MF is spent, the action is spent, and
 * applyCustomSpecEffect falls through its own bespoke list to a generic
 * fallback -- ADV for a buff, -2 DEF and a Broken Bone for a debuff, 30% HP for
 * a heal -- so the spec appears to do SOMETHING, which is why this survived.
 * Ziggy's CALL OFF THE SWARM was one; it granted the ant it was trying to tame
 * a combat bonus instead.
 *
 * Counted rather than estimated, by splitting applyAttackSpecBonus on its own
 * `else if (s.n === "...")` branches and cross-checking each name's declared
 * type and the other table's branch list:
 *
 *   165 dead branches   104 buff · 55 debuff · 3 heal · 1 utility
 *                       1 mobility · 1 summon
 *   0 names appear in BOTH tables, so nothing can double-fire
 *   1 of the 165 reads the damage number an attack would have passed it
 *
 * That last count is what makes this safe to switch on. The worry with a bridge
 * was branches computing "bonus damage on top of the hit" from a hit that never
 * happened; in practice exactly one does -- Spec α — RESIDUE BLOOM -- and it is
 * handed a nominal figure below rather than a zero, so it does something
 * proportionate instead of nothing.
 *
 * HOW IT DECIDES. The list of names is read out of the two functions at RUN
 * TIME, from Function.prototype.toString, not from a table typed in here. Add a
 * spec to either function tomorrow and the bridge sees it; rename one and the
 * bridge stops claiming it. A hard-coded list would be wrong the first time
 * anybody edited the tracker.
 *
 * WHAT IT DOES NOT DO. It does not touch a spec applyCustomSpecEffect already
 * handles, it does not touch attack-typed specs (they were never broken), and
 * it does not silently swallow failures: if a bridged branch throws, the
 * original generic fallback runs after all, so the worst case is the behaviour
 * everyone has had until now.
 *
 * window.blackboxBridge.list() prints what it is bridging. .off() disables it
 * for the session if a table wants the old behaviour back mid-game.
 */
(function () {
 "use strict";
 if (window.__bbBridge) return;
 window.__bbBridge = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const log = (m) => T(() => G("addLog")("system", m));

 let enabled = true;

 /* The names each dispatcher actually handles, read off the functions
    themselves. Both `s.n==="X"` and `s.n === "X"` are matched, and the source
    is read once and cached -- these functions are thousands of lines long. */
 function handled(fn) {
  const set = new Set();
  T(() => {
   const src = String(fn);
   const re = /s\.n\s*===?\s*"((?:[^"\\]|\\.)*)"/g;
   let m;
   while ((m = re.exec(src))) set.add(m[1].replace(/\\(.)/g, "$1"));
  });
  return set;
 }

 const ATK = handled(T(() => window.applyAttackSpecBonus, null) || function () {});
 const CUS = handled(T(() => window.applyCustomSpecEffect, null) || function () {});
 /* A name only counts as stranded if the attack table owns it and the custom
    table does not. Anything in both is already reachable. */
 const STRANDED = new Set([...ATK].filter(n => !CUS.has(n)));

 /* The one branch that reads primaryDmg gets a figure it can work with. This
    is a spec being CHANNELLED, not a hit, so the number stands in for "what a
    modest strike from this actor would have been" rather than being invented
    large. */
 function nominalDmg(actor) {
  return Math.max(1, Math.round((actor && actor.atk || 20) * 0.5));
 }

 T(() => {
  const orig = window.applyCustomSpecEffect;
  const bonus = window.applyAttackSpecBonus;
  if (typeof orig !== "function" || typeof bonus !== "function") return;

  window.applyCustomSpecEffect = function (s, actor, target, ratio) {
   /* The type check is done HERE rather than against a table of declarations,
      because the declaration is on the spec object in front of us. An
      attack-typed spec must never be bridged: it already runs on the attack
      path, and firing its bonus with no attack behind it would be a second,
      free copy of the effect. */
   const nonAttack = (s && (s.type || "attack")) !== "attack";
   if (!enabled || !s || !s.n || !nonAttack || !STRANDED.has(s.n))
    return orig.apply(this, arguments);
   /* applyAttackSpecBonus opens with `if (!target) return false;` -- reasonable
      for a bonus that hangs off a hit, fatal for a self-buff channelled with
      nobody selected. The actor stands in, which is exactly what the generic
      fallback already did with a missing target (`const t = target || actor`),
      so a self-targeted spec behaves the way it always appeared to. */
   const tgt = target || actor;
   let ran = false;
   T(() => {
    bonus.call(this, s, actor, tgt, nominalDmg(actor), false);
    ran = true;
   });
   if (ran) { T(() => G("render")()); return; }
   /* It threw. Fall back to exactly what would have happened before. */
   log("[BRIDGE] " + s.n + " failed while running its real effect — falling back to the generic result.");
   return orig.apply(this, arguments);
  };
 });

 window.blackboxBridge = {
  get on() { return enabled; },
  off: () => { enabled = false; log("[BRIDGE] off — non-attack specs go back to the generic fallback."); },
  on_: () => { enabled = true; log("[BRIDGE] on — non-attack specs run their real effects."); },
  /* Names the attack table owns and the custom table does not. Whether any
     given one is bridged is decided when it is used, by its declared type --
     an attack-typed spec on this list was never broken and is never bridged. */
  count: () => STRANDED.size,
  list: () => [...STRANDED].sort(),
  handles: (n) => STRANDED.has(n)
 };
 T(() => {
  if (STRANDED.size < 50)
   log("[BRIDGE] only " + STRANDED.size + " spec name(s) found — the dispatchers " +
       "were probably already wrapped when this loaded, and the bridge will do little. " +
       "Load this block BEFORE the other fix blocks.");
  else
   log("[BRIDGE] " + STRANDED.size + " spec name(s) readable from the attack table; " +
       "every non-attack one among them now runs its real effect instead of a generic result.");
 });
})();
/* ================= END BLACKBOX SPEC BRIDGE ========================= */
