/* ==== BEGIN LEDGER EXTENSION 48 — THE HANDS ACTUALLY APPLIED, injected block, delete to the END marker to revert ==== */
/* KEVANNA WRITES IN RED. SO DOES EVERYONE ELSE, IN THEIR OWN COLOUR.
 *
 * Block 20 already found this bug and already wrote the fix: "Kevanna's own
 * guest-book ink was set to #c6ff3d -- this app's sage-green -- when her
 * actual color is red", alongside a font-collision fix for Cole, Felana and
 * the GM all sharing Space Mono.
 *
 * None of it ever reached the screen. Checked in the running page rather than
 * read off the source: Kevanna still signs in rgb(198,255,61) in Audiowide,
 * and Cole and Felana still share Space Mono -- the exact collision block 20
 * says it fixed. Its REVISED_HANDS table is real and correct and completely
 * inert, because both it and the original HANDS live inside their own
 * closures. Neither is reachable from anywhere, so block 20 built its
 * replacement and had nothing to assign it to.
 *
 * The ink is written as INLINE STYLE on the elements themselves, though, and
 * the author's name is right there in the markup -- the signature, the margin
 * note's byline, the wall note's caption. So the hands can be applied after
 * the fact, which is what this does. The values below are block 20's own,
 * lifted verbatim rather than reinvented; it had already decided what each
 * character's hand should be and it was right.
 *
 * One change from block 20's table, asked for directly: KEVANNA AND DAHLIA NO
 * LONGER SHARE A RED. Both were #ff3b3b, told apart only by typeface. Kevanna
 * keeps that one -- the bright scarlet suits a hand that is fast and too big
 * for the line -- and Dahlia moves to #c8102e, a deeper carmine that is both
 * darker and cooler. Picked by measuring rather than by eye: it sits 71 points
 * of RGB distance from Kevanna's (the shared value was 0), it is further from
 * every other ink in this table than it is from hers, and it still clears 3:1
 * against the page, which is the threshold that matters for text this size.
 *
 * Vergil and Angi still share a cyan and Zalir and Xaim still share an amber.
 * Those were not asked about and are left as block 20 designed them.
 */
(function () {
 "use strict";
 if (window.__ledgerExt48) return;
 window.__ledgerExt48 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };

 const HANDS = {
  cole:    { font: "'Space Mono',monospace",        size: 23, slant: -4,  ink: "#e9e6f2", weight: 700, sp: ".02em" },
  vergil:  { font: "'Orbitron',sans-serif",          size: 22, slant: 2,   ink: "#2fe0ff", weight: 800, sp: ".08em" },
  kevanna: { font: "'Impact','Arial Narrow Bold',sans-serif", size: 28, slant: -10, ink: "#ff3b3b", weight: 900, sp: "-.01em" },
  felana:  { font: "'Trebuchet MS',sans-serif",      size: 22, slant: 3,   ink: "#ff2f92", weight: 700, sp: ".04em" },
  yaviel:  { font: "'Syncopate',sans-serif",         size: 19, slant: -2,  ink: "#b83fff", weight: 700, sp: ".10em" },
  zalir:   { font: "'Courier New',monospace",        size: 22, slant: 0,   ink: "#ff9b1f", weight: 700, sp: ".04em" },
  dahlia:  { font: "'Chakra Petch',sans-serif",      size: 25, slant: -8,  ink: "#c8102e", weight: 600, sp: ".01em" },
  angi:    { font: "'Audiowide',cursive",            size: 21, slant: 4,   ink: "#2fe0ff", weight: 400, sp: ".03em" },
  burham:  { font: "Georgia,serif",                  size: 21, slant: -3,  ink: "#6b6478", weight: 400, sp: ".02em" },
  merov:   { font: "Verdana,sans-serif",             size: 20, slant: 1,   ink: "#8a8394", weight: 400, sp: ".03em" },
  xaim:    { font: "'Arial Black',sans-serif",       size: 21, slant: -5,  ink: "#ff9b1f", weight: 900, sp: "0" },
  neven:   { font: "'Palatino Linotype',Palatino,serif", size: 24, slant: -6, ink: "#cc6b3f", weight: 400, sp: ".01em" },
  ziggy:   { font: "'Comic Sans MS',cursive",        size: 22, slant: 6,   ink: "#c6ff3d", weight: 700, sp: ".02em" },
  gm:      { font: "'Space Mono',monospace",         size: 18, slant: 0,   ink: "#6b6478", weight: 400, sp: ".14em" }
 };

 /* A byline can read "Kevanna", "kevanna", or "Kevanna on Angi's" -- the wall
    caption names the speaker and then whose tag they are speaking about. Only
    the first word matters, and only when it is somebody with a hand. */
 function handOf(text) {
  if (!text) return null;
  const first = String(text).trim().split(/\s+on\s+|\s/)[0].replace(/[^\w-]/g, "").toLowerCase();
  return HANDS[first] || null;
 }

 function ink(el, h, withFont) {
  if (!el || !h) return;
  el.style.color = h.ink;
  if (withFont) {
   el.style.fontFamily = h.font;
   el.style.fontWeight = h.weight;
   el.style.letterSpacing = h.sp;
  }
 }

 function apply() {
  /* The signature, its seal, and the entry's own margin notes. */
  document.querySelectorAll(".gb-sig").forEach(sig => {
   const h = handOf(sig.textContent);
   if (!h) return;
   ink(sig, h, true);
   sig.style.fontSize = h.size + "px";
   sig.style.transform = "rotate(" + h.slant + "deg)";
   const entry = sig.closest(".gb-entry");
   const seal = entry && entry.querySelector(".gb-seal");
   if (seal) seal.style.color = h.ink;
  });

  document.querySelectorAll(".gb-note").forEach(n => {
   const who = n.querySelector(".gb-note-who");
   const h = handOf(who && who.textContent);
   if (h) ink(n, h, false);
  });

  /* Wall notes carry the hand as colour and typeface both. */
  document.querySelectorAll(".lx-wall-note").forEach(n => {
   const w = n.querySelector(".w");
   const h = handOf(w ? w.textContent : n.textContent);
   if (h) ink(n, h, true);
  });
 }

 /* One observer rather than a wrapper per render path: the guest book, the
    wall and the margin notes are all rebuilt from innerHTML by several
    different blocks, and a subtree observer catches every one of them
    including any added later. Only childList is watched, so the inline styles
    written here cannot retrigger it. */
 let queued = false;
 const nudge = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; T(apply); }); } };
 T(() => new MutationObserver(nudge).observe(document.body, { childList: true, subtree: true }));
 if (document.readyState === "loading") addEventListener("DOMContentLoaded", nudge);
 nudge();
 setTimeout(nudge, 500);

 window.ledgerHands = { HANDS: HANDS, apply: apply };
})();
/* ================= END LEDGER EXTENSION 48 ========================= */
