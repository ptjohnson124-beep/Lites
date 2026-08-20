# Lites

Animations for **Dahlia**, built from drawn pose sheets: a slicer that finds the
poses and cleans them up, an assembler that times them into a loop, and a
browser player for previewing the result.

| animation | source | result |
| --- | --- | --- |
| **attack** | `assets/dahlia_attack_sheet.png`, 20 drawings | `out/dahlia_attack/` — 57 frames, 2.85 s |
| **dodge** | `assets/dahlia_dodge_sheet.png`, 20 drawings | `out/dahlia_dodge/` — 49 frames, 2.45 s |
| **taunt** | `assets/dahlia_taunt_sheet.png`, 15 drawings | `out/dahlia_taunt/` — 59 frames, 2.95 s |
| **going insane** | `assets/dahlia_insane_b_sheet.png`, 16 drawings | `out/dahlia_insane/` — 68 frames, 3.4 s |
| **insanity transformation** | `assets/dahlia_insanity_sheet.png`, 16 drawings | `out/dahlia_insanity/` — 79 frames, 3.95 s |
| **cyberpsychosis** | `assets/dahlia_cyberpsychosis_sheet.png`, 16 drawings | `out/dahlia_cyberpsychosis/` — 93 frames, 4.65 s |
| **corrupted idle** | `assets/dahlia_insane_a_sheet.png`, 16 drawings | `out/dahlia_insane_idle/` — 47 frames, 2.35 s |
| **getting hit** | `assets/dahlia_hit_sheet.png`, 20 drawings | `out/dahlia_hit/` — 55 frames, 2.75 s |
| **block** | `assets/dahlia_block_sheet.png`, 12 drawings | `out/dahlia_block/` — 70 frames, 3.5 s |
| **dagger twirl idle** | `assets/twirl_sheet.png`, 12 drawings | `out/dahlia_twirl/` — 150 frames, 7.5 s |

Each output directory holds `NAME.gif`, `NAME.webp`, `NAME_strip.png` (a sprite
strip for engine use) and `NAME.json` describing it.

```sh
pip install pillow numpy
sh build.sh          # rebuild every animation from its sheet
python3 -m http.server 8000
# http://localhost:8000/web/index.html?m=../out/dahlia_block/dahlia_block.json
```

## The attack

```sh
python3 tools/slice_sheet.py assets/dahlia_attack_sheet.png -o out/dahlia_attack \
  --components --tol 18 --glow-tol 0 --fill-holes 3 --despeckle 24 --denoise 5 \
  --single dahlia_attack --align silhouette
python3 tools/assemble.py out/dahlia_attack/frames -o out/dahlia_attack -n dahlia_attack \
  --poses 1,3,6,7,8,9,10,11,13,15,16 --holds 12,8,3,2,2,6,3,3,3,5,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 9:4 --offset 7:16,8:24,9:26,10:24,11:16,13:8
```

| | pose | time | |
| --- | --- | --- | --- |
| ready | 1, 3 | 1.00 s | stance, weight shifts |
| **coil** | 6 | 0.15 s | arm back, about to go |
| **dash** | 7 | 0.10 s | the drawn motion blur, 16 px forward |
| | 8 | 0.10 s | blade out, 24 px forward |
| **strike** | 9 | 0.30 s | thrust at full extension, jolt of 4 px |
| | 10 | 0.15 s | follow through |
| recovery | 11, 13 | 0.30 s | pulling back |
| | 15, 16 | 0.75 s | settles, back to ready |

Half a second covers coil, dash and strike, with the sprite carried 32 px
forward across the lunge and walked back over the recovery.

Registration holds a character still on purpose, so a loop cannot drift — right
for an idle, wrong for an attack, and neither alignment mode recovers the ground
she covers, because the drawings disagree about where she is standing. So travel
is authored. Asking for a raw shift per pose (`--offset`) does not survive
contact with the drawings, though: each already sits at its own spot once
registered, so equal shifts produce an uneven path, and the dodge came out going
out, back, further out, and back again — a stumble rather than a dash.
`--travel` takes where she should be *standing* instead, measures each pose's
own footing from the desaturated pixels of its lower body — hair being the most
mobile thing on the character, it gets no vote on where her feet are — and
works out the shift from there. All three travelling animations use it.

