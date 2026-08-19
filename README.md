# Lites

Turns character sprite sheets into playable animations: a slicer that finds the
frames on a sheet, an in-betweener that makes the result fluid rather than
steppy, and a browser player for previewing either one.

## The dagger twirl idle

`assets/twirl_sheet.png` holds twelve drawn poses. `out/dagger_twirl/` holds the
animation built from them — **73 frames, 2.92 s, looping**, as
`dagger_twirl.gif`, `dagger_twirl.webp`, and `dagger_twirl_strip.png` (an 8-wide
sprite strip for engine use, described by `dagger_twirl.json`).

```sh
pip install pillow numpy opencv-python-headless

python3 tools/slice_sheet.py assets/twirl_sheet.png -o out/dagger_twirl \
  --tol 28 --single dagger_twirl --align silhouette
python3 tools/smooth.py out/dagger_twirl/frames -o out/dagger_twirl \
  -n dagger_twirl --steps 5 --fps 25
```

Preview it, or any other build, in the player:

```sh
python3 -m http.server 8000
# http://localhost:8000/web/index.html?m=../out/dagger_twirl/dagger_twirl.json
```

## Making twelve poses look fluid

Playing twelve poses back as twelve frames reads as twelve poses no matter how
short you make each one. The frames that were never drawn have to be generated:
`tools/smooth.py` measures dense optical flow between each pair of poses and
builds in-betweens by warping both poses along that motion field and blending
where they meet, so limbs and hair travel to their next position instead of one
pose dissolving into the next. The sequence is treated as a cycle, so the last
pose flows back into the first with no seam.

Two details do most of the work:

- **Pacing.** Consecutive poses are not equally far apart — on this sheet the
  widest gap moves eight times as far as the narrowest. Spreading in-betweens
  evenly makes the animation lurch through the big gaps, so they are handed out
  in proportion to how far each pair actually travels. That alone cut the worst
  frame-to-frame jump by a quarter and roughly halved its variance.
- **Registration.** `--align silhouette` cross-correlates whole frames against
  the first one, rather than anchoring on the feet, which move. Without it the
  whole body twitches a pixel or two per frame and no amount of in-betweening
  hides it.

Frame-to-frame change across the finished loop averages 4.1 (of 255) against
13.4 for the twelve raw poses.

Useful knobs: `--steps` (in-betweens per pose pair, on average), `--fps`,
`--winsize` (raise it when limbs jump a long way between poses), `--uniform`
(disable distance pacing), `--no-loop`, `--quality` (WebP).

GIF stores frame delays in hundredths of a second, so pick an fps that divides
into 10 ms — 25 is exact, 30 gets rounded to 33 and plays 11 % fast. The WebP is
accurate at any rate.

## Slicing a sheet

`tools/slice_sheet.py` takes the sheet apart. It does not assume a uniform grid —
these sheets have uneven spacing and rows with different frame counts — so it
keys out the flat background colour and segments the leftover ink: horizontal
gaps split rows, vertical gaps split frames within a row.

Cutting the background out needs more than that colour test, though: mid-grey
shading on the face and hoodie falls within tolerance of the grey backdrop, so
keying by colour alone punches holes straight through the character. Only
background that connects to the sheet edge is really background, so the alpha
comes from a flood fill inward from the edges.

| flag | why |
| --- | --- |
| `--single NAME` | treat every frame on the sheet as one animation, in reading order |
| `--align silhouette` | fine-register frames to each other instead of anchoring on the feet |
| `--rows N` / `--cols N` | force a uniform grid instead of detecting one |
| `--tol N` | background colour tolerance; raise it on a noisy or JPEG-compressed sheet |
| `--min-gap N` | smallest background gap that counts as a frame boundary — raise it if one sprite splits in two, lower it if two sprites merge |
| `--min-size N` | drop specks smaller than this |
| `--pad N` | transparent margin around each frame |
| `--names a,b,c` | name each row instead of `row1`, `row2`, … |
| `--opaque` | keep the sheet background instead of cutting it out |

`assets/spritesheet.png` is an earlier sheet of four separate animations, sliced
into `out/`: fight_stance (5 poses), knife_spin (6), low_slash (6),
guard_idle (6). `tools/make_test_sheet.py` generates a stand-in sheet for
exercising the slicer without real art.
