/* ==== BEGIN BLACKBOX INTERIOR — injected block, delete to the END marker to revert ==== */
/* A FIGHT INSIDE A TRAIN CARRIAGE SHOULD HAPPEN INSIDE THE TRAIN CARRIAGE.
 *
 * The battle map rules 12x8 over whatever backdrop is chosen and treats every
 * one of those 96 cells as standable. That is right for a desert and wrong for
 * anything with walls: on the carriage maps the car itself is six of the eight
 * rows, and the top and bottom rows are the platform on the other side of the
 * hull. Nothing stopped a unit spawning out there, walking out there, or being
 * left there by a knockback -- through the side of a moving train.
 *
 * So a map may now declare which cells are INSIDE, and three things are held
 * to it. Each is a separate door and all three had to be shut:
 *
 *   assignInitialMapPosition   spawning. It picks a random cell in a 4-wide
 *                              band at one edge and any of the 8 rows, so on
 *                              an interior map a quarter of arrivals started
 *                              outside the hull.
 *   moveUnitOnMap              deliberate movement, including the drag-and-
 *                              drop on the stage, which routes through here.
 *   knockbackUnit              being thrown. This one is not clamped quietly:
 *                              a unit driven into the wall of the car STOPS at
 *                              the wall and takes the file's own pin, which is
 *                              what its comment already says should happen at
 *                              the grid edge -- "a wall, especially relevant on
 *                              interior/corridor maps". The interior boundary
 *                              is that wall; it just did not exist yet.
 *
 * A map with no interior declared is untouched, so every existing map behaves
 * exactly as it did. The bounds live in data written by tools/bb_maps.py
 * (--interior), not in this file, because they belong to the artwork.
 *
 * THE TOKENS SHRINK, and it is not cosmetic. A token is 8.2% of the stage
 * width and a cell is 8.33%, so a token is very nearly a whole cell. That is
 * fine across twelve columns of desert and unreadable stacked into six rows of
 * carriage, where the whole party is in one corridor two cells wide. On a map
 * with an interior they go to 5.4%, about two thirds of a cell, so a cell's
 * occupant is still obvious and neighbours stop swallowing each other.
 *
 * The boundary is also DRAWN, faintly, because a rule the GM cannot see is a
 * rule they will argue with.
 */
