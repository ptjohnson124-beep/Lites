#!/bin/sh
# Rebuild every animation from its sheet. Run from the repo root.
#
# Per-sheet differences are not arbitrary — each one is a property of how that
# sheet was drawn, and the comments say which.
set -e

SLICE="python3 tools/slice_sheet.py"
BUILD="python3 tools/assemble.py"
CLEAN="--despeckle 24 --denoise 8 --align silhouette"

# The warm aura around Dahlia is part of her design, so no sheet strips it:
# --glow-tol stays at 0 everywhere. (The flag still exists for sheets whose
# background really does shade off into haze.)
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
