# Lites

Animations for **Dahlia**, built from drawn pose sheets: a slicer that finds the
poses and cleans them up, an assembler that times them into a loop, and a
browser player for previewing the result.

| animation | source | result |
| --- | --- | --- |
| **block** | `assets/dahlia_block_sheet.png`, 12 drawings | `out/dahlia_block/` — 70 frames, 3.5 s |
| **dagger twirl idle** | `assets/twirl_sheet.png`, 12 drawings | `out/dahlia_twirl/` — 150 frames, 7.5 s |

Each output directory holds `NAME.gif`, `NAME.webp`, `NAME_strip.png` (a sprite
strip for engine use) and `NAME.json` describing it.

```sh
pip install pillow numpy
python3 -m http.server 8000
# http://localhost:8000/web/index.html?m=../out/dahlia_block/dahlia_block.json
```

## The block

```sh
python3 tools/slice_sheet.py assets/dahlia_block_sheet.png -o out/dahlia_block \
  --panels --tol 28 --glow-tol 35 --glow-depth 3 --despeckle 24 --denoise 5 \
  --single dahlia_block --align silhouette
python3 tools/assemble.py out/dahlia_block/frames -o out/dahlia_block -n dahlia_block \
  --poses 1,12,2,3,4,6,5,3,11,12 --holds 16,12,2,2,5,8,3,2,6,14 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 --shake 4:5,6:3
```

A block is reactive, so the timing is the opposite shape to an idle: almost
nothing, then everything at once, then a long recovery.

| | pose | time | |
| --- | --- | --- | --- |
| ready | 1 | 0.80 s | guard stance, knife at hip |
| | 12 | 0.60 s | weight shifts |
| **snap** | 2 | 0.10 s | palm up, eyes wide — she sees it coming |
| | 3 | 0.10 s | guard crossing |
| **impact** | 4 | 0.25 s | arms crossed, flash, jolt of 5 px |
| **strain** | 6 | 0.40 s | aura at full, jolt of 3 px |
| | 5 | 0.15 s | pressure easing |
| | 3 | 0.10 s | guard lowering |
| recovery | 11 | 0.30 s | settles, exhales |
| | 12 | 0.70 s | back to ready, smiling |

Four tenths of a second covers everything from seeing the hit to absorbing it;
the rest is stance. Pose 3 does double duty as the guard going up and coming
back down, and the sequence ends on a different ready pose than it starts on, so
the loop never lands twice on the same drawing.

**Only eight of the twelve drawings are usable.** In poses 7, 8 and 9 her hands
are open and empty — the knife is gone, then back in her hand in pose 10. Those
are the drawn recovery, and playing them would make the weapon vanish and
reappear mid-animation, so recovery runs back through 5 and 3 instead.

**`--shake` is new, and it is what makes the block land.** There is no drawing of
Dahlia recoiling, so the impact has to come from somewhere: on the impact poses
the whole sprite is jolted, hard on the first frame and decaying over the run,
so the hit strikes and settles rather than vibrating for as long as the pose
holds. Rigid translation, so nothing smears.

## The dagger twirl idle

```sh
python3 tools/slice_sheet.py assets/twirl_sheet.png -o out/dahlia_twirl \
  --tol 28 --glow-tol 62 --glow-depth 3 --despeckle 24 --denoise 5 \
  --single dahlia_twirl --align silhouette
python3 tools/assemble.py out/dahlia_twirl/frames -o out/dahlia_twirl -n dahlia_twirl \
  --poses 3,4,3,4,5,6,7,6,5,4 --holds 28,24,32,16,2,2,28,4,4,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 3 --breathe-levels 12 --sway 2
```

Same story on that sheet: the dagger is in her hand in poses 3–7 only, so the
idle is built from those five. It opens with five seconds of standing still —
poses 3 and 4 alternating, which differ by 5 % below the waist and mostly in the
hair, so it reads as weight settling rather than an arm move — before the swing
passes in two frames and lands on the smile, held 1.4 s. That smile is the only
moment in the loop her expression changes.

## No in-betweens are generated

An earlier version built in-betweens with optical flow, warping each drawing
toward the next along a motion field. On art like this it looks like melting
wax, and no tuning fixes it: these poses are independent illustrations whose
hair, folds and outlines are redrawn every time, so a flow field has no
correspondence to follow and slides hair across a face. That approach is gone.
What is left is what traditional animation does anyway, and all of it is
lossless — every pixel shipped is a pixel that was drawn.

- **Selection.** Only poses holding the same prop belong in one animation.
- **Holds.** `--holds` sets how long each pose stays on screen, and it carries
  the performance. Fast through the action and long on the extremes is what
  makes a handful of poses read as movement rather than as a metronome.
- **Breathing.** `--breathe` stretches the sprite by a percent or so of its
  height, planted at the feet. Chest expansion is the one part of breathing a
  single drawing can fake, and at this size it moves her head three or four
  pixels while the boots stay put. Scales are quantised to twelve levels and
  cached, so a pose held for over a second resamples to pixel-identical images
  at each level instead of shimmering as the scale creeps.
- **Float.** `--sway` drifts the sprite sideways once per loop. Vertical drift
  is left to the breathing: `--bob` as well would put two vertical rhythms of
  different periods on the same body, which reads as nervous rather than calm.
- **Shake.** `--shake` supplies the impact a still drawing cannot.

### What would make it genuinely fluid

Timing carries this a long way, but five or eight drawings is still five or
eight drawings. Fluidity is a property of the source: it needs the poses to be
phases of one continuous action, prop in hand throughout, with hair length, hood
and proportions consistent between them. Given that, these same commands produce
a genuinely smooth loop with no other changes.

