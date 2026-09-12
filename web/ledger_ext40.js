/* ==== BEGIN LEDGER EXTENSION 40 — TREE SEATING, injected block, delete to the END marker to revert ==== */
/* THE SKILL TREE, RE-SEATED FOR A TREE THAT GREW.
 *
 * When the first version of this drew Cole's tree it held 11 nodes across 7
 * disciplines. It now holds 162 across 40, and the layout that suited the
 * first is actively hostile to the second: ranking every node globally by
 * depth and laying each rank out as ONE horizontal row put roughly forty nodes
 * on tier 1, which made the canvas 13,426 pixels wide inside a 460-pixel box.
 * Fit-to-width then hit its own clamp and the whole thing became an unreadable
 * strip you scrolled sideways forever.
 *
 * The fix is that a tier is a BAND, not a row. Its nodes flow left to right and
 * wrap into as many rows as they need, at a column count measured from the
 * container rather than assumed. Forty nodes on one tier becomes a tidy block
 * six across and seven down, the tree reads top to bottom the way a tree
 * should, and nothing scrolls sideways at all.
 *
 * Two things come with it, both forced by the same growth. Forty disciplines
 * rendered as a flat legend was six lines of coloured text above the tree,
 * taller than the tree it was labelling -- it is now a compact iconified strip
 * that collapses. And with 162 nodes, FINDING one matters more than seeing all
 * of them, so a discipline can be clicked to isolate it and everything else
 * drops back.
 *
 * This block redefines renderTree outright rather than patching the earlier
 * one, because that implementation is a closure with nothing exposed. It reuses
 * the CSS custom properties block 1 already installed -- --sigils, --ico-hex,
 * --ac -- so it needs no new art of its own.
 */
