/* ==== BEGIN LEDGER EXTENSION 47 — NO MORE HOOKS, injected block, delete to the END marker to revert ==== */
/* THE HOOK LINE GOES; BUFFS AND UNLOCK METHODS BECOME LISTS.
 *
 * A rung used to read: Buff, then Hook, then "TO EARN THIS RUNG", then "AND
 * THEN THIS IS TRUE". The Hook is gone from every rung on every screen, in
 * both the reading view and the edit view.
 *
 * Gone from the SCREEN, not from the data. c.rungs[i].hook is left exactly
 * where it is and still travels in a save file, so nothing anyone wrote is
 * destroyed by this block and deleting the block brings every line back.
 *
 * In its place both of the things that survived become LISTS rather than
 * single lines, because that is what the hook was really being used for:
 *
 *   buffs   -- a rung can grant several things. Seeded from the single buff
 *              that was already there, so no rung starts empty.
 *   unlocks -- a rung can be earned more than one way. Seeded from the task
 *              the wave type was already showing, so no rung loses its first
 *              method either. Each carries its own checkbox.
 *
 * "AND THEN THIS IS TRUE" is untouched -- it belongs to the shared rung
 * ladder rather than to any one connection, and it was asked to stay.
 *
 * Both lists live on the connection's own rung entry, which means the save
 * file already carries them: block 46 saves `rungs` whole.
 */