## Cyberpsychosis

A different failure mode from the insanity sheets: digital rather than demonic.
Her eyes go red, an afterimage splits off her, red static crawls up her chest,
and she tears into two copies of herself before it peaks and lets her go. The
episode plays start to finish in 4.65 s:

| | pose | time | |
| --- | --- | --- | --- |
| normal | 1, 2 | 0.70 s | stance, gold aura |
| onset | 3 | 0.25 s | eyes go red, first artefacts |
| | 4 | 0.30 s | an afterimage splits off, small jolt |
| | 5 | 0.20 s | static in her chest |
| **the tear** | 6, 7, 6, 7 | 0.45 s | ripped into two, the two drawings flickered against each other |
| **peak** | 8 | 0.60 s | full aura, grinning, the loop's biggest jolt |
| | 9 | 0.15 s | one dark flash — the deepest point, gone as fast as it came |
| comedown | 12, 11, 10 | 0.70 s | red-eyed, steadying |
| | 13, 14 | 0.50 s | flushed, catching her breath |
| back | 15, 16 | 0.80 s | herself again |

The two tear drawings are the same trick as the taunt's flame: flickering
between them animates the glitch instead of holding a static rip. The dark
pose 9 gets a single 0.15 s flash — held any longer it reads as a costume
change; flashed, it reads as something underneath showing through.

The audit's flat-area noise reads high on this sheet (11.4 against 4–6
elsewhere) and that is correct behaviour: the red static *is* noise, drawn on
purpose, and the denoiser's edge threshold protects it the same way it protects
line work.

## The insanity transformation

The heaviest sheet: bloodied hoodie, the drawing itself glitching apart, and two
frames of full corruption wrapped in lightning. The clip is the descent — hand
to her head, the glitch escalating, a burst, shaking, a second burst, then she
comes down head-bowed and ends standing, bloodied and still sparking. 3.95 s,
with 8 px and 6 px jolts on the two bursts.

The sheet also draws a corrupted lunge (poses 6–8) — that is an attack she does
in this state, not part of the transformation, so it is left out of this clip
and available for an insane-attack animation later.

## Going insane

Two sheets arrived for this, and they are not two takes on one animation —
they are two different animations.

**`dahlia_insane`** is the transformation, and it has a whole arc drawn into it:
she is standing normally, she grabs her head, she fights it, the drawing itself
starts glitching, then one frame of full corruption with the lightning and the
red — and then she comes down, hunched and panting, until she is upright again.
3.4 s, and the peak holds for four tenths of a second under the biggest jolt in
the whole set, 10 px.

**`dahlia_insane_idle`** is what she is like once she is there. That sheet
draws the same stance over and over with the aura guttering between gold and
red and her eyes lit white, so the loop plays it as exactly that: an unstable
idle whose colour will not settle. Breathing runs faster here — three cycles to
the loop rather than two.

```sh
python3 tools/assemble.py out/dahlia_insane/frames -o out/dahlia_insane -n dahlia_insane \
  --poses 2,1,3,4,5,6,7,8,9,10,11,12,13,15,16 \
  --holds 8,3,6,3,3,2,8,3,4,4,3,5,4,4,8 \
  --fps 20 --breathe 1.5 --breathe-cycles 3 --breathe-levels 12 --sway 2 \
  --shake 3:5,5:3,7:10,8:5 --travel 6:10,7:2,8:-4
```

## The taunt

She snaps a flame alight in her palm, shows it off, and gives a smug little
gesture. Built from 13 of the 15 drawings.

