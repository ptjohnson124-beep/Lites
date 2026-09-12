/* ==== BEGIN BLACKBOX GATE — injected block, delete to the END marker to revert ==== */
/* TWO THINGS THAT WERE NEVER ACTUALLY ENFORCED: THE STARTING WHISTLE, AND
 * WHETHER THE UNIT IN FRONT OF YOU CAN DO THE THING YOU JUST PICKED.
 *
 * ---------------------------------------------------------------------------
 * 1. NOTHING WAITED FOR "BEGIN ENGAGEMENT"
 *
 * e.engagementActive existed, the button toggled it, the backdrop lit up for
 * it -- and not one line of resolve() ever read it. Actions spent from the
 * pools, damage landed, rounds advanced, all of it during setup, all of it
 * before anybody said go. Half the "why is the party down two actions before
 * the fight started" confusion is this: a stray click on a unit card's quick
 * button (there are a dozen of those, and they call resolve() directly) is a
 * real, spent action even with the field cold.
 *
 * Now resolve() and enemyRetaliation() refuse while the field is cold, and say
 * so where the result normally appears. Setup is untouched: deploying, editing,
 * splitting, assigning bars, loading a saved build, adding grafts -- none of
 * that goes through resolve(), so none of it is blocked. Only the things that
 * spend an action are.
 *
 * ---------------------------------------------------------------------------
 * 2. ANYBODY COULD DO ANYBODY'S SIGNATURE MOVE
 *
 * The Action dropdown carries about ninety entries and a good number of them
 * name their owner IN THE LABEL -- "(Jamie only)", "(Charity)", "(Yaviel)",
 * "(Zalir)", "(Cole)", the whole A.X.E. group under a heading that says
 * VERGIL. Some of those are genuinely enforced in resolve(): Wire Strike,
 * Plug In, Sicon Fusion, Bite, Take a Swig, Rinne Sync, Codex Active and the
 * Lite Signature all check before they fire. The rest never did. Vent Mode
 * off a unit that isn't Charity, Overclock off someone who isn't Yaviel,
 * Jamie's Index off anyone at all -- all of it resolved, spent the action, and
 * printed a result as if it were real.
 *
 * Every lock below was read off the tracker's OWN label for that action, and
 * only actions with no existing check were given one, so this does not
 * duplicate a refusal the file already writes.
 *
 * ---------------------------------------------------------------------------
 * STATS ARE A WARNING, NOT A WALL -- AND THAT IS DELIBERATE
 *
 * Stats matter here, but they matter the way they matter at a table. A Heavy
 * Strike out of POW 3 is a bad idea; it is not an impossible one, and a tool
 * that refuses it has taken a decision away from whoever is running the game.
 * So a stat shortfall is loud -- the finder marks it, the refusal box explains
 * it, the numbers are shown -- and then it lets you do it anyway.
 *
 * If you want the harder rule, window.blackboxGate.strictStats = true turns
 * every shortfall into a real refusal, and the floors themselves are in
 * window.blackboxGate.STAT for retuning.
 *
 * NOTHING HERE IS A DEAD END. Every refusal this block writes carries a
 * [DO IT ANYWAY] button that clears the block for that one action. The fiction
 * changes; a possessed body, a stolen prosthetic, a favour called in. The tool
 * should say "that isn't theirs" once and then get out of the way.
 */
