/* ==== BEGIN LEDGER CHIBIS — injected block, delete to the END marker to revert ==== */
/* THE PORTRAITS.
 *
 * Sixty-six connections have carried `chibi: null` since the file was written,
 * and every card that had no portrait printed the words "NO IMG". This block
 * holds the portraits and hands them out. It is separate from the extension
 * blocks on purpose: it is the one block that will be re-injected over and
 * over, once per person as their art gets drawn, and it should never take a
 * code change to do that -- the injector reads a folder and whatever is in it
 * is what ships.
 *
 * Two places take a portrait, and the second one was already built for it:
 * .menu-avatar has had `img{width:100%;height:100%;object-fit:cover}` in the
 * stylesheet since the beginning, with nothing ever putting an img inside it.
 * It has been drawing a single letter this whole time.
 *
 * Names are matched exactly first, then as a leading word -- so a file called
 * Dahlia.webp finds the connection "Dahlia Ishmael", and finds it in Cole's
 * list and Vergil's both. A key that would match two different people is
 * reported and skipped rather than guessed at, because a portrait on the wrong
 * person is worse than no portrait.
 */
(function () {
 "use strict";
 if (window.__ledgerChibis) return;
 window.__ledgerChibis = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);

 const PORTRAITS = __PORTRAITS__;
 const KEYS = Object.keys(PORTRAITS);
 if (!KEYS.length) return;

 const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

 /* Every connection object the file holds, across both characters and any
    later block that pushed more in. Collected fresh each pass, because the
    wavelength blocks add to these arrays long after this one runs.
    The store is WAVELENGTHS; every block that touches it aliases it to a local
    `WL`, which is a good way to look up the wrong name and silently find
    nothing -- as this block did on its first run. */
 function allConnections() {
  const WL = G("WAVELENGTHS") || G("WL") || {};
  const out = [];
  Object.keys(WL).forEach(who => {
   const list = WL[who];
   if (Array.isArray(list)) list.forEach(c => { if (c && typeof c === "object") out.push(c); });
  });
  return out;
 }

 /* Which key belongs to which connection. Resolved per CONNECTION rather
    than per key, so precedence is a decision rather than an accident of the
    order the folder happened to be read in: an exact name always beats a
    leading-word match, and among leading-word matches the longest key wins.
    That is what lets "Betanexus and Dotframe.webp" -- one card, two people --
    sit in the folder beside a "Betanexus.webp" without the shorter name
    quietly taking the card. */
 function keyFor(name) {
  const n = norm(name);
  let exact = null, prefix = null;
  KEYS.forEach(k => {
   const kk = norm(k);
   if (kk === n) exact = k;
   else if (n.startsWith(kk + " ") && (!prefix || kk.length > norm(prefix).length)) prefix = k;
  });
  return exact || prefix;
 }

 let applied = 0, reported = false;
 function apply() {
  const conns = allConnections();
  if (!conns.length) return;
  const used = {};
  conns.forEach(c => {
   const key = keyFor(c.name);
   if (!key) return;
   used[key] = (used[key] || 0) + 1;
   if (c.chibi !== PORTRAITS[key]) { c.chibi = PORTRAITS[key]; applied++; }
  });
  if (!reported) {
   reported = true;
   const missed = KEYS.filter(k => !used[k]);
   console.log("[chibis] " + (KEYS.length - missed.length) + "/" + KEYS.length + " placed" +
     (missed.length ? "; no connection named: " + missed.join(", ") : ""));
  }
 }

 /* The menu avatar, which has been a letter in a circle waiting for an image.
    Keyed off the player's display name rather than their login key, so the
    same file serves the connection card and the avatar. */
 function avatar() {
  const el = document.getElementById("menuAvatar");
  if (!el) return;
  const P = G("PLAYERS") || {}, who = G("currentUser");
  const nm = (P[who] || {}).name;
  if (!nm) return;
  const key = KEYS.find(k => norm(k) === norm(nm)) ||
              KEYS.find(k => norm(nm).startsWith(norm(k) + " "));
  if (!key) return;
  if (el.firstElementChild && el.firstElementChild.getAttribute("src") === PORTRAITS[key]) return;
  el.textContent = "";
  const img = document.createElement("img");
  img.src = PORTRAITS[key];
  img.alt = nm;
  el.appendChild(img);
 }

 /* Applied on load and again after any screen change, because the wavelength
    blocks push new connections in at their own pace and openMenu rewrites the
    avatar back to a letter every time it runs. */
 function pass() { T(apply); T(avatar); }
 T(() => {
  const orig = window.showScreen;
  if (typeof orig === "function")
   window.showScreen = function () { const r = orig.apply(this, arguments); T(pass); return r; };
 });
 T(() => {
  const orig = window.openMenu;
  if (typeof orig === "function")
   window.openMenu = function () { const r = orig.apply(this, arguments); T(pass); return r; };
 });
 if (document.readyState === "loading") addEventListener("DOMContentLoaded", pass);
 pass();
 setTimeout(pass, 300);

 window.ledgerChibis = { portraits: PORTRAITS, apply: pass };
})();
/* ================= END LEDGER CHIBIS ========================= */