(function () {
 "use strict";
 if (window.__ledgerExt40) return;
 window.__ledgerExt40 = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
   ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

 /* ---- geometry -------------------------------------------------------
    Smaller than before, because 162 of something needs less of each. The
    column count is MEASURED, not fixed: the whole failure being fixed here
    came from assuming a shape instead of asking the container for one. */
 const NODE_W = 166, NODE_H = 56, COL_GAP = 14, ROW_GAP = 16;
 const BAND_GAP = 40, PAD_X = 18, PAD_Y = 34;

 const BRANCH_COLOR = ["#ff2f92", "#2fe0ff", "#c6ff3d", "#b83fff", "#ff9b1f", "#ff3b3b",
                       "#5dff9b", "#ffd93d", "#7db4ff", "#ff7ad9"];
 const ACCENT = { cole: "#5dff9b", vergil: "#b83fff" };

 /* Edges parsed from the requirement text, exactly as before -- longest name
    first so "Read The Story — Deepened" is not swallowed by "Read The Story". */
 function parseEdges(tree) {
  const nodes = [];
  (tree.branches || []).forEach((b, bi) =>
    (b.nodes || []).forEach(n => nodes.push({ node: n, branch: b, bi: bi })));
  const byName = {};
  nodes.forEach(x => { if (x.node.n && x.node.n !== "???") byName[x.node.n.toLowerCase()] = x; });
  const names = Object.keys(byName).sort((a, b) => b.length - a.length);
  nodes.forEach(x => {
   x.parents = [];
   let scan = (x.node.reqs || "").toLowerCase();
   if (!scan) return;
   names.forEach(nm => {
    if (nm === (x.node.n || "").toLowerCase()) return;
    const at = scan.indexOf(nm);
    if (at >= 0) {
     x.parents.push(byName[nm]);
     scan = scan.slice(0, at) + " ".repeat(nm.length) + scan.slice(at + nm.length);
    }
   });
  });
  const depth = (x, seen) => {
   if (x.__d !== undefined) return x.__d;
   seen = seen || new Set();
   if (seen.has(x)) return 0;
   seen.add(x);
   let d = 0;
   x.parents.forEach(p => { d = Math.max(d, depth(p, seen) + 1); });
   return (x.__d = d);
  };
  nodes.forEach(x => { x.__d = undefined; });
  nodes.forEach(x => depth(x));
  return nodes;
 }

 /* ---- the seating ----------------------------------------------------
    One band per tier. Within a band the nodes are ordered by DISCIPLINE so
    the colours group into runs instead of speckling, then flowed across the
    measured column count and wrapped. */
 function layout(nodes, avail) {
  const cols = Math.max(3, Math.floor((avail - PAD_X * 2 + COL_GAP) / (NODE_W + COL_GAP)));
  /* Whatever the last whole column left over is given back to the gaps rather
     than left as a dead margin on the right -- capped, because a gap wider
     than the nodes stops reading as a row. */
  const slack = avail - (PAD_X * 2 + cols * NODE_W + (cols - 1) * COL_GAP);
  const gap = COL_GAP + (cols > 1 ? Math.max(0, Math.min(46, slack / (cols - 1))) : 0);
  const bands = {};
  nodes.forEach(x => { (bands[x.__d] = bands[x.__d] || []).push(x); });
  const tiers = Object.keys(bands).map(Number).sort((a, b) => a - b);
  let y = PAD_Y;
  const rails = [];
  tiers.forEach(d => {
   const list = bands[d].sort((a, b) => a.bi - b.bi ||
     String(a.node.n).localeCompare(String(b.node.n)));
   const rows = Math.ceil(list.length / cols);
   rails.push({ d: d, y: y - 20, n: list.length, rows: rows });
   list.forEach((x, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const inRow = Math.min(cols, list.length - r * cols);
    const rowW = inRow * NODE_W + (inRow - 1) * gap;
    const x0 = PAD_X + ((cols * NODE_W + (cols - 1) * gap) - rowW) / 2;
    x.x = x0 + c * (NODE_W + gap);
    x.y = y + r * (NODE_H + ROW_GAP);
   });
   y += rows * (NODE_H + ROW_GAP) + BAND_GAP;
  });
  return { placed: nodes, rails: rails, cols: cols,
           w: PAD_X * 2 + cols * NODE_W + (cols - 1) * gap,
           h: y + 10 };
 }

 /* The node's TYPE, as a glyph rather than a word.
    --ico-hex is a 6x6 sheet of hexagonal ability badges that has been sitting
    in this file declared and never drawn. Each of the seven kinds of node the
    trees actually use gets one, picked for what it means: a honeycomb for the
    passives that just hold, a target for gear, a shuriken for the bespoke
    one-offs nobody else has, brainwaves for affinities, a rising arrow for
    blessings, a skull for the soul engine, an eye-chip for MF spec. Anything
    unrecognised falls to a neutral chevron rather than borrowing a meaning. */
 const TYPE_ICON = { passive: 33, gear: 20, bespoke: 0, affinity: 15,
                     blessing: 2, soulengine: 31, mfspec: 12 };
 function typeStyle(type, px) {
  const n = TYPE_ICON[String(type || "").toLowerCase()];
  const cell = (n === undefined ? 35 : n);
  const cols = 6, rows = 6, c = cell % cols, r = Math.floor(cell / cols);
  return "-webkit-mask-image:var(--ico-hex);mask-image:var(--ico-hex);" +
   "-webkit-mask-size:" + (px * cols) + "px " + (px * rows) + "px;" +
   "mask-size:" + (px * cols) + "px " + (px * rows) + "px;" +
   "-webkit-mask-position:" + (-c * px) + "px " + (-r * px) + "px;" +
   "mask-position:" + (-c * px) + "px " + (-r * px) + "px;";
 }

 /* And the node's STATE, as one of the three ranked hexes off the combat
    tracker's own sheet -- blue for locked, violet for a node that is standing
    open, gold for one that has actually been earned. Full colour, so this is a
    background rather than a mask: the whole point of it is that gold reads as
    gold from across the tier. */
 const RANK_CELL = { locked: 0, unlockable: 1, unlocked: 2 };
 function rankStyle(status, px) {
  const cell = RANK_CELL[status] === undefined ? 0 : RANK_CELL[status];
  return "width:" + px + "px;height:" + px + "px;" +
   "background-image:var(--rank);background-repeat:no-repeat;" +
   "background-size:" + (px * 3) + "px " + px + "px;" +
   "background-position:" + (-cell * px) + "px 0";
 }

 const css = document.createElement("style");
 css.textContent = `
 .lx-tree-wrap{--rank:url("__RANK__")}
 /* Taller viewport: the tree is the screen's whole job, so it gets the room. */
 .lx-tree-wrap{max-height:78vh !important}
 /* A fixed node box, so the bands really are grids. Left it free the first
    time and a two-line name grew the box past the row pitch -- nothing
    overlapped, but the rows stopped lining up, which is most of what a grid
    is for. The name clamps to two lines instead. */
 .lx-node{width:${NODE_W}px !important;height:${NODE_H}px !important;
  padding:7px 26px 7px 34px !important;overflow:hidden !important}
 .lx-node .n{font-size:10px !important;line-height:1.2 !important;min-height:0 !important;
  margin-bottom:3px !important;display:-webkit-box;-webkit-line-clamp:2;
  -webkit-box-orient:vertical;overflow:hidden}
 .lx-node .sg{left:6px !important;top:9px !important;width:22px !important;height:22px !important}
 .lx-node .ic{display:block !important;position:absolute !important;right:5px !important;
  top:8px !important;bottom:auto !important;opacity:1 !important;pointer-events:none}
 .lx-node.unlocked .ic{filter:drop-shadow(0 0 4px rgba(255,196,64,.75))}
 .lx-node .tier{display:none !important}
 .lx-node .meta{font-size:8px !important}

 /* The tier rail: a label and a hairline the full width of the band. */
 .lx4-rail{position:absolute;left:0;right:0;height:1px;background:rgba(233,230,242,.07)}
 .lx4-rail-tag{position:absolute;left:2px;font-family:var(--font-mono);font-size:8px;
  letter-spacing:.14em;color:var(--faint);white-space:nowrap}
 .lx4-rail-tag b{color:var(--ac,#c6ff3d)}

 /* The legend, compacted. Forty entries as a wall of text was taller than the
    tree; as chips it is two lines, and it collapses to none. */
 .lx4-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0}
 .lx4-btn{font-family:var(--font-mono);font-size:9px;letter-spacing:.08em;padding:4px 9px;
  border:1px solid var(--line);background:#151220;color:var(--paper);cursor:pointer;
  clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
 .lx4-btn:hover{border-color:var(--ac,#c6ff3d)}
 .lx4-btn.on{background:var(--ac,#c6ff3d);color:#0b0a11;border-color:var(--ac,#c6ff3d)}
 .lx4-stat{font-family:var(--font-mono);font-size:9px;color:var(--faint)}
 .lx4-stat b{color:var(--ac,#c6ff3d)}
 .lx4-keys{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0 8px;max-height:64px;overflow:auto}
 .lx4-keys.hid{display:none}
 .lx4-key{display:flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:8.5px;
  color:var(--faint);border:1px solid transparent;padding:2px 6px 2px 4px;cursor:pointer;
  background:rgba(255,255,255,.02)}
 .lx4-key:hover{border-color:var(--line2,#2c2838);color:var(--paper)}
 .lx4-key.on{border-color:currentColor}
 .lx4-key i{width:9px;height:9px;flex:none;display:block}
 /* Isolating a discipline: everything else drops back rather than vanishing,
    so you keep the shape of the tree while you read one thread of it. */
 .lx4-dim{opacity:.10 !important;filter:grayscale(1)}
 .lx4-edge-dim{opacity:.05 !important}
 `;
 document.head.appendChild(css);

 let filterBi = null;

 function drawTree(tree, treeName, treeKey) {
  const canvas = $("treeCanvas");
  if (!canvas) return;
  canvas.innerHTML = "";
  if (!tree) { canvas.innerHTML = '<div style="padding:20px;color:var(--faint)">Nothing logged yet.</div>'; return; }

  const nodes = parseEdges(tree);
  let acc = ACCENT[String(treeKey || "").toLowerCase()];
  if (!acc) {
   let h = 0; const nk = String(treeKey || treeName || "x");
   for (let i = 0; i < nk.length; i++) h = (h * 31 + nk.charCodeAt(i)) | 0;
   acc = "hsl(" + (Math.abs(h) % 360) + ",85%,66%)";
  }

  /* ---- chrome above the tree ---- */
  const bar = document.createElement("div");
  bar.className = "lx4-bar";
  const done = nodes.filter(x => x.node.status === "unlocked").length;
  const open = nodes.filter(x => x.node.status === "unlockable").length;
  bar.innerHTML =
   '<button class="lx4-btn" id="lx4Out">− zoom</button>' +
   '<button class="lx4-btn" id="lx4In">+ zoom</button>' +
   '<button class="lx4-btn" id="lx4Fit">fit</button>' +
   '<button class="lx4-btn" id="lx4Keys">disciplines (' + (tree.branches || []).length + ')</button>' +
   '<button class="lx4-btn" id="lx4Clear" style="display:none">clear filter</button>' +
   '<span class="lx4-stat"><b>' + done + '</b> earned · <b>' + open + '</b> open · ' +
     nodes.length + ' nodes · ' + nodes.reduce((a, b) => a + b.parents.length, 0) +
     ' links read from the requirement text</span>';

  const keys = document.createElement("div");
  keys.className = "lx4-keys hid";
  keys.innerHTML = (tree.branches || []).map((b, i) =>
   '<span class="lx4-key" data-bi="' + i + '" style="color:' + BRANCH_COLOR[i % BRANCH_COLOR.length] + '">' +
   '<i style="background:' + BRANCH_COLOR[i % BRANCH_COLOR.length] + '"></i>' + esc(b.label) + '</span>').join("");

  const wrap = document.createElement("div");
  wrap.className = "lx-tree-wrap";
  wrap.style.setProperty("--ac", acc);
  const inner = document.createElement("div");
  inner.className = "lx-tree-inner";

  /* Measured, not assumed. The container has to be in the document before it
     can report a width, so the tree is laid out after it is appended. */
  const ident = document.createElement("div");
  ident.className = "lx-identity";
  const bannerCol = document.createElement("div");
  bannerCol.style.cssText = "flex:none;width:172px;color:" + acc;
  bannerCol.innerHTML =
   '<div class="lx-banner">' +
    '<div class="nm">' + esc(treeName || "") + '</div>' +
    '<i class="emb"></i>' +
    '<div class="sb">' + ((tree.branches || []).length) + ' DISCIPLINES</div>' +
    '<div class="ct">' + done + ' / ' + nodes.length + ' EARNED</div>' +
   '</div>';
  const rest = document.createElement("div");
  rest.className = "col";
  rest.appendChild(bar); rest.appendChild(keys);
  const eyerow = document.createElement("div"); eyerow.className = "lx-eyerow";
  rest.appendChild(eyerow); rest.appendChild(wrap);
  ident.appendChild(bannerCol); ident.appendChild(rest);
  canvas.appendChild(ident);
  wrap.appendChild(inner);

  const avail = wrap.clientWidth || canvas.clientWidth - 190 || 1100;
  const L = layout(nodes, avail);
  inner.style.width = L.w + "px";
  inner.style.height = L.h + "px";

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "lx-edges");
  svg.setAttribute("width", L.w); svg.setAttribute("height", L.h);
  L.placed.forEach(x => {
   x.parents.forEach(p => {
    if (p.x === undefined) return;
    const x1 = p.x + NODE_W / 2, y1 = p.y + NODE_H;
    const x2 = x.x + NODE_W / 2, y2 = x.y;
    const mid = (y1 + y2) / 2;
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", "M" + x1 + "," + y1 + " C" + x1 + "," + mid + " " + x2 + "," + mid + " " + x2 + "," + y2);
    path.setAttribute("fill", "none");
    path.setAttribute("data-bi", x.bi);
    const col = BRANCH_COLOR[x.bi % BRANCH_COLOR.length];
    const live = x.node.status === "unlocked";
    path.setAttribute("stroke", live ? col : "rgba(233,230,242,.18)");
    path.setAttribute("stroke-width", live ? 2 : 1.1);
    if (!live) path.setAttribute("stroke-dasharray", "4 5");
    else path.setAttribute("filter", "drop-shadow(0 0 3px " + col + ")");
    svg.appendChild(path);
   });
  });
  inner.appendChild(svg);

  L.rails.forEach(rl => {
   const rail = document.createElement("div");
   rail.className = "lx4-rail";
   rail.style.top = rl.y + "px";
   inner.appendChild(rail);
   const tag = document.createElement("div");
   tag.className = "lx4-rail-tag";
   tag.style.top = (rl.y - 13) + "px";
   tag.innerHTML = "TIER " + (rl.d + 1) + " · <b>" + rl.n + "</b> node" + (rl.n === 1 ? "" : "s");
   inner.appendChild(tag);
  });

  L.placed.forEach(x => {
   const n = x.node;
   const el = document.createElement("div");
   el.className = "lx-node " + n.status + (n.desc === null ? " mystery" : "");
   el.style.left = x.x + "px"; el.style.top = x.y + "px";
   el.setAttribute("data-bi", x.bi);
   const bc = BRANCH_COLOR[x.bi % BRANCH_COLOR.length];
   el.style.borderColor = n.status === "locked" ? "rgba(233,230,242,.16)" : bc;
   el.style.boxShadow = "inset 3px 0 0 " + (n.status === "locked" ? "rgba(233,230,242,.16)" : bc);
   el.innerHTML =
    '<i class="lx-sig sg" style="' + typeStyle(n.type, 22) + '"></i>' +
    '<i class="ic" style="' + rankStyle(n.status, 17) + '"></i>' +
    '<div class="n">' + (n.desc === null ? "???" : esc(n.n)) + '</div>' +
    '<div class="meta"><span>' + esc(n.type || "") + '</span>' +
    '<span class="cost">' + (n.cost || 0) + ' pt' + (n.cost === 1 ? "" : "s") + '</span></div>';
   el.title = (n.n || "") + " — " + (n.type || "node") + ", " + n.status +
    (n.reqs ? "\n\n" + n.reqs : "");
   el.onclick = () => T(() => openNodeModal(n));
   inner.appendChild(el);
  });

  /* ---- zoom, fit and the discipline filter ---- */
  let z = 1;
  const CLAMP = (v) => Math.max(.45, Math.min(1.5, v));
  const apply = () => {
   inner.style.transform = "scale(" + z + ")";
   inner.style.width = (L.w * z) + "px";
   inner.style.height = (L.h * z) + "px";
  };
  T(() => { $("lx4In").onclick = () => { z = CLAMP(z + .1); apply(); }; });
  T(() => { $("lx4Out").onclick = () => { z = CLAMP(z - .1); apply(); }; });
  T(() => { $("lx4Fit").onclick = () => { z = CLAMP(Math.min(1, (wrap.clientWidth - 20) / L.w)); apply(); }; });
  T(() => { $("lx4Keys").onclick = () => keys.classList.toggle("hid"); });

  function applyFilter() {
   const on = filterBi !== null;
   inner.querySelectorAll(".lx-node").forEach(el =>
     el.classList.toggle("lx4-dim", on && +el.dataset.bi !== filterBi));
   svg.querySelectorAll("path").forEach(el =>
     el.classList.toggle("lx4-edge-dim", on && +el.getAttribute("data-bi") !== filterBi));
   keys.querySelectorAll(".lx4-key").forEach(el =>
     el.classList.toggle("on", on && +el.dataset.bi === filterBi));
   T(() => { $("lx4Clear").style.display = on ? "" : "none"; });
  }
  keys.querySelectorAll(".lx4-key").forEach(el => {
   el.onclick = () => { const bi = +el.dataset.bi; filterBi = (filterBi === bi) ? null : bi; applyFilter(); };
  });
  T(() => { $("lx4Clear").onclick = () => { filterBi = null; applyFilter(); }; });
  filterBi = null; applyFilter();

  requestAnimationFrame(() => { if (L.w > (wrap.clientWidth || 0)) {
    z = CLAMP(Math.min(1, ((wrap.clientWidth || avail) - 20) / L.w)); apply(); } });
 }

 /* Same recovery of the character's name and key as before: the Ledger calls
    renderTree with the tree object alone, so the key is whichever entry in
    SKILL_TREES IS this object. */
 T(() => {
  window.renderTree = function (tree) {
   let nm = "", key = "";
   T(() => {
    const ST = G("SKILL_TREES") || {}, P = G("PLAYERS") || {};
    const k = Object.keys(ST).find(k2 => ST[k2] === tree);
    if (k) { nm = (P[k] || {}).name || k; key = k; }
   });
   return drawTree(tree, nm, key);
  };
 });

 /* Redraw on a resize, because the column count is measured and a window that
    changes width should re-seat rather than keep a stale shape. */
 let rt = null;
 addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => T(() => {
   const scr = $("screen-skilltree");
   if (scr && scr.classList.contains("active") && typeof selectTreeChar === "function")
    T(() => renderTree((G("SKILL_TREES") || {})[G("activeTreeChar")]));
  }), 220);
 });

 window.ledgerTree = { redraw: drawTree, filter: (bi) => { filterBi = bi; } };
})();
/* ================= END LEDGER EXTENSION 40 ========================= */
