/* ==== BEGIN LEDGER EXTENSION 49 — EDITING THE GUEST BOOK, injected block, delete to the END marker to revert ==== */
/* THE BOOK CAN BE WRITTEN IN, AND NOW IT CAN BE CORRECTED.
 *
 * Until this block the guest book was append-only. You could sign it and you
 * could pin a margin note to somebody else's entry, and that was the whole of
 * it -- a typo, a line signed as the wrong person, a day number that drifted,
 * or an auto-entry the table would rather not keep were all permanent. For a
 * page that fills itself in as the campaign runs, that is the wrong shape: the
 * book gains entries nobody typed, so it needs a way to take them back out.
 *
 * WHY THIS ONE CAN TOUCH THE REAL DATA. The book's array is called GB and it
 * lives inside extension 1's closure, which is normally the end of the story
 * in this file -- it is the same wall that made block 20's HANDS revision inert
 * and forced block 48 to repaint the signatures from outside. But extension 1
 * exports `window.ledgerExt.guestBook: () => GB`, and that returns the ARRAY
 * ITSELF, not a copy. Block 3 already relied on that to push six entries in and
 * they stuck. So this block edits the genuine records rather than the rendered
 * text: what changes here is what the page redraws from, what autoSign appends
 * to, and what gets written to localStorage.
 *
 * Which means it does not fight anything. Every other block that decorates the
 * book -- 3, 20 and 48 repainting hands, the seals, the wobble -- hangs off
 * openGuestBook and off the .gb-entry elements, so an edit here simply redraws
 * through all of them and comes out dressed correctly on the other side. There
 * is no second copy of the book anywhere in this block.
 *
 * WHAT CAN BE CHANGED. The message; who signed it (which changes the hand, the
 * ink and the seal, since those are all looked up from the signer); the day
 * line; the order of the page; and whether the entry is there at all. Margin
 * notes get the same treatment one level down: reword, reassign, remove. The
 * "wrote itself" mark on an auto-entry can be cleared, which is how you adopt
 * a line the book wrote as one the character actually said.
 *
 * WHAT IS DELIBERATELY NOT DONE. No confirmation dialogue on an edit, because
 * every edit is visible and reversible by editing again -- only deleting asks,
 * and only because it is the one thing that cannot be undone from the page.
 * The controls are behind a toggle and off by default, so the book still reads
 * as a book until somebody says otherwise.
 */
