# Lites

Turns character sprite sheets into playable animations: a slicer that finds the
poses on a sheet, an assembler that times them into a loop, and a browser player
for previewing the result.

## The dagger twirl idle

`assets/twirl_sheet.png` holds twelve drawings. **Five of them are one
animation.** The dagger is in her hand only in poses 3–7; in 1–2 and 8–12 the
hand is an empty fist and the blade is sheathed at her hip, so playing all
twelve teleports the weapon between hand and hip twice per loop. The idle is
built from poses 3–7 alone, which form a clean arc: blade low, wound out,
swept with its trail, up, settled.

`out/dagger_twirl/` holds the result — **75 frames, 7.5 s, looping** — as
`dagger_twirl.gif`, `dagger_twirl.webp`, and `dagger_twirl_strip.png` with
`dagger_twirl.json` describing it.

```sh
pip install pillow numpy

python3 tools/slice_sheet.py assets/twirl_sheet.png -o out/dagger_twirl \
  --tol 28 --single dagger_twirl --align silhouette
python3 tools/assemble.py out/dagger_twirl/frames -o out/dagger_twirl \
  -n dagger_twirl --poses 3,4,3,4,5,6,7,6,5,4 --holds 14,12,16,8,1,1,14,2,2,5 \
  --fps 10 --breathe 1.2 --breathe-cycles 3 --sway 2
```

Preview it in the player:

```sh
python3 -m http.server 8000
# http://localhost:8000/web/index.html?m=../out/dagger_twirl/dagger_twirl.json
```

## No in-betweens are generated

An earlier version of this built in-betweens with optical flow — warping each
drawing toward the next along a motion field. On art like this it looks like
melting wax, and no amount of tuning fixes it: these poses are independent
illustrations whose hair, folds and outlines are redrawn every time, so there is
no correspondence for a flow field to follow, and it ends up sliding hair across
a face. That approach is gone.

What is left is what traditional animation does anyway, and all of it is
lossless — every pixel shipped is a pixel that was drawn:

- **Selection.** Only poses holding the same prop belong in one loop.
- **Ping-pong.** Five poses that rise are not a cycle; played out and back they
  are, with no pop at the seam.
- **Holds.** `--holds` sets how long each pose stays on screen, and it carries
  the performance. Her expression changes across these drawings — 3 and 4 are
  serious, the smirk arrives with the swing at 5, and 6 and 7 are smiling — so
  the loop sits on two beats and moves fast between them:

  | | pose | time | |
  | --- | --- | --- | --- |
  | idle | 3 | 1.4 s | standing, staring, blade low |
  | | 4 | 1.2 s | weight settles |
  | | 3 | 1.6 s | staring |
  | | 4 | 0.8 s | settles again, about to move |
  | action | 5 | 0.1 s | swing, trail, smirk arrives |
  | | 6 | 0.1 s | rising |
  | beat | 7 | 1.4 s | blade up, smiling |
  | | 6, 5 | 0.2 s each | coming back down |
  | | 4 | 0.5 s | settling |

  Five of the seven and a half seconds are spent standing still. Poses 3 and 4
  differ by 5 % below the waist and mostly in the hair, so alternating them
  reads as settling rather than as an arm move, and the blade never leaves her
  hand. Then the flourish passes in two frames and lands on the smile, which is
  the only moment in the loop her expression changes.
- **Breathing.** `--breathe 1.2` stretches the sprite by up to 1.2 % of its
  height, planted at the feet, three breaths to the loop. Chest expansion is the
  one part of breathing a single drawing can fake, and at this size it moves her
  head three or four pixels while the boots stay put. Scales are quantised to
  six levels and cached, so a pose held for a second and a half resamples to
  pixel-identical images at each level instead of shimmering as the scale
  creeps — each hold gets exactly one inhale and one exhale.
- **Float.** `--sway` drifts the sprite sideways once per loop, a rigid
  translation, so weight appears to shift without anything distorting. Vertical
  drift is left to the breathing: `--bob` as well would put two vertical rhythms
  of different periods on the same body, which reads as nervous rather than
  calm.
- **Stabilisation.** `--stabilize core` registers poses on the hoodie and
  trousers, ignoring the hair — the hair is the most freely redrawn thing on the
  sheet and dominates a whole-silhouette match, dragging the body around with it.

To see why the selection matters, build the version this replaced:

```sh
python3 tools/assemble.py out/dagger_twirl/frames -o /tmp -n all_twelve --poses 1-12 --fps 12
```

### What would make it genuinely fluid

Timing carries this a long way, but five drawings is still five drawings. Fluidity is
a property of the source: it needs eight to twelve drawings **of the same
action**, dagger in hand throughout, with hair length, hood and proportions held
consistent between them — phases of one twirl rather than twelve separate
illustrations of a character holding a knife. Given that, this same command
produces a genuinely smooth loop with no other changes.

## Slicing a sheet

`tools/slice_sheet.py` takes the sheet apart. It does not assume a uniform grid —
these sheets have uneven spacing and rows with different frame counts — so it
keys out the flat background colour and segments the leftover ink: horizontal
gaps split rows, vertical gaps split frames within a row.

Cutting the background out needs more than that colour test: mid-grey shading on
the face and hoodie falls within tolerance of the grey backdrop, so keying by
colour alone punches holes straight through the character. Only background that
connects to the sheet edge is really background, so the alpha comes from a flood
fill inward from the edges.

| flag | why |
| --- | --- |
| `--single NAME` | treat every frame on the sheet as one sequence, in reading order |
| `--align silhouette` | fine-register frames to each other instead of anchoring on the feet |
| `--rows N` / `--cols N` | force a uniform grid instead of detecting one |
| `--tol N` | background colour tolerance; raise it on a noisy or JPEG-compressed sheet |
| `--min-gap N` | smallest background gap that counts as a frame boundary — raise it if one sprite splits in two, lower it if two merge |
| `--min-size N` | drop specks smaller than this |
| `--pad N` | transparent margin around each frame |
| `--names a,b,c` | name each row instead of `row1`, `row2`, … |
| `--opaque` | keep the sheet background instead of cutting it out |

GIF stores frame delays in hundredths of a second, so a rate that does not
divide into 10 ms gets rounded — 12 fps plays about 4 % fast there. The WebP is
exact at any rate.

`assets/spritesheet.png` is an earlier sheet of four separate animations, sliced
into `out/`: fight_stance (5 poses), knife_spin (6), low_slash (6),
guard_idle (6). `tools/make_test_sheet.py` generates a stand-in sheet for
exercising the slicer without real art.
