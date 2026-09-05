/* ==== BEGIN BLACKBOX MAPS — injected block, delete to the END marker to revert ==== */
/* NEW BATTLE MAPS, REGISTERED BY BEING FOUND RATHER THAN BY BEING LISTED.
 *
 * Adding a backdrop to this tracker means touching three places that have to
 * agree: a .bm-stage.bm-bg-<key> rule in the stylesheet, an <option> in the
 * picker, and an entry in BM_BG_CLASSES. Miss the third and the option is
 * selectable and does nothing; miss the second and the art is in the file with
 * no way to reach it. Three lists of the same names, kept in step by hand.
 *
 * This keeps one of them -- the stylesheet, where the art actually is -- and
 * derives the other two. It walks the loaded rules for .bm-bg-* class names,
 * subtracts the ones BM_BG_CLASSES already knows, and registers what is left:
 * an entry in the map, an option in the picker, done. tools/bb_maps.py writes
 * the rule and the payload; nothing here needs editing to add a sixth map.
 *
 * WHY THE GRID CARES ABOUT THE CROP. The stage takes its shape from each map's
 * declared aspect-ratio and then rules a 12x8 grid over it, so a cell is only
 * square when the image is exactly 3:2. On anything else a tile is a
 * rectangle: diagonals lie, and the distance the out-of-range falloff reads
 * off gridDistance() is measuring different amounts of ground depending on
 * which way you went. The four maps added here are cropped to 3:2 exactly, and
 * bb_maps.py refuses one that is not. The maps that shipped before this are
 * left alone -- several of them are portrait, and that is theirs to be.
 *
 * The picker says which is which: a map that rules square is marked, and one
 * that does not is marked too, with the ratio it actually has.
 */
