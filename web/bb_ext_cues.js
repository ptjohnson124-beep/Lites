/* ==== BEGIN BLACKBOX CUES — injected block, delete to the END marker to revert ====
   -------------------------------------------------------------------
   THE SPRITE FEED KNOWS TWENTY-THREE ROLES AND ONLY SIX OF THEM EVER FIRED.

   Nine are already handled and are not touched here. The feed's RESTING table
   reads them straight off unit state -- death, down, ritualized,
   cyberpsychosis, fractured, staggered, slipping -- and AFTER hands death on
   to dead and ritualized on to crowned. Those work.

   Six more are wired inside the feed itself: hit and block off damage(),
   attack and taunt off applyDamageToTarget(), counter and dodge off the
   retaliation types.

   That leaves SEVEN clips that nothing in the tracker ever asked for:
   spec, soul, rev, grab, throw, ragdoll and recover. A character could own all
   seven and never once play them. This block is the missing half of the
   mapping, and it is the only thing it does.

   WHERE THE ANSWER COMES FROM. The tracker already names every action: the
   Action dropdown's option VALUES are the vocabulary, so the mapping below is
   a lookup on #resAction rather than a guess about what happened. That is why
   ripengine and soulflare reach the soul clip while slam reaches nothing for
   the attacker -- the file already decided what those actions are.

   TWO THINGS THAT WOULD OTHERWISE GO WRONG.

   A knockdown is not something the attacker does, it is something that
   happens to the TARGET, so ragdoll plays on the other unit. A throw is both:
   the thrower throws and the thrown one hits the floor, so that row cues two
   different units and the panel ends on the one who landed.

   A finish must keep its taunt. applyDamageToTarget returns whether the
   target went down and the feed plays taunt on that, so a spec that kills
   would otherwise have its taunt immediately overwritten by the spec clip.
   Anything that defeated someone leaves the taunt alone.

   AND NOTHING FIRES FOR AN ACTION THAT DID NOT HAPPEN. The engagement gate
   can refuse a resolve outright; the panel should not mime an attack that was
   blocked. Every resolved action writes to the log, so the log length before
   and after the call is the test for whether there is anything to narrate.
   =================================================================== */
(function () {
 "use strict";
 const T = (f, d) => { try { return f(); } catch (e) { return d; } };
 const val = id => T(() => { const el = document.getElementById(id); return el ? el.value : ""; }, "");
 const unitOf = id => T(() => (S.eng.units || []).find(u => u.id === id), null) || null;
 const cue = (u, role) => T(() => !!(u && u.name && window.spriteFeed &&
                                     window.spriteFeed.play(u.name, role)), false);
 const logLen = () => T(() => S.eng.log.length, 0);

 /* #resAction value -> the clip the ACTOR plays. */
 const ACTOR = {
  spec: "spec", weaponspec: "spec", rolespecial: "spec", litesignature: "spec",
  engineattack: "soul", enginelight: "soul", soulflare: "soul", ripengine: "soul",
  rev: "rev",
  grab: "grab",
  throw: "throw", mapthrowunit: "throw", mapscrap_throw: "throw"
 };
 /* #resAction value -> the clip the TARGET plays. Being put on the floor is
    the target's animation; the attacker has already played its own. */
 const TARGET = {
  knockdown: "ragdoll", slam: "ragdoll", seismicslam: "ragdoll",
  throw: "ragdoll", mapthrowunit: "ragdoll"
 };

 const stat = { fired: 0, skipped: 0, last: "" };

 /* Did this action finish someone? Only applyDamageToTarget's return value
    says so -- a hostile is never marked dead, its side drains a shared pool. */
 let defeated = false;
 if (typeof applyDamageToTarget === "function") {
  const _adt = applyDamageToTarget;
  applyDamageToTarget = function () {
   const r = _adt.apply(this, arguments);
   if (r) defeated = true;
   return r;
  };
 }

 function cueing(fn) {
  return function () {
   const kind = val("resAction");
   const actor = unitOf(val("resActor"));
   const target = unitOf(val("resTarget"));
   const before = logLen();
   defeated = false;
   const r = fn.apply(this, arguments);
   T(() => {
    if (logLen() === before) { stat.skipped++; stat.last = kind + " (nothing resolved)"; return; }
    if (defeated) { stat.last = kind + " (finished — taunt kept)"; return; }
    let played = "";
    const a = ACTOR[kind]; if (a && cue(actor, a)) played += a + " ";
    const t = TARGET[kind]; if (t && cue(target, t)) played += t + "@target";
    if (played) { stat.fired++; stat.last = kind + " -> " + played.trim(); }
    else stat.last = kind + " (no clip)";
   });
   return r;
  };
 }

 if (typeof resolveGroup === "function") {
  resolveGroup = cueing(resolveGroup);
  /* The button holds a reference to whatever resolveGroup was when it was
     wired, so reassigning the name is not enough -- the same trap the sprite
     feed block documents. Re-point it at the current one. */
  const el = document.getElementById("btnResolve");
  if (el) el.onclick = resolveGroup;
 }

 /* recover has no action of its own: it is the moment a unit stops being out.
    Watched on the render that follows, so it catches a manual un-stun and a
    resolved one alike. Nothing fires on the first pass -- there is no previous
    state to have left. */
 const wasOut = new Map();
 function watchRecovery() {
  for (const u of T(() => S.eng.units || [], [])) {
   const out = !!(u.down || u.stunned || u.dead);
   const prev = wasOut.get(u.id);
   wasOut.set(u.id, out);
   if (prev === true && !out) { if (cue(u, "recover")) { stat.fired++; stat.last = "recover"; } }
  }
 }
 if (typeof render === "function") {
  const _render = render;
  render = function () { const r = _render.apply(this, arguments); T(watchRecovery); return r; };
 }

 window.bbCues = {
  get stats() { return Object.assign({}, stat); },
  roles: () => ({ actor: Object.assign({}, ACTOR), target: Object.assign({}, TARGET) }),
  test: (name, role) => cue({ name: name }, role)
 };
 T(() => console.log("[bb cues] " + Object.keys(ACTOR).length + " actor actions, " +
                     Object.keys(TARGET).length + " target actions, recover watcher on"));
})();
/* ================= END BLACKBOX CUES ========================= */
