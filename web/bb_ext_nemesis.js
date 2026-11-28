/* ==== BEGIN BLACKBOX NEMESIS+ — injected block, delete to the END marker to revert ==== */
/* THE NEMESIS ONLY EVER RECOMMENDED A BASIC ATTACK, AND HERE IS EXACTLY WHY.
 *
 * scoreOffence() takes all 84 entries of the Action dropdown, runs each through
 * actShape(), and scores it as SHAPE_THREAT[shape] * how much of that shape
 * gets through the guard it expects. Read that again: the ONLY thing about an
 * action that reaches the score is which of EIGHT shape buckets its label
 * falls into. Eighty-four actions collapse to eight distinct numbers, so most
 * of the list ties exactly -- and Array.sort is stable, so a tie is broken by
 * the order the options appear in the DOM. The CORE ATTACKS optgroup is first.
 *
 * That is the whole bug. It was never choosing Strike because Strike was good;
 * it was choosing Strike because Strike is at the top of the list and nothing
 * in the scoring could tell it apart from anything else shaped like it.
 *
 * Worse, the thing that actually makes a nemesis frightening was not in the
 * running at all. specsFor() gives a unit its real named abilities -- character
 * specs, its faction's rank techniques, the universal alpha/beta/gamma/delta
 * chain, weapon-node specials. A Helknit Heretic has a page of them. The
 * nemesis could not see any of it, because the Action list has ONE entry
 * covering all of them ("MF Spec") and shape-scoring cannot see inside it.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES INSTEAD
 *
 * The candidate list becomes the actions AND every spec the unit really has,
 * each scored as itself:
 *
 *   through      kept from the original — how much of this shape beats the
 *                guard the party actually raises. This part was right.
 *   punch        the damage or effect it is worth, read off the spec's own
 *                numbers (MF cost is the file's own proxy for magnitude) or,
 *                for an action, its action cost and hit modifier.
 *   affordable   a 20-MF spec on a unit holding 8 MF is not a plan. Anything
 *                it cannot pay for is dropped, not merely penalised.
 *   allowed      run through blackboxGate: it will not reach for Charity's
 *                Vent Mode, or a ranged attack with nothing ranged on it.
 *   spent        run through the same flag scan the readiness panel uses, so
 *                a once-per-encounter signature already burned is gone.
 *   nerve        its LEVEL decides how far up the list it dares reach. A Wary
 *                nemesis opens with the reliable thing; a high one opens with
 *                the thing it has been saving. That is the level system's own
 *                idea -- it just had nothing interesting to choose between.
 *
 * The original scorer is left running and is still the source of the `through`
 * term; this reads its output rather than replacing its judgement.
 *
 * WHERE IT SHOWS. window.nemesis.offence() is replaced so everything already
 * reading it -- the hover ranking on the action list, the stars, the auto-react
 * banner -- gets the better list for free. The panel's own RECOMMENDED ACTION
 * card is left where it is and a fuller one is added under it, naming the spec,
 * its cost, and the reason in a sentence a GM can read out loud.
 */
