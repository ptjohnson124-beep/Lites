/* ==== BEGIN BLACKBOX MUSIC BAR CLOSE — injected block, delete to the END marker to revert ==== *
 *
 * PASS 40 puts three things on screen and only one of them can be dismissed.
 *
 *   #bb40Cue   the cue card      — already has a wired ✕ and a 45s timeout. Fine.
 *   #bb40Note  the settings panel — closes ONLY by clicking ♪ again. Nothing on
 *                                   the panel says so, so it reads as stuck.
 *   #bb40Btn   the ♪ corner button — pinned bottom-right forever, with no way
 *                                   to hide it at all.
 *
 * This adds the two missing affordances and leaves PASS 40 itself untouched:
 *   · a ✕ on the settings panel, and a "hide the ♪ button" row inside it
 *   · Escape closes the panel, and then the cue card
 *   · window.__bbMusicBar.show() / .hide() / .toggle() from the console
 *
 * Hiding is remembered in localStorage, and the moment it hides it logs the
 * one line that brings it back — a control you cannot find again is worse
 * than one you cannot close.
 */
(function () {
 "use strict";
 if (window.__bbMusicClose) return; window.__bbMusicClose = true;

 const $ = (id) => document.getElementById(id);
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const log = (m) => T(() => window.addLog && window.addLog("system", m));
 const KEY = "bb_musicBtnHidden";

 const isHidden = () => T(() => localStorage.getItem(KEY) === "1", false);
 const remember = (v) => T(() => localStorage.setItem(KEY, v ? "1" : "0"));

 function applyBtn() {
  const b = $("bb40Btn");
  if (!b) return false;
  b.style.display = isHidden() ? "none" : "";
  return true;
 }

 function hide() {
  remember(true); applyBtn();
  if ($("bb40Note")) $("bb40Note").remove();
  log("[MUSIC] ♪ button hidden. Bring it back with __bbMusicBar.show() in the console.");
  return true;
 }
 function show() { remember(false); applyBtn(); return true; }

 window.__bbMusicBar = {
  show: show, hide: hide,
  toggle: () => (isHidden() ? show() : hide()),
  get hidden() { return isHidden(); }
 };

 /* The panel is built by PASS 40's own click handler, so it is decorated when
    it appears rather than by rewriting that handler — a wrapper there would
    have to rebuild the whole innerHTML to add one button. */
 function decorate(n) {
  if (!n || n.__bbDecorated) return;
  n.__bbDecorated = true;

  n.style.position = n.style.position || "fixed";

  const x = document.createElement("button");
  x.textContent = "✕";
  x.title = "Close (Esc)";
  x.style.cssText = "position:absolute;top:6px;right:6px;background:#1d1630;" +
   "border:1px solid #4a3f66;color:#e6dcff;font:700 10.5px ui-monospace,Menlo,monospace;" +
   "padding:2px 6px;border-radius:4px;cursor:pointer;line-height:1.2";
  x.onclick = () => n.remove();
  n.appendChild(x);

  const row = document.createElement("label");
  row.style.cssText = "display:block;margin-top:8px;padding-top:7px;border-top:1px solid #33294d";
  const cb = document.createElement("input");
  cb.type = "checkbox"; cb.checked = isHidden();
  cb.onchange = () => { cb.checked ? hide() : show(); };
  row.appendChild(cb);
  row.appendChild(document.createTextNode(" hide the ♪ button"));
  n.appendChild(row);
 }

 T(() => {
  const obs = new MutationObserver(() => {
   const n = $("bb40Note"); if (n) decorate(n);
   applyBtn();                       // PASS 40 may rebuild the button on boot
  });
  obs.observe(document.body, { childList: true });
 });

 /* Escape: the panel first, then the cue card. Never both at once, so one
    press does not clear something the user was still reading. */
 T(() => {
  document.addEventListener("keydown", (ev) => {
   if (ev.key !== "Escape") return;
   const n = $("bb40Note"); if (n) { n.remove(); return; }
   const c = $("bb40Cue");  if (c) { c.remove(); }
  });
 });

 applyBtn();
 T(() => log("[GM ONLY · MUSIC] the ♪ panel now has a ✕ and a 'hide the ♪ button' row; " +
             "Esc closes the panel, then the cue card. __bbMusicBar.show() restores a hidden button."));
})();
/* ================= END BLACKBOX MUSIC BAR CLOSE ========================= */