(function () {
 "use strict";
 if (window.__ledgerExt49) return;
 window.__ledgerExt49 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

 const GBKEY = "opus_guestbook_v2";
 const book = () => T(() => {
   const b = window.ledgerExt && window.ledgerExt.guestBook();
   return Array.isArray(b) ? b : null;
  }, null);
 const save = () => T(() => localStorage.setItem(GBKEY, JSON.stringify(book() || [])));
 const toast = (m) => T(() => G("showToast")(m));

 let editing = false;   // is the book in edit mode
 let openIdx = -1;      // which entry has its editor open, -1 for none
 let openNote = -1;     // which margin note inside it, -1 for none

 /* The signer is a KEY, not a display name -- the hand, the ink and the seal
    are all looked up from it. The list offered is every key the app knows about
    plus every key already used in the book, so somebody like Neven who has no
    PLAYERS entry still appears rather than being quietly unofferable. */
 function signers() {
  const P = G("PLAYERS") || {};
  const seen = new Map();
  Object.keys(P).forEach(k => seen.set(k, (P[k] || {}).name || k));
  (book() || []).forEach(e => {
   if (e && e.who && !seen.has(e.who)) seen.set(e.who, e.who);
   (e && e.notes || []).forEach(n => {
    if (n && n.who && !seen.has(n.who)) seen.set(n.who, n.who);
   });
  });
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
 }

 function whoField(id, value) {
  const list = signers();
  return '<input class="lx49-who" id="' + id + '" list="lx49Signers" value="' + esc(value || "") + '">' +
   '<datalist id="lx49Signers">' +
   list.map(([k, nm]) => '<option value="' + esc(k) + '">' + esc(nm) + '</option>').join("") +
   '</datalist>';
 }

 function redraw() {
  T(() => window.openGuestBook());
 }

 /* ---- the editors ------------------------------------------------------ */
 function entryEditor(e, i) {
  const box = document.createElement("div");
  box.className = "lx49-ed";
  box.innerHTML =
   '<div class="lx49-eh">EDITING ENTRY ' + (i + 1) + '</div>' +
   '<label class="lx49-lb">Signed by</label>' + whoField("lx49Who", e.who) +
   '<label class="lx49-lb">What they wrote</label>' +
   '<textarea id="lx49Msg" rows="4">' + esc(e.msg || "") + '</textarea>' +
   '<label class="lx49-lb">When</label>' +
   '<input id="lx49At" value="' + esc(e.at || "") + '" placeholder="Day 4">' +
   (e.auto ? '<label class="lx49-ck"><input type="checkbox" id="lx49Auto" checked>' +
             'keep the “wrote itself · ' + esc(e.auto) + '” mark</label>' : "") +
   '<div class="lx49-row">' +
    '<button class="lx49-btn go" id="lx49Save">Save</button>' +
    '<button class="lx49-btn" id="lx49Cancel">Cancel</button>' +
    '<button class="lx49-btn bad" id="lx49Del">Delete this entry</button>' +
   '</div>';

  T(() => {
   box.querySelector("#lx49Save").onclick = () => {
    const w = box.querySelector("#lx49Who").value.trim();
    const m = box.querySelector("#lx49Msg").value.trim();
    if (!m) { toast("An entry with nothing in it is just a blank line — write something or delete it."); return; }
    e.who = w || e.who;
    e.msg = m;
    e.at = box.querySelector("#lx49At").value.trim();
    const keep = box.querySelector("#lx49Auto");
    if (keep && !keep.checked) delete e.auto;
    save(); openIdx = -1; redraw(); toast("Entry " + (i + 1) + " rewritten.");
   };
   box.querySelector("#lx49Cancel").onclick = () => { openIdx = -1; redraw(); };
   box.querySelector("#lx49Del").onclick = () => {
    const gb = book(); if (!gb) return;
    if (!confirm("Tear entry " + (i + 1) + " out of the book? That one cannot be undone from this page.")) return;
    gb.splice(i, 1);
    save(); openIdx = -1; redraw(); toast("Entry torn out.");
   };
  });
  return box;
 }

 function noteEditor(e, i, j) {
  const n = e.notes[j];
  const box = document.createElement("div");
  box.className = "lx49-ed note";
  box.innerHTML =
   '<div class="lx49-eh">EDITING MARGIN NOTE ' + (j + 1) + '</div>' +
   '<label class="lx49-lb">Written by</label>' + whoField("lx49NWho", n.who) +
   '<label class="lx49-lb">Note</label>' +
   '<textarea id="lx49NT" rows="2">' + esc(n.t || "") + '</textarea>' +
   '<div class="lx49-row">' +
    '<button class="lx49-btn go" id="lx49NSave">Save</button>' +
    '<button class="lx49-btn" id="lx49NCancel">Cancel</button>' +
    '<button class="lx49-btn bad" id="lx49NDel">Remove note</button>' +
   '</div>';
  T(() => {
   box.querySelector("#lx49NSave").onclick = () => {
    const t = box.querySelector("#lx49NT").value.trim();
    if (!t) { toast("Nothing to write in the margin."); return; }
    n.who = box.querySelector("#lx49NWho").value.trim() || n.who;
    n.t = t;
    save(); openNote = -1; redraw();
   };
   box.querySelector("#lx49NCancel").onclick = () => {
    if (!String(n.t || "").trim()) e.notes.splice(j, 1);   /* one just added and
                                                              never written */
    openNote = -1; redraw();
   };
   box.querySelector("#lx49NDel").onclick = () => {
    e.notes.splice(j, 1);
    save(); openNote = -1; redraw(); toast("Note rubbed out.");
   };
  });
  return box;
 }

 /* The Ledger's own "+ add a margin note" asks through a prompt() box, which
    cannot be corrected once it is closed. Rebound to the same inline editor
    the existing notes use, so adding and fixing a note work the same way. */
 let noteOwner = -1;
 function addNote(e, i) {
  e.notes = e.notes || [];
  const gbWho = $("gbWho");
  e.notes.push({ who: (gbWho && gbWho.value) || "gm", t: "" });
  openIdx = -1; openNote = e.notes.length - 1; noteOwner = i;
  redraw();
 }

 /* ---- decorating the rendered page ------------------------------------ */
 function bar(gb) {
  const b = document.createElement("div");
  b.className = "lx49-bar";
  b.innerHTML =
   '<button class="lx49-btn' + (editing ? " go" : "") + '" id="lx49Toggle">' +
    (editing ? "Done editing" : "Edit the book") + '</button>' +
   '<span class="lx49-note">' + gb.length + ' entries. ' +
    (editing
      ? "Reword an entry, change who signed it, move it, or tear it out. Margin notes edit the same way."
      : "The book writes itself as the campaign runs — this is how you correct it when it gets something wrong.") +
   '</span>';
  T(() => {
   b.querySelector("#lx49Toggle").onclick = () => {
    editing = !editing; openIdx = -1; openNote = -1; redraw();
   };
  });
  return b;
 }

 function decorate() {
  const body = $("gbBody");
  const gb = book();
  if (!body || !gb) return;

  body.querySelectorAll(".lx49-bar,.lx49-ed,.lx49-ctl").forEach(x => x.remove());
  const page = body.querySelector(".gb-book");
  if (page) page.parentNode.insertBefore(bar(gb), page);
  if (!editing) return;

  const rows = [...body.querySelectorAll(".gb-entry")];
  rows.forEach((el, i) => {
   const e = gb[i];
   if (!e) return;                       /* rendered rows and records are the
                                            same array, but never assume it */

   if (openIdx === i) {
    el.classList.add("lx49-open");
    el.appendChild(entryEditor(e, i));
   } else {
    const c = document.createElement("div");
    c.className = "lx49-ctl";
    c.innerHTML =
     '<button class="lx49-s" data-a="edit">edit</button>' +
     '<button class="lx49-s" data-a="up"' + (i === 0 ? " disabled" : "") + ' title="move up">↑</button>' +
     '<button class="lx49-s" data-a="down"' + (i === rows.length - 1 ? " disabled" : "") + ' title="move down">↓</button>' +
     '<button class="lx49-s bad" data-a="del" title="tear out">×</button>';
    c.querySelectorAll("button").forEach(btn => {
     btn.onclick = () => {
      const a = btn.dataset.a;
      if (a === "edit") { openIdx = i; openNote = -1; redraw(); return; }
      if (a === "up" && i > 0) { gb.splice(i - 1, 0, gb.splice(i, 1)[0]); save(); redraw(); return; }
      if (a === "down" && i < gb.length - 1) { gb.splice(i + 1, 0, gb.splice(i, 1)[0]); save(); redraw(); return; }
      if (a === "del") {
       if (!confirm("Tear entry " + (i + 1) + " out of the book?")) return;
       gb.splice(i, 1); openIdx = -1; save(); redraw(); toast("Entry torn out.");
      }
     };
    });
    el.appendChild(c);
   }

   /* Margin notes, one level in. */
   const notes = [...el.querySelectorAll(".gb-note")];
   notes.forEach((nEl, j) => {
    if (!(e.notes || [])[j]) return;
    if (noteOwner === i && openNote === j) {
     nEl.style.display = "none";
     nEl.parentNode.insertBefore(noteEditor(e, i, j), nEl.nextSibling);
     return;
    }
    const nc = document.createElement("span");
    nc.className = "lx49-nctl";
    nc.innerHTML = '<button class="lx49-s" data-a="nedit">edit</button>' +
                   '<button class="lx49-s bad" data-a="ndel">×</button>';
    nc.querySelectorAll("button").forEach(btn => {
     btn.onclick = (ev) => {
      ev.stopPropagation();
      if (btn.dataset.a === "nedit") { openNote = j; noteOwner = i; openIdx = -1; redraw(); return; }
      e.notes.splice(j, 1); save(); redraw(); toast("Note rubbed out.");
     };
    });
    nEl.appendChild(nc);
   });

   const add = el.querySelector(".gb-addnote");
   if (add) add.onclick = () => addNote(e, i);
  });
 }

 /* Everything else that dresses the book already hangs off openGuestBook, and
    this wraps last, so the controls are added to a page that has already had
    its hands, seals and wobble applied rather than before. autoSign redraws
    #gbBody on its own without going through openGuestBook, so that path is
    caught by watching the node instead. */
 T(() => {
  const orig = window.openGuestBook;
  if (typeof orig !== "function") return;
  window.openGuestBook = function () {
   const r = orig.apply(this, arguments);
   T(decorate);
   return r;
  };
 });

 let queued = false;
 T(() => new MutationObserver(() => {
   const body = $("gbBody");
   if (!body || queued) return;
   if (body.querySelector(".lx49-bar")) return;     /* our own work, or nothing new */
   queued = true;
   requestAnimationFrame(() => { queued = false; T(decorate); });
  }).observe(document.body, { childList: true, subtree: true }));

 /* Loading a save file rewrites the stored book, but the live array is what
    the page draws from and it has no idea that happened. Re-seat it in place
    -- same array, new contents -- so a loaded book shows up without a reload. */
 T(() => {
  const LS = window.ledgerSave;
  if (!LS || typeof LS.restore !== "function") return;
  const orig = LS.restore;
  LS.restore = function () {
   const r = orig.apply(this, arguments);
   T(() => {
    const gb = book();
    const stored = JSON.parse(localStorage.getItem(GBKEY) || "null");
    if (!gb || !Array.isArray(stored)) return;
    gb.length = 0;
    stored.forEach(x => gb.push(x));
    const scr = $("screen-guestbook");
    if (scr && !scr.classList.contains("hidden")) redraw();
   });
   return r;
  };
 });

 const css = document.createElement("style");
 css.textContent = `
 .lx49-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;
  padding:9px 11px;border:1px dashed var(--line);background:rgba(255,255,255,.03)}
 .lx49-note{font-family:var(--font-mono);font-size:9px;line-height:1.5;color:var(--faint);
  flex:1 1 200px}
 .lx49-btn{font-family:var(--font-mono);font-size:10px;letter-spacing:.06em;padding:6px 11px;
  border:1px solid var(--line);background:#151220;color:var(--paper);cursor:pointer}
 .lx49-btn:hover{border-color:var(--sage);color:var(--sage)}
 .lx49-btn.go{border-color:var(--sage);color:var(--sage)}
 .lx49-btn.bad{color:var(--danger);border-color:rgba(255,59,59,.4)}
 .lx49-btn.bad:hover{border-color:var(--danger);color:var(--danger)}

 .lx49-ctl{position:absolute;top:2px;right:4px;display:flex;gap:3px;opacity:.35;
  transition:opacity .12s}
 .gb-entry:hover .lx49-ctl{opacity:1}
 .lx49-s{font-family:var(--font-mono);font-size:8.5px;letter-spacing:.05em;line-height:1;
  padding:4px 6px;border:1px solid var(--line);background:#151220;color:var(--faint);
  cursor:pointer}
 .lx49-s:hover{color:var(--sage);border-color:var(--sage)}
 .lx49-s.bad:hover{color:var(--danger);border-color:var(--danger)}
 .lx49-s[disabled]{opacity:.25;cursor:default}
 .lx49-s[disabled]:hover{color:var(--faint);border-color:var(--line)}
 .lx49-nctl{display:inline-flex;gap:3px;margin-left:7px;vertical-align:middle;opacity:.3}
 .gb-note:hover .lx49-nctl{opacity:1}

 .gb-entry.lx49-open{outline:1px dashed var(--line);outline-offset:6px}
 .lx49-ed{margin-top:10px;padding:10px 11px;border:1px solid var(--line);background:#0d0b13;
  transform:none}
 .lx49-ed.note{margin:4px 0 8px}
 .lx49-eh{font-family:var(--font-mono);font-size:8.5px;letter-spacing:.1em;color:var(--sage);
  margin-bottom:7px}
 .lx49-lb{display:block;font-family:var(--font-mono);font-size:8.5px;letter-spacing:.07em;
  color:var(--faint);margin:7px 0 3px}
 .lx49-ed textarea,.lx49-ed input[type=text],.lx49-ed input:not([type]),.lx49-who{
  width:100%;box-sizing:border-box;background:#151220;color:var(--paper);
  border:1px solid var(--line);font-family:var(--font-body);font-size:12px;
  padding:6px 7px;resize:vertical}
 .lx49-ed .lx49-who{font-family:var(--font-mono);font-size:11px}
 .lx49-ck{display:flex;align-items:center;gap:6px;margin-top:9px;
  font-family:var(--font-mono);font-size:9px;color:var(--faint);cursor:pointer}
 .lx49-ck input{accent-color:var(--sage);cursor:pointer}
 .lx49-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
 `;
 document.head.appendChild(css);

 setTimeout(() => T(decorate), 400);
 window.ledgerGuestEdit = { decorate: decorate, book: book, save: save };
})();
/* ================= END LEDGER EXTENSION 49 ========================= */