| | pose | time | |
| --- | --- | --- | --- |
| ready | 14 | 0.50 s | standing, knife at her hip |
| wind up | 1, 2 | 0.30 s | hand comes up, fingers spread |
| **spark** | 3 | 0.10 s | ignition flash, 4 px pop |
| | 4 | 0.10 s | it catches |
| **the flame** | 6, 5, 6, 9, 6, 5 | 0.70 s | held up, flickering |
| | 9, 11 | 0.30 s | lowered, burning down |
| | 12 | 0.10 s | out |
| **the taunt** | 8, 7 | 0.45 s | hand to her chin, smug |
| | 13 | 0.40 s | back to ready |

**The flame is the reason this sheet is worth more than its 15 drawings.** Four
of them — 4, 5, 6 and 9 — are the same held flame at different heights and
shapes, which makes them frames of a fire rather than four separate poses.
Cycling them two frames at a time through the hold gives a flame that dances
for three quarters of a second, where holding any single drawing that long
would have given a candle painted on her hand. Her arm rides slightly with it,
because the drawings put the flame at slightly different heights, and that
reads as the weight of holding something alive.

The knife stays at her hip in all 15 drawings, so nothing had to be dropped for
prop continuity. Poses 7 and 8 have no flame in them, so they are played after
it burns out rather than during — the smug beat lands on an empty hand, which
is the better read anyway.

## The dodge

```sh
python3 tools/slice_sheet.py assets/dahlia_dodge_sheet.png -o out/dahlia_dodge \
  --components --tol 18 --glow-tol 0 --fill-holes 3 --despeckle 24 --denoise 5 \
  --single dahlia_dodge --align silhouette
python3 tools/assemble.py out/dahlia_dodge/frames -o out/dahlia_dodge -n dahlia_dodge \
  --poses 1,3,4,7,9,8,10,6,12,11 --holds 12,3,3,2,2,3,5,4,5,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 10:3 --travel 1:0,3:0,4:-6,7:-20,9:-30,8:-22,10:-12,6:-6,12:-2,11:0
```

The drawings turn out to describe a spin, not a sidestep, so that is what this
plays:

| | pose | time | ground | |
| --- | --- | --- | --- | --- |
| ready | 1 | 0.60 s | 0 | knife at her side |
| | 3 | 0.15 s | 0 | eyes close — she has read it |
| **push off** | 4 | 0.15 s | −6 | gold flares at her feet |
| **dash** | 7 | 0.10 s | −20 | drawn motion blur |
| **spin** | 9 | 0.10 s | −30 | back to the camera, furthest out |
| | 8 | 0.15 s | −22 | coming back around, knife up |
| **land** | 10 | 0.25 s | −12 | crouched, small jolt |
| recovery | 6, 12 | 0.45 s | −6 → −2 | rising, settling |
| | 11 | 0.50 s | 0 | back to ready |

Half a second from push-off to landing, of which the two blurred drawings hold
0.1 s each. Poses 9 and 8 are played in that order rather than the order they
sit on the sheet: 7 faces left, 9 has her back turned, 8 brings her round to
face the camera again, which is one continuous rotation instead of a spin that
skips and resets.

This is the first animation where the ground she covers is the whole point, and
it is also where `--offset` stopped being good enough — see below.

## Getting hit

```sh
python3 tools/slice_sheet.py assets/dahlia_hit_sheet.png -o out/dahlia_hit \
  --components --tol 18 --glow-tol 0 --fill-holes 3 --despeckle 24 --denoise 5 \
  --single dahlia_hit --align silhouette
python3 tools/assemble.py out/dahlia_hit/frames -o out/dahlia_hit -n dahlia_hit \
  --poses 19,3,4,5,6,7,8,9,10,13,16 --holds 14,2,2,3,4,2,4,5,5,6,8 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 3:9,4:5,5:3 --offset 5:-6,6:-10,7:-8,8:-5,9:-2
```

| | pose | time | |
| --- | --- | --- | --- |
| ready | 19 | 0.70 s | standing |
| **impact** | 3 | 0.10 s | gold burst, jolt of 9 px |
| | 4 | 0.10 s | snapped back, jolt of 5 px |
| **knocked back** | 5, 6 | 0.35 s | staggering, mouth open, 10 px back |
| | 7 | 0.10 s | the drawn motion blur, head down |
| recovery | 8, 9, 10 | 0.70 s | straightening up |
| | 13, 16 | 0.70 s | settles, back to standing |

