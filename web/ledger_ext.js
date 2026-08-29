/* ==== BEGIN LEDGER EXTENSION — injected block, delete to the END marker to revert ==== */
/* OPUS_∅ LEDGER — extension block.
 *
 * Six things, in one removable block, appended after the Ledger's own script so
 * everything it needs already exists:
 *
 *   1. a graffiti-cyberpunk skin, and the icon set and typefaces from the
 *      combat tracker, so the two files read as one project
 *   2. the skill tree rebuilt as an ACTUAL branching tree, with the edges
 *      derived from the requirement text the Ledger already carries
 *   3. the mini-games played by a CPU that is never Cole or Vergil, driving
 *      the real games through the real handlers rather than inventing scores
 *   4. a guest book, signed by each character in their own hand
 *   5. more hooks and more detail on the connections
 *   6. a deeper apocalypse tracker
 *
 * NOTHING IN THE LEDGER IS EDITED. This block reassigns a few of its render
 * functions and adds screens of its own; delete from the BEGIN marker to the
 * END marker and the file is exactly what it was.
 */
(function () {
 "use strict";
 if (window.__ledgerExt) return;
 window.__ledgerExt = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

 /* ================================================================
    1. THE SKIN — graffiti cyberpunk
    ================================================================
    The Ledger already had the right palette -- hot pink, acid lime, cyan and
    violet on near-black -- so this does not repaint it. What it adds is the
    thing that makes paint read as PAINT rather than as flat colour: hard
    angles instead of rounded corners, tape and stencil edges, a spray halo on
    anything important, and type with real weight to it.

    Everything is drawn in CSS. No image is used for the texture, because a
    graffiti texture that ships as a bitmap tiles visibly and cannot take the
    palette with it, whereas a repeating-conic and a couple of gradients get
    the grain and recolour themselves for free. */
 const css = document.createElement("style");
 css.textContent = `
 __FONTS__

 :root{
  --spray:#ff2f92; --spray2:#c6ff3d; --spray3:#2fe0ff; --spray4:#b83fff;
  --ink:#08070d;
  --font-display:'Audiowide','Arial Black',Impact,sans-serif;
  --font-body:'Space Mono','Segoe UI',Helvetica,Arial,sans-serif;
  --font-mono:'Space Mono','Consolas','Courier New',monospace;
  --font-tag:'Orbitron','Arial Black',sans-serif;
  --uic:url("__ICONS__");
 }

 /* The wall everything is painted on. Two very low-contrast gradients and a
    fine diagonal grain -- enough to stop the black reading as a void, not
    enough to compete with anything on top of it. */
 body{
  background:
   radial-gradient(120% 80% at 12% -10%, rgba(255,47,146,.10), transparent 60%),
   radial-gradient(100% 70% at 92% 8%, rgba(47,224,255,.08), transparent 62%),
   radial-gradient(90% 60% at 50% 110%, rgba(184,63,255,.09), transparent 60%),
   repeating-linear-gradient(115deg, rgba(255,255,255,.014) 0 2px, transparent 2px 6px),
   var(--ink) !important;
 }

 /* Hard edges everywhere. A rounded corner is the single most un-graffiti
    thing a UI can do, so every radius in the file is clipped back to a cut
    corner instead -- the same notch the combat tracker's panels take. */
 .card,.panel,.node,.wl-card,.game-card,.modal-box,.mg-zone,.apoc-char,
 .lx-node,.lx-card,.gb-entry{
  border-radius:0 !important;
 }

 /* Section headings get the spray-tag treatment: skewed, heavy, with a hard
    offset shadow in a second colour so it reads as two passes of paint. */
 /* The fixed OPUS_∅ badge sits over the top-left corner, and every section
    title starts a few pixels under its right edge -- so the first letter of
    WAVELENGTHS was being clipped by it. Cleared by indenting the title alone
    rather than the whole bar, which would have dragged the back button with
    it. */
 .section-title{padding-left:16px}

 .chalk,.screen-title,.section-title,.tree-branch-label{
  font-family:var(--font-display) !important;
  letter-spacing:.02em;
  text-shadow:2px 2px 0 rgba(255,47,146,.55), 4px 4px 0 rgba(47,224,255,.22);
 }

 /* Tape. Two strips at opposing angles, drawn on a pseudo-element so it can
    hang off the corner of the box it is taping down. */
 .lx-taped{position:relative}
 .lx-taped::before,.lx-taped::after{
  content:"";position:absolute;width:56px;height:17px;pointer-events:none;
  background:repeating-linear-gradient(90deg,rgba(230,225,240,.13) 0 5px,rgba(230,225,240,.05) 5px 10px);
  border-left:1px solid rgba(255,255,255,.10);border-right:1px solid rgba(255,255,255,.10);
 }
 .lx-taped::before{top:-8px;left:-12px;transform:rotate(-24deg)}
 .lx-taped::after{top:-8px;right:-12px;transform:rotate(21deg)}

 /* Stencil icons, the same 899-cell sheet the combat tracker uses, keyed to
    alpha and painted through a mask so one sprite serves every colour here
    too. */
 .lx-ic{display:inline-block;width:14px;height:14px;vertical-align:-2px;margin-right:6px;
  background:currentColor;-webkit-mask-image:var(--uic);mask-image:var(--uic);
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
  -webkit-mask-size:256px 912px;mask-size:256px 912px}

 /* ---- 2. THE SKILL TREE -------------------------------------------- */
 .lx-tree-wrap{position:relative;border:1px solid var(--line);background:
   repeating-linear-gradient(90deg,rgba(255,255,255,.020) 0 1px,transparent 1px 46px),
   repeating-linear-gradient(0deg,rgba(255,255,255,.020) 0 1px,transparent 1px 46px),
   #0b0a11;
   overflow:auto;max-height:74vh;padding:0}
 .lx-tree-inner{position:relative;transform-origin:0 0}
 .lx-edges{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}
 .lx-node{position:absolute;width:186px;box-sizing:border-box;padding:9px 10px 10px;
  border:1px solid var(--line);background:linear-gradient(180deg,#16141f,#100e17);
  cursor:pointer;transition:transform .11s ease, box-shadow .11s ease;
  clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px)}
 .lx-node:hover{transform:translateY(-2px);box-shadow:0 6px 0 -2px rgba(0,0,0,.6)}
 .lx-node .n{font-family:var(--font-tag);font-size:11px;line-height:1.25;color:var(--paper);
  letter-spacing:.01em;margin-bottom:5px;word-break:break-word}
 .lx-node .meta{display:flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:8.5px;color:var(--faint)}
 .lx-node .cost{margin-left:auto;color:var(--sage)}
 .lx-node.unlocked{border-color:var(--sage);box-shadow:inset 3px 0 0 var(--sage)}
 .lx-node.unlocked::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(80% 120% at 0% 0%,rgba(198,255,61,.13),transparent 62%)}
 .lx-node.unlockable{border-color:var(--gold);box-shadow:inset 3px 0 0 var(--gold)}
 .lx-node.unlockable::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(80% 120% at 0% 0%,rgba(47,224,255,.13),transparent 62%);
  animation:lx-pulse 2.6s ease-in-out infinite}
 @keyframes lx-pulse{0%,100%{opacity:.5}50%{opacity:1}}
 .lx-node.locked{border-color:var(--line);opacity:.62}
 .lx-node.mystery .n{color:var(--rust);letter-spacing:.22em}
 .lx-node .tier{position:absolute;top:-1px;right:-1px;font-family:var(--font-mono);font-size:7.5px;
  padding:1px 5px;background:var(--line);color:var(--faint)}
 .lx-branch-head{position:absolute;font-family:var(--font-display);font-size:13px;
  letter-spacing:.04em;white-space:nowrap;
  text-shadow:2px 2px 0 rgba(255,47,146,.5),4px 4px 0 rgba(47,224,255,.2)}
 .lx-tools{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:8px 0}
 .lx-legend{display:flex;gap:12px;flex-wrap:wrap;font-family:var(--font-mono);font-size:9px;color:var(--faint);margin:6px 0 10px}
 .lx-legend i{display:inline-block;width:9px;height:9px;margin-right:4px;vertical-align:-1px}

 /* ---- 3. CPU PLAY --------------------------------------------------- */
 .lx-cpu-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:10px 0 6px;
  padding:8px 9px;border:1px dashed var(--line);background:rgba(184,63,255,.05)}
 .lx-cpu-bar .lbl{font-family:var(--font-display);font-size:11px;color:var(--rust);letter-spacing:.05em}
 .lx-cpu-bar select{font-family:var(--font-mono);font-size:10px;background:#0d0b13;color:var(--paper);
  border:1px solid var(--line);padding:4px 6px}
 .lx-watch{position:absolute;left:50%;transform:translateX(-50%);bottom:16px;
  font-family:var(--font-mono);font-size:10px;color:var(--rust);letter-spacing:.1em;
  border:1px solid var(--rust);padding:5px 12px;background:rgba(8,7,13,.85)}
 .lx-ghost{position:fixed;width:22px;height:22px;border:2px solid var(--rust);border-radius:50%;
  pointer-events:none;z-index:9999;transform:translate(-50%,-50%);
  box-shadow:0 0 12px rgba(184,63,255,.8);transition:left .12s linear, top .12s linear}
 .lx-ghost.click{animation:lx-tap .18s ease}
 @keyframes lx-tap{50%{transform:translate(-50%,-50%) scale(.55);background:rgba(184,63,255,.5)}}

 /* ---- 4. GUEST BOOK -------------------------------------------------- */
 .gb-page{background:
   repeating-linear-gradient(0deg,transparent 0 25px,rgba(233,230,242,.045) 25px 26px),
   linear-gradient(180deg,#131019,#0c0a12);
   border:1px solid var(--line);padding:16px 18px;position:relative;min-height:320px}
 .gb-page::before{content:"";position:absolute;left:42px;top:0;bottom:0;width:1px;background:rgba(255,47,146,.22)}
 .gb-entry{position:relative;margin:0 0 18px 54px;padding:2px 0 10px;border-bottom:1px dashed rgba(233,230,242,.10)}
 .gb-sig{font-size:25px;line-height:1.05;margin-bottom:3px;display:inline-block}
 .gb-msg{font-size:12px;line-height:1.55;color:var(--paper);opacity:.9;max-width:62ch}
 .gb-when{font-family:var(--font-mono);font-size:8.5px;color:var(--faint);margin-top:5px;letter-spacing:.06em}
 .gb-form{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;margin-top:12px;
  padding:10px;border:1px dashed var(--line);background:rgba(255,255,255,.02)}
 .gb-form textarea{flex:1;min-width:240px;min-height:56px;background:#0d0b13;color:var(--paper);
  border:1px solid var(--line);font-family:var(--font-body);font-size:12px;padding:7px 8px;resize:vertical}
 .gb-form select{background:#0d0b13;color:var(--paper);border:1px solid var(--line);
  font-family:var(--font-mono);font-size:10px;padding:5px 6px}

 /* ---- 5/6. CONNECTIONS + APOCALYPSE --------------------------------- */
 .lx-hooks{margin-top:8px;border-top:1px dashed var(--line);padding-top:7px}
 .lx-hook{font-family:var(--font-body);font-size:11.5px;line-height:1.5;color:var(--paper);
  opacity:.86;padding:4px 0 4px 12px;border-left:2px solid var(--spray);margin-bottom:5px}
 .lx-hook.b{border-left-color:var(--spray3)}
 .lx-hook.c{border-left-color:var(--spray2)}
 .lx-hook .who{font-family:var(--font-mono);font-size:8.5px;color:var(--faint);
  letter-spacing:.08em;display:block;margin-bottom:2px}
 .lx-strain{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
 .lx-chip{font-family:var(--font-mono);font-size:8.5px;letter-spacing:.06em;
  border:1px solid var(--line);padding:2px 6px;color:var(--faint)}
 .lx-chip.warn{border-color:var(--danger);color:var(--danger)}
 .lx-chip.bad{border-color:var(--tagred);color:var(--tagred)}
 .lx-chip.good{border-color:var(--sage);color:var(--sage)}
 `;
 document.head.appendChild(css);

 /* ================================================================
    2. THE SKILL TREE, AS AN ACTUAL TREE
    ================================================================
    The Ledger drew each branch as a flat row of cards. It called itself a
    tree and was a list, and the information that makes it a tree was already
    in the file -- every node carries a `reqs` sentence, and those sentences
    name their prerequisites in plain English: "Requires Steady Hands."

    So the edges are PARSED rather than authored. Every node name in the
    character's tree is checked against every other node's reqs text, longest
    name first so "Read The Story — Deepened" is not matched by "Read The
    Story". That means the tree stays true to the writing: change a
    requirement sentence and the drawn tree changes with it, with no second
    place to keep in sync.

    A node whose reqs name nobody is a root and sits on the top rank. Depth is
    the longest path back to a root, which is what puts a node that needs two
    different things below both of them rather than beside one. */
 function parseEdges(tree) {
  const nodes = [];
  tree.branches.forEach((b, bi) => b.nodes.forEach(n => nodes.push({ node: n, branch: b, bi: bi })));
  const byName = {};
  nodes.forEach(x => { if (x.node.n && x.node.n !== "???") byName[x.node.n.toLowerCase()] = x; });
  const names = Object.keys(byName).sort((a, b) => b.length - a.length);
  nodes.forEach(x => {
   x.parents = [];
   const req = (x.node.reqs || "").toLowerCase();
   if (!req) return;
   let scan = req;
   names.forEach(nm => {
    if (nm === (x.node.n || "").toLowerCase()) return;
    const at = scan.indexOf(nm);
    if (at >= 0) {
     x.parents.push(byName[nm]);
     // blank the match so a shorter name inside it cannot match again
     scan = scan.slice(0, at) + " ".repeat(nm.length) + scan.slice(at + nm.length);
    }
   });
  });
  // depth = longest path to a root, computed with a visited guard because a
  // requirement sentence could in principle name something circularly
  const depth = (x, seen) => {
   if (x.__d !== undefined) return x.__d;
   seen = seen || new Set();
   if (seen.has(x)) return 0;
   seen.add(x);
   let d = 0;
   x.parents.forEach(p => { d = Math.max(d, depth(p, seen) + 1); });
   x.__d = d;
   return d;
  };
  nodes.forEach(x => depth(x));
  return nodes;
 }

 const NODE_W = 178, NODE_H = 62, COL_GAP = 22, ROW_GAP = 54, PAD_X = 24, PAD_Y = 46;

 /* ONE TREE, NOT SEVEN COLUMNS.
    The first layout gave each branch its own vertical band, which is what the
    Ledger already did and is exactly the thing that made it not look like a
    tree: most branches hold one or two nodes, so seven bands of depth one is a
    row of cards with a heading over each.

    Ranking every node globally by depth instead -- everything that needs
    nothing on the top rank, everything that needs those below it -- is what
    produces an actual branching shape, because the tree's real structure runs
    ACROSS branches. Cole's Soul Engine node requires his Blessing node; that
    is a branch of the tree, and banding by category hid it.

    Branch identity does not disappear, it moves to colour: a node is painted
    by the branch it belongs to, and within a rank nodes are sorted by branch
    so the colours group instead of interleaving. */
 function layout(nodes) {
  const ranks = {};
  nodes.forEach(x => { (ranks[x.__d] = ranks[x.__d] || []).push(x); });
  const keys = Object.keys(ranks).map(Number).sort((a, b) => a - b);

  // sort each rank so children sit near their parents: by the mean x of the
  // parents on the rank above, falling back to branch index for the roots.
  keys.forEach(r => {
   ranks[r].sort((a, b) => {
    const pa = a.parents.length ? a.parents.reduce((s, p) => s + (p.__ord || 0), 0) / a.parents.length : a.bi * 100;
    const pb = b.parents.length ? b.parents.reduce((s, p) => s + (p.__ord || 0), 0) / b.parents.length : b.bi * 100;
    return pa - pb || a.bi - b.bi;
   });
   ranks[r].forEach((x, i) => { x.__ord = i; });
  });

  const widest = Math.max.apply(null, keys.map(k => ranks[k].length));
  const fullW = widest * NODE_W + (widest - 1) * COL_GAP;
  let maxR = 0;
  keys.forEach(r => {
   const row = ranks[r];
   const rowW = row.length * NODE_W + (row.length - 1) * COL_GAP;
   let x0 = PAD_X + (fullW - rowW) / 2;
   row.forEach(x => { x.x = x0; x.y = PAD_Y + r * (NODE_H + ROW_GAP); x0 += NODE_W + COL_GAP; });
   maxR = Math.max(maxR, r);
  });
  return { placed: nodes, ranks: keys, w: fullW + PAD_X * 2,
           h: PAD_Y + (maxR + 1) * (NODE_H + ROW_GAP) + 20 };
 }

 const BRANCH_COLOR = ["#ff2f92", "#2fe0ff", "#c6ff3d", "#b83fff", "#ff9b1f", "#ff3b3b"];

 function drawTree(tree) {
  const canvas = $("treeCanvas");
  if (!canvas) return;
  canvas.innerHTML = "";
  if (!tree) { canvas.innerHTML = '<div style="padding:20px;color:var(--faint)">Nothing logged yet.</div>'; return; }

  const nodes = parseEdges(tree);
  const L = layout(nodes);

  const wrap = document.createElement("div");
  wrap.className = "lx-tree-wrap";
  const inner = document.createElement("div");
  inner.className = "lx-tree-inner";
  inner.style.width = L.w + "px";
  inner.style.height = L.h + "px";

  /* Edges first so nodes paint over them. Drawn as a cubic that leaves the
     bottom of the parent and arrives at the top of the child, which reads as
     a branch rather than as a wire even when a child sits off to one side of
     its parent. */
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
    const col = BRANCH_COLOR[x.bi % BRANCH_COLOR.length];
    const live = x.node.status === "unlocked";
    path.setAttribute("stroke", live ? col : "rgba(233,230,242,.20)");
    path.setAttribute("stroke-width", live ? 2.4 : 1.4);
    if (!live) path.setAttribute("stroke-dasharray", "5 5");
    svg.appendChild(path);
   });
  });
  inner.appendChild(svg);

  /* A faint rail per rank, so the depth of the tree is legible even where a
     rank happens to hold a single node. */
  L.ranks.forEach(r => {
   const rail = document.createElement("div");
   rail.style.cssText = "position:absolute;left:0;right:0;height:1px;background:rgba(233,230,242,.055);top:" +
     (PAD_Y + r * (NODE_H + ROW_GAP) - 16) + "px";
   inner.appendChild(rail);
   const tag = document.createElement("div");
   tag.style.cssText = "position:absolute;left:2px;font-family:var(--font-mono);font-size:8px;color:var(--faint);top:" +
     (PAD_Y + r * (NODE_H + ROW_GAP) - 26) + "px;letter-spacing:.12em";
   tag.textContent = "TIER " + (r + 1);
   inner.appendChild(tag);
  });

  L.placed.forEach(x => {
   const n = x.node;
   const el = document.createElement("div");
   el.className = "lx-node " + n.status + (n.desc === null ? " mystery" : "");
   el.style.left = x.x + "px"; el.style.top = x.y + "px";
   const bc = BRANCH_COLOR[x.bi % BRANCH_COLOR.length];
   el.style.borderColor = bc;
   if (n.status === "locked") el.style.borderColor = "rgba(233,230,242,.16)";
   el.style.boxShadow = "inset 3px 0 0 " + (n.status === "locked" ? "rgba(233,230,242,.16)" : bc);
   el.innerHTML =
    '<div class="tier">T' + (x.__d + 1) + '</div>' +
    '<div class="n">' + (n.desc === null ? "???" : esc(n.n)) + '</div>' +
    '<div class="meta"><span>' + esc(n.type || "") + '</span>' +
    '<span class="cost">' + n.cost + ' pt' + (n.cost === 1 ? "" : "s") + '</span></div>';
   el.onclick = () => T(() => openNodeModal(n));
   inner.appendChild(el);
  });

  wrap.appendChild(inner);

  const legend = document.createElement("div");
  legend.className = "lx-legend";
  legend.innerHTML =
   '<span><i style="background:var(--sage)"></i>unlocked</span>' +
   '<span><i style="background:var(--gold)"></i>available now</span>' +
   '<span><i style="background:var(--line)"></i>locked</span>' +
   '<span>solid line = earned · dashed = still owed</span>' +
   '<span>T# = how deep in the tree it sits</span>';

  const key = document.createElement("div");
  key.className = "lx-legend";
  key.innerHTML = tree.branches.map((b, i) =>
   '<span><i style="background:' + BRANCH_COLOR[i % BRANCH_COLOR.length] + '"></i>' + esc(b.label) + '</span>').join("");

  const tools = document.createElement("div");
  tools.className = "lx-tools";
  tools.innerHTML =
   '<button class="btn" id="lxZoomOut">− zoom</button>' +
   '<button class="btn" id="lxZoomIn">+ zoom</button>' +
   '<button class="btn" id="lxFit">fit</button>' +
   '<span style="font-family:var(--font-mono);font-size:9px;color:var(--faint)">' +
   L.placed.length + ' nodes · ' + L.placed.reduce((a, b) => a + b.parents.length, 0) + ' links read from the requirement text</span>';

  canvas.appendChild(tools);
  canvas.appendChild(legend);
  canvas.appendChild(key);
  canvas.appendChild(wrap);

  /* Zoom, and the one line of it that has to be defensive.
     The fit-to-width divides by the container's measured width, and drawTree
     can run while the screen is still hidden -- in which case clientWidth is
     0, (0 - 30) / 2314 is NEGATIVE, and scale(-0.013) draws the whole tree
     flipped and two pixels wide. It renders, it throws nothing, and the panel
     just looks empty. So the scale is clamped at both ends and the fit is
     deferred to the frame after layout, with a resize hook so it settles when
     the screen is actually shown. */
  let z = 1;
  const CLAMP = (v) => Math.max(.35, Math.min(1.6, v));
  const apply = () => { inner.style.transform = "scale(" + z + ")";
    inner.style.width = (L.w * z) + "px"; inner.style.height = (L.h * z) + "px"; };
  const avail = () => wrap.clientWidth || canvas.clientWidth || 1100;
  const fit = () => { z = CLAMP(Math.min(1, (avail() - 26) / L.w)); apply(); };
  T(() => { $("lxZoomIn").onclick = () => { z = CLAMP(z + .12); apply(); }; });
  T(() => { $("lxZoomOut").onclick = () => { z = CLAMP(z - .12); apply(); }; });
  T(() => { $("lxFit").onclick = fit; });
  requestAnimationFrame(() => { if (L.w > avail()) fit(); });
 }

 // take over the Ledger's renderer
 T(() => { window.renderTree = drawTree; });

 /* ================================================================
    3. THE CPU THAT PLAYS THE GAMES
    ================================================================
    Cole and Vergil are the player characters and are never driven by this.
    Everyone else in Zazz's yard is, which is what the Ledger's own PLAYERS
    table already says out loud -- "AI-controlled in Zazz's Games" is written
    against every one of them. This makes that true instead of decorative.

    IT PLAYS THE REAL GAME. There is no score generator here. The CPU is given
    the same stage, the same buttons and the same clock the player gets, and it
    operates them: it waits through the wait phase, reacts when the prompt
    flips, mashes at its own rate, and takes whatever score the game's own
    scoring function gives it. That matters because the games already have
    fouls in them -- clicking early in the Bottle Cap Duel is a foul, and a
    twitchy CPU really does foul.

    A character is a set of five numbers and they mean what they say:
      reflex     how fast it reacts once the prompt is live
      twitch     how likely it is to jump the gun before the prompt
      grit       how fast it can mash, for the hold-and-endure games
      precision  how well it picks the right target among several
      nerve      how long it can sit still when the game rewards stillness
    They are drawn from who these people are, not tuned to be fair. Kevanna is
    fast and undisciplined. Zalir is slow and immovable. Yaviel is precise and
    patient. That asymmetry is the point: the yard has a pecking order and it
    should show up in the leaderboard on its own. */
 const CPU = {
  kevanna: { name: "Kevanna", reflex: .88, twitch: .42, grit: .90, precision: .55, nerve: .25,
             line: "Kevanna doesn't wait for anything. Sometimes that's the whole problem." },
  felana:  { name: "Felana",  reflex: .62, twitch: .30, grit: .48, precision: .70, nerve: .55,
             line: "Felana plays it loose until it matters, then doesn't." },
  yaviel:  { name: "Yaviel",  reflex: .70, twitch: .10, grit: .55, precision: .93, nerve: .88,
             line: "Yaviel measures it. Every time. It's infuriating to watch and it works." },
  zalir:   { name: "Zalir",   reflex: .38, twitch: .06, grit: .97, precision: .60, nerve: .95,
             line: "Zalir is slow to start and impossible to move once he has." },
  dahlia:  { name: "Dahlia",  reflex: .80, twitch: .55, grit: .40, precision: .78, nerve: .30,
             line: "Dahlia reads it a half-second early and is right often enough to keep doing it." },
  angi:    { name: "Angi",    reflex: .74, twitch: .38, grit: .82, precision: .58, nerve: .40,
             line: "Angi does not stop. That is the entire strategy and it places more often than it should." },
  burham:  { name: "Burham",  reflex: .50, twitch: .20, grit: .70, precision: .82, nerve: .72,
             line: "Burham watches the whole board and moves once." }
 };
 /* Whoever the Ledger knows about, minus the two who are actually played.
    Read from PLAYERS rather than listed here, so a character added to the
    Ledger becomes CPU-playable without touching this block. */
 function cpuRoster() {
  const P = G("PLAYERS") || {};
  return Object.keys(P).filter(k => k !== "cole" && k !== "vergil" && k !== "gm")
   .map(k => ({ key: k, name: (P[k] || {}).name || k, prof: CPU[k] || { name: (P[k] || {}).name || k,
     reflex: .6, twitch: .25, grit: .6, precision: .6, nerve: .6, line: "" } }));
 }

 let cpuNow = null;      // {key, name, prof, gameId} while a CPU is at the controls
 let cpuTimer = null, ghost = null;

 /* Attribution. The Ledger's logMinigameScore hardcodes the logged-in user as
    the participant, which is right for a person playing and wrong for a CPU.
    Wrapped rather than rewritten: the entry is built by the Ledger exactly as
    before and then the participant is corrected, so any change to how it logs
    is inherited rather than duplicated. */
 T(() => {
  const orig = window.logMinigameScore;
  if (typeof orig !== "function") return;
  window.logMinigameScore = function (gameId, score, label) {
   const e = orig.apply(this, arguments);
   if (cpuNow && e && e.participants && e.participants[0]) {
    e.participants[0].player = cpuNow.key;
    e.loggedBy = "cpu";
    e.sessionLabel = cpuNow.name + " played it themselves — CPU at the controls";
    e.note = "Played by the CPU driving the real game: same stage, same clock, same fouls.";
   }
   return e;
  };
 });

 function ghostTo(el, tap) {
  if (!ghost) { ghost = document.createElement("div"); ghost.className = "lx-ghost"; document.body.appendChild(ghost); }
  const r = el.getBoundingClientRect();
  ghost.style.left = (r.left + r.width / 2) + "px";
  ghost.style.top = (r.top + r.height / 2) + "px";
  if (tap) { ghost.classList.remove("click"); void ghost.offsetWidth; ghost.classList.add("click"); }
 }
 function ghostOff() { if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost); ghost = null; }

 /* The targets the CPU is allowed to touch: whatever the stage is currently
    offering, minus the two controls that would end the run rather than play
    it. Found by looking at the DOM rather than by a per-game table, so a game
    whose stage is reworked keeps working here. */
 function stageTargets() {
  const stage = $("minigameStage");
  if (!stage) return [];
  const els = Array.from(stage.querySelectorAll("#mgZone,[onclick],button,.mg-zone,.mg-target,.mg-flag,.mg-frag,.mg-option,.mg-cell"));
  return els.filter(e => !/exit|play again|again|back|save/i.test((e.textContent || "") + (e.id || "")));
 }
 const jitter = (v, spread) => v * (1 - spread / 2 + Math.random() * spread);

 function cpuStop(msg) {
  if (cpuTimer) { clearInterval(cpuTimer); cpuTimer = null; }
  ghostOff();
  const w = $("lxWatchTag"); if (w && w.parentNode) w.parentNode.removeChild(w);
  cpuNow = null;
  if (msg) T(() => showToast(msg));
 }

 function cpuPlay(gameId, key) {
  const roster = cpuRoster();
  const who = roster.find(r => r.key === key) || roster[0];
  if (!who) return;
  const PG = G("PLAYABLE_GAMES") || {};
  const launch = PG[gameId] && G(PG[gameId].launch);
  if (typeof launch !== "function") { T(() => showToast("That one isn't playable yet.")); return; }

  cpuStop();
  cpuNow = { key: who.key, name: who.name, prof: who.prof, gameId: gameId };
  launch(gameId);

  const tag = document.createElement("div");
  tag.className = "lx-watch"; tag.id = "lxWatchTag";
  tag.textContent = who.name.toUpperCase() + " IS PLAYING — CPU AT THE CONTROLS";
  T(() => $("minigameOverlay").appendChild(tag));

  const p = who.prof;
  let reactAt = 0, lastPhase = null, mashGap = 0, lastMash = 0, settled = 0;

  cpuTimer = setInterval(() => {
   const st = G("mgState");
   if (!st) { cpuStop(); return; }
   const now = Date.now();
   const phase = st.phase;
   if (phase !== lastPhase) { lastPhase = phase; reactAt = 0; settled = now; }

   /* Waiting. The discipline test: a twitchy CPU jumps and takes the foul the
      game already has rules for, rather than being quietly prevented from
      making a mistake a person could make. */
   if (phase === "wait") {
    if (Math.random() < p.twitch * 0.012) {
     const t = stageTargets()[0];
     if (t) { ghostTo(t, true); t.click(); }
    }
    return;
   }

   /* Reacting. Reaction time is drawn once per prompt from the character's
      reflex, floored at 120ms because nothing human beats that and a CPU that
      does stops being a character and becomes a cheat. */
   if (phase === "go" || phase === "active" || phase === "throw" || phase === "running") {
    if (!reactAt) reactAt = now + Math.max(120, jitter(520 - p.reflex * 380, .5));
    if (now >= reactAt) {
     const ts = stageTargets();
     if (ts.length) {
      const pick = ts.length === 1 ? ts[0]
        : (Math.random() < p.precision ? ts[0] : ts[Math.floor(Math.random() * ts.length)]);
      ghostTo(pick, true); pick.click();
      reactAt = 0;
     }
    }
    return;
   }

   /* Mashing, for the hold-and-endure games. Rate straight off grit. */
   if (phase === "holding" || phase === "pulling") {
    if (!mashGap) mashGap = jitter(240 - p.grit * 150, .3);
    if (now - lastMash >= mashGap) {
     const ts = stageTargets();
     if (ts.length) { ghostTo(ts[0], true); ts[0].click(); }
     lastMash = now;
    }
    return;
   }

   /* Stillness, for the games that score you for NOT moving. nerve is the
      chance per tick of resisting the fidget. */
   if (phase === "waiting" || phase === "still" || phase === "hush") {
    if (Math.random() > p.nerve * 0.985) {
     const ts = stageTargets();
     if (ts.length) { ghostTo(ts[0], true); ts[0].click(); }
    }
    return;
   }

   /* Anything else that is still offering a control -- the picking games --
      gets a considered click on a cadence, not a mash. */
   if (phase && !/result|done|over|finish|early/.test(phase)) {
    if (now - lastMash >= jitter(700 - p.reflex * 300, .4)) {
     const ts = stageTargets();
     if (ts.length) {
      const pick = Math.random() < p.precision ? ts[0] : ts[Math.floor(Math.random() * ts.length)];
      ghostTo(pick, true); pick.click(); lastMash = now;
     }
    }
    return;
   }

   // finished
   const sc = st.score;
   cpuStop(who.name + (sc !== undefined ? " scored " + sc + "." : " is done.") + (p.line ? "  " + p.line : ""));
   T(() => { if (typeof renderGameLog === "function") renderGameLog(); });
   T(() => { if (typeof renderLeaderboard === "function") renderLeaderboard(); });
  }, 90);
 }

 /* The control the GM actually uses: pick a hand, pick a game, watch it play.
    Inserted into the catalog tab rather than made a screen of its own, because
    it belongs beside the games it drives. */
 function mountCpuBar() {
  const host = $("tab-catalog");
  if (!host || $("lxCpuBar")) return;
  const bar = document.createElement("div");
  bar.className = "lx-cpu-bar"; bar.id = "lxCpuBar";
  const roster = cpuRoster();
  const games = G("GAME_CATALOG") || [];
  const PG = G("PLAYABLE_GAMES") || {};
  bar.innerHTML =
   '<span class="lbl">CPU AT THE CONTROLS</span>' +
   '<select id="lxCpuWho">' + roster.map(r => '<option value="' + esc(r.key) + '">' + esc(r.name) + '</option>').join("") + '</select>' +
   '<select id="lxCpuGame">' + games.filter(g => PG[g.id])
     .map(g => '<option value="' + esc(g.id) + '">' + esc(g.title || g.id) + '</option>').join("") + '</select>' +
   '<button class="btn" id="lxCpuGo">Watch them play</button>' +
   '<button class="btn" id="lxCpuRound">Run a full round</button>' +
   '<span style="font-family:var(--font-mono);font-size:9px;color:var(--faint)">' +
   'Cole and Vergil are played by their players and never appear here.</span>';
  host.insertBefore(bar, host.firstChild);
  T(() => { $("lxCpuGo").onclick = () => cpuPlay($("lxCpuGame").value, $("lxCpuWho").value); });
  T(() => { $("lxCpuRound").onclick = () => cpuRound($("lxCpuGame").value); });
 }

 /* A full round: every CPU hand plays the same game back to back, so the
    leaderboard fills with a real field rather than one entry. */
 function cpuRound(gameId) {
  const roster = cpuRoster();
  let i = 0;
  const next = () => {
   if (i >= roster.length) { T(() => showToast("Round over — every hand has played.")); return; }
   const who = roster[i++];
   cpuPlay(gameId, who.key);
   const watch = setInterval(() => {
    if (!cpuNow) { clearInterval(watch); setTimeout(next, 500); }
   }, 200);
  };
  next();
 }

 /* ================================================================
    4. THE GUEST BOOK
    ================================================================
    A page everyone signs, and the whole point is that no two signatures look
    alike. Each character gets a hand: a face, a size, a slant, an ink and a
    weight, chosen to match who they are rather than assigned round-robin.
    Zalir's is heavy and level. Dahlia's leans and trails. Kevanna's is fast
    and too big for the line.

    Entries persist in their own localStorage key, so the book fills up across
    sessions the way a real one on a real counter would. */
 const HANDS = {
  cole:    { font: "'Space Mono',monospace", size: 23, slant: -2, ink: "#e9e6f2", weight: 400, sp: ".02em" },
  vergil:  { font: "'Orbitron',sans-serif",  size: 21, slant: 0,  ink: "#2fe0ff", weight: 800, sp: ".16em" },
  kevanna: { font: "'Audiowide',cursive",    size: 30, slant: -13, ink: "#c6ff3d", weight: 400, sp: "-.02em" },
  felana:  { font: "'Space Mono',monospace", size: 24, slant: -7, ink: "#ff2f92", weight: 700, sp: ".06em" },
  yaviel:  { font: "'Syncopate',sans-serif", size: 18, slant: 0,  ink: "#b83fff", weight: 700, sp: ".22em" },
  zalir:   { font: "'Arial Black',sans-serif", size: 26, slant: 0, ink: "#ff9b1f", weight: 900, sp: ".01em" },
  dahlia:  { font: "'Chakra Petch',sans-serif", size: 27, slant: -16, ink: "#ff3b3b", weight: 600, sp: ".04em" },
  angi:    { font: "'Audiowide',sans-serif", size: 22, slant: 6,  ink: "#2fe0ff", weight: 400, sp: ".10em" },
  burham:  { font: "'Chakra Petch',sans-serif", size: 20, slant: -3, ink: "#6b6478", weight: 600, sp: ".05em" },
  gm:      { font: "'Space Mono',monospace", size: 17, slant: 0,  ink: "#6b6478", weight: 700, sp: ".30em" }
 };
 const GBKEY = "opus_guestbook_v1";
 let GB = T(() => JSON.parse(localStorage.getItem(GBKEY)) || null, null) || [
  { who: "zalir",   msg: "Signed because Zazz said the book has to have names in it. It has a name in it now.", at: "Day 1" },
  { who: "kevanna", msg: "FIRST. someone tell yaviel i was first. i dont care that the page says day one for everybody", at: "Day 1" },
  { who: "yaviel",  msg: "Kevanna was not first. The book was open before either of us walked in.", at: "Day 2" },
  { who: "dahlia",  msg: "I wrote something here already. It isn't on this page any more. Ask the page.", at: "Day 2" }
 ];
 const gbSave = () => T(() => localStorage.setItem(GBKEY, JSON.stringify(GB)));

 function guestBookHtml() {
  const P = G("PLAYERS") || {};
  const rows = GB.map((e, i) => {
   const h = HANDS[e.who] || HANDS.gm;
   const nm = (P[e.who] || {}).name || e.who;
   return '<div class="gb-entry">' +
    '<span class="gb-sig" style="font-family:' + h.font + ';font-size:' + h.size + 'px;color:' + h.ink +
      ';font-weight:' + h.weight + ';letter-spacing:' + h.sp + ';transform:rotate(' + h.slant + 'deg)">' + esc(nm) + '</span>' +
    '<div class="gb-msg">' + esc(e.msg) + '</div>' +
    '<div class="gb-when">' + esc(e.at || "") + (e.byCpu ? " · signed unprompted" : "") + '</div>' +
   '</div>';
  }).join("");
  const opts = Object.keys(HANDS).filter(k => P[k]).map(k =>
    '<option value="' + esc(k) + '">' + esc((P[k] || {}).name || k) + '</option>').join("");
  return '<div class="gb-page lx-taped">' + (rows || '<div style="color:var(--faint)">Nobody has signed yet.</div>') + '</div>' +
   '<div class="gb-form">' +
    '<select id="gbWho">' + opts + '</select>' +
    '<textarea id="gbMsg" placeholder="Sign it. Say something. Nobody is checking spelling."></textarea>' +
    '<button class="btn" id="gbSign">Sign the book</button>' +
   '</div>';
 }

 /* showScreen() takes the id WITHOUT the screen- prefix and adds it itself,
    and it switches an .active class rather than a display style -- .screen is
    display:none and .screen.active is display:flex. A new screen therefore has
    to carry the class and no inline display, or it stays invisible while every
    check says it mounted fine. */
 function mountGuestBook() {
  if ($("screen-guestbook")) return;
  const app = $("app") || document.body;
  const scr = document.createElement("div");
  scr.className = "screen"; scr.id = "screen-guestbook";
  /* The Ledger's own header markup, class for class -- .section-bar with a
     .back-btn and a .section-title carrying its subtitle in a <small>. Written
     to match rather than invented, because a screen with its own header
     classes lands unstyled at the top-left corner under the build tag, which
     is exactly what the first version did. */
  scr.innerHTML =
   '<div class="section-bar">' +
    '<button class="back-btn" data-goto="menu" id="gbBack">←</button>' +
    '<div class="section-title chalk">Guest Book<small>Everyone who came through, in their own hand</small></div>' +
   '</div>' +
   '<div class="tree-canvas-wrap" id="gbBody" style="padding:14px"></div>';
  app.appendChild(scr);
  T(() => { $("gbBack").onclick = () => showScreen("menu"); });
 }

 function openGuestBook() {
  mountGuestBook();
  $("gbBody").innerHTML = guestBookHtml();
  T(() => showScreen("guestbook"));
  bindSign();
 }
 function bindSign() {
  T(() => {
   $("gbSign").onclick = () => {
    const who = $("gbWho").value, msg = ($("gbMsg").value || "").trim();
    if (!msg) { T(() => showToast("Write something first.")); return; }
    GB.push({ who: who, msg: msg, at: T(() => "Day " + G("apocDay"), "") || new Date().toISOString().slice(0, 10) });
    gbSave();
    $("gbBody").innerHTML = guestBookHtml();
    bindSign();
    T(() => showToast("Signed."));
   };
  });
 }
 window.openGuestBook = openGuestBook;

 /* ================================================================
    5 + 6. HOOKS, AND THE APOCALYPSE IN MORE DETAIL
    ================================================================
    The connections already carried one hook line per rung. These add a second
    and third kind: something the other person says back, and something that
    only becomes available at that rung -- so a rung is a scene to play rather
    than a number to raise. Keyed by rung index, so they layer over whatever
    connection is open without the Ledger's own data being touched.

    STRAIN is the new idea. A connection that has not moved in a long time is
    not neutral, it is drifting, and the tracker should say so. */
 const RUNG_PROMPTS = [
  { back: "They don't answer. They just look at you for a second longer than is comfortable.",
    opens: "You can ask them one factual thing about themselves and they'll answer it straight." },
  { back: "\"Why do you want to know?\" — not hostile. Actually asking.",
    opens: "They'll stand next to you in a fight without being told to." },
  { back: "\"...huh.\" A pause. \"Nobody's asked me that in a while.\"",
    opens: "They'll tell you one thing they're bad at." },
  { back: "They tell you the short version. The one with the edges filed off.",
    opens: "They'll cover your back specifically, not just the group's." },
  { back: "They tell you the long version. It takes a while and they don't look at you for most of it.",
    opens: "You can ask them for something costly and they'll consider it seriously." },
  { back: "\"You already know the answer to that.\" And you do.",
    opens: "They'll break a rule for you. A small one." },
  { back: "They finish your sentence and neither of you remarks on it.",
    opens: "They'll take a hit meant for you without deciding to first." },
  { back: "No answer needed. They're already doing the thing you were about to ask for.",
    opens: "They'll tell you when you're wrong, in front of people." },
  { back: "\"Don't.\" — meaning don't thank them, don't make it a moment.",
    opens: "They'll break a rule for you. A big one." },
  { back: "Nothing. They don't need to say anything and you don't need them to.",
    opens: "There is nothing left to unlock. That's the whole point of the top of the ladder." }
 ];

 T(() => {
  const orig = window.renderWLDetailContent;
  if (typeof orig !== "function") return;
  window.renderWLDetailContent = function () {
   const r = orig.apply(this, arguments);
   T(() => {
    const ladder = $("wlLadder");
    if (!ladder) return;
    const rows = ladder.querySelectorAll(".wl-rung, .rung, li");
    rows.forEach((row, i) => {
     if (row.querySelector(".lx-hooks")) return;
     const pr = RUNG_PROMPTS[i]; if (!pr) return;
     const box = document.createElement("div");
     box.className = "lx-hooks";
     box.innerHTML =
      '<div class="lx-hook b"><span class="who">THEY SAY BACK</span>' + esc(pr.back) + '</div>' +
      '<div class="lx-hook c"><span class="who">THIS RUNG OPENS</span>' + esc(pr.opens) + '</div>';
     row.appendChild(box);
    });
   });
   return r;
  };
 });

 /* The apocalypse tracker, deepened. The Ledger already tracked hunger,
    hydration and afflictions; what it did not do was say what any of that
    MEANS at the table. These read the numbers it already keeps and turn them
    into the consequence a GM can act on this round -- a penalty, a risk, a
    thing that happens next if nothing changes. Nothing is written back; this
    is a reading of state, not a second copy of it. */
 function apocReadout(st) {
  const out = [];
  const h = st.hunger | 0, w = st.hydration | 0;
  if (w < 25) out.push(["bad", "DEHYDRATED — −2 to everything physical, and a save each dawn or lose a point of PREC permanently."]);
  else if (w < 45) out.push(["warn", "THIRSTY — −1 PREC. Headache. Short temper with people who don't deserve it."]);
  else if (w > 80) out.push(["good", "Watered. No penalty."]);
  if (h < 20) out.push(["bad", "STARVING — −2 PWR, and the body starts spending muscle. Recovery from here takes days, not a meal."]);
  else if (h < 45) out.push(["warn", "HUNGRY — −1 PWR. Distracted by it. Notices food before anything else in a room."]);
  else if (h > 85) out.push(["good", "Fed. Steady hands."]);
  if ((st.daysWithoutWater | 0) >= 2) out.push(["bad", "Day " + st.daysWithoutWater + " without water — this is the clock that actually kills."]);
  if ((st.daysWithoutFood | 0) >= 3) out.push(["warn", "Day " + st.daysWithoutFood + " without food — still standing, but slower every morning."]);
  (st.afflictions || []).forEach(a => {
   const sev = String(a.severity || "").toLowerCase();
   out.push([sev === "critical" || sev === "serious" ? "bad" : "warn", (a.name || "Affliction") + " — " + sev]);
  });
  if (!out.length) out.push(["good", "Nothing wrong with them today. Note the date."]);
  return out;
 }

 T(() => {
  const orig = window.renderApocCharacters;
  if (typeof orig !== "function") return;
  window.renderApocCharacters = function () {
   const r = orig.apply(this, arguments);
   T(() => {
    const AC = G("APOC_CHARACTERS") || {};
    const grid = $("apocCharGrid");
    if (!grid) return;
    Array.from(grid.children).forEach(card => {
     if (card.querySelector(".lx-strain")) return;
     // match the card to a character by the name it displays
     const txt = (card.textContent || "").toLowerCase();
     const key = Object.keys(AC).find(k => txt.indexOf(k) >= 0);
     if (!key) return;
     const box = document.createElement("div");
     box.className = "lx-strain";
     box.innerHTML = apocReadout(AC[key]).map(([cls, t]) =>
       '<span class="lx-chip ' + cls + '">' + esc(t) + '</span>').join("");
     card.appendChild(box);
    });
   });
   return r;
  };
 });

 /* ---- wiring the new screens into the menu ------------------------- */
 T(() => {
  const menu = $("screen-menu");
  if (!menu) return;
  const grid = menu.querySelector(".menu-cards");
  if (!grid || grid.querySelector("[data-goto=guestbook]")) return;
  const card = document.createElement("div");
  card.className = "menu-card guestbook lx-taped";
  card.setAttribute("data-goto", "guestbook");
  card.style.cursor = "pointer";
  card.innerHTML = '<span class="menu-card-tag">THE COUNTER</span>' +
   '<div class="menu-card-title chalk">Guest Book</div>' +
   '<div class="menu-card-desc">Everyone who came through, in their own hand. ' +
   'Nobody writes the same way twice and nobody is made to be polite about it.</div>';
  card.onclick = openGuestBook;
  grid.appendChild(card);
 });

 // the CPU bar has to wait for the games screen to exist
 T(() => {
  const orig = window.openGames;
  if (typeof orig === "function") {
   window.openGames = function () { const r = orig.apply(this, arguments); T(mountCpuBar); return r; };
  }
 });

 window.ledgerExt = { cpuPlay: cpuPlay, cpuRound: cpuRound, roster: cpuRoster, guestBook: () => GB,
                      redrawTree: drawTree };
})();
/* ================= END LEDGER EXTENSION ========================= */