(function () {
 "use strict";
 if (window.__bbGate) return;
 window.__bbGate = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
 const $ = (id) => document.getElementById(id);

 /* ---------------------------------------------------------------------
    WHO OWNS WHAT.

    `who` is matched against the unit's NAME the same way the tracker's own
    checks do it -- indexOf, not equality -- so "Kevanna #2" out of a squad
    split and a renamed possessed body both still match. `fac` is matched
    against u.g, the faction field, for the two construct abilities that
    belong to an organisation rather than a person.

    Deliberately NOT locked, and worth saying why:
      drag            Share Dream Smoke Pack exists specifically to hand
                      someone else a pack. Locking it to Felana would break
                      an ability the tracker already ships.
      racialactive    gated on echoTongueUnlocked / Heavenly Attuned, which
                      is a trait, not a person.
      rolespecial     role-flavoured by design.
      litesignature   already resolves through LITE_SIGNATURES by name.
    -------------------------------------------------------------------- */
 const LOCK = {
  mapindex:       { who: ["Jamie"], why: "Index is Jamie's read — it needs the Perception Sway to hold a body still long enough to file it." },
  ventmode:       { who: ["Charity"], why: "Vent Mode burns Charity's own plasma stacks through her cone vents." },
  bankshot:       { who: ["Charity"], why: "Bank Shot is Charity's — it spends a plasma stack to put Empeyral Burn on the shot." },
  cruciblebreath: { who: ["Charity"], why: "Crucible Breath dumps every plasma stack Charity has. Nobody else carries them." },
  overclock:      { who: ["Yaviel"], why: "Overclock routes coolant through Yaviel's own cyberised brain. It is not a technique." },
  fieldmedic:     { who: ["Yaviel"], why: "Field Medic Precision is Yaviel's, and it costs her her own blood to run." },
  seismicslam:    { who: ["Zalir"], why: "Seismic Slam reads the ground through Zalir's pulse sense." },
  granularread:   { who: ["Zalir"], why: "Granular Read is Zalir's terrain sense — a free minor for him and nothing at all for anyone else." },
  directive:      { who: ["Cole"], why: "Lab of Horrors is Cole's Directive Field. It is the Story's End imprint speaking, not an order anyone can give." },
  swig:           { who: ["Felana"], why: "The cup is Felana's." },
  rinnesync:      { who: ["Felana"], why: "Rinne Sync needs the RINNE VEIL, and the veil is Felana's." },
  bite:           { who: ["Kevanna", "Burham"], why: "Bite is Kevanna's feed and Burham's cannibalism. It needs the jaw for it." },
  axedraw:        { who: ["Vergil"], why: "The A.X.E. dock is Vergil's rig." },
  axeswap:        { who: ["Vergil"], why: "The A.X.E. dock is Vergil's rig." },
  axestow:        { who: ["Vergil"], why: "The A.X.E. dock is Vergil's rig." },
  axestrike:      { who: ["Vergil"], why: "The A.X.E. dock is Vergil's rig." },
  axedocswing:    { who: ["Vergil"], why: "Swinging the whole doc means swinging Vergil's own A.X.E. assembly." },
  axespeak:       { who: ["Vergil"], why: "A.X.E. talks to Vergil. It does not take requests." },
  recognizewindow:{ who: ["Kevanna", "Helknit", "Thessun"], why: "Speaking the name only lands from someone the name means something coming from — Kevanna, the Helknit, or Thessun." },
  sicomerge:      { fac: ["Domineral's Grafts", "Junk Machines"], why: "Sicon Fusion consumes allied constructs. It belongs to Domineral's Grafts and the Junk Machines." }
 };

 /* FACULTY. Not who they are — what they have on them, or in them. Each
    returns null when the unit is fine, or the sentence explaining what is
    missing. Read off the same fields the tracker's own resolve branches read. */
 const NEED = {
  ranged:      (u) => hasRanged(u) ? null : "nothing ranged that still works — every ranged weapon and tool on them is at 0 HP or absent.",
  multiranged: (u) => hasRanged(u) ? null : "nothing ranged that still works — a multi-shot needs a working ranged weapon.",
  lite:        (u) => !hasLite(u) ? "no Lite to discharge — their Lite reads “—”."
                    : (u.engineRipped ? "their Soul Engine was ripped out — there is nothing left to discharge through." : null),
  litesignature: (u) => hasLite(u) ? null : "no Lite, so no Lite Signature.",
  engineattack:(u) => engineReason(u),
  enginelight: (u) => engineReason(u),
  soulflare:   (u) => engineReason(u),
  rev:         (u) => engineReason(u),
  virussurge:  (u) => u.gigaVirus ? null : "not a WINGS Virus carrier.",
  codexactive: (u) => u.codexImprint ? null : "holds no Codex Imprint.",
  weaponspec:  (u) => { const f = G("weaponSpecsFor"); const l = T(() => f ? f(u) : null, null);
                        return (l && l.length) ? null : "no WEAPON NODE specials on their equipped gear."; },
  spec:        (u) => { const f = G("specsFor"); const l = T(() => f ? f(u) : null, null);
                        return (l && l.length) ? null : "no MF specs available to them."; }
 };
 function hasRanged(u) {
  return !!(u.equipped || []).some(it => it && it.weaponType === "ranged" && (it.hp == null || it.hp > 0));
 }
 function hasLite(u) { return !!(u.lite && u.lite !== "—" && u.lite !== "-"); }
 function hasEngine(u) {
  return !!(u.soulEngineType || (u.equipped || []).some(it => it && it.weaponType === "soulengine" && (it.hp == null || it.hp > 0)));
 }
 function engineReason(u) {
  if (u.engineRipped) return "their Soul Engine was ripped out.";
  return hasEngine(u) ? null : "no Soul Engine — nothing to discharge, flare or rev.";
 }

 /* STAT FLOORS. These are judgement calls against the roster's own spread
    (POW/PREC/SOUL sit between 3 and 9 across the party), not rules read out
    of the file, and they are exposed so they can be argued with. A shortfall
    of 1 or 2 is a strain; more than that is out of their depth. Neither
    refuses unless strictStats is on. */
 const STAT = {
  heavy:        { s: "pow",  floor: 5, what: "winding up a telegraphed heavy" },
  slam:         { s: "pow",  floor: 5, what: "putting a body on the ground with weight" },
  grab:         { s: "pow",  floor: 5, what: "holding onto something that does not want to be held" },
  throw:        { s: "pow",  floor: 6, what: "picking a combatant up and throwing them" },
  mapthrowunit: { s: "pow",  floor: 6, what: "throwing a whole unit across the map" },
  overdrive:    { s: "pow",  floor: 6, what: "an all-out three-action commitment" },
  cutlimb:      { s: "pow",  floor: 6, what: "taking a limb off" },
  ripengine:    { s: "pow",  floor: 7, what: "tearing a Soul Engine out of a living chassis" },
  ranged:       { s: "prec", floor: 4, what: "putting a shot where it needs to go" },
  multiranged:  { s: "prec", floor: 6, what: "landing two or three in succession" },
  vital:        { s: "prec", floor: 6, what: "a called shot at something vital" },
  disarm:       { s: "prec", floor: 6, what: "knocking a weapon out of a live grip" },
  percblitz:    { s: "prec", floor: 6, what: "a blitz that has to land clean or it is wasted" },
  engineattack: { s: "soul", floor: 5, what: "driving an attack out of the engine itself" },
  lite:         { s: "soul", floor: 5, what: "holding a Lite discharge together" },
  soulflare:    { s: "soul", floor: 5, what: "a signature flare" },
  taunt:        { s: "soul", floor: 5, what: "getting under someone's PMF" }
 };
 const STAT_LABEL = { pow: "POW", prec: "PREC", soul: "SOUL", eva: "EVA", atk: "ATK", def: "DEF" };

 let strictStats = false;
 let gateEngagement = true;
 const passes = Object.create(null);   // one-shot overrides, keyed act|unitId

 function nameHit(u, list) {
  return !!(u && u.name && list.some(n => String(u.name).indexOf(n) >= 0));
 }

 /* The verdict for one unit and one action. Levels:
      ok      nothing to say
      strain  allowed, but the numbers are against them
      deny    they cannot do this at all (identity or faculty)
    `why` is a whole sentence, because it gets shown to a person mid-game. */
 function check(u, act) {
  if (!u || !act) return { level: "ok", why: "" };
  const lock = LOCK[act];
  if (lock) {
   const owned = (lock.who && nameHit(u, lock.who)) ||
                 (lock.fac && lock.fac.indexOf(u.g) >= 0);
   if (!owned) return { level: "deny", kind: "identity", why: u.name + " can't: " + lock.why };
  }
  const need = NEED[act];
  if (need) {
   const missing = T(() => need(u), null);
   if (missing) return { level: "deny", kind: "faculty", why: u.name + " has " + missing };
  }
  const st = STAT[act];
  if (st) {
   const have = +u[st.s] || 0;
   if (have < st.floor) {
    const short = st.floor - have;
    return {
     level: strictStats ? "deny" : "strain", kind: "stat",
     why: u.name + "'s " + STAT_LABEL[st.s] + " is " + have + " against a " + st.floor +
          " floor for " + st.what + " — " + (short > 2 ? "well out of their depth." : "a real strain, but reachable.")
    };
   }
  }
  return { level: "ok", why: "" };
 }

 /* ---------------------------------------------------------------------
    THE REFUSAL. Written where the result normally appears, so it is read in
    the place the eye already goes, and carrying its own way past itself.
    -------------------------------------------------------------------- */
 function refuse(boxId, headline, body, onOverride) {
  const out = $(boxId);
  if (!out) return;
  out.className = "res-out miss";
  out.innerHTML = '<b>' + esc(headline) + '</b><br>' + esc(body) +
   (onOverride ? '<div style="margin-top:8px"><button class="btn tiny cr" id="bbGateOverride">[DO IT ANYWAY]</button>' +
                 '<span style="margin-left:9px;font-size:9.5px;color:#5a6f85">clears this one action only</span></div>' : "");
  if (onOverride) {
   const b = $("bbGateOverride");
   if (b) b.onclick = onOverride;
  }
 }

 function cold() {
  const e = T(() => G("S").eng, null);
  return !!(gateEngagement && e && !e.engagementActive);
 }
 function flashBeginButton() {
  const b = $("btnBeginEngagement");
  if (!b) return;
  b.classList.add("bbgate-call");
  setTimeout(() => T(() => b.classList.remove("bbgate-call")), 2400);
  T(() => b.scrollIntoView({ block: "nearest", behavior: "smooth" }));
 }

 T(() => {
  const orig = window.resolve;
  if (typeof orig !== "function") return;
  window.resolve = function () {
   if (cold()) {
    refuse("resOut", "The field is still cold.",
     "Nothing spends an action until BEGIN ENGAGEMENT is pressed. Finish setting up — deploy, split, load builds, assign Integrity bars — then start the fight and this resolves normally.");
    flashBeginButton();
    return;
   }
   const e = T(() => G("S").eng, null);
   const actor = e && T(() => e.units.find(u => u.id === ($("resActor") || {}).value), null);
   const act = ($("resAction") || {}).value;
   const key = act + "|" + (actor ? actor.id : "");
   if (actor && act && !passes[key]) {
    const v = check(actor, act);
    if (v.level === "deny") {
     refuse("resOut", "Not something " + actor.name + " can do.", v.why, () => {
      passes[key] = true;
      T(() => G("addLog")("system", "[GATE] Override — " + actor.name + " is being allowed " +
        actLabel(act) + " anyway. " + v.why));
      window.resolve();
     });
     return;
    }
    if (v.level === "strain") T(() => G("addLog")("system", "[GATE] " + v.why));
   }
   delete passes[key];
   return orig.apply(this, arguments);
  };
 });

 T(() => {
  const orig = window.enemyRetaliation;
  if (typeof orig !== "function") return;
  window.enemyRetaliation = function () {
   if (cold()) {
    refuse("retOut", "The field is still cold.",
     "A retaliation answers an attack, and no attack can be made until BEGIN ENGAGEMENT is pressed.");
    flashBeginButton();
    return;
   }
   return orig.apply(this, arguments);
  };
 });

 /* ---------------------------------------------------------------------
    THE OTHER SEVEN DOORS.

    resolve() and enemyRetaliation() are where the great majority of actions
    are spent, but they are not the only places. Counted by walking every
    `pool.used += 1` in the file and throwing out the ones inside those two
    functions, seven more sites spend an action from somewhere else: the
    Classical Cadence toggle on Vergil's card, five quick* helpers behind
    unit-card buttons, and consumeSpecialAction(), which nine different
    abilities call to charge themselves.

    Gating the POOL itself would be the wrong fix and worth saying why: the
    spend is the first line of those handlers and the effect follows it
    unconditionally, so refusing the write would hand out the ability for
    free — strictly worse than not gating at all. So each door is closed at
    its own handle. consumeSpecialAction returns false, which every one of
    its nine callers already treats as "not enough actions" and bails on;
    the quick helpers return before they touch anything; and the Cadence
    button is stopped at the click, since it lives inside a per-card closure
    with no function of its own to wrap. */
 const QUICK_SPENDERS = ["quickReplay", "quickKevConsume", "quickMassWeave",
                         "quickVergilDiscard", "quickVergilGearUp"];
 QUICK_SPENDERS.forEach(fn => T(() => {
  const orig = window[fn];
  if (typeof orig !== "function") return;
  window[fn] = function () {
   if (cold()) { coldToast(); return; }
   return orig.apply(this, arguments);
  };
 }));
 T(() => {
  const orig = window.consumeSpecialAction;
  if (typeof orig !== "function") return;
  window.consumeSpecialAction = function () {
   if (cold()) { coldToast(); return false; }
   return orig.apply(this, arguments);
  };
 });
 document.addEventListener("click", (ev) => {
  if (!cold()) return;
  const t = ev.target && ev.target.closest && ev.target.closest("[data-vergilmusic]");
  if (!t) return;
  ev.preventDefault(); ev.stopPropagation();
  coldToast();
 }, true);

 let toasted = 0;
 function coldToast() {
  T(() => G("toast")("The field is cold — press Begin Engagement first."));
  const now = Date.now();
  if (now - toasted > 4000) {
   toasted = now;
   T(() => G("addLog")("system", "[GATE] Refused — nothing spends an action before Begin Engagement."));
  }
  flashBeginButton();
 }

 /* The round only means anything inside an engagement. */
 T(() => {
  const orig = window.nextRound;
  if (typeof orig !== "function") return;
  window.nextRound = function () {
   if (cold()) { coldToast(); return; }
   return orig.apply(this, arguments);
  };
 });

 function actLabel(act) {
  const sel = $("resAction");
  const o = sel && sel.querySelector('option[value="' + act + '"]');
  return o ? o.textContent.replace(/\s*\(.*$/, "").trim() : act;
 }

 /* A standing marker on the Resolve card while the field is cold, so the
    refusal is never the first time anybody hears about it. */
 function paintColdBanner() {
  const card = document.querySelector(".card.resolve");
  if (!card) return;
  let b = $("bbGateCold");
  if (!cold()) { if (b) b.remove(); document.body.classList.remove("bbgate-cold"); return; }
  document.body.classList.add("bbgate-cold");
  if (!b) {
   b = document.createElement("div");
   b.id = "bbGateCold";
   b.className = "bbgate-cold-banner";
   b.innerHTML = '<span class="dot"></span><b>FIELD COLD</b> — no action resolves until Begin Engagement is pressed. ' +
     '<button class="btn tiny gd" id="bbGateBegin">▶ Begin Engagement</button>';
   card.insertBefore(b, card.firstChild);
   const go = $("bbGateBegin");
   if (go) go.onclick = () => T(() => $("btnBeginEngagement").click());
  }
 }

 T(() => {
  const orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function () { const r = orig.apply(this, arguments); T(paintColdBanner); return r; };
 });

 const css = document.createElement("style");
 css.textContent = `
 .bbgate-cold-banner{display:flex;align-items:center;gap:9px;flex-wrap:wrap;
  padding:8px 11px;margin:0 0 11px;border:1px solid rgba(224,70,76,.42);
  background:rgba(224,70,76,.07);font-size:10.5px;color:#c2cedd;
  font-family:var(--mono,ui-monospace,monospace)}
 .bbgate-cold-banner b{color:#e0464c;letter-spacing:.1em}
 .bbgate-cold-banner .dot{width:7px;height:7px;border-radius:50%;background:#e0464c;
  box-shadow:0 0 0 0 rgba(224,70,76,.6);animation:bbgatePulse 1.9s infinite}
 .bbgate-cold-banner .btn{margin-left:auto}
 @keyframes bbgatePulse{70%{box-shadow:0 0 0 8px rgba(224,70,76,0)}100%{box-shadow:0 0 0 0 rgba(224,70,76,0)}}
 .bbgate-call{outline:2px solid #ffd873 !important;outline-offset:2px;
  animation:bbgateCall .5s ease-in-out 3}
 @keyframes bbgateCall{50%{transform:translateY(-2px)}}
 body.bbgate-cold #btnResolve,body.bbgate-cold #btnRetal{opacity:.5}
 `;
 document.head.appendChild(css);
 T(paintColdBanner);

 window.blackboxGate = {
  check: check,
  LOCK: LOCK, STAT: STAT, NEED: NEED,
  get strictStats() { return strictStats; },
  set strictStats(v) { strictStats = !!v; },
  get engagementGate() { return gateEngagement; },
  set engagementGate(v) { gateEngagement = !!v; T(paintColdBanner); },
  /* Every action this unit cannot currently take, with the reason. Feeds the
     finder in the access block, and answers "why is that greyed out" directly
     from a console. */
  audit: (u) => {
   const sel = $("resAction"); if (!sel || !u) return [];
   return Array.from(sel.options).map(o => {
    const v = check(u, o.value);
    return v.level === "ok" ? null : { act: o.value, label: o.textContent, level: v.level, why: v.why };
   }).filter(Boolean);
  }
 };
 T(() => G("addLog")("system", "[GATE] Actions now wait for Begin Engagement — resolve, retaliation, the round, " +
   "consumeSpecialAction and every unit-card button that spends one. " +
   Object.keys(LOCK).length + " character-owned actions refuse anyone they don't belong to. " +
   "Stat shortfalls warn rather than refuse — blackboxGate.strictStats = true if you want the hard rule."));
})();
/* ================= END BLACKBOX GATE ========================= */
