# Lites

Turns a character sprite sheet into playable animations: a slicer that finds the
frames, exports animated GIF/WebP and cut-out PNGs, and a browser player for
previewing each animation row at any speed.

## Use it

Drop your sheet in `assets/`, then:

```sh
pip install pillow numpy
python3 tools/slice_sheet.py assets/spritesheet.png -o out --tol 28 --fps 10 \
  --names fight_stance,knife_spin,low_slash,guard_idle
```

That writes, per row of the sheet:

- `out/NAME.gif` and `out/NAME.webp` — the animation, ready to share
- `out/frames/NAME_MM.png` — individual frames, background cut out, feet-aligned
- `out/sheet_keyed.png` — the whole sheet with its background made transparent
- `out/frames.json` — frame rects in sheet space, for engines or the player

`assets/spritesheet.png` is already sliced into `out/`: **fight_stance** (5
frames), **knife_spin** (6), **low_slash** (6), **guard_idle** (6).

Then preview with the interactive player (row picker, speed, zoom, frame step):

```sh
python3 -m http.server 8000
# open http://localhost:8000/web/index.html
```

## How framing works

The sheet is not on a tidy grid — frames sit at uneven spacing and rows hold
different numbers of them. So frames are located by keying out the flat
background colour and segmenting the leftover ink: horizontal gaps split rows,
vertical gaps split frames within a row.

Cutting the background out needs more than that colour test, though: mid-grey
shading on the face and hoodie falls within tolerance of the grey backdrop, so
keying by colour alone punches holes straight through the character. Only
background that connects to the sheet edge is really background, so the alpha
comes from a flood fill inward from the edges.

Each frame is then re-registered on
the character's feet (horizontal centre of its lowest ink) onto a shared canvas,
which is what stops the sprite bobbing around during playback.

Override the detection when a sheet needs it:

| flag | why |
| --- | --- |
| `--rows N` / `--cols N` | force a uniform grid instead of detecting one |
| `--tol N` | background colour tolerance; raise it if the background is noisy or gradient-y |
| `--min-gap N` | smallest background gap that counts as a frame boundary — raise it if one sprite gets split in two, lower it if two sprites merge |
| `--min-size N` | drop specks smaller than this |
| `--pad N` | transparent margin around each frame |
| `--names a,b,c` | name each row instead of `row1`, `row2`, … |
| `--opaque` | keep the sheet background instead of cutting it out |

`tools/make_test_sheet.py` generates a stand-in sheet (grey background, uneven
spacing, rows of 5/6/6/6) for exercising the slicer without real art.
