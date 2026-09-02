/* ==== BEGIN LEDGER EXTENSION 44 — THREE NEW FILES, injected block, delete to the END marker to revert ==== */
/* PEOPLE WHO HAD PORTRAITS BEFORE THEY HAD ENTRIES.
 *
 * Three figures the Ledger has no file on, added so their art has somewhere
 * to land: Hora on Vergil's list, Mika on Cole's, and Max and Vixen on both.
 *
 * Dude With Bat is here for the same reason as Max and Vixen, one block
 * later. Block 39 DELETED him outright -- it spliced vergil_dude_bat out of
 * the list on the reasoning that "keeping a separate invented entry alongside
 * the corrected John/Lass pair would just be a duplicate under a different
 * name". He is not John, he is not Lass, and he has his own face. Restored,
 * with block 39 otherwise untouched.
 *
 * Max and Vixen are here because block 36 got it wrong. That block resolved
 * "Max & Vixen" and "Anti-Rover Lieutenants" as two names for one pair --
 * Maxium and Veion -- and folded them together. They are not the same people.
 * Maxium and Veion are the lieutenants; Max and Vixen are their own file, and
 * this restores it. Block 36 is left exactly as it is: the merge it made is
 * still there for the lieutenants, which is correct, and this only adds back
 * what it absorbed.
 *
 * The relations are written the way this file already writes a figure nobody
 * has documented yet -- the same shape as Amriah's, which reads "a new figure,
 * not found in any existing file. Read here as..." -- because inventing a
 * history for someone else's character is not this block's job. What is here
 * is what the art shows and nothing further, and every one of them is editable
 * in the app. Each accent colour is sampled from that character's own artwork,
 * so the card's bar and the ring around the portrait already agree with it.
 */
(function () {
 "use strict";
 if (window.__ledgerExt44) return;
 window.__ledgerExt44 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);

 /* Ten rungs, unwritten. Better an honest empty ladder than ten invented
    beats about people the table has not played yet. */
 function blankRungs(who) {
  const out = [];
  for (let i = 0; i < 10; i++) {
   out.push(i === 0
    ? { buff: "None yet — the file is open and mostly empty.",
        hook: "\"What do we actually know about " + who + " that somebody checked?\"" }
    : { buff: "Not written yet.", hook: "Not written yet." });
  }
  return out;
 }

 const NEW = [
  { on: ["vergil"], id: "hora", name: "Hora", color: "#9a433c",
    relation: "A new figure, not found in any existing file. Reads as a rider — " +
      "horned, pointed-eared, travelling with a horse he clearly keeps well and a " +
      "staff he clearly knows how to use. Everything past that is unwritten, " +
      "including how Vergil came to be standing near him at all." },
  /* id "mika" is already taken -- Chi-Mika's entry on Cole's list is
     literally cole_mika, so the duplicate guard fired on her and this one
     never got added. A different person needs a different id. */
  { on: ["cole"], id: "mika_solo", name: "Mika", color: "#69af52",
    relation: "A new figure, not found in any existing file. Reads as a watcher — " +
      "a barcode on the cheek she has not covered up, a drone off one shoulder and " +
      "a screen she keeps looking at instead of at you. Not the same person as " +
      "Chi-Mika, whatever the overlap in the name turns out to mean." },
  { on: ["cole", "vergil"], id: "max_vixen", name: "Max and Vixen", color: "#9b6bd6",
    relation: "Two people, one file, and their own file rather than the " +
      "lieutenants' — an earlier pass folded this entry into Maxium and Veion by " +
      "mistake. A pair who turn up together and stay that way, jackets patched with " +
      "the same hand, and at least one of them arrives with somebody's blood on his " +
      "chin more often than is comfortable." },
  { on: ["vergil"], id: "dude_bat", name: "Dude With Bat", color: "#c8a24a",
    relation: "The one with the bat, and his own file rather than a stray line " +
      "in someone else's -- an earlier pass deleted this entry as a duplicate of " +
      "John and Lass, which he is not. Black coat, a crane worked into the sleeve, " +
      "gold eyes, and a length of pipe carried over one shoulder like it is " +
      "nothing much. Everything past that is unwritten." }
 ];

 /* Chi-Mika's card carries the art of the pair, because that is the art there
    is. Her entry now says so in as many words, so nobody reads a second face
    on the card as a second connection: the wavelength on this card is with
    her, and Dau-Lu is standing in the picture, not in the file. */
 const CHIMIKA_NOTE = " The card shows her with Mr. Dau-Lu because that is the " +
   "portrait that exists, but the wavelength here is with Chi-Mika alone — " +
   "Cole has no separate standing with him yet.";

 T(() => {
  const WL = G("WAVELENGTHS");
  if (!WL) return;
  Object.keys(WL).forEach(who => {
   if (!Array.isArray(WL[who])) return;
   WL[who].forEach(c => {
    if (c && c.name === "Chi-Mika" && c.relation && c.relation.indexOf(CHIMIKA_NOTE) < 0)
     c.relation += CHIMIKA_NOTE;
   });
  });
 });

 T(() => {
  const WL = G("WAVELENGTHS");
  if (!WL) return;
  let added = 0;
  NEW.forEach(spec => {
   spec.on.forEach(who => {
    if (!Array.isArray(WL[who])) return;
    const id = who + "_" + spec.id;
    if (WL[who].some(c => c && (c.id === id || c.name === spec.name))) return;
    WL[who].push({ id: id, name: spec.name, relation: spec.relation,
                   color: spec.color, level: 1, chibi: null,
                   rungs: blankRungs(spec.name) });
    added++;
   });
  });
  if (added) console.log("[ext44] added " + added + " new connection entr(ies)");
 });
})();
/* ================= END LEDGER EXTENSION 44 ========================= */
