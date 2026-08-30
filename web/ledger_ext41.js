/* ==== BEGIN LEDGER EXTENSION 41 — BORROWED CHROME, injected block, delete to the END marker to revert ==== */
/* THE ART THAT WAS SENT AND NEVER HUNG.
 *
 * Four sheets that have only ever been used by the combat tracker come across
 * here, plus one that has been sitting inside this file declared and never
 * drawn. Nothing here is decoration for its own sake -- each sheet was picked
 * because there was already a place in the Ledger doing that job badly:
 *
 *   emblems  (10x4 faction marks)  -> the menu cards had a rule for an icon and
 *                                     no icon; a connection with no portrait
 *                                     said the words "NO IMG"; the game cards
 *                                     were four identical rectangles.
 *   ranked hexes                   -> handled in block 40, on the tree nodes.
 *   rings    (two HUD dials)       -> the survival numbers were bare digits on
 *                                     a flat card with no sense of a gauge.
 *   plates   (seven HUD plates)    -> every screen's header bar was the same
 *                                     bar; now each one carries its own plate.
 *   glitch   (three damage bars)   -> a hairline of interference under that bar.
 *   rules    (three tech dividers) -> already in the file, never referenced.
 *
 * Almost all of it is CSS. That is deliberate: the Ledger re-renders these
 * lists constantly -- games on every tab change, connections on every raise,
 * resources on every day advance -- and art attached with ::before survives a
 * re-render, where art injected by a wrapped function has to be re-injected
 * every time and eventually is not. The one exception is the portrait slot,
 * which needs to know WHO it is standing in for, and that only exists in the
 * markup.
 *
 * Every mark is chosen by a hash of something stable -- the screen's id, the
 * game's name, the connection's name -- so a person keeps their sigil between
 * sessions instead of being reassigned one on every load.
 */