(function () {
 "use strict";
 if (window.__bbNemPlus) return;
 window.__bbNemPlus = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
 const eng = () => T(() => G("S").eng, null);
 const nem = () => window.nemesis || null;

 const baseOffence = T(() => window.nemesis && window.nemesis.offence, null);
 if (!baseOffence) {
  T(() => G("addLog")("system", "[NEMESIS+] The nemesis module isn't loaded — this block is idle."));
  return;
 }

 function unitNamed(name) {
  const e = eng();
  if (!e || !name) return null;
  return (e.units || []).find(u => u.name === name) ||
         (e.units || []).find(u => String(u.name).indexOf(name) >= 0) || null;
 }
 function dossierOf(name) { return T(() => nem().dossier(name), null); }

 /* ---- can it, and has it already ---- */
 function allowed(u, actId) {
  const g = window.blackboxGate;
  if (!g || !u) return true;
  const v = T(() => g.check(u, actId), null);
  return !v || v.level !== "deny";
 }
 /* The same properties the readiness panel reads, for the same reason: a
    once-per-encounter ability that is spent is not a candidate. Matched by
    name so a spec called "CRUCIBLE BREATH" is tied to crucibleBreathUsed. */
 function spentFlags(u) {
  const out = [];
  if (!u) return out;
  Object.keys(u).forEach(k => {
   if (!/Used$/.test(k) || u[k] === false || u[k] == null || u[k] === 0) return;
   out.push(k.replace(/Used$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase());
  });
  return out;
 }
 function looksSpent(u, label, spentList) {
  if (!spentList.length) return false;
  const L = String(label).toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
  return spentList.some(f => f.length > 5 && L.indexOf(f) >= 0);
 }

 /* ---- how hard a thing hits, from the file's own numbers ---- */
 function specPunch(s, u) {
  /* MF cost is the tracker's own measure of how big a spec is -- the roster's
     specs run about 6 MF for a small one to 30+ for a signature -- so it is
     used as the magnitude rather than a new table invented here. A spec that
     costs nothing is a utility, and is scored as one. */
  const mf = +s.mf || 0;
  const hit = (+s.hit || 0) / 100;
  const typeWeight = { attack: 1.0, debuff: .85, buff: .7, heal: .6, utility: .5, mobility: .5, summon: .95 };
  return (0.55 + mf / 26) * (typeWeight[s.type || "attack"] || .8) * (1 + hit) * (s.bypass ? 1.15 : 1);
 }
 function actPunch(a) {
  /* Two actions of the same shape are not the same size. What separates them
     in this file is what they cost and what they do to the roll, both of which
     are written in the option's own label. */
  const L = (a.label || "").toLowerCase();
  const cost = /\(3|3 actions|overdrive/.test(L) ? 3 : /\(2|2 actions/.test(L) ? 2 : 1;
  let p = 0.55 + cost * 0.28;
  if (/\+dmg|huge|massive|escalating|all-out/.test(L)) p += .25;
  if (/low dmg|light|−dmg|-dmg|no attack|build/.test(L)) p -= .28;
  if (/once|1\/encounter|signature|ultimate/.test(L)) p += .22;
  return Math.max(.2, p);
 }

 /* ---- the list ---- */
 function candidates(name, targetName) {
  const u = unitNamed(name);
  const d = dossierOf(name);
  const level = (d && d.level) || 1;
  const base = T(() => baseOffence.call(nem(), name), []) || [];
  /* baseOffence returns only its top 8; the shape term is wanted for every
     action, so it is looked up by shape with a mid-table fallback. */
  const byId = Object.create(null);
  base.forEach(r => { byId[r.id] = r; });
  const meanThrough = base.length
    ? base.reduce((a, r) => a + (r.through || 0), 0) / base.length : 0.6;

  const spent = spentFlags(u);
  const mf = u ? (u.mf == null ? 90 : u.mf) : 90;
  const out = [];

  /* actions */
  const sel = $("resAction");
  if (sel && u) {
   Array.from(sel.options).forEach(o => {
    if (!o.value) return;
    if (!allowed(u, o.value)) return;
    const b = byId[o.value];
    const through = b ? b.through : meanThrough;
    const risk = b ? (b.risk || 0) : 0;
    out.push({
     kind: "act", id: o.value, label: o.text.trim(),
     through: through, risk: risk,
     score: through * actPunch({ label: o.text }) - risk * .2,
     why: null
    });
   });
  }

  /* specs — the part that was invisible */
  const sf = G("specsFor");
  const list = (u && sf) ? (T(() => sf(u), []) || []) : [];
  list.forEach((s, i) => {
   if (!s || !s.n) return;
   if ((+s.mf || 0) > mf) return;                       // cannot pay for it
   if (looksSpent(u, s.n, spent)) return;               // already burned
   const shapeRow = base.find(r => r.id === "spec");
   const through = shapeRow ? shapeRow.through : meanThrough;
   out.push({
    kind: "spec", id: "spec#" + i, specIndex: i, label: s.n,
    mf: +s.mf || 0, type: s.type || "attack", d: s.d || "",
    through: through, risk: 0,
    score: through * specPunch(s, u) * 1.12,            // a named ability over a generic one
    why: null
   });
  });

  out.sort((a, b2) => b2.score - a.score);

  /* NERVE. Level decides how far up its own list it dares reach: a level 1
     nemesis takes the safe middle of the ranking, a level 10 takes the top of
     it. This is the same idea as the module's own pick(), which deliberately
     chooses a NEARBY option rather than the best one at low level -- the
     difference is that there is now something worth reaching for. */
  const nerve = Math.min(1, Math.max(0, (level - 1) / 9));
  const depth = Math.max(0, Math.round((1 - nerve) * Math.min(9, out.length - 1)));
  return { list: out, chosen: out[depth] || out[0] || null, level: level, depth: depth, unit: u };
 }

 function reason(c, r) {
  if (!r) return "nothing it can currently do.";
  const t = Math.round((r.through || 0) * 100);
  if (r.kind === "spec")
   return "Its own " + (r.type === "attack" ? "technique" : r.type) + ", " +
     (r.mf ? r.mf + " MF of the " + (c.unit ? (c.unit.mf == null ? 90 : c.unit.mf) : "?") + " it holds" : "free") +
     " — and about " + t + "% of that shape gets past the guard this party keeps raising.";
  return "About " + t + "% of this gets past the guard this party keeps raising" +
    (r.risk > .05 ? ", and it is willing to be struck back for it." : ".");
 }

 /* ---- replace the surface everything else already reads ---- */
 T(() => {
  const n = nem();
  n.offenceBasic = baseOffence;
  n.offence = function (name) {
   const c = candidates(name);
   /* Kept in the shape the original returned -- {id,label,score,through,risk} --
      so the hover ranking and the stars in the access block need no changes. */
   return c.list.slice(0, 12);
  };
  n.plan = (name) => {
   const c = candidates(name);
   return c.chosen ? {
    what: c.chosen.label, kind: c.chosen.kind, mf: c.chosen.mf || 0,
    level: c.level, rank: c.depth + 1, why: reason(c, c.chosen)
   } : null;
  };
 });

 /* ---- the card ---- */
 function paint() {
  const host = $("nemBody");
  if (!host) return;
  const sel = host.querySelector(".nem-cards");
  if (!sel) { const old = $("bbNemPlus"); if (old) old.remove(); return; }
  const hostiles = T(() => (eng().units || []).filter(u => u.side === "enemy"), []) || [];
  const rowSel = document.querySelector(".nem-row.sel");
  const key = rowSel ? rowSel.dataset.nem : null;
  const u = hostiles.find(x => String(x.name).toLowerCase().trim() === key) || hostiles[0];
  if (!u) return;
  const d = dossierOf(u.name);
  if (!d || !d.watching) { const old = $("bbNemPlus"); if (old) old.remove(); return; }

  const c = candidates(u.name);
  let card = $("bbNemPlus");
  if (!card) {
   card = document.createElement("div");
   card.id = "bbNemPlus";
   card.className = "bbnem";
   sel.parentNode.insertBefore(card, sel.nextSibling);
  }
  const top = c.list.slice(0, 5);
  card.innerHTML =
   '<div class="bbnem-head"><span class="cap">WHAT IT ACTUALLY REACHES FOR</span>' +
    '<span class="lv">L' + c.level + ' · takes rank #' + (c.depth + 1) + ' of its own list</span></div>' +
   (c.chosen
     ? '<div class="bbnem-pick ' + c.chosen.kind + '">' + esc(c.chosen.label) +
       (c.chosen.kind === "spec" ? '<i>MF −' + c.chosen.mf + '</i>' : '') + '</div>' +
       '<div class="bbnem-why">' + esc(reason(c, c.chosen)) + '</div>'
     : '<div class="bbnem-why">Nothing it can currently do — everything is spent, unaffordable, or not its to use.</div>') +
   '<div class="bbnem-rank">' + top.map((r, i) =>
     '<span class="bbnem-r ' + r.kind + (r === c.chosen ? " on" : "") + '" title="' +
       esc((r.kind === "spec" ? "Spec · MF −" + r.mf + "\n" : "Action\n") + (r.d || "")) + '">' +
       (i + 1) + '. ' + esc(String(r.label).replace(/\s*\(.*$/, "").slice(0, 30)) + '</span>').join("") +
   '</div>' +
   '<div class="bbnem-note">' + c.list.filter(x => x.kind === "spec").length +
     ' of its own specs are in the running; anything it cannot pay for, has already spent, ' +
     'or was never its to use has been dropped.</div>';
 }

 T(() => {
  const orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function () { const r = orig.apply(this, arguments); T(paint); return r; };
 });
 document.addEventListener("click", (ev) => {
  const t = ev.target && ev.target.closest && ev.target.closest("[data-nem], .nem-btns .btn");
  if (t) setTimeout(() => T(paint), 30);
 }, true);

 const css = document.createElement("style");
 css.textContent = `
 .bbnem{border:1px solid rgba(224,70,76,.34);background:rgba(224,70,76,.05);
  padding:8px 11px;margin:9px 0 0;font-family:var(--mono,ui-monospace,monospace)}
 .bbnem-head{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
 .bbnem .cap{font-size:8.5px;letter-spacing:.14em;color:#e0464c}
 .bbnem .lv{font-size:9px;color:#5b6a7e;margin-left:auto}
 .bbnem-pick{font-size:13px;color:#dde5f0;margin:5px 0 3px;line-height:1.3}
 .bbnem-pick.spec{color:#ffd873}
 .bbnem-pick i{font-style:normal;font-size:9.5px;color:#8194aa;margin-left:8px}
 .bbnem-why{font-size:10px;color:#c2cedd;line-height:1.45}
 .bbnem-rank{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
 .bbnem-r{font-size:9px;padding:3px 6px;border:1px solid var(--line,#1c2839);color:#8194aa;cursor:help}
 .bbnem-r.spec{border-color:rgba(232,177,58,.34);color:#c9a15a}
 .bbnem-r.on{border-color:#e0464c;color:#f08a8e;background:rgba(224,70,76,.1)}
 .bbnem-note{font-size:9px;color:#5b6a7e;margin-top:7px;line-height:1.45}
 `;
 document.head.appendChild(css);
 T(paint);
 setTimeout(() => T(paint), 800);

 window.blackboxNemesis = {
  plan: (name) => T(() => nem().plan(name), null),
  candidates: (name) => candidates(name).list,
  basic: (name) => T(() => baseOffence.call(nem(), name), [])
 };
 T(() => G("addLog")("system",
  "[NEMESIS+] The nemesis now weighs its own specs, not just the Action list. It was picking basic " +
  "attacks because every action of the same shape scored identically and ties fell to dropdown order — " +
  "and its real abilities were never candidates at all. It now drops what it can't pay for, has already " +
  "spent, or was never its to use, and its level decides how far up its own list it dares reach."));
})();
/* ================= END BLACKBOX NEMESIS+ ========================= */