A hit is the inverse of a block: no anticipation at all, because being hit is
not something you prepare for. It opens straight onto the impact frame, and the
jolt is the largest in any of these animations at 9 px, decaying through the
recoil. The knockback is `--offset` again, negative — she gives ground and
walks it back as she recovers.

**The knife is only in her hand on 6 of these 20 drawings**, and none of the
recoil poses is one of them. Building the reaction around the knife would mean
dropping the entire recoil, so this runs knife-free: the ready pose, the
stagger and the recovery are all drawings where her hands are open. The one
exception is the impact frame itself, which is the only drawing with the burst
on it. It is on screen for 0.1 s under a 9 px jolt and a screenful of gold,
which is exactly what an impact frame is for — but it is a compromise, and
`--poses 19,4,5,6,7,8,9,10,13,16` builds the version without it.

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

- **Poses that overlap.** Gap splitting fails as soon as two poses overlap once
  flattened onto an axis — on the attack sheet one pose's hair reaches into the
  next one's column and a whole row of four collapsed into a single frame.
  `--components` labels the ink and takes one frame per island, which is exact
  where a projection is only a guess, and folds detached scraps like the flame
  wisps into the nearest pose rather than making frames of them. Both 20-pose
  sheets segment exactly.
- **Blurred poses hollowed out.** Both action sheets draw one frame with heavy
  motion blur, which shades large parts of the body toward the background
  colour and gives the flood a path inward, so it walked in and punched holes
  through her torso. Tightening the tolerance does not fix it — those pixels
  really are background-coloured. `--fill-holes` seals the mask shut, treats
  whatever transparency is then cut off from the outside as a hole, and fills
  it, adding back only the holes so the outline stays exactly as crisp. The
  haze pass has to be off entirely on these sheets for the same reason.
- **Panel borders.** The block sheet boxes every pose in a black frame. The
  frame is ink, so the segmenter read the whole grid as one connected drawing
  and found no gaps to split on — and the corner-sampled background colour came
  back black, so nothing keyed at all. `--panels` finds the border lines, widens
  them to swallow their antialiased edges (one pixel left standing walls the
  background flood out of a cell), measures the background with those rows and
  columns excluded, and paints the grid out in it.
- **The aura had grey baked into it.** Her glow is painted *over* the sheet's
  grey at partial opacity, so every pixel of it is a mix of gold and grey. Keyed
  out faithfully and lifted onto a transparent background, that reads as
  grey-tan mud rather than as fire — the aura on the taunt sheet averages
  (178, 137, 104) in the source. `--unmatte` reads each glow pixel as
  P = a·C + (1−a)·grey, takes the coverage from its distance off the grey, and
  solves for the colour. The glow comes out genuinely semi-transparent, coloured
  as painted, and fading out smoothly rather than ending on a keyed edge.

  What gets *stored* is not the true coverage, though. Most of a soft glow sits
  under half-opacity, and GIF's one-bit alpha throws every such pixel away — the
  first version of this fix recovered the colour and then lost the whole aura in
  the GIFs. The colour is solved from the true coverage, then the stored alpha
  is lifted through a gamma curve, and the GIF export cuts at 64 rather than
  128, so the glow keeps its full drawn extent in every format while the very
  fringe still fades.

  Where the solve may reach is the other problem. Her hair sits 54 levels off the
  background and her skin 74, so a reach that passes either turns the character
  herself translucent — at 90 the entire figure washed out to a ghost. Two
  things keep it honest: the band is capped a fixed distance in from the keyed
  edge, and it is allowed to run further through pixels *brighter* than the
  background than through darker ones. Glow emits, so it is always brighter than
  what it was painted over; her hair is darker. That one asymmetry lets the band
  run through an entire flame — where most of the baked-in grey actually is —
  while her hair still stops it dead. Verified after every build: hoodie and
  hair come out at alpha 255 and 250.