(function () {
 "use strict";
 if (window.__ledgerExt47) return;
 window.__ledgerExt47 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

 const DKEY = "opus_unlock_done_v1";
 const DONE = T(() => JSON.parse(localStorage.getItem(DKEY) || "{}"), {}) || {};
 const dSave = () => T(() => localStorage.setItem(DKEY, JSON.stringify(DONE)));

 function activeConn() {
  return T(() => {
   const list = G("connectionsFor")(G("currentUser")) || [];
   return list.find(x => x.id === G("activeWLPerson")) || null;
  }, null);
 }

 /* Seeded once per rung, from whatever that rung already had. The unlock
    method is read off the DOM rather than out of a table, because the text
    shown there depends on the connection's wave type and this block has no
    business duplicating that logic. */
 function seed(c, i, row) {
  const r = (c.rungs = c.rungs || [])[i] || (c.rungs[i] = {});
  if (!Array.isArray(r.buffs)) {
   const b = (r.buff || "").trim();
   r.buffs = b && !/^not written yet\.?$/i.test(b) ? [b] : [];
  }
  if (!Array.isArray(r.unlocks)) {
   const t = row && row.querySelector(".lx-task .tx");
   const s = t ? t.textContent.trim() : "";
   r.unlocks = s ? [s] : [];
  }
  return r;
 }

 const dKey = (c, i, j) => c.id + "#" + i + "#" + j;

 function lineList(cls, label, items) {
  if (!items.length) return "";
  return '<div class="' + cls + '"><span class="cap">' + label + '</span>' +
   items.map(x => '<div class="row">' + esc(x) + '</div>').join("") + '</div>';
 }

 /* ---- reading view ---------------------------------------------------- */
 /* One rung, one editor. A rung being EDITED must not also show the reading
    view underneath it: the first pass drew both, so an open rung listed its
    buff three times over -- the Ledger's own single Buff field, this block's
    read-only list, and this block's editable list -- and its unlock methods
    twice. The reading half is skipped while the editor is up. */
 function paint(c, row, i, reached, editing) {
  const r = seed(c, i, row);
  const box = row.querySelector(".wl-rung-box");
  if (!box) return;

  T(() => { const h = box.querySelector(".wl-rung-hook"); if (h) h.remove(); });

  const old = box.querySelector(".lx47-buffs");
  if (old) old.remove();
  const buffBlock = row.querySelector(".wl-rung-buff");
  if (buffBlock) buffBlock.style.display = "none";
  if (editing && reached) {
   T(() => { const u = row.querySelector(".lx47-unlocks"); if (u) u.remove(); });
   const t = row.querySelector(".lx-task");
   if (t) t.style.display = "none";
   return;
  }
  const wrap = document.createElement("div");
  wrap.className = "lx47-buffs";
  wrap.innerHTML = reached
   ? (r.buffs.length
      ? lineList("lx47-list", r.buffs.length > 1 ? "BUFFS" : "BUFF", r.buffs)
      : '<div class="lx47-list"><span class="cap">BUFF</span>' +
        '<div class="row dim">Nothing yet.</div></div>')
   : '<div class="lx47-list"><span class="cap">BUFF</span>' +
     '<div class="row dim">Locked.</div></div>';
  box.appendChild(wrap);

  /* The unlock methods replace the single task block 23 draws. Its checkbox
     state was keyed one-per-rung; these are keyed per method, so a rung with
     three ways in remembers which of the three were taken. */
  const hooks = row.querySelector(".lx-hooks");
  if (!hooks) return;
  const task = hooks.querySelector(".lx-task");
  const oldU = hooks.querySelector(".lx47-unlocks");
  if (oldU) oldU.remove();
  if (task) task.style.display = "none";
  const u = document.createElement("div");
  u.className = "lx47-unlocks";
  u.innerHTML = '<span class="cap">' +
   (r.unlocks.length > 1 ? "TO EARN THIS RUNG — ANY OF" : "TO EARN THIS RUNG") + '</span>' +
   (r.unlocks.length
    ? r.unlocks.map((x, j) => {
       const k = dKey(c, i, j), on = !!DONE[k];
       return '<label class="lx47-u' + (on ? " done" : "") + '">' +
        '<input type="checkbox"' + (on ? " checked" : "") + ' data-k="' + esc(k) + '">' +
        '<span class="tx">' + esc(x) + '</span></label>';
      }).join("")
    : '<div class="lx47-u empty">No method written yet.</div>');
  hooks.insertBefore(u, hooks.firstChild);
  u.querySelectorAll("input").forEach(cb => {
   cb.onchange = () => {
    DONE[cb.dataset.k] = cb.checked; dSave();
    cb.closest(".lx47-u").classList.toggle("done", cb.checked);
   };
  });
 }

 /* ---- edit view -------------------------------------------------------- */
 function editor(c, row, i) {
  const r = seed(c, i, row);
  const box = row.querySelector(".wl-rung-box");
  if (!box || box.querySelector(".lx47-edit")) return;

  /* The Ledger's own hook field goes with the hook line. Its label is the
     text node before it, so both are found by walking, not by class. */
  box.querySelectorAll(".wl-edit-hook").forEach(ta => {
   const lab = ta.previousElementSibling;
   if (lab && lab.classList.contains("wl-form-label")) lab.remove();
   ta.remove();
  });
  /* The single Buff field is HIDDEN rather than removed. It is a third copy of
     the same line, and editing it would write to r.buff, which nothing draws
     any more -- but saveWLEdits still reads it, so taking it out of the page
     entirely would drop that value on the next save. */
  box.querySelectorAll(".wl-edit-buff").forEach(ta => {
   const lab = ta.previousElementSibling;
   if (lab && lab.classList.contains("wl-form-label")) lab.style.display = "none";
   ta.style.display = "none";
  });

  const ed = document.createElement("div");
  ed.className = "lx47-edit";
  const draw = () => {
   ed.innerHTML =
    '<div class="lx47-eh">BUFFS</div>' +
    r.buffs.map((b, j) =>
      '<div class="lx47-er"><textarea rows="2" data-kind="buff" data-j="' + j + '">' +
      esc(b) + '</textarea><button class="lx47-x" data-kind="buff" data-j="' + j +
      '" title="remove">×</button></div>').join("") +
    '<button class="lx47-add" data-kind="buff">+ another buff</button>' +
    '<div class="lx47-eh">WAYS TO EARN THIS RUNG</div>' +
    r.unlocks.map((u, j) =>
      '<div class="lx47-er"><textarea rows="2" data-kind="unlock" data-j="' + j + '">' +
      esc(u) + '</textarea><button class="lx47-x" data-kind="unlock" data-j="' + j +
      '" title="remove">×</button></div>').join("") +
    '<button class="lx47-add" data-kind="unlock">+ another way in</button>';
   ed.querySelectorAll("textarea").forEach(ta => {
    ta.oninput = () => {
     const list = ta.dataset.kind === "buff" ? r.buffs : r.unlocks;
     list[Number(ta.dataset.j)] = ta.value;
    };
   });
   ed.querySelectorAll(".lx47-add").forEach(b => {
    b.onclick = (e) => {
     e.preventDefault();
     (b.dataset.kind === "buff" ? r.buffs : r.unlocks).push("");
     draw();
    };
   });
   ed.querySelectorAll(".lx47-x").forEach(b => {
    b.onclick = (e) => {
     e.preventDefault();
     (b.dataset.kind === "buff" ? r.buffs : r.unlocks).splice(Number(b.dataset.j), 1);
     draw();
    };
   });
  };
  draw();
  box.appendChild(ed);
 }

 function fix() {
  const c = activeConn();
  const ladder = $("wlLadder");
  if (!c || !ladder) return;
  const editing = !!G("wlEditMode");
  [...ladder.querySelectorAll(".wl-rung")].forEach((row, i) => {
   const reached = (i + 1) <= c.level;
   T(() => paint(c, row, i, reached, editing));
   if (editing && reached) T(() => editor(c, row, i));
  });
 }

 /* Hook wording anywhere else in the app -- the add-person form has its own
    labelled field. Cleared the same way: hidden, never deleted. */
 function sweep() {
  document.querySelectorAll("label, .wl-form-label").forEach(l => {
   if (/^\s*hook\s*:?\s*$/i.test(l.textContent || "")) {
    const f = l.nextElementSibling;
    l.style.display = "none";
    if (f && /^(TEXTAREA|INPUT)$/.test(f.tagName)) f.style.display = "none";
   }
  });
 }

 ["renderWLDetailContent", "openWLDetail", "toggleWLEdit"].forEach(fn => T(() => {
  const orig = window[fn];
  if (typeof orig !== "function") return;
  window[fn] = function () {
   const r = orig.apply(this, arguments);
   T(fix); T(sweep);
   return r;
  };
 }));

 const css = document.createElement("style");
 css.textContent = `
 /* Hook is gone from the reading view, wherever a block drew one. */
 .wl-rung-hook{display:none !important}

 .lx47-list .cap,.lx47-unlocks .cap{display:block;font-family:var(--font-mono);
  font-size:8.5px;letter-spacing:.08em;color:var(--faint);margin-bottom:3px}
 .lx47-list .row{font-family:var(--font-body);font-size:11.5px;line-height:1.5;
  color:var(--paper);padding:3px 0 3px 11px;border-left:2px solid var(--spray3);
  margin-bottom:4px}
 .lx47-list .row.dim{color:var(--faint);border-left-color:var(--line)}

 .lx47-unlocks{margin-bottom:7px}
 .lx47-u{display:block;position:relative;padding:6px 8px 7px 30px;margin-bottom:5px;
  border-left:2px solid var(--spray4);background:rgba(184,63,255,.06);cursor:pointer}
 .lx47-u input{position:absolute;left:9px;top:9px;accent-color:var(--spray2);cursor:pointer}
 .lx47-u .tx{display:block;font-family:var(--font-body);font-size:11.5px;line-height:1.5;
  color:var(--paper);opacity:.9}
 .lx47-u.done{border-left-color:var(--spray2);background:rgba(198,255,61,.07)}
 .lx47-u.empty{padding-left:11px;color:var(--faint);font-family:var(--font-mono);
  font-size:10px;cursor:default;background:none}

 .lx47-edit{margin-top:8px;border-top:1px dashed var(--line);padding-top:7px}
 .lx47-eh{font-family:var(--font-mono);font-size:8.5px;letter-spacing:.1em;
  color:var(--sage);margin:6px 0 4px}
 .lx47-er{display:flex;gap:5px;align-items:flex-start;margin-bottom:5px}
 .lx47-er textarea{flex:1;background:#0d0b13;color:var(--paper);border:1px solid var(--line);
  font-family:var(--font-body);font-size:11.5px;padding:6px 7px;resize:vertical}
 .lx47-x{flex:none;width:24px;height:24px;line-height:1;border:1px solid var(--line);
  background:#151220;color:var(--faint);cursor:pointer;font-size:13px}
 .lx47-x:hover{color:var(--danger);border-color:var(--danger)}
 .lx47-add{font-family:var(--font-mono);font-size:9.5px;letter-spacing:.05em;
  padding:5px 9px;border:1px dashed var(--line);background:none;color:var(--sage);
  cursor:pointer}
 .lx47-add:hover{border-style:solid}
 `;
 document.head.appendChild(css);

 T(fix); T(sweep);
 setTimeout(() => { T(fix); T(sweep); }, 400);
 window.ledgerRungContent = { fix: fix };
})();
/* ================= END LEDGER EXTENSION 47 ========================= */