(function () {
 "use strict";
 if (window.__bbInterior) return;
 window.__bbInterior = true;
 const T = (fn, d) => { try { return fn(); } catch (e) { return d; } };
 const G = (n) => T(() => (new Function("return typeof " + n + '!=="undefined"?' + n + ":null"))(), null);
 const $ = (id) => document.getElementById(id);
 const eng = () => T(() => G("S").eng, null);

 const GW = () => T(() => G("BATTLEMAP_GRID_W"), 12) || 12;
 const GH = () => T(() => G("BATTLEMAP_GRID_H"), 8) || 8;

 /* The interior of the map currently on the stage, or null if it has none. */
 function box() {
  const e = eng();
  const key = e && e.battleMap && e.battleMap.bg;
  const all = window.__BB_MAP_INTERIOR || {};
  const b = key && all[key];
  return (b && b.length === 4) ? { x0: b[0], y0: b[1], x1: b[2], y1: b[3] } : null;
 }
 function inside(b, x, y) { return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1; }
 const clampTo = (b, x, y) => ({
  x: Math.max(b.x0, Math.min(b.x1, x)),
  y: Math.max(b.y0, Math.min(b.y1, y))
 });

 /* The free cell nearest to where the unit was trying to be. Nearest by
    Chebyshev distance, which is the same metric gridDistance() uses, so
    "closest" here means the same thing it means everywhere else in the file. */
 function nearestFree(b, x, y, e, selfId) {
  const taken = new Set((e.units || [])
    .filter(u => u.id !== selfId && u.mapX != null && u.mapY != null)
    .map(u => u.mapX + "," + u.mapY));
  const c = clampTo(b, x, y);
  if (!taken.has(c.x + "," + c.y)) return c;
  const span = Math.max(b.x1 - b.x0, b.y1 - b.y0);
  for (let r = 1; r <= span; r++) {
   for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
     if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
     const nx = c.x + dx, ny = c.y + dy;
     if (!inside(b, nx, ny)) continue;
     if (!taken.has(nx + "," + ny)) return { x: nx, y: ny };
    }
   }
  }
  return c;                                  // packed solid; stack rather than escape
 }

 /* ---- 1. spawning ---- */
 T(() => {
  const orig = window.assignInitialMapPosition;
  if (typeof orig !== "function") return;
  window.assignInitialMapPosition = function (u, e) {
   const r = orig.apply(this, arguments);
   const b = box();
   if (!b || !u || u.mapX == null) return r;
   if (inside(b, u.mapX, u.mapY)) return r;
   /* Keep the side it chose -- the left band for the party, the right for
      hostiles -- and only pull it in through the hull. */
   const p = nearestFree(b, u.mapX, u.mapY, e || eng() || { units: [] }, u.id);
   u.mapX = p.x; u.mapY = p.y;
   return r;
  };
 });

 /* ---- 2. deliberate movement ---- */
 T(() => {
  const orig = window.moveUnitOnMap;
  if (typeof orig !== "function") return;
  window.moveUnitOnMap = function (u, tx, ty) {
   const b = box();
   if (!b || !u) return orig.apply(this, arguments);
   const want = { x: Math.round(tx), y: Math.round(ty) };
   if (inside(b, want.x, want.y)) return orig.apply(this, arguments);
   const c = clampTo(b, want.x, want.y);
   const res = orig.call(this, u, c.x, c.y);
   T(() => G("addLog")("system", "[INTERIOR] " + u.name + " stops at the wall — that cell is " +
     "outside the hull. Moved to the nearest tile inside instead."));
   if (res) res.clamped = true;
   return res;
  };
 });

 /* ---- 3. knockback, which is where the wall earns its keep ---- */
 T(() => {
  const orig = window.knockbackUnit;
  if (typeof orig !== "function") return;
  window.knockbackUnit = function (e, u, fx, fy, tiles) {
   const b = box();
   if (!b || !u) return orig.apply(this, arguments);
   const before = { x: u.mapX, y: u.mapY };
   const res = orig.apply(this, arguments) || {};
   if (u.mapX == null || inside(b, u.mapX, u.mapY)) return res;
   const c = clampTo(b, u.mapX, u.mapY);
   u.mapX = c.x; u.mapY = c.y;
   res.x = c.x; res.y = c.y;
   res.moved = Math.max(Math.abs(c.x - before.x), Math.abs(c.y - before.y));
   /* The file's own pin, for the file's own stated reason. */
   if (!u.pinned) { u.pinned = true; u.pinnedRounds = 2; }
   res.pinned = true;
   T(() => G("addLog")("system", "[INTERIOR — PINNED] " + u.name + " gets driven into the " +
     "wall of the compartment and stops there — pinned, can't move, can't dodge properly, 2 rounds."));
   return res;
  };
 });

 /* ---- the boundary, drawn, and the tokens sized for a corridor ---- */
 function paint() {
  const stage = document.querySelector(".bm-stage");
  if (!stage) return;
  const b = box();
  let ov = $("bbInteriorOv");
  document.body.classList.toggle("bb-interior-map", !!b);
  if (!b) { if (ov) ov.remove(); return; }
  if (!ov) {
   ov = document.createElement("div");
   ov.id = "bbInteriorOv";
   ov.className = "bbint-ov";
   stage.appendChild(ov);
  } else if (ov.parentNode !== stage) {
   stage.appendChild(ov);
  }
  const gw = GW(), gh = GH();
  ov.style.left = (b.x0 / gw * 100) + "%";
  ov.style.top = (b.y0 / gh * 100) + "%";
  ov.style.width = ((b.x1 - b.x0 + 1) / gw * 100) + "%";
  ov.style.height = ((b.y1 - b.y0 + 1) / gh * 100) + "%";
  ov.title = "Inside — units spawn, move and land only in here.";
 }
 T(() => {
  const orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function () { const r = orig.apply(this, arguments); T(paint); return r; };
 });
 T(() => { const s = $("bmBgSelect"); if (s) s.addEventListener("change", () => setTimeout(() => T(paint), 0)); });

 const css = document.createElement("style");
 css.textContent = `
 .bbint-ov{position:absolute;pointer-events:none;z-index:4;
  border:1px solid rgba(120,240,190,.34);
  box-shadow:0 0 0 9999px rgba(2,6,12,.34)}
 body.bb-interior-map .bm-token{width:5.4%;font-size:9px}
 body.bb-interior-map .bm-token .bm-token-name,
 body.bb-interior-map .bm-tokenlabel{font-size:8.5px}
 `;
 document.head.appendChild(css);
 T(paint);
 setTimeout(() => T(paint), 700);

 window.blackboxInterior = {
  box: box,
  /* Pull everybody in at once — for a map switched mid-fight, where units are
     already standing where the new map has no floor. */
  gather: () => {
   const e = eng(), b = box();
   if (!e || !b) { T(() => G("toast")("This map has no interior declared.")); return 0; }
   let n = 0;
   (e.units || []).forEach(u => {
    if (u.mapX == null || inside(b, u.mapX, u.mapY)) return;
    const p = nearestFree(b, u.mapX, u.mapY, e, u.id);
    u.mapX = p.x; u.mapY = p.y; n++;
   });
   if (n) { T(() => G("addLog")("system", "[INTERIOR] " + n + " unit(s) brought inside.")); T(() => G("save")()); T(() => G("render")()); }
   return n;
  },
  set: (key, x0, y0, x1, y1) => {
   window.__BB_MAP_INTERIOR = window.__BB_MAP_INTERIOR || {};
   window.__BB_MAP_INTERIOR[key] = [x0, y0, x1, y1];
   T(paint);
  }
 };
 T(() => {
  const n = Object.keys(window.__BB_MAP_INTERIOR || {}).length;
  if (n) G("addLog")("system", "[INTERIOR] " + n + " map(s) have a declared inside. On those, units " +
    "spawn, move and get thrown only within it — a knockback into the hull pins them against it — and " +
    "the tokens shrink so a six-row carriage stays readable.");
 });
})();
/* ================= END BLACKBOX INTERIOR ========================= */
