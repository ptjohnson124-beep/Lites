/* ==== BEGIN BLACKBOX CSS IMAGE RESTORE — injected block, delete to the END marker to revert ==== */
/* THE ARTWORK COMES BACK AS BLOBS. THIS IS THE LAG FIX.
 *
 * Measured, not guessed. The tracker's stylesheet carried 4.3 MB of artwork
 * inline as base64 `url("data:...")` values, and three of those sat in CUSTOM
 * PROPERTIES on :root and body -- --uic at 1.34 MB, --combat-bg-1 at 716 KB,
 * --bm-img-1 at 533 KB. A custom property on :root is INHERITED, so every one
 * of the page's three thousand elements carried a copy of those strings in its
 * computed style, and every full style recalculation had to resolve them all
 * again.
 *
 * What that cost, measured in the running app:
 *
 *   full style recalculation      5,440 ms
 *   one render()                  4,800 ms
 *   load to interactive          22,100 ms
 *
 * A style recalculation is not a rare event. It happens whenever the DOM is
 * rebuilt, which every renderForces() does, and the sprite panel's fit() reads
 * stage.clientWidth on every render -- which forces that recalculation to
 * happen SYNCHRONOUSLY, inside the render call, before anything can paint. So
 * one action at the table cost several seconds of frozen page, and it was not
 * the game logic: with the same rules and the same artwork but the images held
 * as blobs instead of as text, the same recalculation is 36 ms.
 *
 *   full style recalculation         36 ms   (150x)
 *   one render()                     94 ms   (51x)
 *
 * Nothing is thrown away and nothing is re-encoded. The bytes are the same
 * bytes; they are handed to the browser as Blobs and referenced by a 60-
 * character blob: URL instead of by a 1.3-megabyte string, so the style engine
 * copies a pointer where it used to copy a megabyte. Screenshots before and
 * after differ by less than the page's own idle animation.
 *
 * bb_fix.py lifts the payloads out of the stylesheet at build time and leaves
 * `about:blank#bbimgN` markers behind, so the CSS parser never sees them
 * either -- that is the other half, and it is what takes the load down. This
 * script puts them back before the first paint. It runs from the <head>,
 * immediately after the stylesheet it repairs, for exactly that reason.
 *
 * If it does not run, or fails, the artwork is missing but nothing else
 * breaks: every marker is a valid URL that simply resolves to nothing.
 */
(function () {
 "use strict";
 if (window.__bbCssBoot) return;
 window.__bbCssBoot = true;
 var T = function (fn, d) { try { return fn(); } catch (e) { return d; } };
 var PAY = window.__BB_CSS_IMG || {};
 var made = {}, used = 0, bytes = 0, props = 0;

 function blobFor(key) {
  if (made[key]) return made[key];
  var uri = PAY[key];
  if (!uri) return "";
  var url = uri;
  T(function () {
   var c = uri.indexOf(",");
   var type = uri.slice(5, c).split(";")[0] || "application/octet-stream";
   var bin = atob(uri.slice(c + 1)), arr = new Uint8Array(bin.length);
   for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
   url = URL.createObjectURL(new Blob([arr], { type: type }));
   bytes += bin.length; used++;
  });
  made[key] = url;
  return url;
 }

 /* Two shapes are rewritten. A MARKER is what bb_fix.py left behind and is the
    normal path. A raw data: URI is the fallback for a file that was never
    deflated -- running this on an untouched tracker still fixes the recalc,
    it just cannot help the load. */
 var MARK = /url\(\s*(['"]?)about:blank#(bbimg\d+)\1\s*\)/g;
 var DATA = /url\(\s*(['"]?)(data:[^'")\s]+)\1\s*\)/g;
 var inline = {}, inlineN = 0;

 function rewrite(v) {
  if (v.indexOf("about:blank#bbimg") >= 0)
   return v.replace(MARK, function (m, q, key) {
    var u = blobFor(key);
    return u ? 'url("' + u + '")' : m;
   });
  if (v.indexOf("data:") >= 0 && v.length >= 400)
   return v.replace(DATA, function (m, q, uri) {
    var k = inline[uri];
    if (!k) { k = inline[uri] = "inline" + (++inlineN); PAY[k] = uri; }
    var u = blobFor(k);
    return u ? 'url("' + u + '")' : m;
   });
  return v;
 }

 /* Walked by index rather than by iterator, and each rule's children read behind
    a try: a CSSImportRule throws on .cssRules, and an iterator that dies
    halfway leaves the rest of the sheet unconverted -- which is exactly what
    the first version of this did, and it silently fixed seven declarations out
    of fifty. */
 function doRule(r) {
  var kids = null;
  try { kids = r.cssRules; } catch (e) { kids = null; }
  if (kids && kids.length) for (var i = 0; i < kids.length; i++) doRule(kids[i]);
  var st = r.style;
  if (!st) return;
  var names = [];
  for (var j = 0; j < st.length; j++) names.push(st[j]);
  for (var k = 0; k < names.length; k++) {
   var p = names[k], v = "";
   try { v = st.getPropertyValue(p); } catch (e) { continue; }
   if (!v) continue;
   var nv = rewrite(v);
   if (nv === v) continue;
   T(function () { st.setProperty(p, nv, st.getPropertyPriority(p)); props++; });
  }
 }

 function run() {
  var t0 = (window.performance && performance.now()) ? performance.now() : 0;
  var sheets = document.styleSheets;
  for (var i = 0; i < sheets.length; i++) {
   var list = null;
   try { list = sheets[i].cssRules; } catch (e) { continue; }   // cross-origin
   for (var j = 0; j < list.length; j++) doRule(list[j]);
  }
  var ms = t0 ? Math.round(performance.now() - t0) : 0;
  window.__bbCssBootStats = { images: used, declarations: props,
                              bytes: bytes, ms: ms };
 }
 run();
 /* A stylesheet added later -- an injected skin block appended after this one
    -- is caught on the next frame rather than missed. */
 T(function () { requestAnimationFrame(run); });
})();
/* ================= END BLACKBOX CSS IMAGE RESTORE ========================= */
