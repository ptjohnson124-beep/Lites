#!/bin/sh
# Rebuild every animation from its sheet. Run from the repo root.
#
# Per-sheet differences are not arbitrary — each one is a property of how that
# sheet was drawn, and the comments say which.
set -e

SLICE="python3 tools/slice_sheet.py"
BUILD="python3 tools/assemble.py"
CLEAN="--despeckle 24 --denoise 8 --unmatte 45 --align silhouette"

# The warm aura around Dahlia is part of her design, so no sheet strips it:
# --glow-tol stays at 0 everywhere. --unmatte goes further and recovers the
# colour it was painted in: the glow is laid over the sheet's grey at partial
# opacity, so grey is baked into it, and lifted off as-is it reads tan.
$SLICE assets/twirl_sheet.png -o out/dahlia_twirl \
  --tol 14 --glow-tol 0 $CLEAN --single dahlia_twirl
$BUILD out/dahlia_twirl/frames -o out/dahlia_twirl -n dahlia_twirl \
  --poses 3,4,3,4,5,6,7,6,5,4 --holds 28,24,32,16,2,2,28,4,4,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 3 --breathe-levels 12 --sway 2

# Block: the poses are boxed in a drawn grid, which has to be painted out
# before anything downstream finds the gaps between them.
$SLICE assets/dahlia_block_sheet.png -o out/dahlia_block \
  --panels --tol 14 --glow-tol 0 $CLEAN --single dahlia_block
$BUILD out/dahlia_block/frames -o out/dahlia_block -n dahlia_block \
  --poses 1,12,2,3,4,6,5,3,11,12 --holds 16,12,2,2,5,8,3,2,6,14 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 --shake 4:5,6:3

# Taunt: panelled like the block sheet, and its poses overlap once flattened,
# so it needs both the grid painted out and splitting by connected ink.
$SLICE assets/dahlia_taunt_sheet.png -o out/dahlia_taunt \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_taunt
$BUILD out/dahlia_taunt/frames -o out/dahlia_taunt -n dahlia_taunt \
  --poses 14,1,2,3,4,6,5,6,9,6,5,9,11,12,8,7,13 \
  --holds 10,3,3,2,2,3,2,2,2,3,2,3,3,2,6,3,8 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 --shake 3:4

# The three action sheets: poses overlap once flattened, so they are split by
# connected ink. Each draws a motion-blurred frame that shades into the
# background, so holes punched through it get filled back in.
ACTION="--components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN"

$SLICE assets/dahlia_attack_sheet.png -o out/dahlia_attack $ACTION --single dahlia_attack
$BUILD out/dahlia_attack/frames -o out/dahlia_attack -n dahlia_attack \
  --poses 1,3,6,7,8,9,10,11,13,15,16 --holds 12,8,3,2,2,6,3,3,3,5,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 9:4 --travel 1:0,3:0,6:6,7:18,8:28,9:32,10:28,11:18,13:8,15:2,16:0

$SLICE assets/dahlia_hit_sheet.png -o out/dahlia_hit $ACTION --single dahlia_hit
$BUILD out/dahlia_hit/frames -o out/dahlia_hit -n dahlia_hit \
  --poses 19,3,4,5,6,7,8,9,10,13,16 --holds 14,2,2,3,4,2,4,5,5,6,8 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 3:9,4:5,5:3 --travel 19:0,3:0,4:-4,5:-12,6:-20,7:-16,8:-10,9:-5,10:-2,13:0,16:0

$SLICE assets/dahlia_dodge_sheet.png -o out/dahlia_dodge $ACTION --single dahlia_dodge
$BUILD out/dahlia_dodge/frames -o out/dahlia_dodge -n dahlia_dodge \
  --poses 1,3,4,7,9,8,10,6,12,11 --holds 12,3,3,2,2,3,5,4,5,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 10:3 --travel 1:0,3:0,4:-6,7:-20,9:-30,8:-22,10:-12,6:-6,12:-2,11:0

# Going insane. Sheet A is panelled and holds her corrupted idle, the aura
# guttering between gold and red; sheet B is the transformation itself.
$SLICE assets/dahlia_insane_a_sheet.png -o out/dahlia_insane_idle \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_insane_idle
$BUILD out/dahlia_insane_idle/frames -o out/dahlia_insane_idle -n dahlia_insane_idle \
  --poses 3,4,5,8,9,10,11,12,6,16 --holds 6,4,4,3,4,5,4,5,4,8 \
  --fps 20 --breathe 1.4 --breathe-cycles 3 --breathe-levels 12 --sway 2

$SLICE assets/dahlia_insane_b_sheet.png -o out/dahlia_insane \
  --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_insane
$BUILD out/dahlia_insane/frames -o out/dahlia_insane -n dahlia_insane \
  --poses 2,1,3,4,5,6,7,8,9,10,11,12,13,15,16 \
  --holds 8,3,6,3,3,2,8,3,4,4,3,5,4,4,8 \
  --fps 20 --breathe 1.5 --breathe-cycles 3 --breathe-levels 12 --sway 2 \
  --shake 3:5,5:3,7:10,8:5 --travel 6:10,7:2,8:-4

# The full insanity transformation: head grab, escalating glitch, two corruption
# bursts, then she comes down bloodied and sparking. The sheet also draws a
# corrupted lunge (poses 6-8) — a different action, left out of this clip.
$SLICE assets/dahlia_insanity_sheet.png -o out/dahlia_insanity \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_insanity
$BUILD out/dahlia_insanity/frames -o out/dahlia_insanity -n dahlia_insanity \
  --poses 13,1,2,3,4,12,10,11,9,14,15,16 --holds 10,6,5,4,7,4,6,5,8,6,8,10 \
  --fps 20 --breathe 1.5 --breathe-cycles 3 --breathe-levels 12 --sway 2 \
  --shake 3:3,4:8,10:6

# Cyberpsychosis. The episode arc: eyes go red, an afterimage splits off, static
# in the chest, she tears into two (poses 6 and 7 flickered against each other),
# peaks grinning in the full aura, one dark flash, then a red-eyed comedown back
# to herself. The tear poses stay single components because the drawn glitch
# streaks connect the halves.
$SLICE assets/dahlia_cyberpsychosis_sheet.png -o out/dahlia_cyberpsychosis \
  --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_cyberpsychosis
$BUILD out/dahlia_cyberpsychosis/frames -o out/dahlia_cyberpsychosis -n dahlia_cyberpsychosis \
  --poses 1,2,3,4,5,6,7,6,7,8,9,12,11,10,13,14,15,16 \
  --holds 8,6,5,6,4,2,2,2,3,12,3,4,5,5,5,5,6,10 \
  --fps 20 --breathe 1.4 --breathe-cycles 3 --breathe-levels 12 --sway 2 \
  --shake 4:3,6:4,7:4,8:6,9:5

# The dagger-flip idle: one coherent toss cycle across all 15 drawings, the
# ornate teal dagger consistent in every one. Ends where it starts, so it
# cycles without ping-pong. Poses 12, 14, 15 are spares.
$SLICE assets/dahlia_flip_idle_sheet.png -o out/dahlia_flip_idle \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_flip_idle
$BUILD out/dahlia_flip_idle/frames -o out/dahlia_flip_idle -n dahlia_flip_idle \
  --poses 1,2,3,4,5,6,7,8,9,10,11 --holds 14,4,2,3,6,4,3,2,6,5,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 --shake 7:2
