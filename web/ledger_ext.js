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

 /* The Ledger's own iconography, keyed out of the reference sheets. The hand
    sigils are the important one: eighteen of them, and they escalate from a
    single open hand to a full five-fold mandala, which maps onto tree depth
    exactly. A tier-1 node gets one hand; a tier-5 node gets the mandala. The
    art does the explaining that a tier number only labels. */
 :root{
  --sigils:url("__SIGILS__");
  --eye-solid:url("__EYESOLID__");
  --eye-line:url("__EYELINE__");
  --eye-row:url("__EYEROW__");
  --rules:url("__RULES__");
  --ico-hex:url("__ICOHEX__");
  --ico-oct:url("__ICOOCT__");
  --ico-rogue:url("__ICOROGUE__");
  --decals:url("__DECALS__");
  --neon:url("__NEON__");
  --tags:url("__TAGS__");
  --stickers:url("__STICKERS__");
 }
 /* Three more stencil sheets, masked the same way as everything else so one
    file serves every colour. hex is the ability set (36), oct the survival set
    (13), rogue the kit and poisons set (16). */
 .lx-i{display:inline-block;background:currentColor;
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
 .lx-sig{display:block;background:currentColor;
  -webkit-mask-image:var(--sigils);mask-image:var(--sigils);
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}

 /* ---- 2. THE SKILL TREE -------------------------------------------- */
 /* The class banner, taken from the reference sheet's own idea: a hanging
    cloth with a torn hem and the order's sigil burned into the middle of it.
    The tear is a clip-path polygon rather than an image, so it recolours with
    the character and never tiles. */
 .lx-banner{position:relative;width:190px;min-height:230px;margin:0 auto 6px;
  background:linear-gradient(180deg,#191627,#12101c 62%,#0d0b14);
  border:1px solid rgba(233,230,242,.10);border-bottom:0;
  clip-path:polygon(0 0,100% 0,100% 88%,92% 96%,84% 88%,76% 97%,68% 87%,60% 95%,
   52% 86%,44% 96%,36% 88%,28% 97%,20% 87%,12% 95%,4% 87%,0 94%);
  display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
  padding:14px 10px 0}
 .lx-banner::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;
  background:linear-gradient(90deg,transparent,rgba(233,230,242,.25),transparent)}
 .lx-banner .emb{width:104px;height:74px;margin:10px 0 8px;background:currentColor;
  -webkit-mask:var(--eye-solid) no-repeat center/contain;mask:var(--eye-solid) no-repeat center/contain}
 .lx-banner .nm{font-family:var(--font-display);font-size:15px;letter-spacing:.06em;
  text-align:center;line-height:1.2}
 .lx-banner .sb{font-family:var(--font-mono);font-size:8px;color:var(--faint);
  letter-spacing:.16em;margin-top:5px;text-align:center}
 .lx-banner .ct{font-family:var(--font-mono);font-size:8.5px;color:var(--faint);
  margin-top:auto;padding-bottom:26px;letter-spacing:.08em}

 /* The eye border. One strip, repeated on the x axis, used as the rule under
    the banner and above the tree -- the reference sheet's own device for
    saying "this is the order's page". */
 .lx-eyerow{height:20px;background:var(--eye-row) repeat-x center/auto 100%;
  opacity:.30;margin:2px 0 10px}

 .lx-identity{display:flex;gap:18px;align-items:stretch;margin-bottom:6px}
 .lx-identity .col{flex:1;min-width:0}

 /* ---- (skill tree nodes) ------------------------------------------- */
 /* The accent is set per character on the wrapper and everything downstream
    reads it, so Cole's tree is green and Vergil's is purple without a second
    code path anywhere. */
 .lx-tree-wrap{--ac:#c6ff3d;--ac-dim:rgba(198,255,61,.18)}
 .lx-circuit{position:absolute;left:0;top:0;pointer-events:none;z-index:0}
 .lx-circuit path{fill:none;stroke:var(--ac);stroke-linecap:square}
 .lx-circuit circle{fill:var(--ac)}
 .lx-circuit .live{filter:drop-shadow(0 0 4px var(--ac))}
 /* The pulse that runs down a live trace. A dash pattern animated along the
    path, which costs one property and reads as current moving rather than as
    a decorative shimmer. */
 @keyframes lx-flow{to{stroke-dashoffset:-260}}
 .lx-circuit .pulse{stroke-dasharray:5 255;animation:lx-flow 5.5s linear infinite}
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
 .lx-node{z-index:1}
 .lx-node .ic{position:absolute;right:8px;bottom:8px;opacity:.30}
 .lx-node.unlocked .ic{opacity:.7}
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
 /* The sigil badge. Sits in the node's cut corner, sized off the tier, and it
    is the reason a glance across the tree reads as depth: the marks get
    denser the further down you are. */
 .lx-node{padding-left:44px}
 .lx-node .sg{position:absolute;left:8px;top:9px;width:28px;height:28px;opacity:.85}
 .lx-node.locked .sg{opacity:.4}
 .lx-node .n{min-height:26px}
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
 .lx-duel{border-color:var(--gold);color:var(--gold)}
 /* The verdict card. Two columns and a number each, because the only thing
    anyone wants off this screen is who won and by how much. */
 .lx-verdict{text-align:center;padding:20px 10px}
 .lx-v-title{font-family:var(--font-display);font-size:26px;letter-spacing:.08em;
  color:var(--paper);text-shadow:3px 3px 0 rgba(255,47,146,.6),6px 6px 0 rgba(47,224,255,.25)}
 .lx-v-row{display:flex;align-items:center;justify-content:center;gap:26px;margin:22px 0 10px}
 .lx-v-side{min-width:150px;padding:12px 14px;border:1px solid var(--line);background:#0d0b13;
  clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)}
 .lx-v-side.won{border-color:var(--sage);box-shadow:0 0 22px rgba(198,255,61,.25)}
 .lx-v-side .nm{font-family:var(--font-mono);font-size:10px;color:var(--faint);letter-spacing:.12em}
 .lx-v-side .sc{font-family:var(--font-display);font-size:38px;color:var(--gold);margin-top:5px}
 .lx-v-side.won .sc{color:var(--sage)}
 .lx-v-vs{font-family:var(--font-display);font-size:14px;color:var(--ember);letter-spacing:.14em}
 .lx-v-note{font-family:var(--font-mono);font-size:9px;color:var(--faint);margin-bottom:16px}
 /* Warning decals on the apocalypse screen, and neon over the yard. Both are
    kept in their own colour: a hazard sticker that is not red is not a hazard
    sticker, and neon that takes the page's palette stops being neon. */
 .lx-decal{background:var(--decals) no-repeat;background-size:600% 500%;
  pointer-events:none;position:absolute;opacity:.85}
 .lx-neon{background:var(--neon) no-repeat;background-size:600% 200%;
  pointer-events:none;position:absolute;filter:drop-shadow(0 0 10px rgba(47,224,255,.4))}
 @keyframes lx-tap{50%{transform:translate(-50%,-50%) scale(.55);background:rgba(184,63,255,.5)}}

 /* ---- THE TERMINAL ---------------------------------------------------
    Instrument-panel grey rather than the graffiti palette, on purpose: this is
    the one screen in the file that is a machine and not a person. The colour
    arrives the moment you are through it. */
 .lx-term{position:absolute;inset:0;background:#22262b;
  background-image:repeating-linear-gradient(112deg,rgba(255,255,255,.022) 0 12px,transparent 12px 26px);
  display:flex;flex-direction:column;font-family:var(--font-mono);color:#c9cfd6;z-index:5;
  clip-path:polygon(0 0,calc(100% - 46px) 0,100% 46px,100% 100%,0 100%)}
 .lx-term.bad{animation:lx-shake .42s ease}
 @keyframes lx-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}
  45%{transform:translateX(5px)}70%{transform:translateX(-3px)}}
 .lx-t-top{display:flex;align-items:center;gap:9px;padding:7px 14px 7px 108px;background:#cdd3d9;color:#1b1f24;
  font-size:9px;letter-spacing:.14em;flex:none}
 .lx-t-top .dot{width:7px;height:7px;border-radius:50%;background:#1b1f24;flex:none}
 .lx-t-top .seg{width:44px;height:4px;background:#9aa3ad;flex:none}
 .lx-t-top .seg.s2{width:18px}.lx-t-top .seg.s3{width:30px}
 .lx-t-top .right{margin-left:auto;display:flex;gap:5px}
 .lx-t-top .b{width:22px;height:5px;background:#9aa3ad;display:block}
 .lx-t-top .b.on{background:#19c37d}
 .lx-t-fn{display:flex;align-items:center;gap:16px;padding:5px 16px;font-size:8px;
  letter-spacing:.16em;color:#79828c;border-bottom:1px solid #2e343b;flex:none}
 .lx-t-fn .fn.on{color:#19c37d}
 .lx-t-fn .rule{flex:1;height:1px;background:linear-gradient(90deg,#39404a,transparent)}
 .lx-t-body{flex:1;display:flex;min-height:0}
 .lx-t-rail{width:74px;flex:none;display:flex;flex-direction:column;align-items:center;
  gap:9px;padding:16px 0;border-right:1px solid #2e343b;position:relative}
 .lx-t-rail.r{border-right:0;border-left:1px solid #2e343b}
 .lx-t-rail .gauge{width:11px;height:130px;background:#191d22;border:1px solid #363d45;
  display:flex;align-items:flex-end;flex:none}
 .lx-t-rail .gauge.sm{height:74px}
 .lx-t-rail .gauge i{display:block;width:100%;background:#19c37d}
 .lx-t-rail .gauge.sm i{background:#7d8892}
 .lx-t-rail .vlabel{writing-mode:vertical-rl;font-size:7px;letter-spacing:.22em;color:#69727c}
 .lx-t-rail .ticks{width:26px;height:60px;flex:none;
  background:repeating-linear-gradient(0deg,#39404a 0 1px,transparent 1px 7px)}
 .lx-t-field{flex:1;position:relative;min-width:0}
 .lx-t-code{position:absolute;left:40%;top:12%;font-size:11px;letter-spacing:.2em;color:#aeb6bf}
 .lx-t-sn{position:absolute;right:16px;top:9%;font-family:var(--font-display);font-size:30px;
  letter-spacing:.04em;color:#e4e9ee;display:flex;align-items:center;gap:10px}
 .lx-t-sn .sac{font-family:var(--font-mono);font-size:8px;letter-spacing:.2em;background:#cdd3d9;
  color:#1b1f24;padding:2px 6px;align-self:flex-start}
 .lx-t-field .cross{position:absolute;color:#5b646e;font-size:13px}
 .cross.c1{left:26%;top:33%}.cross.c2{left:46%;top:33%}.cross.c3{left:26%;top:62%}
 .cross.c4{left:46%;top:62%}.cross.c5{left:66%;top:47%}
 .lx-t-field .box{position:absolute;border:1px solid #39404a;
  clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}
 .box.b1{left:10%;top:40%;width:46px;height:44px}
 .box.b2{left:10%;top:70%;width:46px;height:44px}
 .lx-t-prog{position:absolute;left:16%;bottom:14%;width:210px}
 .lx-t-prog .n{font-family:var(--font-display);font-size:17px;color:#dfe5ea;margin-bottom:6px}
 .lx-t-prog .bar{height:7px;background:#191d22;border:1px solid #363d45}
 .lx-t-prog .bar i{display:block;height:100%;width:52%;background:#7d8892}
 .lx-t-menu{width:320px;flex:none;display:flex;flex-direction:column;justify-content:center;
  gap:13px;padding:0 18px 0 6px}
 .lx-t-menu .row{position:relative;display:flex;align-items:center;gap:10px;height:42px;
  padding:0 34px 0 14px;border:1px solid #39404a;background:#252a30;cursor:pointer;flex:none;
  clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}
 .lx-t-menu .row:hover{background:#2c323a;border-color:#5d6570}
 .lx-t-menu .row.active{background:#dfe5ea;border-color:#dfe5ea}
 .lx-t-menu .row.dim{opacity:.5}
 .lx-t-menu .lbl{margin-left:auto;font-family:var(--font-display);font-size:14px;
  letter-spacing:.06em;color:#e4e9ee}
 .lx-t-menu .row.active .lbl{color:#1b1f24}
 .lx-t-menu .ar{color:#e4e9ee;font-size:11px}
 .lx-t-menu .row.active .ar{color:#1b1f24}
 /* The row index sits INSIDE the row. It was placed just below it at
    bottom:-13px, and a clip-path clips real children exactly like it clips
    pseudo-elements -- the same lesson the combat tracker's bar end-caps
    taught -- so all five numbers were cut off and invisible. */
 .lx-t-menu .num{position:absolute;left:12px;bottom:3px;font-size:7.5px;letter-spacing:.16em;color:#69727c}
 .lx-t-menu .row.active .num{color:#7c858f}
 .lx-t-menu input{flex:1;background:transparent;border:0;outline:0;color:#1b1f24;
  font-family:var(--font-display);font-size:14px;letter-spacing:.14em;text-align:right;min-width:0}
 .lx-t-menu input::placeholder{color:#6d757e}
 .lx-t-err{min-height:16px;font-size:9px;letter-spacing:.08em;color:#ff5d66;margin-top:4px}
 .lx-t-btm{display:flex;align-items:center;gap:14px;padding:6px 16px;border-top:1px solid #2e343b;
  font-size:8px;letter-spacing:.16em;color:#69727c;flex:none}
 .lx-t-btm .dashes{flex:1;height:1px;background:repeating-linear-gradient(90deg,#39404a 0 14px,transparent 14px 26px)}
 .lx-t-btm .blocks{display:flex;gap:4px}
 .lx-t-btm .blocks i{width:9px;height:9px;background:#39404a;display:block}
 .lx-t-btm .blocks i.on{background:#c9cfd6}
 @media(max-width:820px){.lx-t-rail{display:none}.lx-t-menu{width:auto;flex:1}}

 /* ---- THE WALL ------------------------------------------------------
    Behind everything, unclickable, and quiet until you look at it. The note
    beside a tag is deliberately small: it should read as pencil in a margin
    that you notice on the third visit, not as a caption demanding to be read
    the first time. Hovering brings it up to full. */
 .lx-wall{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
 .lx-wall-piece{position:absolute;pointer-events:auto;max-width:190px}
 .lx-wall-art{display:block;background-repeat:no-repeat;background-position:center;
  opacity:.34;transition:opacity .18s ease;filter:saturate(1.15)}
 .lx-wall-piece:hover .lx-wall-art{opacity:.75}
 .lx-wall-note{font-size:8.5px;line-height:1.35;opacity:.40;margin-top:2px;max-width:170px;
  transition:opacity .18s ease;letter-spacing:.01em;transform:rotate(-1.5deg)}
 .lx-wall-piece:hover .lx-wall-note{opacity:.92}
 .lx-wall-note .w{display:block;font-family:var(--font-mono);font-size:7px;
  letter-spacing:.14em;opacity:.65;margin-bottom:1px}
 @media(max-width:900px){.lx-wall{display:none}}

 /* ---- 4. GUEST BOOK -------------------------------------------------
    A book rather than a list. Ruled lines, a red margin rule, a foxed paper
    tone, an eye border top and bottom, every entry pressed with the signer's
    own seal and rocked a fraction off true. The wobble is SEEDED so the page
    is hand-made rather than restless -- entries that re-rotate on each render
    read as a bug. */
 .gb-book{position:relative;background:
   radial-gradient(120% 60% at 20% -10%,rgba(255,47,146,.05),transparent 60%),
   linear-gradient(180deg,#15121d,#0d0b13);
   border:1px solid var(--line);padding:10px 12px}
 .gb-eyerow{height:15px;background:var(--eye-row) repeat-x center/auto 100%;opacity:.22}
 .gb-page{position:relative;padding:20px 18px 18px 62px;background:
   repeating-linear-gradient(0deg,transparent 0 27px,rgba(233,230,242,.05) 27px 28px);
   min-height:300px}
 .gb-page::before{content:"";position:absolute;left:44px;top:0;bottom:0;width:1px;
   background:rgba(255,47,146,.30)}
 .gb-page::after{content:"";position:absolute;left:47px;top:0;bottom:0;width:1px;
   background:rgba(255,47,146,.12)}
 .gb-entry{position:relative;margin:0 0 22px;padding:4px 0 12px 56px;
   border-bottom:1px dashed rgba(233,230,242,.09);transform-origin:0 50%}
 .gb-seal{position:absolute;left:0;top:4px;width:46px;height:46px;opacity:.55}
 .gb-sig{font-size:25px;line-height:1.05;margin-bottom:3px;display:inline-block}
 .gb-msg{font-size:12.5px;line-height:1.6;color:var(--paper);opacity:.92;max-width:66ch}
 .gb-when{font-family:var(--font-mono);font-size:8.5px;color:var(--faint);margin-top:6px;letter-spacing:.07em}
 /* Margin notes: what makes the book a conversation instead of a queue. Anyone
    can write in the margin of anyone else's entry, in their own ink. */
 .gb-notes{margin:9px 0 0 14px;border-left:2px solid rgba(233,230,242,.12);padding-left:10px}
 .gb-note{font-family:var(--font-body);font-size:11px;line-height:1.5;opacity:.85;
   margin:3px 0;transform-origin:0 50%}
 .gb-note-who{font-family:var(--font-mono);font-size:8px;letter-spacing:.1em;
   opacity:.7;display:block}
 .gb-auto{color:var(--rust);letter-spacing:.08em}
 .gb-live{font-family:var(--font-mono);font-size:9px;color:var(--faint);letter-spacing:.1em;
  display:flex;align-items:center;gap:8px;margin-bottom:8px}
 .gb-live i{width:7px;height:7px;border-radius:50%;background:var(--sage);
  box-shadow:0 0 8px var(--sage);animation:lx-pulse 1.8s ease-in-out infinite}
 .gb-addnote{margin-top:7px;background:none;border:1px dashed var(--line);color:var(--faint);
   font-family:var(--font-mono);font-size:8.5px;padding:3px 8px;cursor:pointer;letter-spacing:.06em}
 .gb-addnote:hover{border-color:var(--spray);color:var(--spray)}
 .gb-form{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;margin-top:14px;
  padding:11px;border:1px dashed var(--line);background:rgba(255,255,255,.02)}
 .gb-form textarea{flex:1;min-width:240px;min-height:58px;background:#0d0b13;color:var(--paper);
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
 /* The earn-this-rung row. A label wrapping a real checkbox, so the whole
    strip is the hit target and the state is a form control the browser keeps
    for us rather than a div pretending to be one. */
 .lx-task{display:block;position:relative;padding:6px 8px 7px 30px;margin-bottom:6px;
  border-left:2px solid var(--spray4);background:rgba(184,63,255,.06);cursor:pointer}
 .lx-task input{position:absolute;left:9px;top:9px;accent-color:var(--spray2);cursor:pointer}
 /* The caption is display:block only under .lx-hook, so inside a task it ran
    inline and read as "TO EARN THIS RUNGSay their name out loud". */
 .lx-task .who{display:block;margin-bottom:3px}
 .lx-task .tx{font-family:var(--font-body);font-size:11.5px;line-height:1.5;color:var(--paper);opacity:.9;display:block}
 .lx-task.done{border-left-color:var(--spray2);background:rgba(198,255,61,.07)}
 .lx-task.done .tx{opacity:.55;text-decoration:line-through}
 /* The wave card. The signature is a real drawn path, not a word -- six types
    that all said "wave" and looked identical would be six labels. */
 .lx-wave{margin-top:10px;border:1px solid var(--line);border-left:3px solid var(--wc);
  background:rgba(255,255,255,.02);padding:9px 11px 10px;width:100%}
 .lx-wave-top{display:flex;align-items:center;gap:11px;flex-wrap:wrap}
 .lx-wave-svg{width:130px;height:26px;flex:none}
 .lx-wave-svg path{fill:none;stroke:var(--wc);stroke-width:1.8;
  filter:drop-shadow(0 0 4px var(--wc))}
 .lx-wave-nm{font-family:var(--font-display);font-size:12px;color:var(--wc);letter-spacing:.06em}
 .lx-wave-sel{margin-left:auto;background:#0d0b13;color:var(--paper);border:1px solid var(--line);
  font-family:var(--font-mono);font-size:9px;padding:3px 5px}
 .lx-wave-read{font-family:var(--font-body);font-size:12px;line-height:1.55;
  color:var(--paper);opacity:.9;margin-top:7px}
 .lx-wave-risk{font-family:var(--font-mono);font-size:9.5px;line-height:1.5;
  color:var(--faint);margin-top:5px}
 .lx-wave-risk b{color:var(--danger);letter-spacing:.1em}
 .lx-strain{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
 .lx-chip{font-family:var(--font-mono);font-size:8.5px;letter-spacing:.06em;
  border:1px solid var(--line);padding:2px 6px;color:var(--faint)}
 .lx-chip.warn{border-color:var(--danger);color:var(--danger)}
 .lx-chip.bad{border-color:var(--tagred);color:var(--tagred)}
 .lx-chip.good,.lx-chip.ok{border-color:var(--sage);color:var(--sage)}
 .lx-strain{flex-direction:column;align-items:flex-start;gap:4px}
 .lx-chip{display:flex;align-items:center;line-height:1.45;padding:4px 7px;width:100%;
  box-sizing:border-box;text-align:left}
 .lx-chip.bad{background:rgba(255,59,59,.07)}
 .lx-chip.warn{background:rgba(255,155,31,.06)}
 `;
 document.head.appendChild(css);

 /* Sheet geometry, so a caller asks for (sheet, index, px) and never does the
    arithmetic. Each sheet is a fixed grid of square cells; index N sits at
    column N%cols, row N/cols. */
 const SHEETS = { hex: { cols: 6, rows: 6, v: "--ico-hex" },
                  oct: { cols: 10, rows: 2, v: "--ico-oct" },
                  rogue: { cols: 6, rows: 3, v: "--ico-rogue" },
                  sig: { cols: 6, rows: 3, v: "--sigils" } };
 function ico(sheet, n, px) {
  const S2 = SHEETS[sheet]; if (!S2) return "";
  const c = n % S2.cols, r = Math.floor(n / S2.cols) % S2.rows;
  return "width:" + px + "px;height:" + px + "px;" +
   "-webkit-mask-image:var(" + S2.v + ");mask-image:var(" + S2.v + ");" +
   "-webkit-mask-size:" + (px * S2.cols) + "px " + (px * S2.rows) + "px;" +
   "mask-size:" + (px * S2.cols) + "px " + (px * S2.rows) + "px;" +
   "-webkit-mask-position:" + (-c * px) + "px " + (-r * px) + "px;" +
   "mask-position:" + (-c * px) + "px " + (-r * px) + "px;";
 }
 const icoEl = (sheet, n, px, extra) =>
   '<i class="lx-i" style="' + ico(sheet, n, px) + (extra || "") + '"></i>';


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

 /* Which of the eighteen sigils a node wears. Depth picks the ROW -- the sheet
    runs simple to elaborate down its three rows -- and the branch picks the
    column, so a node's mark says both how deep it sits and which discipline it
    belongs to, without a legend. */
 const SIG_COLS = 6, SIG_ROWS = 3, SIG_CELL = 128;
 function sigilStyle(depth, bi, px) {
  const row = Math.min(SIG_ROWS - 1, depth);
  const col = bi % SIG_COLS;
  const w = px * SIG_COLS, h = px * SIG_ROWS;
  return "-webkit-mask-size:" + w + "px " + h + "px;mask-size:" + w + "px " + h + "px;" +
         "-webkit-mask-position:" + (-col * px) + "px " + (-row * px) + "px;" +
         "mask-position:" + (-col * px) + "px " + (-row * px) + "px;";
 }

 const BRANCH_COLOR = ["#ff2f92", "#2fe0ff", "#c6ff3d", "#b83fff", "#ff9b1f", "#ff3b3b"];

 /* THE CIRCUIT BED.
    Traces are generated rather than drawn: from each node, a run leaves the
    bottom edge, breaks orthogonally with a 45-degree chamfer, and terminates
    in a via pad somewhere out in the field. It is the same routing grammar a
    board uses -- straight runs, one diagonal at each corner, a round pad at
    the end -- which is what makes it read as circuitry rather than as
    decorative lines.

    Seeded off the node's position so the bed is identical every redraw. A
    circuit that reshuffles itself on each render is a screensaver, and a
    screensaver behind a skill tree is noise. */
 function circuitBed(NS, L, w, h) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "lx-circuit");
  svg.setAttribute("width", w); svg.setAttribute("height", h);
  let seed = 1337;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const add = (d, op, wd, cls) => {
   const el = document.createElementNS(NS, "path");
   el.setAttribute("d", d); el.setAttribute("stroke-width", wd);
   el.setAttribute("opacity", op); if (cls) el.setAttribute("class", cls);
   svg.appendChild(el); return el;
  };
  const pad = (x, y, r, op) => {
   const c = document.createElementNS(NS, "circle");
   c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", r);
   c.setAttribute("opacity", op); svg.appendChild(c);
  };

  // a run of bus lines across the whole bed, behind everything
  for (let i = 0; i < 7; i++) {
   const y = 24 + i * (h - 40) / 7 + rnd() * 12;
   const bend = 120 + rnd() * (w - 300);
   const dy = (rnd() < .5 ? -1 : 1) * (16 + rnd() * 26);
   add("M0," + y.toFixed(0) + " H" + bend.toFixed(0) +
       " l14," + dy.toFixed(0) + " H" + w, .10, 1, null);
  }

  // a spur off every node, ending in a via
  L.placed.forEach((n, i) => {
   const live = n.node.status === "unlocked" || n.node.status === "unlockable";
   const x0 = n.x + 24, y0 = n.y + 62;
   const down = 26 + rnd() * 46;
   const side = rnd() < .5 ? -1 : 1;
   const across = (34 + rnd() * 130) * side;
   const x1 = Math.max(12, Math.min(w - 12, x0 + across));
   const y1 = y0 + down;
   const d = "M" + x0 + "," + y0 + " V" + (y1 - 10) +
             " l" + (10 * side) + ",10 H" + x1 + " v" + (18 + rnd() * 40).toFixed(0);
   add(d, live ? .55 : .16, live ? 1.6 : 1, live ? "live" : null);
   if (live) add(d, .9, 2.2, "live pulse");
   pad(x1, y1 + 18 + 20, live ? 3 : 2, live ? .6 : .18);
  });
  return svg;
 }

 function drawTree(tree, treeName, treeKey) {
  const canvas = $("treeCanvas");
  if (!canvas) return;
  canvas.innerHTML = "";
  if (!tree) { canvas.innerHTML = '<div style="padding:20px;color:var(--faint)">Nothing logged yet.</div>'; return; }

  const nodes = parseEdges(tree);
  const L = layout(nodes);

  /* Cole reads green, Vergil purple, and anyone else is given a colour off
     their name so a third character never lands unstyled. */
  const ACCENT = { cole: "#5dff9b", vergil: "#b83fff" };
  let acc = ACCENT[String(treeKey || "").toLowerCase()];
  if (!acc) {
   let hsum = 0; const nk = String(treeKey || treeName || "x");
   for (let i = 0; i < nk.length; i++) hsum = (hsum * 31 + nk.charCodeAt(i)) | 0;
   acc = "hsl(" + (Math.abs(hsum) % 360) + ",85%,66%)";
  }
  const wrap = document.createElement("div");
  wrap.className = "lx-tree-wrap";
  wrap.style.setProperty("--ac", acc);
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
    if (live) path.setAttribute("filter", "drop-shadow(0 0 3px " + col + ")");
    path.setAttribute("stroke-width", live ? 2.4 : 1.4);
    if (!live) path.setAttribute("stroke-dasharray", "5 5");
    svg.appendChild(path);
   });
  });
  inner.insertBefore(circuitBed(NS, L, L.w, L.h), inner.firstChild);
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
    '<i class="lx-sig sg" style="' + sigilStyle(x.__d, x.bi, 28) + '"></i>' +
    icoEl("hex", (x.bi * 7 + x.__d * 3 + x.__ord) % 36, 22, "position:absolute;right:8px;bottom:8px;opacity:.3;") +
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

  /* The class-identity column, straight from the reference sheet: a hanging
     banner with the order's sigil, the character's line under it, and the eye
     border ruling it off from the tree itself. */
  const done = L.placed.filter(x => x.node.status === "unlocked").length;
  const ident = document.createElement("div");
  ident.className = "lx-identity";
  const bannerCol = document.createElement("div");
  bannerCol.style.cssText = "flex:none;width:190px;color:" + acc;
  bannerCol.innerHTML =
   '<div class="lx-banner">' +
    '<div class="nm">' + esc(treeName || "") + '</div>' +
    '<i class="emb"></i>' +
    '<div class="sb">' + esc((tree.branches || []).length) + ' DISCIPLINES</div>' +
    '<div class="ct">' + done + ' / ' + L.placed.length + ' EARNED</div>' +
   '</div>';
  const rest = document.createElement("div");
  rest.className = "col";
  rest.appendChild(tools); rest.appendChild(legend); rest.appendChild(key);
  const eyerow = document.createElement("div"); eyerow.className = "lx-eyerow";
  rest.appendChild(eyerow);
  rest.appendChild(wrap);
  ident.appendChild(bannerCol); ident.appendChild(rest);
  canvas.appendChild(ident);

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
 /* renderTree is called with the tree object only, so the name is recovered
    from whichever key in SKILL_TREES holds this object -- identity comparison,
    not a copy of the selection state. */
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
 let cpuRun = 0;         // bumped on every launch, so a deferred close can tell it is stale
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
   if (!cpuNow && duel && duel.stage === "human") { T(() => onHumanScored(e)); return e; }
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

 /* Closing the stage is part of playing. A human finishing a game reads the
    result and presses Done; a CPU that never does leaves the overlay across
    the whole app, and every screen behind it is unreachable until someone
    clicks out. The score is left up for a beat first so it can be read. */
 function cpuStop(msg, closeStage) {
  if (cpuTimer) { clearInterval(cpuTimer); cpuTimer = null; }
  ghostOff();
  const w = $("lxWatchTag"); if (w && w.parentNode) w.parentNode.removeChild(w);
  cpuNow = null;
  if (msg) T(() => showToast(msg));
  /* The close is deferred, so it has to check that it is still the right thing
     to do when it fires. A round runs hands back to back, and a 1.4s timeout
     from the previous player was landing in the middle of the next one's game
     and tearing down its state -- one hand in four silently never logged a
     score. The token is bumped by every launch, so a stale timeout does
     nothing. */
  if (closeStage) {
   const token = ++cpuRun;
   setTimeout(() => { if (token === cpuRun && !cpuNow) T(() => exitMinigame()); }, 1400);
  }
 }

 function cpuPlay(gameId, key, inDuel) {
  const roster = cpuRoster();
  const who = roster.find(r => r.key === key) || roster[0];
  if (!who) return;
  const PG = G("PLAYABLE_GAMES") || {};
  const launch = PG[gameId] && G(PG[gameId].launch);
  if (typeof launch !== "function") { T(() => showToast("That one isn't playable yet.")); return; }

  cpuStop();
  cpuRun++;
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
   if (inDuel && duel) { cpuStop(null, false); settleDuel(sc); return; }
   T(() => {
    const others = T(() => (G("GAME_LOG") || []).filter(e => e.gameId === gameId)
      .flatMap(e => e.participants || []).map(x => x.score).filter(v => typeof v === "number"), []);
    const best = others.length ? Math.max.apply(null, others) : -1;
    autoSign(who.key, (typeof sc === "number" && sc >= best) ? "win" : "loss");
   });
   cpuStop(who.name + (sc !== undefined ? " scored " + sc + "." : " is done.") + (p.line ? "  " + p.line : ""), true);
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

 /* Icons on the game catalogue. Matched to each game by what the game IS --
    a reaction duel gets the hourglass, a grip trial gets the fist -- keyed off
    the id so a game added later falls back to a neutral mark rather than
    borrowing a meaning it does not have. */
 const GAME_ICON = {
  bottle_cap_duel: 1, scrap_toss: 0, junkyard_sprint: 6, grip_trial: 30,
  tug_of_the_wreck: 24, hush_rules: 12, wolf_and_warren: 8, the_long_wait: 21,
  salvage_hunt: 12, story_chain: 26
 };
 function decorateCatalog() {
  T(() => {
   const host = $("gamesGrid"); if (!host) return;
   const cat = G("GAME_CATALOG") || [];
   Array.from(host.children).forEach((card) => {
    if (card.querySelector(".lx-gico")) return;
    const txt = (card.textContent || "").toLowerCase();
    const g = cat.find(x => txt.indexOf(String(x.title || "").toLowerCase()) >= 0);
    const n = g && GAME_ICON[g.id] !== undefined ? GAME_ICON[g.id] : 33;
    const i = document.createElement("i");
    i.className = "lx-i lx-gico";
    i.setAttribute("style", ico("hex", n, 34) +
      "position:absolute;right:11px;top:11px;opacity:.28;color:var(--gold);");
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    card.appendChild(i);
   });
  });
 }

 /* ================================================================
    HEAD TO HEAD — a logged-in player never plays alone
    ================================================================
    Zazz's games are not solitaire. When a person who is signed in as a
    character launches a playable game, a CPU hand is put opposite them: the
    player goes first, their score is held, and then the CPU plays THE SAME
    GAME on the same stage while they watch. Both scores land in one session
    entry with two participants, and the verdict is the tracker's own
    comparison rather than an opinion.

    The opponent is drawn from the yard, never from the two player characters,
    and never from the person playing -- Kevanna signed in does not get matched
    against Kevanna. The GM is exempt from the whole thing: they are not a
    contender, and a GM opening a game to look at it should not trigger a duel. */
 let duel = null;   // {game, human, humanScore, opp} while a match is live

 function duelOpponent(exclude) {
  const r = cpuRoster().filter(x => x.key !== exclude);
  if (!r.length) return null;
  return r[Math.floor(Math.random() * r.length)];
 }

 /* The player's own launch is wrapped per game. Each of the ten launchers is
    a global function the catalogue calls by name, so wrapping them all is one
    loop rather than ten edits -- and it means a game added to PLAYABLE_GAMES
    later is picked up without a change here. */
 function armDuels() {
  const PG = G("PLAYABLE_GAMES") || {};
  Object.keys(PG).forEach(gid => {
   const fname = PG[gid].launch;
   const orig = G(fname);
   if (typeof orig !== "function" || orig.__duelWrapped) return;
   const wrapped = function (gameId) {
    const r = orig.apply(this, arguments);
    // a CPU run sets cpuNow before launching; only a HUMAN launch arms a duel
    T(() => {
     const me = G("currentUser");
     if (cpuNow || !me || me === "gm") return;
     if (duel && duel.stage === "cpu") return;
     const opp = duelOpponent(me);
     if (!opp) return;
     duel = { game: gameId || gid, human: me, opp: opp, stage: "human", humanScore: null };
     showDuelTag(opp.name);
    });
    return r;
   };
   wrapped.__duelWrapped = true;
   T(() => { (new Function("f", "try{" + fname + "=f}catch(e){window['" + fname + "']=f}"))(wrapped); });
  });
 }

 function showDuelTag(oppName) {
  T(() => {
   const old = $("lxDuelTag"); if (old && old.parentNode) old.parentNode.removeChild(old);
   const t = document.createElement("div");
   t.className = "lx-watch lx-duel"; t.id = "lxDuelTag";
   t.textContent = "CHALLENGE · " + oppName.toUpperCase() + " PLAYS THIS AFTER YOU";
   $("minigameOverlay").appendChild(t);
  });
 }

 /* The player's score arrives through logMinigameScore, which is already
    wrapped for CPU attribution. This is the second half of that wrapper: when
    a human finishes the first leg of a duel, the entry is held rather than
    left standing alone, and the CPU is sent in. */
 function onHumanScored(entry) {
  if (!duel || duel.stage !== "human") return;
  duel.humanScore = T(() => entry.participants[0].score, null);
  duel.entry = entry;
  duel.stage = "cpu";
  T(() => showToast(duel.opp.name + " steps up."));
  setTimeout(() => {
   if (!duel) return;
   duel.stage = "cpu";
   cpuPlay(duel.game, duel.opp.key, /*inDuel*/ true);
  }, 1500);
 }

 function settleDuel(cpuScore) {
  if (!duel) return;
  const hs = duel.humanScore, cs = cpuScore;
  const P = G("PLAYERS") || {};
  const meName = (P[duel.human] || {}).name || duel.human;
  const win = (typeof hs === "number" && typeof cs === "number")
    ? (hs > cs ? "human" : hs < cs ? "cpu" : "draw") : "unknown";
  /* One entry, two participants -- so the leaderboard reads it as a match
     rather than as two unrelated solo runs that happen to share a game. */
  T(() => {
   const e = duel.entry;
   if (e) {
    e.participants = [{ player: duel.human, score: hs }, { player: duel.opp.key, score: cs }];
    e.sessionLabel = meName + " vs " + duel.opp.name + " — challenge match";
    e.note = "Head-to-head: the player played it, then the CPU played the same game on the same stage.";
    e.winner = win === "human" ? duel.human : win === "cpu" ? duel.opp.key : null;
    // the CPU's own solo entry from this leg is redundant now
    const GL = G("GAME_LOG") || [];
    const last = GL[GL.length - 1];
    if (last && last !== e && last.loggedBy === "cpu") GL.pop();
   }
  });
  showVerdict(meName, hs, duel.opp.name, cs, win);
  T(() => autoSign(duel.opp.key, win === "cpu" ? "win" : "loss"));
  duel = null;
  T(() => { if (typeof renderGameLog === "function") renderGameLog(); });
  T(() => { if (typeof renderLeaderboard === "function") renderLeaderboard(); });
 }

 function showVerdict(meName, hs, oppName, cs, win) {
  T(() => {
   const stage = $("minigameStage"); if (!stage) return;
   const t = $("lxDuelTag"); if (t && t.parentNode) t.parentNode.removeChild(t);
   stage.innerHTML =
    '<div class="lx-verdict">' +
     '<div class="lx-v-title">' + (win === "human" ? "YOU TOOK IT" : win === "cpu" ? "THEY TOOK IT" : "DEAD EVEN") + '</div>' +
     '<div class="lx-v-row">' +
      '<div class="lx-v-side' + (win === "human" ? " won" : "") + '">' +
       '<div class="nm">' + esc(meName) + '</div><div class="sc">' + (hs == null ? "—" : hs) + '</div></div>' +
      '<div class="lx-v-vs">VS</div>' +
      '<div class="lx-v-side' + (win === "cpu" ? " won" : "") + '">' +
       '<div class="nm">' + esc(oppName) + '</div><div class="sc">' + (cs == null ? "—" : cs) + '</div></div>' +
     '</div>' +
     '<div class="lx-v-note">Logged as one match. Both scores stand.</div>' +
     '<button class="btn" id="lxVDone">Done</button>' +
    '</div>';
   T(() => { $("lxVDone").onclick = () => T(() => exitMinigame()); });
  });
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
    THE TERMINAL LOGIN
    ================================================================
    Rebuilt in the reference sheet's language: a dark instrument panel with
    rails down both edges, a bank of numbered entries on the right, corner
    chamfers, registration crosses across the field and a status strip along
    the bottom. The Ledger's own login is kept underneath and still does the
    work -- this replaces the LOOK of the screen, not the mechanism, so the
    passphrase check, the error text and the failure counter are all still the
    file's own.

    The right-hand bank is where the sheet has PLAY / OPTIONS / NETWORK; here
    the top entry is the passphrase field and the rest are the things a person
    at a locked terminal can actually do, which is not much. That is the joke
    and it is also true. */
 function mountTerminal() {
  const scr = $("screen-login");
  if (!scr || $("lxTerm")) return;
  const pass = $("loginPass"), btn = $("loginBtn"), err = $("loginErr");
  if (!pass || !btn) return;

  const wrap = document.createElement("div");
  wrap.className = "lx-term"; wrap.id = "lxTerm";
  const stamp = new Date();
  const hhmm = String(stamp.getHours()).padStart(2, "0") + ":" + String(stamp.getMinutes()).padStart(2, "0");
  const fn = (n) => '<span class="fn">FN_' + String(n).padStart(2, "0") + '</span>';

  wrap.innerHTML =
   '<div class="lx-t-top">' +
     '<span class="dot"></span><span class="ttl">ST-R PRO TOOL 0.5</span>' +
     '<span class="seg"></span><span class="seg s2"></span><span class="seg s3"></span>' +
     '<span class="right"><i class="b"></i><i class="b"></i><i class="b on"></i></span>' +
   '</div>' +
   '<div class="lx-t-fn">' + fn(3) + fn(7) + fn(8) + '<span class="fn on">FN_09</span>' +
     '<span class="rule"></span></div>' +
   '<div class="lx-t-body">' +
     '<div class="lx-t-rail l">' +
       '<div class="gauge"><i style="height:62%"></i></div>' +
       '<div class="vlabel">HP</div>' +
       '<div class="ticks"></div>' +
       '<div class="gauge sm"><i style="height:34%"></i></div>' +
       '<div class="vlabel">FRQ BLEED</div>' +
     '</div>' +
     '<div class="lx-t-field">' +
       '<div class="lx-t-code">[ 0-2 ]</div>' +
       '<div class="lx-t-sn"><span class="sac">SAC</span>SN-02 <b>&#9727;</b></div>' +
       '<div class="cross c1">+</div><div class="cross c2">+</div><div class="cross c3">+</div>' +
       '<div class="cross c4">+</div><div class="cross c5">+</div>' +
       '<div class="box b1"></div><div class="box b2"></div>' +
       '<div class="lx-t-prog"><div class="n">03/06</div><div class="bar"><i></i></div></div>' +
     '</div>' +
     '<div class="lx-t-menu">' +
       '<div class="row active" id="lxRowPass">' +
         '<input id="lxPass" type="password" placeholder="PASSPHRASE" autocomplete="off">' +
         '<span class="ar">&#9654;</span><span class="num">001</span></div>' +
       '<div class="row" id="lxRowEnter"><span class="lbl">ENTER</span><span class="ar">&#9654;</span><span class="num">002</span></div>' +
       '<div class="row dim"><span class="lbl">NETWORK</span><span class="ar">&#9654;</span><span class="num">003</span></div>' +
       '<div class="row dim"><span class="lbl">CREDITS</span><span class="ar">&#9654;</span><span class="num">004</span></div>' +
       '<div class="row dim" id="lxRowWipe"><span class="lbl">WIPE LOCAL</span><span class="ar">&#9654;</span><span class="num">005</span></div>' +
       '<div class="lx-t-err" id="lxErr"></div>' +
     '</div>' +
     '<div class="lx-t-rail r">' +
       '<div class="gauge"><i style="height:78%"></i></div>' +
       '<div class="vlabel">PWR / MODE</div>' +
       '<div class="ticks"></div>' +
       '<div class="gauge sm"><i style="height:52%"></i></div>' +
       '<div class="vlabel">BUFF</div>' +
     '</div>' +
   '</div>' +
   '<div class="lx-t-btm">' +
     '<span class="fn">FN_24</span><span class="fn">FN_26</span>' +
     '<span class="dashes"></span>' +
     '<span class="blocks"><i></i><i class="on"></i><i></i><i></i><i class="on"></i><i></i></span>' +
     '<span class="stamp">' + hhmm + ' · OPUS_&#8709; TERMINAL</span>' +
   '</div>';

  scr.appendChild(wrap);
  /* The Ledger's own controls are hidden rather than removed, because they are
     what actually validates. Everything below drives them. */
  T(() => { pass.style.display = "none"; btn.style.display = "none"; if (err) err.style.display = "none"; });

  const go = () => {
   pass.value = $("lxPass").value;
   btn.click();
   setTimeout(() => T(() => {
    const e = $("lxErr"), m = (err && err.textContent) || "";
    if (m) { e.textContent = m; wrap.classList.add("bad"); setTimeout(() => wrap.classList.remove("bad"), 420); }
    else e.textContent = "";
   }), 60);
  };
  T(() => { $("lxRowEnter").onclick = go; });
  T(() => { $("lxPass").onkeydown = (ev) => { if (ev.key === "Enter") go(); }; });
  T(() => { $("lxRowWipe").onclick = () => {
    if (!confirm("Wipe this browser's local Ledger data — guest book, ticks, wave readings and nemesis memory?")) return;
    ["opus_guestbook_v2","opus_rung_tasks_v1","opus_wave_types_v1"].forEach(k => T(() => localStorage.removeItem(k)));
    T(() => showToast("Local data wiped."));
  }; });
  T(() => $("lxPass").focus());
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
 /* Each character also gets a SEAL -- one of the eighteen hand sigils, stamped
    beside their signature in their own ink. It is what turns a list of names
    into a book people have physically been at: the seal is the mark they press
    into the page, and no two are the same mark or the same colour. */
 const SEAL = { cole: 0, vergil: 5, kevanna: 11, felana: 2, yaviel: 16, zalir: 6,
                dahlia: 9, angi: 3, burham: 13, merov: 8, xaim: 14, gm: 17 };

 const GBKEY = "opus_guestbook_v2";
 let GB = T(() => JSON.parse(localStorage.getItem(GBKEY)) || null, null) || [
  { who: "zalir",   msg: "Signed because Zazz said the book has to have names in it. It has a name in it now.", at: "Day 1", notes: [] },
  { who: "kevanna", msg: "FIRST. someone tell yaviel i was first. i dont care that the page says day one for everybody", at: "Day 1",
    notes: [{ who: "yaviel", t: "You were not." }] },
  { who: "yaviel",  msg: "Kevanna was not first. The book was open before either of us walked in.", at: "Day 2", notes: [] },
  { who: "dahlia",  msg: "I wrote something here already. It isn't on this page any more. Ask the page.", at: "Day 2",
    notes: [{ who: "burham", t: "I checked. She's right and I wish she wasn't." }] }
 ];
 const gbSave = () => T(() => localStorage.setItem(GBKEY, JSON.stringify(GB)));

 /* A stable per-entry wobble. Seeded off the index and the signer so a page
    looks hand-made but does not reshuffle itself every time it is drawn --
    an entry that jumps a degree on every render reads as a bug, not as ink. */
 function wob(seed, spread) {
  let h = 0; const str = String(seed);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - .5) * spread;
 }

 function guestBookHtml() {
  const P = G("PLAYERS") || {};
  const rows = GB.map((e, i) => {
   const h = HANDS[e.who] || HANDS.gm;
   const nm = (P[e.who] || {}).name || e.who;
   const sig = SEAL[e.who] === undefined ? 17 : SEAL[e.who];
   const notes = (e.notes || []).map(n => {
    const nh = HANDS[n.who] || HANDS.gm;
    return '<div class="gb-note" style="color:' + nh.ink + ';transform:rotate(' + wob(n.who + n.t, 3).toFixed(2) + 'deg)">' +
     '<span class="gb-note-who">' + esc((P[n.who] || {}).name || n.who) + '</span>' + esc(n.t) + '</div>';
   }).join("");
   return '<div class="gb-entry" style="transform:rotate(' + wob(e.who + i, 1.1).toFixed(2) + 'deg)">' +
    '<i class="lx-sig gb-seal" style="color:' + h.ink + ';' +
      sigilStyle(Math.floor(sig / 6), sig % 6, 46) + '"></i>' +
    '<span class="gb-sig" style="font-family:' + h.font + ';font-size:' + h.size + 'px;color:' + h.ink +
      ';font-weight:' + h.weight + ';letter-spacing:' + h.sp + ';transform:rotate(' + h.slant + 'deg)">' + esc(nm) + '</span>' +
    '<div class="gb-msg">' + esc(e.msg) + '</div>' +
    '<div class="gb-when">' + esc(e.at || "") + ' · entry ' + (i + 1) +
      (e.auto ? ' · <span class="gb-auto">wrote itself · ' + esc(e.auto) + '</span>' : "") + '</div>' +
    (notes ? '<div class="gb-notes">' + notes + '</div>' : "") +
    '<button class="gb-addnote" data-note="' + i + '">+ add a margin note</button>' +
   '</div>';
  }).join("");
  const opts = Object.keys(HANDS).filter(k => P[k]).map(k =>
    '<option value="' + esc(k) + '">' + esc((P[k] || {}).name || k) + '</option>').join("");
  return '<div class="gb-live"><i></i>THE BOOK IS OPEN · <span id="lxBookCount">' + GB.length +
   ' ENTRIES</span> · it writes itself when something happens</div>' +
   '<div class="gb-book lx-taped">' +
    '<div class="gb-eyerow"></div>' +
    '<div class="gb-page">' + (rows || '<div style="color:var(--faint)">Nobody has signed yet.</div>') + '</div>' +
    '<div class="gb-eyerow"></div>' +
   '</div>' +
   '<div class="gb-form">' +
    '<select id="gbWho">' + opts + '</select>' +
    '<textarea id="gbMsg" placeholder="Sign it. Say something. Nobody is checking spelling."></textarea>' +
    '<button class="btn" id="gbSign">Press your seal</button>' +
   '</div>';
 }

 /* THE BOOK WRITES ITSELF.
    A guest book that only fills when a person types into it is a form. This
    one reacts: when a day is survived, when a CPU hand plays a game, when
    somebody's condition turns, whoever it happened to signs the page about it
    -- in their own voice, in their own hand, on their own line.

    The lines are per-character and per-event, so Kevanna's note about winning
    is not Yaviel's, and the book reads back as a record of the campaign rather
    than a list of names. Auto-entries are marked so nobody mistakes them for
    something a player wrote. */
 const AUTO = {
  win: { kevanna: ["told you.", "easy. next.", "who's next then"],
         yaviel: ["Recorded. The margin was smaller than it looked."],
         zalir: ["Fine."], dahlia: ["I knew before I threw. That's not the same as cheating."],
         felana: ["ha! did anyone see that or do i have to describe it"],
         angi: ["again. right now. i'm not tired."], burham: ["Noted the wind. It mattered."] },
  loss: { kevanna: ["rigged.", "that doesn't count"],
          yaviel: ["I was beaten. It's worth writing down which part."],
          zalir: ["Lost. Still standing."], dahlia: ["I saw this one too. Seeing it doesn't stop it."],
          felana: ["i wasn't even trying. i was a bit trying."],
          angi: ["fine. FINE."], burham: ["Beaten on the last throw. I'll take it apart later."] },
  day: { kevanna: ["another one. still here."], yaviel: ["Day logged. Water first, always."],
         zalir: ["Sun came up. Went down. We're here."],
         dahlia: ["The day went the way I saw it. That's getting harder to enjoy."],
         felana: ["is anyone else counting or is it just me"],
         angi: ["up before the light again."], burham: ["Counted the stores twice. Same answer."],
         cole: ["Read the day before it happened. Wish I hadn't."],
         vergil: ["Held the line. Nothing else to report."] },
  hurt: { kevanna: ["it's fine. it's FINE."], yaviel: ["Documenting this before it gets worse."],
          zalir: ["It'll hold."], dahlia: ["I saw this coming and let it anyway."],
          felana: ["ow. writing this with the other hand."],
          angi: ["doesn't stop me."], burham: ["Field-dressed it. Not well."],
          cole: ["Should have moved a half-second earlier."], vergil: ["It is being handled."] }
 };
 function autoSign(who, kind) {
  const pool = (AUTO[kind] || {})[who];
  if (!pool || !pool.length) return;
  const day = T(() => "Day " + (G("apocDay") | 0), "");
  const last = GB[GB.length - 1];
  if (last && last.who === who && last.auto === kind) return;   // no double-signing
  GB.push({ who: who, msg: pool[Math.floor(Math.random() * pool.length)],
            at: day, auto: kind });
  if (GB.length > 120) GB.shift();
  gbSave();
  T(() => { if ($("gbBody") && !$("screen-guestbook").classList.contains("hidden")) {
    $("gbBody").innerHTML = guestBookHtml(); bindSign(); } });
  T(() => { const n = $("lxBookCount"); if (n) n.textContent = GB.length + " ENTRIES"; });
 }
 window.__autoSign = autoSign;

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
   $("gbBody").querySelectorAll("[data-note]").forEach(b => {
    b.onclick = () => {
     const i = +b.dataset.note;
     const who = $("gbWho").value;
     const t = prompt("Margin note, as " + ((G("PLAYERS") || {})[who] || {}).name + ":");
     if (!t) return;
     GB[i].notes = GB[i].notes || [];
     GB[i].notes.push({ who: who, t: t });
     gbSave(); $("gbBody").innerHTML = guestBookHtml(); bindSign();
    };
   });
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
 /* WHAT A RUNG COSTS, rather than what the other person says.
    The first pass gave each rung a line of dialogue back. It read well and it
    did nothing -- there was no reason to look at it twice, because nothing was
    being asked of anybody. Replaced with the thing that actually warrants
    interaction: a CONDITION the table has to satisfy before the rung can be
    raised, written as something to do rather than something to feel, and a
    box to tick when it has been done.

    The ticks persist in their own key and the raise button stays disabled
    until the rung's condition is met, so the ladder stops being a number the
    GM nudges and becomes a thing the players earn on purpose. */
 /* ---- WAVE TYPES ---------------------------------------------------
    Not every bond is the same KIND of bond, and a ten-rung ladder that treats
    them all alike flattens the interesting part. Six types, each with its own
    waveform, its own reading, and its own ladder of things to actually do --
    what raises a Dissonant connection is not what raises a Damped one, and
    saying so is most of the value here.

    The type is DERIVED from the relation line the Ledger already carries plus
    the level, rather than being a new field the GM has to fill in. A relation
    that mentions discipline or opposition reads Dissonant; one that mentions
    carrying or covering reads Damped; and so on. It can be overridden and the
    override sticks, because a derivation is a good default and a bad ruling. */
 const WAVES = {
  resonant: { name: "RESONANT", col: "#c6ff3d",
    d: "M0,14 Q10,2 20,14 T40,14 T60,14 T80,14 T100,14 T120,14",
    read: "You amplify each other. What either of you does lands harder because the other one is there.",
    risk: "Amplification is not selective. It carries the bad nights too." },
  standing: { name: "STANDING", col: "#2fe0ff",
    d: "M0,14 Q15,-2 30,14 T60,14 Q75,-2 90,14 T120,14",
    read: "Fixed. Neither of you moves the other and neither of you needs to. It holds under load.",
    risk: "A standing wave does not go anywhere. Comfortable is not the same as close." },
  dissonant: { name: "DISSONANT", col: "#ff2f92",
    d: "M0,14 L8,4 L14,22 L22,6 L30,20 L38,3 L46,24 L54,8 L62,18 L70,5 L78,21 L88,10 L100,17 L112,7 L120,14",
    read: "You grate. It works anyway — the friction is doing something neither of you would manage alone.",
    risk: "Friction is load-bearing right up until it isn't. This one can snap rather than fade." },
  damped: { name: "DAMPED", col: "#b83fff",
    d: "M0,14 Q6,0 12,14 T24,14 Q29,4 34,14 T46,14 Q50,8 54,14 T64,14 Q67,11 70,14 T120,14",
    read: "One of you absorbs the other. The spikes get taken out before they reach anybody else.",
    risk: "Absorption has a cost and it is paid by whoever is doing it, quietly, every time." },
  carrier: { name: "CARRIER", col: "#ff9b1f",
    d: "M0,14 Q4,6 8,14 T16,14 T24,14 T32,14 T40,14 T48,14 T56,14 T64,14 T72,14 T80,14 T88,14 T96,14 T104,14 T112,14 T120,14",
    read: "One of you carries the other's signal. They get heard in rooms they are not in.",
    risk: "A carrier can be dropped. Being spoken for is not the same as being able to speak." },
  intermittent: { name: "INTERMITTENT", col: "#6b6478",
    d: "M0,14 H14 Q20,4 26,14 T38,14 H52 Q58,3 64,14 T76,14 H92 Q98,5 104,14 T116,14 H120",
    read: "It comes and goes. When it is there it is real; the gaps are real too.",
    risk: "Nobody is sure which state is the true one, including the two of you." }
 };
 const WAVE_ORDER = ["resonant","standing","dissonant","damped","carrier","intermittent"];

 /* Per-type ladders. What a Dissonant connection has to do to climb is not
    what a Carrier one does, and that is the whole reason the types exist. */
 const WAVE_TASKS = {
  resonant: ["Do the same thing at the same time on purpose and let it land twice as hard.",
   "Take a risk you would not take alone, and say out loud that they are why.",
   "Let them finish something you started, and don't correct how they did it.",
   "Back their bad idea in front of people.",
   "Spend the thing you were saving on their problem instead of yours."],
  standing: ["Be where you said you'd be, twice running, with no comment about it.",
   "Hold a position with them for a whole scene without either of you moving.",
   "Say the boring true thing instead of the interesting one.",
   "Do the unglamorous half of their job without being asked or thanked.",
   "Refuse to escalate when they hand you a reason to."],
  dissonant: ["Lose an argument with them on purpose and mean it.",
   "Say the thing that will actually land badly, to their face, because it's true.",
   "Work with them on something neither of you wanted to do together.",
   "Admit they were right about the thing you've been carrying.",
   "Stay in the room after it goes wrong."],
  damped: ["Take the hit they were about to absorb for once.",
   "Notice out loud what it costs them, in front of them.",
   "Ask them what they're carrying, and don't offer to fix it.",
   "Let them be the one who needs something.",
   "Hand them a reason to stop absorbing."],
  carrier: ["Say their name in a room they aren't in, for their benefit.",
   "Correct someone who got them wrong.",
   "Give them the credit in public that you took in private.",
   "Put your standing behind their call when yours would've been safer.",
   "Step back and let them speak for themselves."],
  intermittent: ["Show up in a gap. Unannounced, no reason.",
   "Name the gaps out loud instead of pretending they aren't there.",
   "Make one promise small enough that you'll actually keep it, then keep it.",
   "Be the one who reaches first this time.",
   "Say what would make it steady, even if neither of you can do it yet."]
 };

 /* Derived, then overridable. The override lives with the tick data. */
 const WKEY = "opus_wave_types_v1";
 let WAVE_OVR = T(() => JSON.parse(localStorage.getItem(WKEY)) || {}, {}) || {};
 const wSave = () => T(() => localStorage.setItem(WKEY, JSON.stringify(WAVE_OVR)));
 function waveOf(c) {
  if (!c) return "standing";
  if (WAVE_OVR[c.id]) return WAVE_OVR[c.id];
  const r = String(c.relation || "").toLowerCase();
  if (/disciplin|opposit|argu|rival|doesn't have|friction|against/.test(r)) return "dissonant";
  if (/carr|speak|vouch|name|represent|advoc/.test(r)) return "carrier";
  if (/cover|shield|absorb|protect|takes|tether/.test(r)) return "damped";
  if (/comes and goes|sometimes|when she|when he|on and off|unreliable/.test(r)) return "intermittent";
  if ((c.level | 0) >= 7) return "resonant";
  return "standing";
 }

 const RUNG_TASKS = [
  { need: "Say their name out loud in a scene. Not to them — about them, to someone else.",
    opens: "You can ask them one factual thing about themselves and they'll answer it straight." },
  { need: "Stand next to them in a fight without being asked to, and let it cost you something.",
    opens: "They'll hold a position with you rather than near you." },
  { need: "Tell them one thing you're bad at. Out loud, in front of them, unprompted.",
    opens: "They'll tell you one thing they're bad at, and it will be true." },
  { need: "Spend a real resource on them — an action, a ration, a dose — when you had a better use for it.",
    opens: "They cover your back specifically, not just the group's." },
  { need: "Ask them the question they've been avoiding, and sit through the whole answer.",
    opens: "You can ask them for something costly and they'll consider it seriously." },
  { need: "Break a small rule for them, on purpose, where someone can see you do it.",
    opens: "They break a small one back, and don't mention it." },
  { need: "Finish a job they started without telling them you did it.",
    opens: "They take a hit meant for you without deciding to first." },
  { need: "Disagree with them in front of the group and hold the line.",
    opens: "They tell you when you're wrong, in front of people, and you listen." },
  { need: "Put yourself between them and the thing that was going to land.",
    opens: "They break a big rule for you. Once. Without being asked." },
  { need: "Nothing. There is nothing left to prove and asking for proof would be the insult.",
    opens: "The top of the ladder. It doesn't open anything — it IS the thing." }
 ];
 const TKEY = "opus_rung_tasks_v1";
 let TASKS = T(() => JSON.parse(localStorage.getItem(TKEY)) || {}, {}) || {};
 const tSave = () => T(() => localStorage.setItem(TKEY, JSON.stringify(TASKS)));
 const tKey = (cid, i) => cid + "#" + i;

 T(() => {
  const orig = window.renderWLDetailContent;
  if (typeof orig !== "function") return;
  window.renderWLDetailContent = function (conn) {
   const r = orig.apply(this, arguments);
   /* The connection's id comes from the argument the Ledger already passes in,
      not from a global. activeWLPerson would also work, but the argument is
      the thing being rendered right now and cannot be stale. Keying on it is
      what stops rung 1 of every connection sharing one tick -- which is what
      the first version did, because it fell back to "" and every key came out
      as "#0". */
   const cid = (conn && conn.id) || "";
   /* The wave header, above the ladder: the type, its waveform drawn as a
      real path rather than described, what it means and what it costs. */
   T(() => {
    const head = $("wlDetailHeader");
    if (!head || head.querySelector(".lx-wave")) return;
    const wk = waveOf(conn), W = WAVES[wk];
    const box = document.createElement("div");
    box.className = "lx-wave";
    box.style.setProperty("--wc", W.col);
    box.innerHTML =
     '<div class="lx-wave-top">' +
      '<svg class="lx-wave-svg" viewBox="0 0 120 28" preserveAspectRatio="none">' +
       '<path d="' + W.d + '"/></svg>' +
      '<span class="lx-wave-nm">' + W.name + ' WAVE</span>' +
      '<select class="lx-wave-sel" id="lxWaveSel">' +
       WAVE_ORDER.map(k => '<option value="' + k + '"' + (k === wk ? " selected" : "") + '>' +
         WAVES[k].name + '</option>').join("") + '</select>' +
     '</div>' +
     '<div class="lx-wave-read">' + esc(W.read) + '</div>' +
     '<div class="lx-wave-risk"><b>COSTS</b> ' + esc(W.risk) + '</div>';
    head.appendChild(box);
    T(() => { box.querySelector("#lxWaveSel").onchange = (e) => {
      WAVE_OVR[cid] = e.target.value; wSave();
      T(() => showToast("Re-read as " + WAVES[e.target.value].name + ".")); 
      T(() => renderWLDetailContent(conn));
    }; });
   });
   const wkey = waveOf(conn);
   const wtasks = WAVE_TASKS[wkey] || [];
   T(() => {
    const ladder = $("wlLadder");
    if (!ladder) return;
    const rows = ladder.querySelectorAll(".wl-rung, .rung, li");
    rows.forEach((row, i) => {
     if (row.querySelector(".lx-hooks")) return;
     const pr = RUNG_TASKS[i]; if (!pr) return;
     const k = tKey(cid, i);
     const done = !!TASKS[k];
     const box = document.createElement("div");
     box.className = "lx-hooks";
     box.innerHTML =
      '<label class="lx-task' + (done ? " done" : "") + '">' +
       '<input type="checkbox" ' + (done ? "checked" : "") + ' data-task="' + esc(k) + '">' +
       '<span class="who">TO EARN THIS RUNG</span>' +
       '<span class="tx">' + esc(wtasks[i % wtasks.length] || pr.need) + '</span>' +
      '</label>' +
      '<div class="lx-hook c"><span class="who">AND THEN THIS IS TRUE</span>' + esc(pr.opens) + '</div>';
     T(() => {
      const cb = box.querySelector("input");
      cb.onchange = () => {
       TASKS[cb.dataset.task] = cb.checked; tSave();
       box.querySelector(".lx-task").classList.toggle("done", cb.checked);
       T(() => showToast(cb.checked ? "Marked earned." : "Un-marked."));
      };
     });
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
 /* THE APOCALYPSE, WITHOUT THE CUSHION.
    The first pass read the numbers and said things like "nothing wrong with
    them today, note the date". That is a nice line and it is a lie: a body at
    45% hydration on day two is not fine, it is on a clock, and a tracker that
    says otherwise is doing the players a disservice at the exact moment the
    information matters.

    So every band now names the DAMAGE, the CLOCK and what is permanent. The
    three-day water clock and the eight-day food clock are the real ones and
    they are stated as counts remaining rather than as adjectives. Nothing here
    congratulates anybody for being at 90%. */
 function apocReadout(st) {
  const out = [];
  const h = st.hunger | 0, w = st.hydration | 0;
  const dW = st.daysWithoutWater | 0, dF = st.daysWithoutFood | 0;

  // water — the clock that actually kills, stated as days left
  const wLeft = Math.max(0, 3 - dW);
  if (dW >= 3) out.push(["bad", 12, "RENAL FAILURE — organs are shutting down. Without water today this is the last day."]);
  else if (dW >= 2) out.push(["bad", 12, "DAY " + dW + " DRY · " + wLeft + " DAY LEFT — confusion, no sweat, no urine. Permanent kidney damage from here."]);
  else if (dW >= 1) out.push(["warn", 12, "DAY " + dW + " DRY · " + wLeft + " DAYS LEFT — cracked lips, thick blood, −2 to everything physical."]);
  if (w < 20) out.push(["bad", 30, "SEVERELY DEHYDRATED (" + w + "%) — −4 all physical, −2 PREC, blackouts on exertion."]);
  else if (w < 40) out.push(["bad", 30, "DEHYDRATED (" + w + "%) — −2 physical, −1 PREC. Headache that doesn't lift."]);
  else if (w < 65) out.push(["warn", 30, "UNDER-WATERED (" + w + "%) — −1 PREC. Reaction time is already slower and they don't feel it."]);
  else out.push(["ok", 30, "Water " + w + "% — no penalty yet. This is the number that moves fastest."]);

  // food — slower, more permanent
  if (dF >= 8) out.push(["bad", 1, "STARVATION — the body is eating muscle and heart tissue. Losses here do not come back."]);
  else if (dF >= 4) out.push(["bad", 1, "DAY " + dF + " UNFED — ketosis, tremor, −3 PWR. Recovery now takes weeks of eating, not one meal."]);
  else if (dF >= 2) out.push(["warn", 1, "DAY " + dF + " UNFED — −1 PWR, poor decisions, fixates on food in any room."]);
  if (h < 20) out.push(["bad", 20, "EMACIATED (" + h + "%) — −4 PWR, cannot carry, cannot sprint, cold all the time."]);
  else if (h < 45) out.push(["bad", 20, "HUNGRY (" + h + "%) — −2 PWR, hands shake on fine work."]);
  else if (h < 70) out.push(["warn", 20, "UNDERFED (" + h + "%) — −1 PWR. Fine until they need to be strong."]);

  // afflictions, stated at their real severity
  (st.afflictions || []).forEach(a => {
   const sev = String(a.severity || "").toLowerCase();
   const cls = /critical|severe/.test(sev) ? "bad" : /serious|moderate/.test(sev) ? "bad" : "warn";
   const tail = /critical|severe/.test(sev) ? " — untreated, this is what kills them, not the thirst."
              : /serious/.test(sev) ? " — will not improve on its own out here."
              : " — manageable, and getting worse every week it isn't managed.";
   out.push([cls, 26, (a.name || "Condition") + " [" + (sev || "unrated").toUpperCase() + "]" + tail]);
  });

  /* The verdict. One blunt line at the top, because a stack of chips does not
     tell a GM whether this person is dying and that is the only question. */
  const dying = dW >= 2 || dF >= 8 || w < 20 || h < 20 ||
    (st.afflictions || []).some(a => /critical|severe/.test(String(a.severity || "").toLowerCase()));
  const hurting = dW >= 1 || dF >= 2 || w < 45 || h < 45 ||
    (st.afflictions || []).some(a => /serious/.test(String(a.severity || "").toLowerCase()));
  out.unshift(dying ? ["bad", 25, "DYING — on a clock measured in days. Intervene or lose them."]
            : hurting ? ["warn", 25, "DEGRADING — still working, already worse than yesterday."]
            : ["ok", 25, "HOLDING — no active clock. That is the best this world offers."]);
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
     box.innerHTML = apocReadout(AC[key]).map(([cls, icon, t]) =>
       '<span class="lx-chip ' + cls + '">' + icoEl("hex", icon, 13,
         "vertical-align:-2px;margin-right:5px;") + esc(t) + '</span>').join("");
     card.appendChild(box);
    });
   });
   return r;
  };
 });

 /* DECALS ON THE DEPOT, NEON OVER THE YARD.
    Both sheets keep their own colour, and both are placed as furniture rather
    than as data -- a warning sticker on the supply wall and a sign over the
    games. They are absolutely positioned and pointer-events:none, so nothing
    they sit near can be blocked by them.

    Chosen by index rather than at random: FREE OF BIOHAZARD and DO NOT TAMPER
    belong on a supply cache, HIGH PRESSURE does not belong on a leaderboard. */
 function decal(n, css) {
  const cols = 6, rows = 5;
  const c = n % cols, r = Math.floor(n / cols) % rows;
  return '<i class="lx-decal" style="background-position:' +
    (c * 100 / (cols - 1)) + '% ' + (r * 100 / (rows - 1)) + '%;' + css + '"></i>';
 }
 function neon(n, css) {
  const cols = 6, rows = 2;
  const c = n % cols, r = Math.floor(n / cols) % rows;
  return '<i class="lx-neon" style="background-position:' +
    (c * 100 / (cols - 1)) + '% ' + (r * 100 / (rows - 1)) + '%;' + css + '"></i>';
 }
 function dressApoc() {
  T(() => {
   const scr = $("screen-apoc"); if (!scr || scr.querySelector(".lx-decal")) return;
   scr.style.position = scr.style.position || "relative";
   const host = document.createElement("div");
   host.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0";
   host.innerHTML =
     decal(7,  "width:96px;height:96px;left:14px;top:120px;transform:rotate(-4deg);opacity:.5") +
     decal(10, "width:78px;height:78px;right:20px;top:210px;transform:rotate(3deg);opacity:.42") +
     decal(19, "width:120px;height:56px;left:26px;bottom:70px;transform:rotate(-2deg);opacity:.38") +
     decal(2,  "width:74px;height:74px;right:34px;bottom:120px;transform:rotate(5deg);opacity:.34");
   scr.insertBefore(host, scr.firstChild);
  });
 }
 function dressYard() {
  T(() => {
   const scr = $("screen-games"); if (!scr || scr.querySelector(".lx-neon")) return;
   scr.style.position = scr.style.position || "relative";
   const host = document.createElement("div");
   host.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0";
   host.innerHTML =
     neon(1,  "width:150px;height:150px;right:26px;top:96px;opacity:.30") +
     neon(6,  "width:118px;height:118px;left:18px;bottom:110px;opacity:.24") +
     neon(9,  "width:132px;height:132px;right:120px;bottom:64px;opacity:.20");
   scr.insertBefore(host, scr.firstChild);
  });
 }

 /* ================================================================
    THE WALL — graffiti, stickers, and what people think of them
    ================================================================
    Twenty-four hand tags and twenty street stickers scattered through every
    screen so the Ledger reads as a thing that has been LIVED IN rather than
    deployed. They sit in the outer margins at low opacity, rotated a few
    degrees, behind everything and unclickable.

    The part that matters is the marginalia. A tag on its own is texture; a tag
    with somebody's opinion pencilled next to it is the yard talking. Every
    piece is attributed to whoever put it there and most carry a note from
    somebody else about it, written in that person's own ink from the guest
    book's HANDS table -- so the handwriting in the margin matches the
    handwriting in the book, and Yaviel correcting Kevanna looks the same
    wherever she does it.

    PLACEMENT IS SEEDED, NOT RANDOM. Each screen hashes its own id into the
    generator, so the wall is different on every screen and identical every
    time you come back to that screen. Graffiti that moves when you look away
    is not graffiti, it is a screensaver -- the same rule the circuit bed and
    the guest book's wobble already follow. */
 const WALL = [
  { t: 0,  by: "kevanna", note: { who: "yaviel",  t: "She spelled it wrong. Twice." } },
  { t: 3,  by: "felana",  note: { who: "burham",  t: "That's not a face. That's what she thinks a face is." } },
  { t: 6,  by: "angi",    note: { who: "kevanna", t: "i was gonna put mine there" } },
  { t: 9,  by: "dahlia",  note: { who: "cole",    t: "She wrote this before it happened. I checked the date." } },
  { t: 12, by: "zalir",   note: null },
  { t: 14, by: "yaviel",  note: { who: "felana",  t: "even her tag is neat. how." } },
  { t: 17, by: "kevanna", note: { who: "zalir",   t: "Fine." } },
  { t: 19, by: "burham",  note: { who: "angi",    t: "he measured the wall first. i watched him do it" } },
  { t: 21, by: "felana",  note: { who: "vergil",  t: "This was here when I arrived. It is still here." } },
  { t: 2,  by: "dahlia",  note: { who: "yaviel",  t: "Painted over something. I'd like to know what." } },
  { t: 5,  by: "angi",    note: null },
  { t: 8,  by: "cole",    note: { who: "kevanna", t: "cole did a tag. COLE did a TAG" } },
  { t: 11, by: "kevanna", note: { who: "burham",  t: "Third one this week. She's running out of wall." } },
  { t: 15, by: "felana",  note: null },
  { t: 18, by: "zalir",   note: { who: "dahlia",  t: "He only signs things he means." } },
  { t: 22, by: "vergil",  note: { who: "cole",    t: "He wrote his own name and then looked embarrassed." } },
  { t: 4,  by: "yaviel",  note: null },
  { t: 10, by: "burham",  note: { who: "felana",  t: "what does it MEAN burham" } },
  { t: 13, by: "angi",    note: { who: "yaviel",  t: "Fast, and it shows. That isn't a criticism." } },
  { t: 20, by: "dahlia",  note: null }
 ];
 /* Stickers get their own commentary. They are found objects rather than
    somebody's hand, so the note is about the OBJECT -- who stuck it there and
    why it is funny that it is there. */
 const STICK = [
  { s: 1,  note: { who: "kevanna", t: "peeled it off a rig. it's mine now" } },
  { s: 4,  note: { who: "burham",  t: "Whatever it was warning about already happened." } },
  { s: 7,  note: { who: "felana",  t: "i like this one. no reason." } },
  { s: 10, note: { who: "yaviel",  t: "It's upside down. Nobody will move it." } },
  { s: 13, note: { who: "angi",    t: "zalir put this up. he's TALL" } },
  { s: 16, note: null },
  { s: 3,  note: { who: "dahlia",  t: "This one comes off in eight days. Don't ask." } },
  { s: 19, note: { who: "vergil",  t: "Someone's idea of a joke. It is not a good one." } }
 ];

 function rng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
 }

 function wallPiece(kind, idx, x, y, size, rot, note, byName) {
  const cols = 6, rows = kind === "tag" ? 4 : 4;
  const c = idx % cols, r = Math.floor(idx / cols) % rows;
  const v = kind === "tag" ? "--tags" : "--stickers";
  const bx = (c * 100 / (cols - 1)), by2 = (r * 100 / (rows - 1));
  let h = '<div class="lx-wall-piece" style="left:' + x + '%;top:' + y + '%;' +
    'transform:rotate(' + rot.toFixed(1) + 'deg)">' +
    '<i class="lx-wall-art" style="width:' + size + 'px;height:' + Math.round(size * .55) + 'px;' +
      'background-image:var(' + v + ');background-size:600% 400%;' +
      'background-position:' + bx + '% ' + by2 + '%"></i>';
  if (note) {
   /* WHO IS SPEAKING, not who painted it. The label first read as the tag's
      author, which put Kevanna's name over a sentence Burham wrote about her
      -- exactly backwards. It names the commenter, and the tag's author only
      when there is one to name. */
   const hh = HANDS[note.who] || HANDS.gm;
   const P2 = G("PLAYERS") || {};
   const speaker = (P2[note.who] || {}).name || note.who;
   const about = byName ? " on " + byName + "'s" : "";
   h += '<div class="lx-wall-note" style="color:' + hh.ink + ';font-family:' + hh.font + '">' +
     '<span class="w">' + esc(speaker + about) + '</span>' + esc(note.t) + '</div>';
  }
  return h + '</div>';
 }

 /* Painted onto a screen once. The margins only: a band down each side and a
    strip along the bottom, so nothing lands on top of the thing the screen is
    actually for. */
 function paintWall(scr) {
  if (!scr || scr.querySelector(".lx-wall")) return;
  const P = G("PLAYERS") || {};
  const R = rng(scr.id || "wall");
  const layer = document.createElement("div");
  layer.className = "lx-wall";
  const zones = [
   { x: [1, 12],  y: [12, 88] },     // left margin
   { x: [86, 96], y: [12, 88] },     // right margin
   { x: [14, 82], y: [88, 96] }      // bottom strip
  ];
  /* Drawn WITHOUT replacement. Picking each piece independently let the same
     tag and the same pencil note land twice on one screen, which reads as a
     rendering fault rather than as a wall -- nobody writes the identical
     sentence in two margins. A seeded shuffle, then take from the front. */
  const shuffle = (arr) => {
   const a2 = arr.slice();
   for (let i = a2.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    const t2 = a2[i]; a2[i] = a2[j]; a2[j] = t2;
   }
   return a2;
  };
  const tagBag = shuffle(WALL), stBag = shuffle(STICK);
  let html = "";
  const nTags = Math.min(tagBag.length, 4 + Math.floor(R() * 3));
  for (let i = 0; i < nTags; i++) {
   const w = tagBag[i];
   const z = zones[Math.floor(R() * zones.length)];
   html += wallPiece("tag", w.t,
     z.x[0] + R() * (z.x[1] - z.x[0]), z.y[0] + R() * (z.y[1] - z.y[0]),
     70 + R() * 70, -14 + R() * 28, w.note, (P[w.by] || {}).name || w.by);
  }
  const nSt = Math.min(stBag.length, 1 + Math.floor(R() * 3));
  for (let i = 0; i < nSt; i++) {
   const st = stBag[i];
   const z = zones[Math.floor(R() * zones.length)];
   html += wallPiece("sticker", st.s,
     z.x[0] + R() * (z.x[1] - z.x[0]), z.y[0] + R() * (z.y[1] - z.y[0]),
     60 + R() * 50, -9 + R() * 18, st.note, null);
  }
  layer.innerHTML = html;
  scr.style.position = scr.style.position || "relative";
  scr.insertBefore(layer, scr.firstChild);
 }

 /* Every screen, including the ones this block added, and again whenever a
    screen is shown for the first time. The login terminal is skipped: it is a
    machine that has not been lived in, and that contrast is the point. */
 function paintAllWalls() {
  T(() => {
   document.querySelectorAll(".screen").forEach(scr => {
    if (scr.id === "screen-login") return;
    paintWall(scr);
   });
  });
 }
 T(() => {
  const orig = window.showScreen;
  if (typeof orig !== "function") return;
  window.showScreen = function () { const r = orig.apply(this, arguments); T(paintAllWalls); return r; };
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
  const oc = window.renderGameCatalog;
  if (typeof oc === "function") {
   window.renderGameCatalog = function () { const r = oc.apply(this, arguments); T(decorateCatalog); return r; };
  }
  const orig = window.openGames;
  if (typeof orig === "function") {
   window.openGames = function () { const r = orig.apply(this, arguments);
     T(mountCpuBar); T(decorateCatalog); T(armDuels); return r; };
  }
 });

 /* The hooks that make it live. Each wraps a function the Ledger already
    calls, so the book fills as a side effect of play rather than needing
    anybody to remember to write in it. */
 T(() => {
  const orig = window.advanceApocDay;
  if (typeof orig !== "function") return;
  window.advanceApocDay = function () {
   const before = T(() => JSON.parse(JSON.stringify(G("APOC_CHARACTERS") || {})), {});
   const r = orig.apply(this, arguments);
   T(() => {
    const AC = G("APOC_CHARACTERS") || {};
    const roster = Object.keys(AC);
    // one voice for the day
    const speaker = roster[Math.floor(Math.random() * roster.length)];
    autoSign(speaker, "day");
    // and anyone whose clock turned over signs about it
    /* Only a CROSSING signs, not every tick. Everyone's dry-day counter goes up
       every single day, so signing on any increase filled the book with seven
       identical entries a day and buried the ones that meant something. A
       crossing is day 1 (it starts), day 3 (it turns lethal), or a new
       affliction appearing -- three moments a session, not twenty-one. */
    roster.forEach(k => {
     const b = before[k], a = AC[k]; if (!b || !a) return;
     const dw = a.daysWithoutWater | 0, pw = b.daysWithoutWater | 0;
     const crossed = (pw < 1 && dw >= 1) || (pw < 3 && dw >= 3);
     const newAff = (a.afflictions || []).length > (b.afflictions || []).length;
     if (crossed || newAff) autoSign(k, "hurt");
    });
   });
   return r;
  };
 });

 /* The terminal skin over the login screen, and the yard's furniture. Mounted
    at the end so every function they call already exists. */
 T(mountTerminal);
 T(paintAllWalls);
 T(dressApoc);
 T(dressYard);

 window.ledgerExt = { cpuPlay: cpuPlay, cpuRound: cpuRound, roster: cpuRoster, guestBook: () => GB,
                      redrawTree: drawTree, terminal: mountTerminal };
})();
/* ================= END LEDGER EXTENSION ========================= */