- **The aura is not haze — it is Dahlia.** The warm glow around her is part of
  her design, so no sheet strips it: `--glow-tol` stays at 0 everywhere. The
  flag remains for sheets whose background genuinely shades off, along with
  `--glow-depth` to stop such a flood pouring through a gold trail and hollowing
  it out, but neither is used here.
- **Keeping the faint end of it.** The outermost aura pixels shade toward the
  background, so the keying tolerance decides how much survives. At `--tol 28`
  a quarter of it was being cut; at 14 almost none is, and the background left
  behind barely moves — 493 opaque grey pixels against 446. A lower tolerance
  also makes a stronger barrier against the flood walking into the blurred
  poses, so it helps twice.

  | `--tol` | aura kept | background left opaque |
  | --- | --- | --- |
  | 28 | 75 % | 446 px |
  | 20 | 85 % | 472 px |
  | 14 | 95 % | 493 px |
- **Compression grain.** These sheets arrive as JPEGs, so every flat surface
  carries mottling that no amount of careful keying removes — it is in the
  paint. `--denoise 12` clears it with a bilateral filter: each pixel is
  averaged only with neighbours of similar brightness, so mottling a few levels
  deep is smoothed while anything differing by more than the given strength — a
  mouth line against skin, an outline against a hoodie — is left alone. Three
  passes of a moderate window clear far more than one wide pass at almost no
  cost to the drawing.

  This replaced a median filter, which could not tell a speck from a small drawn
  feature. On a sprite this size it was quietly erasing the things that carry
  the performance — her mouth first, then the eyes and hood strings — and a grin
  came out as a smear.

  Strength is deliberately low, because softness is far more noticeable on a
  sprite than speckle is. Measured inside the character, against the raw sheet:

  | | grain removed | line work kept |
  | --- | --- | --- |
  | median, gated by gradient | 48 % | 80 % |
  | bilateral, 3 passes at 12 | 62 % | 90 % |
  | **bilateral, 1 pass at 8** | **30 %** | **98 %** |

  The last is what ships. It leaves some grain, and that is the right trade: the
  art stays sharp. Line work measures above 100 % of the raw on every sheet in
  the end, because clearing the noise haze around an edge sharpens it, and
  because frames whose breath is at rest now skip the resample entirely instead
  of being resampled to the size they already are.
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

Every animation is audited frame by frame — 727 frames in total, not samples.

Across all eight: no frame touches a canvas edge, no island under 24 px
anywhere, 94–98 % of the aura survives, and line work measures 106–131 % of the
raw sheet — sharper than the source, because clearing the noise haze around an
edge sharpens it.

`build.sh` rebuilds all five from their sheets; the per-sheet flags differ
because the sheets differ, and its comments say how.

The two action sheets read higher because they are grainier JPEGs to begin with,
and what is left is drawn texture: a stronger median takes the figure from 4.98
to 4.80 while costing 4 % of the line work, which is not a trade worth making.

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
| `--components` | split poses by connected ink instead of by gaps; use when poses overlap |
| `--component-min N` | smallest island counted as a pose rather than a stray scrap |
| `--panels` | the sheet boxes each pose in a drawn frame; paint the grid out first |
| `--fill-holes N` | seal and fill holes the flood punched through blurred poses |
| `--single NAME` | treat every frame on the sheet as one sequence, in reading order |
| `--align silhouette` | fine-register frames to each other instead of anchoring on the feet |
| `--rows N` / `--cols N` | force a uniform grid instead of detecting one |
| `--tol N` | background colour tolerance; raise it on a noisy or JPEG-compressed sheet |
| `--glow-tol N` | strip soft painted haze, up to this distance from the background |
| `--glow-depth N` | how many pixels in from the silhouette `--glow-tol` may reach |
| `--denoise N` | clear JPEG grain: differences under N levels are noise, above are drawing |
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
