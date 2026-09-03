/* ==== BEGIN BLACKBOX CSS IMAGE RESTORE — injected block, delete to the END marker to revert ==== */
/* THE ARTWORK COMES BACK, AND IT COMES BACK AS DATA URIs.
 *
 * WHY THE STYLESHEET WAS EMPTIED IN THE FIRST PLACE. The tracker carried about
 * 4.3 MB of artwork inline as base64 `url("data:...")`, and several of those
 * values sat in CUSTOM PROPERTIES on :root -- the icon sheet at 1.34 MB, the
 * combat backdrop at 700 KB, every battle map. A custom property on :root is
 * INHERITED, so all three thousand elements on the page carried a copy of those
 * strings in their computed style, and every full style recalculation resolved
 * them all again. Measured in the running app: 5,440 ms per recalculation, and
 * one happens on every DOM rebuild. That was the lag.
 *
 * WHAT THIS SCRIPT LEARNED THE HARD WAY. The first version handed the bytes to
 * the browser as Blobs and referenced them by a short blob: URL. That is fast
 * and it is WRONG for this file: the tracker is opened off a disk, a file://
 * page has a null origin, and a blob:null/... URL is not something every
 * browser will load from CSS. It worked in one browser and left the battle maps
 * as a blank stage in another -- which is exactly what a person opening the
 * file by double-clicking it saw. A data: URI has no origin to argue with and
 * has worked everywhere since the nineties. The bytes go back as data: URIs.
 *
 * SO WHERE DOES THE SPEED COME FROM NOW? From WHERE the payload is written,
 * not from what it is. Inheritance was the whole cost, so:
 *
 *   a normal property -- background-image, mask-image, border-image, src --
 *   gets the data: URI written straight back into its own rule. Not inherited,
 *   costs nothing, and this is how the file's other big images always worked.
 *
 *   a CUSTOM property is DISSOLVED. Every rule that reads var(--name) has the
 *   data: URI written directly into the property doing the reading, and the
 *   :root declaration is cleared. The property stops existing rather than
 *   moving somewhere narrower.
 *
 * Narrowing was tried first and was not enough, which is worth writing down.
 * Re-declaring the icon sheet on just the elements whose ::before reads it
 * sounds surgical until you count them: its readers include .sk, .unit and
 * .hp-quick .btn, so 1,609 of the page's 3,092 elements still inherited it and
 * the recalculation was still 2,065 ms. Dissolving it instead costs eleven
 * copies of a 1.3 MB string -- about 14 MB, and the heap goes to 61 MB, which
 * is nothing on a page already holding sprite atlases -- and buys this:
 *
 *   full style recalculation   5,440 ms -> 23 ms
 *   one render()               4,900 ms -> 41 ms
 *
 * with every image loading in every browser.
 *
 * If this script does not run, the artwork is missing and nothing else breaks:
 * every marker is a valid URL that resolves to nothing.
 */
(function () {
 "use strict";
 if (window.__bbCssBoot) return;
 window.__bbCssBoot = true;
 var T = function (fn, d) { try { return fn(); } catch (e) { return d; } };
 var PAY = window.__BB_CSS_IMG || {};
 var stats = { images: 0, direct: 0, dissolved: 0, orphans: [], ms: 0 };

 var MARK = /url\(\s*(['"]?)about:blank#(bbimg[A-Za-z0-9_]+)\1\s*\)/g;
 var hasMark = function (v) { return v.indexOf("about:blank#bbimg") >= 0; };
 var fill = function (v) {
  return v.replace(MARK, function (m, q, key) {
   var uri = PAY[key];
   if (!uri) { if (stats.orphans.indexOf(key) < 0) stats.orphans.push(key); return m; }
   stats.images++;
   return 'url("' + uri + '")';
  });
 };

 function allRules(sheet, out) {
  var list = null;
  try { list = sheet.cssRules; } catch (e) { return out; }      // cross-origin
  for (var i = 0; i < list.length; i++) walk(list[i], out, sheet);
  return out;
 }
 function walk(r, out, sheet) {
  var kids = null;
  try { kids = r.cssRules; } catch (e) { kids = null; }
  if (kids && kids.length) for (var i = 0; i < kids.length; i++) walk(kids[i], out, sheet);
  if (r.style) out.push({ rule: r, sheet: sheet });
 }

 function run() {
  var t0 = T(function () { return performance.now(); }, 0);
  var rules = [];
  for (var i = 0; i < document.styleSheets.length; i++) allRules(document.styleSheets[i], rules);

  /* Pass one: every marker sitting in a normal property is filled in place. A
     marker in a CUSTOM property is collected instead -- writing it back where
     it stands is precisely the thing that made the page slow. */
  var vars = [];
  for (var k = 0; k < rules.length; k++) {
   var st = rules[k].rule.style, names = [];
   for (var j = 0; j < st.length; j++) names.push(st[j]);
   for (var n = 0; n < names.length; n++) {
    var p = names[n], v = "";
    try { v = st.getPropertyValue(p); } catch (e) { continue; }
    if (!v || !hasMark(v)) continue;
    if (p.slice(0, 2) === "--") { vars.push({ name: p, value: v, at: rules[k] }); continue; }
    (function (st, p, v) {
     T(function () { st.setProperty(p, fill(v), st.getPropertyPriority(p)); stats.direct++; });
    })(st, p, v);
   }
  }

  /* Pass two: each custom property is dissolved into the rules that read it. */
  var VARCALL = function (name) { return new RegExp("var\\(\\s*" + name + "\\s*(,[^)]*)?\\)", "g"); };
  for (var m = 0; m < vars.length; m++) {
   (function (entry) {
    var name = entry.name, filled = fill(entry.value), wrote = 0;
    var re = VARCALL(name);
    for (var q = 0; q < rules.length; q++) {
     var st2 = rules[q].rule.style, props = [];
     for (var w = 0; w < st2.length; w++) props.push(st2[w]);
     for (var x = 0; x < props.length; x++) {
      var pp = props[x], vv = "";
      try { vv = st2.getPropertyValue(pp); } catch (e) { continue; }
      if (!vv || vv.indexOf("var(" + name) < 0 && vv.indexOf("var( " + name) < 0) continue;
      re.lastIndex = 0;
      var nv = vv.replace(re, filled);
      if (nv === vv) continue;
      (function (st2, pp, nv) {
       T(function () { st2.setProperty(pp, nv, st2.getPropertyPriority(pp)); wrote++; });
      })(st2, pp, nv);
     }
    }
    if (!wrote) {
     /* Nobody reads it. Correctness first: put it back where it stood and
        accept whatever it costs -- an image nobody can see is the worse bug. */
     T(function () { entry.at.rule.style.setProperty(name, filled); });
     return;
    }
    T(function () { entry.at.rule.style.setProperty(name, "initial"); });
    stats.dissolved++;
   })(vars[m]);
  }

  stats.ms = t0 ? Math.round(performance.now() - t0) : 0;
  window.__bbCssBootStats = stats;
 }
 run();
 /* A stylesheet added later -- an injected skin block after this one -- is
    caught on the next frame rather than missed. */
 T(function () { requestAnimationFrame(run); });
})();
/* ================= END BLACKBOX CSS IMAGE RESTORE ========================= */