## Keeping it clean

Five separate things put grain, haze or holes on these animations, and each is
fixed where it is created rather than filtered out afterwards:

- **Panel borders.** The block sheet boxes every pose in a black frame. The
  frame is ink, so the segmenter read the whole grid as one connected drawing
  and found no gaps to split on — and the corner-sampled background colour came
  back black, so nothing keyed at all. `--panels` finds the border lines, widens
  them to swallow their antialiased edges (one pixel left standing walls the
  background flood out of a cell), measures the background with those rows and
  columns excluded, and paints the grid out in it.
- **The painted aura.** The twirl sheet paints a soft warm glow around the
  character. It is real ink, so the keying tolerance kept it, and it read as a
  blurred halo tracing the whole silhouette. `--glow-tol` floods inward from the
  sheet edge a second time at a looser tolerance, eating haze that shades off
  into the background while line work and hair stop it.
- **How deep that flood may reach.** Tolerance alone is not enough. Left
  unbounded it does not stop at the halo: it pours through the gold swing trail,
  hollows it out into an outline, and keeps going into the hand holding the
  dagger — which is what made the idle look like the blade was being clipped.
  `--glow-depth 3` confines it to a band a few pixels wide around the existing
  silhouette, so a halo is trimmed and anything with real body to it survives.
  The trail keeps 95 % of its pixels instead of 92 %, and it keeps its middle.
- **Compression grain.** These sheets arrive as JPEGs, so every flat surface
  carries mottling that no amount of careful keying removes — it is in the
  paint. `--denoise 5` medians it away and blends the result back by local
  gradient, so flat areas take the filtered version and edges keep every
  original pixel. The gradient is measured on a blurred copy, because ringing
  around a line is itself a gradient and would otherwise protect the very noise
  being removed. Flat-area variation drops from 9.9 to 3.9 of 255 with the line
  work intact.
- **Specks.** Keying left hundreds of stray islands of a dozen pixels each.
  `--despeckle` drops any island too small to be drawn detail.
- **Resampling ringing.** Lanczos undershoots around a hard silhouette and
  leaves a dusting of alpha-3-to-8 pixels in what was clean transparency. Alpha
  below 12 is cleared straight after the resize, and the resize runs in
  premultiplied form so transparent pixels are not blended into the edges.
  Whatever survives that is caught by a final speck pass over the finished
  frames — the poses are despeckled when sliced, but the breath resamples them
  afterwards and makes new specks of its own, so the guarantee has to be made
  last, on the images actually written out.
- **GIF encoding.** Handing RGBA to the encoder loses transparency altogether
  and puts the character on a black card; dithering stipples every flat surface;
  and a palette rebuilt per frame makes those surfaces crawl between frames. One
  shared palette per loop, no dithering, one index reserved for transparency.

Frames are also cropped with a small margin rather than flush to the union of
the loop, so no pixel sits on the canvas edge where a renderer that scales or
offsets the sprite would shave it off.

Both animations are audited frame by frame — 150 and 70 frames, not samples:

| | twirl | block |
| --- | --- | --- |
| frames touching the canvas edge | 0 | 0 |
| islands under 24 px, i.e. grain | 0 | 0 |
| flat-area variation (of 255) | 3.9 | 4.1 |
| same, measured on the GIF | 3.9 | 4.2 |

The only detached shapes left in either loop are the drawn gold flame wisps,
52 px and larger.

## Slicing a sheet

`tools/slice_sheet.py` does not assume a uniform grid — these sheets have uneven
spacing and rows with different frame counts — so it keys out the flat
background and segments the leftover ink: horizontal gaps split rows, vertical
gaps split frames within a row. Cutting the background out needs more than a
colour test, since mid-grey shading on the face and hoodie falls within
tolerance of the grey backdrop and keying by colour alone punches holes straight
through the character; only background that connects to the sheet edge is really
background, so the alpha comes from a flood fill inward from the edges.

| flag | why |
| --- | --- |
| `--panels` | the sheet boxes each pose in a drawn frame; paint the grid out first |
| `--single NAME` | treat every frame on the sheet as one sequence, in reading order |
| `--align silhouette` | fine-register frames to each other instead of anchoring on the feet |
| `--rows N` / `--cols N` | force a uniform grid instead of detecting one |
| `--tol N` | background colour tolerance; raise it on a noisy or JPEG-compressed sheet |
| `--glow-tol N` | strip soft painted haze, up to this distance from the background |
| `--glow-depth N` | how many pixels in from the silhouette `--glow-tol` may reach |
| `--denoise N` | clear JPEG grain from flat areas without softening line work |
| `--despeckle N` | drop opaque islands smaller than this many pixels |
| `--min-gap N` | smallest background gap that counts as a frame boundary |
| `--min-size N` | drop specks smaller than this |
| `--pad N` | transparent margin around each frame |
| `--names a,b,c` | name each row instead of `row1`, `row2`, … |
| `--opaque` | keep the sheet background instead of cutting it out |

GIF stores frame delays in hundredths of a second, so a rate that does not
divide into 10 ms gets rounded. 20 fps is exact; the WebP is exact at any rate.

`assets/spritesheet.png` is an earlier sheet of four separate animations, sliced
into `out/`: fight_stance (5 poses), knife_spin (6), low_slash (6),
guard_idle (6). `tools/make_test_sheet.py` generates a stand-in sheet for
exercising the slicer without real art.
