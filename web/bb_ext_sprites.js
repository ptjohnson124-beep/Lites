/* ==== BEGIN BLACKBOX SPRITE CUES — injected block, delete to the END marker to revert ==== */
/* ELEVEN ANIMATIONS THAT WERE DRAWN, LOADED, AND NEVER ONCE PLAYED.
 *
 * Asked of the live panel rather than guessed at -- spriteFeed.cast reports
 * what each atlas actually contains -- Dahlia and Vergil carry 23 clips
 * between them, and the feed triggers twelve. These twelve fire:
 *
 *   idle attack taunt hit block counter dodge
 *   down death dead ritualized crowned
 *
 * and these eleven do not:
 *
 *   spec soul rev grab throw
 *   staggered ragdoll recover slipping fractured cyberpsychosis
 *
 * They are not broken and they are not missing. The feed's own exchange
 * wrapper only knows about an attack landing, being blocked, being countered
 * or being dodged, so the actor gets "attack" whatever they actually did --
 * and every one of the eleven was reachable only by typing
 * spriteFeed.play(name, role) into a console by hand.
 *
 * Each of them has something in the tracker that already means it. This block
 * is the wiring, and nothing else: no new state, no new rules, no new artwork.
 *
 *   spec            the MF Spec action, and a weapon-node special
 *   soul            a Soul Engine attack, a light engine discharge, a flare,
 *                   a Lite discharge, a Lite Signature
 *   rev             Rev Soul Engine
 *   grab / throw    their own actions, and Throw Unit on the battle map
 *   ragdoll         a knockback that actually moved them
 *   staggered       the "Staggered" status arriving -- a real status, pushed
 *                   by pushStatus in the file, read in 58 places
 *   slipping        partialInsanity turning on
 *   fractured       soulFractured turning on
 *   cyberpsychosis  the cyber meter reaching 100, which is the threshold the
 *                   file itself tests in three places
 *   recover         coming back the other way: standing up, or insanity,
 *                   fracture or disassociation clearing
 *
 * ---------------------------------------------------------------------------
 * TWO THINGS THAT HAD TO BE GOT RIGHT
 *
 * ORDER. The feed wraps the Resolve BUTTON and plays "attack" for the actor
 * when that handler finishes; resolve() runs inside it. A cue played from
 * inside resolve() is therefore overwritten a moment later by the generic
 * attack. wrapExchange plays synchronously -- checked, no timer of its own --
 * so the cue is deferred by one turn of the event loop and lands after it. The
 * same deferral covers the dozen unit-card buttons that call resolve()
 * directly and never touch the feed's wrapper at all.
 *
 * A KILL STILL TAUNTS. If the exchange actually put the target down, the feed
 * plays "taunt", and that reads better than any of these. The cue stands down
 * in that one case rather than talking over it.
 *
 * Nothing here checks whether a character HAS the clip, on purpose: the feed's
 * own play() returns false for a role it cannot draw and changes nothing, and
 * its comment says why -- "a wrong animation is worse than no animation". A
 * character with three clips keeps idling, exactly as before.
 */
