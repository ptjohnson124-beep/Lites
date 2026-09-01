/* ==== BEGIN LEDGER EXTENSION 43 — SPLITTING A PAIR, injected block, delete to the END marker to revert ==== */
/* BETANEXUS AND DOTFRAME, WHO ARE TWO PEOPLE.
 *
 * They were filed as one connection with one name, one level and one portrait
 * slot. That was fine while nobody had a face; it stopped being fine the
 * moment they each had one, because a 56-pixel card cannot hold two figures --
 * one always buries the other, and four different compositions of these two
 * proved it, his sword and her tail both wanting the same width.
 *
 * So the entry becomes two entries. Each keeps the colour, the level and its
 * own DEEP COPY of the rung ladder -- copied rather than shared, because two
 * people who happen to have been written down together should not raise each
 * other's wavelength by being raised themselves.
 *
 * Written to run against whatever the arrays hold at the time rather than
 * against a fixed index, and it checks for its own work first, so re-running
 * it or loading it beside a later block that also touches the list does
 * nothing twice.
 */
(function () {
 "use strict";
 if (window.__ledgerExt43) return;
 window.__ledgerExt43 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);

 const PAIR = "Betanexus and Dotframe";
 const HALVES = [
  { key: "betanexus", name: "Betanexus",
    relation: "One half of a scrap-tech pair, and the half that goes and gets it. " +
      "Reads a wreck for what is still worth pulling and comes back with it. Talks " +
      "in the same half-finished shorthand Dotframe does, and has never been seen " +
      "working a site without her somewhere behind him." },
  { key: "dotframe", name: "Dotframe",
    relation: "The other half, and the half that makes it work afterward. Calibrates " +
      "what Betanexus drags back, in a shorthand only the two of them actually " +
      "follow. Whatever the arrangement is, neither has ever explained it and " +
      "neither has ever worked entirely alone." }
 ];

 function clone(x) { return T(() => JSON.parse(JSON.stringify(x)), x); }

 T(() => {
  const WL = G("WAVELENGTHS");
  if (!WL) return;
  let split = 0;
  Object.keys(WL).forEach(who => {
   const list = WL[who];
   if (!Array.isArray(list)) return;
   const at = list.findIndex(c => c && c.name === PAIR);
   if (at < 0) return;
   const src = list[at];
   const made = HALVES.map(h => {
    const c = clone(src);
    c.id = String(src.id || (who + "_pair")).replace(/betanexus_dotframe|pair/i, h.key) ||
           (who + "_" + h.key);
    if (c.id === src.id) c.id = src.id + "_" + h.key;
    c.name = h.name;
    c.relation = h.relation;
    c.rungs = clone(src.rungs) || [];
    return c;
   });
   list.splice(at, 1, made[0], made[1]);
   split++;
  });
  if (split) console.log("[ext43] split '" + PAIR + "' into two on " + split + " list(s)");
 });
})();
/* ================= END LEDGER EXTENSION 43 ========================= */