(function () {
 "use strict";
 if (window.__bbMaps) return;
 window.__bbMaps = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);

 const LABELS = window.__BB_MAP_LABELS || {};

 /* Every .bm-bg-<key> the stylesheet defines, with the aspect ratio the rule
    declares. Read from the live rules rather than from source text, so a rule
    added by any later block is seen the same as one written into the file. */
 function declared() {
  const found = Object.create(null);
  for (let s = 0; s < document.styleSheets.length; s++) {
   let list = null;
   T(() => { list = document.styleSheets[s].cssRules; });
   if (!list) continue;                                   // cross-origin sheet
   for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (!r || !r.selectorText || !r.style) continue;
    const m = /\.bm-bg-([a-z0-9_]+)\b/.exec(r.selectorText);
    if (!m) continue;
    const ar = T(() => r.style.getPropertyValue("aspect-ratio"), "") || "";
    if (!found[m[1]]) found[m[1]] = { ratio: ar.trim() };
    else if (ar.trim()) found[m[1]].ratio = ar.trim();
   }
  }
  return found;
 }

 function ratioOf(txt) {
  if (!txt) return 16 / 9;          // .bm-stage's own default when a rule sets none
  const m = /^\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/.exec(txt);
  if (m) return +m[1] / +m[2];
  const n = parseFloat(txt);
  return isFinite(n) && n > 0 ? n : 16 / 9;
 }
 function pretty(key) {
  return key.replace(/_/g, " ").replace(/\b[a-z]/g, c => c.toUpperCase());
 }

 function register() {
  const CL = G("BM_BG_CLASSES");
  const sel = $("bmBgSelect");
  if (!CL || !sel) return 0;
  const have = declared();
  let added = 0;
  Object.keys(have).forEach(key => {
   if (CL[key]) {
    /* Already the tracker's own — but if a map has been given real artwork
       over the top of a generated backdrop that shares its key, the picker is
       still offering it under the old name. Relabel it, keeping the key so
       every saved engagement that already selected it keeps working. */
    const o = sel.querySelector('option[value="' + key + '"]');
    if (o && LABELS[key] && o.textContent.indexOf(LABELS[key]) < 0) {
     const sq0 = Math.abs(ratioOf(have[key].ratio) - 1.5) < 0.005;
     o.textContent = LABELS[key] + (sq0 ? "  \u25aa square cells" : "");
     o.title = "";
    }
    return;
   }
   CL[key] = "bm-bg-" + key;
   if (!sel.querySelector('option[value="' + key + '"]')) {
    const o = document.createElement("option");
    o.value = key;
    const sq = Math.abs(ratioOf(have[key].ratio) - 1.5) < 0.005;
    o.textContent = (LABELS[key] || pretty(key)) + (sq ? "  ▪ square cells" : "");
    o.title = sq
      ? "Cropped to 3:2, so the 12×8 grid rules square cells and distance measures the same in both directions."
      : "Aspect " + (have[key].ratio || "16/9") + " — the grid still rules 12×8, so cells are not square on this one.";
    sel.appendChild(o);
    added++;
   }
  });
  return added;
 }

 /* Marks the maps that were already here, so the picker tells the truth about
    all of them rather than only about the new ones. Runs once. */
 function annotateExisting() {
  const sel = $("bmBgSelect");
  if (!sel) return;
  const have = declared();
  Array.from(sel.options).forEach(o => {
   if (o.value === "none" || o.title) return;
   const d = have[o.value];
   if (!d) return;
   const r = ratioOf(d.ratio);
   o.title = Math.abs(r - 1.5) < 0.005
     ? "3:2 — the 12×8 grid rules square cells here."
     : "Aspect " + (d.ratio || "16/9") + " — cells are stretched, not square, on this map.";
  });
 }

 /* ---------------------------------------------------------------------
    THE CROP WAS BEING UNDONE AT DISPLAY TIME.

    Every image map in this file declares its own aspect-ratio, and a later
    rule caps the stage: `.bm-stage.bm-stage { max-height: 780px }`. Its
    comment says landscape maps never reach the cap. On a wide window they do
    — a 3:2 map in a 1416px-wide panel wants 944px of height, so the cap bites,
    the box lands at 1416x780 (1.81), and background-size:cover quietly eats
    about a sixth of the map's height. Measured, not guessed: the stage read
    1418x782 for all four new maps before this.

    So a map cropped to exactly 3:2 was still being shown cropped, and the
    12x8 grid was still ruling rectangles.

    The fix is to cap the WIDTH instead, at whatever width makes the derived
    height land exactly on the cap. The cap is read off the element rather
    than written in here, so if that 780px is ever changed this follows it,
    and it applies to the file's own maps too — the portrait ones especially,
    which were being squashed the hardest.
    -------------------------------------------------------------------- */
 function fitStage() {
  const st = document.querySelector(".bm-stage");
  if (!st) return;
  const cs = getComputedStyle(st);
  const ar = ratioOf(cs.aspectRatio === "auto" ? "" : cs.aspectRatio);
  const cap = parseFloat(cs.maxHeight);
  if (!isFinite(ar) || ar <= 0 || !isFinite(cap) || cap <= 0) {
   st.style.maxWidth = ""; return;
  }
  st.style.maxWidth = Math.round(cap * ar) + "px";
  st.style.marginLeft = "auto";
  st.style.marginRight = "auto";
 }

 T(() => {
  const orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function () { const r = orig.apply(this, arguments); T(fitStage); return r; };
 });
 T(() => {
  const sel = $("bmBgSelect");
  if (sel) sel.addEventListener("change", () => setTimeout(() => T(fitStage), 0));
 });
 window.addEventListener("resize", () => T(fitStage));

 const n = T(register, 0);
 T(annotateExisting);
 T(fitStage);

 /* A stylesheet can still be arriving on the first frame; a second pass costs
    nothing and catches a map whose rule had not parsed yet. */
 T(() => requestAnimationFrame(() => { T(register); T(annotateExisting); T(fitStage); }));
 setTimeout(() => { T(register); T(annotateExisting); T(fitStage); }, 800);

 window.blackboxMaps = {
  declared: declared,
  fit: fitStage,
  labels: LABELS,
  /* Which maps rule square cells and which do not — the question this block
     exists to answer, answerable from a console. */
  audit: () => {
   const have = declared();
   return Object.keys(have).sort().map(k => ({
    key: k, ratio: have[k].ratio || "16/9 (default)",
    square: Math.abs(ratioOf(have[k].ratio) - 1.5) < 0.005
   }));
  }
 };
 if (n) T(() => G("addLog")("system",
  "[MAPS] " + n + " battle map" + (n === 1 ? "" : "s") + " registered from the stylesheet — " +
  "cropped to 3:2, so the 12×8 grid rules square cells and distance reads the same in both " +
  "directions. The picker now says which maps do that and which don't."));
})();
/* ================= END BLACKBOX MAPS ========================= */
