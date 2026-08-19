# Lites

Turns a character sprite sheet into playable animations: a slicer that finds the
frames, exports animated GIF/WebP and cut-out PNGs, and a browser player for
previewing each animation row at any speed.

## Use it

Drop your sheet in `assets/`, then:

```sh
pip install pillow numpy
python3 tools/slice_sheet.py assets/spritesheet.png -o out --fps 10
```

That writes, per row of the sheet:

- `out/rowN.gif` and `out/rowN.webp` — the animation, ready to share
- `out/frames/rowN_MM.png` — individual frames, background cut out, feet-aligned
- `out/frames.json` — frame rects in sheet space, for engines or the player

Then preview with the interactive player (row picker, speed, zoom, frame step):

```sh
python3 -m http.server 8000
# open http://localhost:8000/web/index.html
```

## How framing works

The sheet is not on a tidy grid — frames sit at uneven spacing and rows hold
different numbers of them. So frames are located by keying out the flat
background colour and segmenting the leftover ink: horizontal gaps split rows,
vertical gaps split frames within a row. Each frame is then re-registered on
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
| `--opaque` | keep the sheet background instead of cutting it out |

`tools/make_test_sheet.py` generates a stand-in sheet (grey background, uneven
spacing, rows of 5/6/6/6) for exercising the slicer without real art.