(function () {
 "use strict";
 if (window.__ledgerExt41) return;
 window.__ledgerExt41 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };

 /* A small stable hash. Same string in, same mark out, forever. */
 function hash(s) {
  let h = 2166136261;
  s = String(s == null ? "" : s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h | 0);
 }

 /* The emblem sheet: ten across, four down, 96px cells -- but only 38 marks.
    The last two cells are empty padding, and a hash taken modulo 40 lands on
    them one time in twenty, which is a connection quietly getting a blank
    portrait and nobody being told why. Counted rather than assumed: the same
    mistake put fourteen phantom icons in the combat tracker's sheet. */
 const EMB_COLS = 10, EMB_ROWS = 4, EMB_N = 38;
 function embStyle(cell, px) {
  const c = cell % EMB_COLS, r = Math.floor(cell / EMB_COLS) % EMB_ROWS;
  return "background-image:var(--emb);background-repeat:no-repeat;" +
   "background-size:" + (px * EMB_COLS) + "px " + (px * EMB_ROWS) + "px;" +
   "background-position:" + (-c * px) + "px " + (-r * px) + "px;" +
   "width:" + px + "px;height:" + px + "px";
 }

 /* Marks chosen for what they say, not at random. The lattice of triangles for
    a tree that builds on itself; the plus-and-minus infinity for bonds that go
    both ways; a thrown star for Zazz's games; a fortified keep for the
    wasteland count; and the tower of Babel for a book everybody signs in a
    different hand. */
 const SCREEN_EMB = { skilltree: 19, wavelength: 5, games: 37, apoc: 25, guestbook: 23, menu: 8 };
 const SCREEN_PLATE = { skilltree: 0, wavelength: 2, games: 4, apoc: 6, guestbook: 1, menu: 3, login: 5 };

 const css = document.createElement("style");
 let rules = `
 :root{
  --emb:url("__EMBLEMS__");
  --rings:url("__RINGS__");
  --plates:url("__PLATES__");
  --glitchbar:url("__GLITCH__");
 }

 /* ---- the header bar ------------------------------------------------
    One plate per screen, bled off the right edge at low opacity, plus a
    hairline of the glitch bar along the bottom so the bar looks like a
    display rather than a div. Both sit under the bar's own contents. */
 .section-bar{position:relative;overflow:hidden}
 .section-bar::before{content:"";position:absolute;right:-14px;top:50%;
  width:120px;height:120px;transform:translateY(-50%);pointer-events:none;
  background-image:var(--plates);background-repeat:no-repeat;
  background-size:840px 120px;opacity:.42;mix-blend-mode:screen}
 .section-bar::after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;
  pointer-events:none;background:var(--glitchbar) repeat-x 0 -46px;
  background-size:auto 120px;opacity:.30}
 .section-bar > *{position:relative;z-index:1}
`;
 Object.keys(SCREEN_PLATE).forEach(k => {
  rules += ` #screen-${k} .section-bar::before{background-position:${-120 * SCREEN_PLATE[k]}px 0}\n`;
 });

 rules += `
 /* ---- the menu cards -------------------------------------------------
    A big watermark of the screen's own mark, cropped by the card, and a
    small solid copy of it beside the category tag. The rule for
    .menu-card-icon has been in this file since the beginning with nothing
    ever using it; this is what it was for. */
 .menu-card{position:relative}
 .menu-card::after{content:"";position:absolute;right:-26px;bottom:-30px;
  width:150px;height:150px;pointer-events:none;opacity:.13;
  background-repeat:no-repeat;background-image:var(--emb);
  background-size:1500px 600px;background-position:var(--wmx,0) var(--wmy,0);
  transition:opacity .18s, transform .18s}
 .menu-card:hover::after{opacity:.24;transform:scale(1.06) rotate(-3deg)}
 /* Its own line above the title, which is what .menu-card-icon -- a rule that
    has been in this file since the start with nothing using it -- was shaped
    for. Inline it sat beside the title on the cards whose title was short and
    above it on the ones whose wasn't, and four cards in a grid should not
    disagree about where their mark lives. */
 .lx41-mark{display:block;margin:0 0 11px;opacity:.92;
  filter:drop-shadow(0 0 5px rgba(255,255,255,.20))}

 /* ---- the game cards ------------------------------------------------- */
 .game-card{position:relative;overflow:hidden}
 .game-card::before{content:"";position:absolute;right:8px;top:9px;width:40px;height:40px;
  pointer-events:none;opacity:.30;background-repeat:no-repeat;
  background-image:var(--emb);background-size:400px 160px;
  background-position:var(--gx,0) var(--gy,0);
  filter:drop-shadow(0 0 4px var(--gm-c))}
 .game-card:hover::before{opacity:.62}
 .game-card .game-card-name{padding-right:46px}

 /* ---- a connection with no portrait ---------------------------------
    It used to read "NO IMG", which is a thing a form says, not a thing a
    file about people says. Now it carries a house mark instead, the same
    one every time for the same name. */
 .wl-chibi-slot.lx41-sig,.wl-detail-chibi.lx41-sig{
  font-size:0 !important;background-repeat:no-repeat;background-image:var(--emb);
  background-color:rgba(255,255,255,.02)}
 .wl-chibi-slot.lx41-sig::after,.wl-detail-chibi.lx41-sig::after{content:"";display:block;
  position:absolute;inset:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)}

 /* ---- the survival numbers ------------------------------------------
    A dial behind the count. It only turns on the cards that are actually in
    trouble -- a gauge that spins whatever the reading says is wallpaper. */
 .apoc-res-card{position:relative;overflow:hidden}
 .apoc-res-card::before{content:"";position:absolute;right:-22px;top:50%;
  width:104px;height:104px;transform:translateY(-50%);pointer-events:none;
  opacity:.10;background-image:var(--rings);background-repeat:no-repeat;
  background-size:208px 104px;background-position:0 0}
 /* Tinted to the reading, because a blue-grey dial on a card that is telling
    you there is one day of water left is the wrong colour to be calm in. */
 .apoc-res-card.res-warn::before{opacity:.22;background-position:-104px 0;
  filter:sepia(1) saturate(4.5) hue-rotate(-14deg);
  animation:lx41-spin 22s linear infinite}
 .apoc-res-card.res-danger::before{opacity:.34;background-position:-104px 0;
  filter:sepia(1) saturate(7) hue-rotate(-48deg) drop-shadow(0 0 7px rgba(214,78,58,.55));
  animation:lx41-spin 5.5s linear infinite}
 @keyframes lx41-spin{from{transform:translateY(-50%) rotate(0)}
                      to{transform:translateY(-50%) rotate(360deg)}}
 .apoc-res-value{position:relative;z-index:1}

 /* ---- the dividers ---------------------------------------------------
    --rules was inlined into this file at build time and then never referenced
    once -- a strip of three tech dividers nobody drew. The two horizontal
    bars that were only ever a border get one each: the day counter, and the
    row of game tabs. */
 .apoc-day-bar,.games-tabs{position:relative}
 .apoc-day-bar::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:9px;
  pointer-events:none;opacity:.34;background:var(--rules) repeat-x 0 0;background-size:auto 78px}
 .games-tabs::after{content:"";position:absolute;left:0;right:0;bottom:0;height:11px;
  pointer-events:none;opacity:.26;background:var(--rules) repeat-x 0 -30px;background-size:auto 78px}
 `;
 css.textContent = rules;
 document.head.appendChild(css);

 /* The two places a mark has to be written into the markup rather than
    painted behind it: the small copy beside a menu card's tag, and the
    portrait a connection does not have. Both are idempotent -- they check for
    their own class first -- because both run again on every re-render. */
 function dressMenu() {
  document.querySelectorAll(".menu-card[data-goto]").forEach(card => {
   const key = card.getAttribute("data-goto");
   const cell = SCREEN_EMB[key] === undefined ? hash(key) % EMB_N : SCREEN_EMB[key];
   const c = cell % EMB_COLS, r = Math.floor(cell / EMB_COLS) % EMB_ROWS;
   card.style.setProperty("--wmx", (-c * 150) + "px");
   card.style.setProperty("--wmy", (-r * 150) + "px");
   const tag = card.querySelector(".menu-card-tag");
   const already = tag && tag.previousElementSibling &&
     tag.previousElementSibling.classList.contains("lx41-mark");
   if (tag && !already) {
    const i = document.createElement("i");
    i.className = "lx41-mark";
    i.setAttribute("style", embStyle(cell, 26));
    tag.parentNode.insertBefore(i, tag);
   }
  });
 }

 function dressConnections() {
  document.querySelectorAll(".wl-chibi-slot,.wl-detail-chibi").forEach(slot => {
   if (slot.querySelector("img")) { slot.classList.remove("lx41-sig"); return; }
   const card = slot.closest(".wl-card,.wl-detail-view") || slot.parentNode;
   const nmEl = card && card.querySelector(".wl-card-name,.wl-detail-name");
   const nm = nmEl ? nmEl.textContent.trim() : (slot.textContent || "");
   const cell = hash("sigil:" + nm) % EMB_N;
   const px = slot.classList.contains("wl-detail-chibi") ? 84 : 54;
   const c = cell % EMB_COLS, r = Math.floor(cell / EMB_COLS) % EMB_ROWS;
   slot.classList.add("lx41-sig");
   slot.style.backgroundSize = (px * EMB_COLS) + "px " + (px * EMB_ROWS) + "px";
   /* Centred by hand: a sprite cell cannot be background-position:center and
      offset by its own coordinates at once, so the offset is measured from
      the slot's middle. */
   const ox = Math.round((slot.clientWidth - px) / 2);
   const oy = Math.round((slot.clientHeight - px) / 2);
   slot.style.backgroundPosition = (ox - c * px) + "px " + (oy - r * px) + "px";
  });
 }

 function dressGames() {
  document.querySelectorAll(".game-card").forEach(card => {
   const nmEl = card.querySelector(".game-card-name");
   const cell = hash("game:" + (nmEl ? nmEl.textContent.trim() : "")) % EMB_N;
   const c = cell % EMB_COLS, r = Math.floor(cell / EMB_COLS) % EMB_ROWS;
   card.style.setProperty("--gx", (-c * 40) + "px");
   card.style.setProperty("--gy", (-r * 40) + "px");
  });
 }

 /* One observer instead of five wrapped render functions. The Ledger rebuilds
    these lists from innerHTML, so anything hung on the old nodes is gone; a
    subtree observer catches every rebuild including the ones added by blocks
    that do not exist yet. Batched to a frame so a render that appends fifty
    cards one at a time still costs one pass. */
 let queued = false;
 function pass() {
  queued = false;
  T(dressMenu); T(dressConnections); T(dressGames);
 }
 function nudge() { if (!queued) { queued = true; requestAnimationFrame(pass); } }
 T(() => {
  new MutationObserver(nudge).observe(document.body, { childList: true, subtree: true });
 });
 if (document.readyState === "loading") addEventListener("DOMContentLoaded", nudge);
 nudge();
})();
/* ================= END LEDGER EXTENSION 41 ========================= */