(function () {
 "use strict";
 if (window.__bbSpriteCues) return;
 window.__bbSpriteCues = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const eng = () => T(() => G("S").eng, null);
 const feed = () => window.spriteFeed || null;

 if (!feed()) {
  T(() => G("addLog")("system", "[SPRITE CUES] The sprite feed isn't loaded — this block is idle."));
  return;
 }

 /* Action id -> clip. Only actions whose clip exists in the atlases; anything
    not named here keeps the feed's own behaviour. */
 const BY_ACTION = {
  spec: "spec", weaponspec: "spec",
  engineattack: "soul", enginelight: "soul", soulflare: "soul",
  lite: "soul", litesignature: "soul", engineretal: "soul",
  rev: "rev",
  grab: "grab",
  throw: "throw", mapthrowunit: "throw"
 };

 let enabled = true;
 let fired = 0;

 /* All THREE pools, not two. Rev Soul Engine and the Lite Signature charge the
    SPECIAL pool rather than the battle one, so summing only battle and
    retaliation read them as refusals and the rev clip never played -- caught
    on the bench, where rev was the one action that cued nothing. */
 function spent(e) {
  const p = e && e.pools;
  if (!p) return 0;
  return (p.battle ? p.battle.used : 0) + (p.retal ? p.retal.used : 0) +
         (p.special ? p.special.used : 0);
 }

 /* One place that plays, so the deferral and the taunt rule are not repeated.
    `play` takes a NAME because that is the only surface the feed exposes; it
    resolves the unit itself and returns false when the character cannot draw
    the role. */
 function cue(unit, role, guard) {
  if (!enabled || !unit || !unit.name || !role) return;
  setTimeout(() => T(() => {
   if (guard && guard()) return;
   if (feed().play(unit.name, role)) fired++;
  }), 0);
 }

 /* ---- 1. what the actor just did ---- */
 T(() => {
  const orig = window.resolve;
  if (typeof orig !== "function") return;
  window.resolve = function () {
   const e = eng();
   const act = ($("resAction") || {}).value;
   const role = BY_ACTION[act];
   const actor = (role && e) ? e.units.find(u => u.id === ($("resActor") || {}).value) : null;
   const target = (role && e) ? e.units.find(u => u.id === ($("resTarget") || {}).value) : null;
   const wasDown = target ? !!(target.down || target.dead) : false;
   const spentBefore = e ? spent(e) : 0;
   const r = orig.apply(this, arguments);
   if (actor && e) {
    /* Only when the action actually went through. A refusal -- no actions
       left, the gate turning it down, a missing target -- spends nothing, and
       an animation for something that did not happen is a lie on screen. */
    const spentAfter = spent(e);
    if (spentAfter > spentBefore)
     cue(actor, role, () => target && !wasDown && (target.down || target.dead));
   }
   return r;
  };
 });

 /* ---- 2. being thrown ---- */
 T(() => {
  const orig = window.knockbackUnit;
  if (typeof orig !== "function") return;
  window.knockbackUnit = function (e, u, fx, fy, tiles) {
   const res = orig.apply(this, arguments);
   if (u && res && res.moved > 0) cue(u, "ragdoll");
   return res;
  };
 });

 /* ---- 3. states arriving and lifting ----
    Read off the units on every draw and compared with the last draw, so a
    state reached by ANY path shows -- a spec that inflicts it, a status tick,
    a figure typed into a field by hand. Nothing has to announce itself. */
 const STATES = [
  { role: "staggered",      on: (u) => (u.statuses || []).some(s => s.n === "Staggered") },
  { role: "slipping",       on: (u) => !!u.partialInsanity },
  { role: "fractured",      on: (u) => !!u.soulFractured },
  { role: "cyberpsychosis", on: (u) => (+u.cyber || 0) >= 100 },
  /* Down is the feed's own resting role, so only the way BACK is cued. */
  { role: null, recover: true, on: (u) => !!(u.down || u.dead || u.disassociated) }
 ];
 let last = Object.create(null);

 function scan() {
  const e = eng();
  if (!e || !enabled) return;
  const now = Object.create(null);
  (e.units || []).forEach(u => {
   const prev = last[u.id] || {};
   const cur = {};
   STATES.forEach((st, i) => {
    const v = T(() => !!st.on(u), false);
    cur[i] = v;
    if (v === prev[i] || prev[i] === undefined) return;    // no change, or first sight
    if (st.recover) { if (!v) cue(u, "recover"); }          // it lifted
    else if (v) cue(u, st.role);                            // it arrived
   });
   now[u.id] = cur;
  });
  last = now;
 }
 T(() => {
  const orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function () { const r = orig.apply(this, arguments); T(scan); return r; };
 });

 window.blackboxSprites = {
  get on() { return enabled; },
  off: () => { enabled = false; },
  on_: () => { enabled = true; },
  /* Which clips each character carries, and which of them anything can now
     reach. The question this block exists to answer, answerable from a
     console rather than by reading it. */
  audit: () => {
   const AUTO = new Set(["idle", "attack", "taunt", "hit", "block", "counter", "dodge",
                         "down", "death", "dead", "ritualized", "crowned"]);
   const mine = new Set(Object.values(BY_ACTION).concat(
     ["ragdoll", "recover"], STATES.map(s => s.role).filter(Boolean)));
   return T(() => feed().cast.map(c => ({
    name: c.name, ready: c.ready,
    wired: c.clips.filter(k => AUTO.has(k) || mine.has(k)).sort(),
    stillUnused: c.clips.filter(k => !AUTO.has(k) && !mine.has(k)).sort()
   })), []);
  },
  roleFor: (actId) => BY_ACTION[actId] || null,
  fired: () => fired,
  /* Play one by hand, for checking the artwork. */
  test: (name, role) => T(() => feed().play(name, role), false)
 };

 T(() => {
  const a = window.blackboxSprites.audit();
  const left = a.reduce((s, c) => s + c.stillUnused.length, 0);
  G("addLog")("system", "[SPRITE CUES] " +
   "Specs, engine and Lite discharges, revs, grabs, throws, knockbacks, staggers, insanity, " +
   "soul fracture, cyberpsychosis and recovery now play their own clips instead of the generic " +
   "attack. " + (left ? left + " clip(s) across the cast still have nothing that means them." :
   "Every clip in the loaded atlases is now reachable from play."));
 });
})();
/* ================= END BLACKBOX SPRITE CUES ========================= */
