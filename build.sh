#!/bin/sh
# Rebuild every animation from its sheet. Run from the repo root.
#
# Per-sheet differences are not arbitrary — each one is a property of how that
# sheet was drawn, and the comments say which.
set -e

SLICE="python3 tools/slice_sheet.py"
BUILD="python3 tools/assemble.py"
CLEAN="--despeckle 24 --denoise 8 --unmatte 45 --align silhouette"
# Grain is a fraction of the character, not of the sheet, so a sheet that packs
# 25 poses into the space another gives 8 carries the same mottling over a third
# of the pixels and it shows three times as much. Those sheets get a stronger
# filter: at 14 it takes 18% of the grain for 8% of the line work, and her eyes,
# mouth and hood strings all survive it — checked frame by frame.
CLEAN_SMALL="--despeckle 24 --denoise 14 --unmatte 45 --align silhouette"

# The warm aura around Dahlia is part of her design, so no sheet strips it:
# --glow-tol stays at 0 everywhere. --unmatte goes further and recovers the
# colour it was painted in: the glow is laid over the sheet's grey at partial
# opacity, so grey is baked into it, and lifted off as-is it reads tan.
$SLICE assets/twirl_sheet.png -o out/dahlia_twirl \
  --tol 14 --glow-tol 0 $CLEAN --single dahlia_twirl
$BUILD out/dahlia_twirl/frames -o out/dahlia_twirl -n dahlia_twirl \
  --poses 3,4,3,4,5,6,7,6,5,4 --holds 28,24,32,16,2,2,28,4,4,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 3 --breathe-levels 12 --sway 2

# Going insane. Sheet A is panelled and holds her corrupted idle, the aura
# guttering between gold and red; sheet B is the transformation itself.
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
$SLICE assets/dahlia_flip_idle_sheet.png -o out/dahlia_flip_idle \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_flip_idle
$BUILD out/dahlia_flip_idle/frames -o out/dahlia_flip_idle -n dahlia_flip_idle \
  --poses 1,2,3,4,5,6,7,8,9,10,11 --holds 14,4,2,3,6,4,3,2,6,5,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 --shake 7:2

# THE idle, in the new art style (crisper line work, the cyber-dagger that
# deploys into her hand — which retires the prop-continuity problem by design).
# Earlier sheets are being redrawn in this style; this is the template build.
# Loop: empty-handed breath, dagger deploys, spin flourish, held level while
# breathing (poses 5 and 6 alternating as the micro-variation), retract, back
# to the breath. The seam is the retract, and it measures smaller than the
# deploy, so the loop has no pop.
$SLICE assets/dahlia_idle_sheet.png -o out/dahlia_idle \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_idle
$BUILD out/dahlia_idle/frames -o out/dahlia_idle -n dahlia_idle \
  --poses 1,2,3,4,5,6,5,2 --holds 18,3,3,7,10,10,8,2 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2

# Block, in the new style, replacing the old-style build. The loop opens on the
# retracted breath rather than the ready stance: the dagger deploying is the
# sheet's largest step by far, and starting there puts it inside the loop as a
# visible action instead of on the seam. Seam 33 against 51 for the deploy.
$SLICE assets/dahlia_block_v2_sheet.png -o out/dahlia_block \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_block
$BUILD out/dahlia_block/frames -o out/dahlia_block -n dahlia_block \
  --poses 8,1,2,3,4,5,6,7 --holds 10,8,2,3,5,7,3,6 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 4:6,5:3 --travel 8:0,1:0,2:0,3:0,4:-4,5:-6,6:-3,7:-1

# Taking a hit, in the new style. The sheet is a labelled reference --- a
# caption under every cell --- so --strip-captions blanks the text before
# anything segments it as part of her. Ends in a wounded idle rather than
# returning to normal, and poses 7 and 8 alternate to give that idle a breath.
$SLICE assets/dahlia_hit_v2_sheet.png -o out/dahlia_hit \
  --panels --strip-captions --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN \
  --single dahlia_hit
$BUILD out/dahlia_hit/frames -o out/dahlia_hit -n dahlia_hit \
  --poses 1,2,3,4,5,6,7,8,7,8 --holds 8,2,2,3,4,4,6,8,6,8 \
  --fps 20 --breathe 1.3 --breathe-cycles 3 --breathe-levels 12 --sway 2 \
  --shake 3:9,4:6,5:3 --travel 1:0,2:0,3:-3,4:-9,5:-15,6:-11,7:-7,8:-6

# Attacking, in the new style: two of them.
#
# The lunging slash is the primary attack --- wind up, leap in, one big arc,
# recover --- and travels 22px forward across the leap. Replaces the old-style
# attack at the same output path.
$SLICE assets/dahlia_attack_b_sheet.png -o out/dahlia_attack \
  --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_attack
$BUILD out/dahlia_attack/frames -o out/dahlia_attack -n dahlia_attack \
  --poses 1,2,3,4,5,6,7,8 --holds 6,3,2,4,3,3,4,8 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 4:5 --travel 1:0,2:0,3:12,4:22,5:18,6:12,7:6,8:0

# The spin combo is two attacks in one sheet: a stationary spin slash, then a
# thrust that carries her 16px forward. Travel stays at zero through the spin
# and only starts at the thrust, so the two halves read as separate beats.
$SLICE assets/dahlia_attack_a_sheet.png -o out/dahlia_attack_spin \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_attack_spin
$BUILD out/dahlia_attack_spin/frames -o out/dahlia_attack_spin -n dahlia_attack_spin \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12 --holds 6,3,2,5,3,2,2,6,3,3,4,8 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 4:5,8:4 --travel 1:0,2:0,3:0,4:0,5:0,6:4,7:10,8:16,9:14,10:8,11:3,12:0

# Evasion, counter and taunt in the new style, replacing their old-style builds
# at the same output paths.
#
# Evasion is rebuilt from two sheets and 15 drawings. The v2 sheet it replaces
# drew her 219px tall, the smallest in the set; these two are 317px and 309px
# for the same stance, 2.6% apart, so no --scale is needed — the closest two
# sheets have ever landed.
#
# Sheet A is the spin and carries the whole animation: front, weight shift,
# push-off with smear streaks, profile away, full back, profile returning,
# turning through her hair, front. Eight drawings is what a 360 costs; at seven
# it snaps.
#
# Sheet B is thin. Its poses 3 to 7 measure 281x319, 299x326, 299x323, 305x323
# and 309x323 — one stance with the face changing — so all it really adds is
# the landing, the rise, the wink and the drop of the guard. It is built in
# whole rather than trimmed because the near-copies still buy a half-frame of
# settle either side of the wink, and the wink is the point of the clip.
#
# Two drawings are missing the dagger: the landing crouch and the last pose
# come back with zero teal pixels where their neighbours carry about 2000. That
# is the art, not the key, and there is nothing the pipeline can do about it.
#
# One --erase, 758,780 to 784,860. Pose 8's dagger points down-left and its tip
# crosses into pose 7's cell, close enough to touch her trouser leg — so it
# arrives as part of pose 7 and a disembodied blade hangs off her hip through
# the turn. The strip stops at x=784, pose 8's own edge, so pose 8 keeps every
# pixel it already had; only the 26 columns that were never going to reach it
# are cleared.
#
# Her hair bridges the last two poses of sheet A into one island. The valley
# split separates them; before the ownership fix in slice_sheet.py the whole
# island went to the rect its centre fell in and pose 7 came out with four
# pixels in it.
$SLICE assets/dahlia_dodge_a_sheet.png -o out/dahlia_dodge_a \
  --erase 758,780,784,860 \
  --components --component-min 8000 --cluster-gap 14 --tol 3 --glow-tol 20 --glow-depth 3 \
  --fill-holes 4 --despeckle 24 --denoise 10 --unmatte 0 --align silhouette \
  --single dahlia_dodge_a
$SLICE assets/dahlia_dodge_b_sheet.png -o out/dahlia_dodge_b \
  --components --component-min 8000 --cluster-gap 14 --tol 3 --glow-tol 20 --glow-depth 3 \
  --fill-holes 4 --despeckle 24 --denoise 10 --unmatte 0 --align silhouette \
  --single dahlia_dodge_b
python3 tools/merge_sheets.py out/dahlia_dodge_a/frames out/dahlia_dodge_b/frames \
  --skip-first out/dahlia_dodge_b/frames -o out/dahlia_dodge -n dahlia_dodge
$BUILD out/dahlia_dodge/frames -o out/dahlia_dodge -n dahlia_dodge \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15 \
  --holds 8,2,2,2,2,2,2,3,4,2,2,3,9,3,10 \
  --fps 24 --breathe 0 --bob 2 --sway 2 --stabilize none \
  --travel 1:0,2:-4,3:-16,4:-28,5:-34,6:-30,7:-22,8:-14,9:-8,10:-4,11:-2,12:0,13:0,14:0,15:0

# Counter: exported with transparency and saved as JPEG, so the editor's
# checkerboard is baked into the pixels — --checker flattens it back to one
# background. She closes 20px, then the counter lands with a 6px jolt.
$SLICE assets/dahlia_counter_v2_sheet.png -o out/dahlia_counter \
  --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_counter
# Pose 3 is the slash smear --- 76% less edge detail than the others, which is
# how a smear shows up when the arc it carries makes it the densest frame on the
# sheet --- so it gets two frames and no more. The loop opens on pose 7, the one
# with the dagger retracted, so the deploy lands mid-loop rather than on the
# seam, the same reason the block opens where it does.
$BUILD out/dahlia_counter/frames -o out/dahlia_counter -n dahlia_counter \
  --poses 7,8,1,2,3,4,5,6,9,10 --holds 12,6,6,4,2,12,5,7,5,8 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 4:5 --travel 7:0,8:0,1:0,2:-4,3:14,4:20,5:16,6:10,9:4,10:0

# Taunt: a flame lit in her free hand. Poses 5 and 6 are the same flame at two
# sizes, so they alternate to make it gutter rather than sit still.
$SLICE assets/dahlia_taunt_v2_sheet.png -o out/dahlia_taunt \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_taunt
$BUILD out/dahlia_taunt/frames -o out/dahlia_taunt -n dahlia_taunt \
  --poses 1,2,3,4,5,6,5,6,7,8,9,10,11,12 --holds 12,4,3,3,5,4,4,7,4,4,4,4,5,12 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 --shake 4:2

# Insane idle, new style. A corruption cycle rather than a steady state: she
# starts normal, her face shadows over, red glitch and text artefacts build,
# stutter at the peak (poses 9-11 played out and back), then snap clean again.
$SLICE assets/dahlia_insane_idle_v2_sheet.png -o out/dahlia_insane_idle \
  --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_insane_idle
$BUILD out/dahlia_insane_idle/frames -o out/dahlia_insane_idle -n dahlia_insane_idle \
  --poses 1,2,3,4,5,6,7,8,9,10,11,10,9,12 --holds 10,5,4,4,7,4,4,3,2,2,2,2,2,7 \
  --fps 20 --breathe 1.3 --breathe-cycles 2 --breathe-levels 12 --sway 2 --shake 10:3,11:3

# Fully insane idle. This one arrived as a finished animation rather than a
# sheet, so import_gif turns its frames into poses and its per-frame durations
# into holds --- it keeps exactly the timing it was authored with, and still
# gets the same cleanup, strip, manifest and exports as everything else.
# Mirrored to face the other way. No breathing or sway: the motion is drawn.
python3 tools/import_gif.py assets/dahlia_fully_insane_sheet.gif \
  -o out/dahlia_fully_insane_idle -n dahlia_fully_insane_idle --fps 20 --mirror
$BUILD out/dahlia_fully_insane_idle/frames -o out/dahlia_fully_insane_idle -n dahlia_fully_insane_idle \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48 \
  --holds 1,2,1,6,1,2,2,1,1,4,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,4,2,1,1,1,2,1,1,1,4,2,1,2,2,1,1,6,2,1 \
  --fps 20 --breathe 0 --sway 0 --despeckle 24

# Special / skill: a frequency-wave dagger burst across three sheets and 22
# drawings — the charge, the burst, the recovery. Replaces the 11-drawing v7
# build. 7.42s.
#
# Emphasis and fluidity are not in tension, as long as the right poses take the
# extra time. What reads as choppy is a pose caught mid-movement and held; a
# pose that is already at rest can be held as long as the beat needs. So every
# transition here stays at two frames — 83ms, the fluid number the three sheets
# were spent to buy — and the time goes entirely into the extremes: 0.42s each on
# the opening idle, the peak of the charge and the impact, 0.38s on the face
# going into shadow and on the widest shockwave, 0.46s on the settle, and 1.21s
# spread across the nine poses of the rings dissipating. The smear at pose 9 goes
# the other way, down to a single frame, because a smear reads as speed when it
# flashes and as a pose when it is held.
#
# Three --erase strips now. Two are placed where the ink density between two
# poses bottoms out; the third is different, and worth the note. The burst sheet's last two poses
# touch through their shockwave rings, and the recovery sheet's first two touch
# through the wave arcs — one fused component each, so seven poses out of eight
# without the cut. The recovery strip has to be the wider of the two: a narrower
# one severed the poses but left a sliver standing, which then counted as a
# ninth pose of four pixels.
#
# The third strip, 1039,586 to 1090,660, is not on a gap at all. Burst pose 8's
# dagger is drawn reaching left out of its own cell and into pose 7's, where it
# crosses behind the shockwave crescent — there is no density minimum between
# them because the two drawings genuinely overlap. Cutting at the cell edge, as
# the first strip does, only severed the blade and left its tip stranded in
# pose 7, floating point-first out of the crescent for the whole beat. The
# strip has to take the stranded piece itself, so it is fitted to the tip
# rather than to a gap: it costs about 1500 pixels, nearly all of them the tip,
# and the crescent's outline is unchanged either side of it.
#
# --component-min 20000, an order of magnitude above the usual: every real pose
# here is over 33000 body pixels, so the threshold can sit high enough to ignore
# anything an --erase leaves behind.
#
# The beats, fifth pass, and it undoes the four before it. Every earlier pass
# added weight somewhere; what came out was an 8.5s special in which the rate
# the sheets were actually drawn for never appeared once. This one runs at that
# rate and buys its emphasis out of it rather than on top of it.
#
# 22 drawings, 2.54s, 116ms a drawing on average. The floor is two frames —
# 83ms, what these sheets were drawn for, near the run cycle's 67ms — and only
# four poses rise off it: the ring closing at 208ms, the peak at 167ms, the
# impact at 208ms, the settle at 208ms. Four beats is what two and a half
# seconds has room for. The three pulses stay even at 125ms each, because
# evenness is what makes them read as pulses, and the smear stays at one frame.
#
# Readability was never a function of duration here. All 22 drawings differ, so
# at 83ms each they all register; what stopped registering was a beat held long
# enough for the eye to leave it. The three seconds spent on three drawings of
# a ring gathering was the clearest case — nothing in those three moves except
# the ring itself, so most of it was a still image with a countdown on it.
#
# No --scale. The three sheets came back within a pixel of each other — her
# effect-free stance measures 332px on the charge sheet and 332px on the
# recovery sheet, which is the two-attachment continuity rule working as well as
# it ever has.
$SLICE assets/dahlia_skill_charge_sheet.png -o out/dahlia_skill_charge \
  --components --component-min 20000 --cluster-gap 14 --tol 8 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_skill_charge
$SLICE assets/dahlia_skill_burst_sheet.png -o out/dahlia_skill_burst \
  --erase 1070,390,1088,768 --erase 1039,586,1090,660 \
  --components --component-min 20000 --cluster-gap 14 --tol 8 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_skill_burst
$SLICE assets/dahlia_skill_recover_sheet.png -o out/dahlia_skill_recover \
  --erase 375,40,415,375 \
  --components --component-min 20000 --cluster-gap 14 --tol 8 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_skill_recover
python3 tools/merge_sheets.py out/dahlia_skill_charge/frames out/dahlia_skill_burst/frames \
  out/dahlia_skill_recover/frames \
  --skip-first out/dahlia_skill_burst/frames --skip-first out/dahlia_skill_recover/frames \
  -o out/dahlia_skill -n dahlia_skill
$BUILD out/dahlia_skill/frames -o out/dahlia_skill -n dahlia_skill \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22 \
  --holds 3,2,2,2,2,2,5,4,1,5,3,3,3,2,2,2,2,2,2,3,4,5 \
  --fps 24 --breathe 0 --bob 2 --sway 2 --stabilize none \
  --shake 10:6,11:8,12:5 \
  --travel 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:6,10:14,11:18,12:16,13:12,14:8,15:4,16:2,17:0,18:0,19:0,20:0,21:0,22:0

# Moving. Built in place, with no --travel: a locomotion clip is translated by
# whatever plays it, and baking the ground into the loop would have her dash out
# and slide back every cycle. The sheet gives one leap, one stride and one dash
# smear; the rest are stances, so two of those close the loop.
# Ranged attack, from the v4 sheet: twelve drawings instead of v3's 22, and
# nearly twice Dahlia's height in pixels because the sheet spends its area on
# fewer poses. Rest, the gun summons out of her hand, two beats of aim, a dash,
# the shot, the recoil, a grin, and back to rest. She carries 20px forward on
# the dash and walks it back.
#
# One --erase, seven pixels wide. Pose 2's gun barrel and pose 3's hair are
# drawn overlapping — solidly, across six scanlines, so there is no gap for the
# segmenter to find and the two poses arrive as a single island: one frame came
# out empty and the other held two figures. Cutting the sheet on a forced 3x4
# grid separates them but slices the muzzle blast off at the cell edge, which
# is the one drawing on the sheet worth keeping whole. Severing the join
# instead costs the outer rim of pose 2's muzzle on a motion-blurred frame and
# nothing else: pose 3 keeps its hair, its blast, and no stray gun behind her.
$SLICE assets/dahlia_ranged_v4_sheet.png -o out/dahlia_ranged \
  --erase 571,110,578,170 \
  --components --tol 18 --glow-tol 0 --fill-holes 3 $CLEAN_SMALL --single dahlia_ranged
$BUILD out/dahlia_ranged/frames -o out/dahlia_ranged -n dahlia_ranged \
  --poses 9,7,1,5,2,3,4,8,6,10,11 \
  --holds 8,5,4,4,2,7,4,5,4,5,8 \
  --fps 24 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 3:8,4:4 \
  --travel 9:0,7:0,1:0,5:0,2:14,3:20,4:12,8:6,6:2,10:0,11:0

# Cyberpsychosis, new style, replacing the old-style build: eyes go, the face
# corrupts, one flash of the double-headed glitch, a scream, then the gold surge
# before she settles.
$SLICE assets/dahlia_cyber_v2_sheet.png -o out/dahlia_cyberpsychosis \
  --panels --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_cyberpsychosis
$BUILD out/dahlia_cyberpsychosis/frames -o out/dahlia_cyberpsychosis -n dahlia_cyberpsychosis \
  --poses 1,2,3,4,5,6,7,8,9,12,10,11 --holds 8,4,4,3,5,4,4,4,4,5,4,6 \
  --fps 20 --breathe 1.3 --breathe-cycles 2 --breathe-levels 12 --sway 2 --shake 4:6,5:4,12:5

# Soul attack: one continuous action across two sheets and fifteen drawings —
# the charge, then the slash. Unlike the knockdown and the get-up, there is no
# state to hold between the halves, so this builds as one clip rather than two.
# Replaces the 16-pose soul sheet, on which Dahlia measured 167px; here she is
# 363px, and the effect goes from a single spark to a fire disc taller than she
# is and out again.
#
# Two --erase strips on the charge sheet. Its last three poses have flames wider
# than she is and they touch, fusing into one 795px component — seven poses and
# a fragment out of a straight slice. The cuts are twelve pixels wide and land
# where the flame density between poses bottoms out, so nothing of either pose
# is lost. The slash sheet needs none: it was regenerated in landscape with the
# spacing rule stated effect-to-effect rather than body-to-body.
#
# merge_sheets puts both slices on one canvas, anchored on her feet and her
# body's centre line rather than on the bounding box — the effects reach much
# further on some poses than others, so a box centre would drag her sideways at
# the seam. All fifteen poses land on the same anchor. --skip-first drops the
# slash sheet's opening pose, which repeats the charge sheet's last.
#
# --scale 94 on the charge poses. The two sheets are drawn 6% apart, measured by
# body pixel count with the fire and teal masked out; the charge is the larger,
# so it scales down, which sharpens rather than softens.
$SLICE assets/dahlia_soul_charge_sheet.png -o out/dahlia_soul_charge \
  --erase 516,500,527,976 --erase 796,500,807,976 \
  --components --component-min 3000 --tol 8 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_soul_charge
$SLICE assets/dahlia_soul_slash_sheet.png -o out/dahlia_soul_slash \
  --components --component-min 3000 --tol 8 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_soul_slash
python3 tools/merge_sheets.py out/dahlia_soul_charge/frames out/dahlia_soul_slash/frames \
  --skip-first out/dahlia_soul_slash/frames -o out/dahlia_soul -n dahlia_soul
$BUILD out/dahlia_soul/frames -o out/dahlia_soul -n dahlia_soul \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15 \
  --holds 8,5,5,5,6,5,5,10,3,8,5,5,5,5,12 \
  --fps 24 --breathe 0 --bob 2 --sway 2 --stabilize none \
  --scale 1:94,2:94,3:94,4:94,5:94,6:94,7:94,8:94 \
  --shake 8:4,9:6,10:9 \
  --travel 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:10,10:24,11:20,12:14,13:8,14:3,15:0

# Moving: a 12-drawing run cycle, replacing the 36-frame v3. Fewer drawings but
# a much better cycle — v3 spent most of its length on stances and read as a
# shuffle. These twelve are all stride. Uniform two-frame holds and no breathing
# or sway: the drawings already carry every bit of the motion, and a cycle wants
# even spacing where an action wants beats. Built in place with no --travel; a
# locomotion clip is translated by whatever plays it, and baking the ground into
# the loop would have her dash out and slide back every cycle.
$SLICE assets/dahlia_move_v4_sheet.png -o out/dahlia_move \
  --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_move
$BUILD out/dahlia_move/frames -o out/dahlia_move -n dahlia_move \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12 \
  --holds 2,2,2,2,2,2,2,2,2,2,2,2 \
  --fps 30 --breathe 0 --sway 0

# Ragdoll and get-up: one action across two sheets, generated in two turns and
# built as two clips, which is also how an engine wants them — play the
# knockdown, hold the downed pose for as long as the character stays down, then
# play the get-up. Replaces the 27-pose ragdoll sheet, on which Dahlia measured
# 153px tall, the smallest in the project. On these she is 303px.
#
# Both sheets were redrawn without the ground line the first versions carried,
# so neither needs --panels — eight poses straight out of component
# segmentation. The two detector fixes that line forced are worth keeping for
# the next sheet that has one, and are in the README: an
# absolute darkness threshold means nothing on a navy backdrop darker than the
# threshold itself, and line uniformity has to be measured against the median,
# because a ground line is uniform along its length and wild where eight pairs
# of boots cross it.
#
# --tol 8: the backdrop is dark and her boots and trousers are darker still, so
# the flood needs a tight leash, and the sheet is flat enough to give it one —
# 99% of the edge strip sits within 7 levels. --unmatte 0, as on every sheet
# that is not mid-grey.
#
# Pose order is not reading order. As drawn, the airborne tumble sits fifth and
# the skid third, so read straight through she lands before she is thrown. The
# dagger settles it: she holds it in 1, 2, 5, 4 and 3 and never again, so those
# five are the flight and the impact in that order. Pose 7 is dropped — it is
# the only frame where the fallen dagger lies inside her crop, so playing it
# flashes the prop on for a quarter second and off again.
$SLICE assets/dahlia_knockdown_sheet.png -o out/dahlia_ragdoll \
  --components --component-min 3000 --tol 8 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_ragdoll
$BUILD out/dahlia_ragdoll/frames -o out/dahlia_ragdoll -n dahlia_ragdoll \
  --poses 1,2,5,4,3,6,8 \
  --holds 6,3,4,5,4,7,18 \
  --fps 24 --breathe 0 --bob 2 --sway 2 \
  --shake 4:9,3:5 \
  --travel 1:0,2:6,5:-26,4:-48,3:-66,6:-72,8:-76

# The get-up needs no reordering — its eight drawings run in sequence, and the
# stance it ends on measures 296px against the knockdown's 303, a 2% drift
# across two separately generated sheets. That is what attaching the last pose
# of sheet one as the reference for sheet two buys.
#
# Slow at the bottom and quickening as she rises: 0.42s face down, holds
# shortening all the way up to the stance, then 0.5s to settle.
$SLICE assets/dahlia_getup_sheet.png -o out/dahlia_getup \
  --components --component-min 3000 --tol 8 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_getup
$BUILD out/dahlia_getup/frames -o out/dahlia_getup -n dahlia_getup \
  --poses 1,2,3,4,5,6,7,8 \
  --holds 10,7,7,6,6,5,6,12 \
  --fps 24 --breathe 0 --bob 2 --sway 2 \
  --shake 6:3 \
  --travel 1:0,2:0,3:4,4:8,5:10,6:8,7:4,8:0


# Twirl idle, the first animation of the new design. Two sheets, both with a
# real alpha channel -- around 200 levels and 57 to 79 thousand soft-edge
# pixels apiece -- so --keyed takes each sheet's own mask and there is nothing
# to un-matte, no grain to denoise and no backdrop to guess.
#
# The sheets are played in the reverse of the order they were labelled. The
# spin sheet's faces are neutral all the way across and the grin sheet runs
# neutral, grin, grin, grin, grin, neutral -- a complete arc that returns --
# so the twirl is the first half whatever the prompt called them. It is also
# the tighter join: spin-to-grin measures 35 of 255 where grin-to-spin is 65,
# and both are smaller than the largest step inside either sheet.
#
# --match-scale rather than a hand-computed --scale. The duplicated attachment
# pose is the only thing carrying scale between two sheets and it is the
# instruction the generator ignores most often -- twice in a row the second
# sheet came back with a pose that was similar rather than copied, and 6 to 9
# per cent larger with it. Her standing height is measurable on both sheets,
# so the correction is too.
$SLICE assets/dahlia_twirl_spin_sheet.png -o out/twirl_spin \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single spin
$SLICE assets/dahlia_twirl_grin_sheet.png -o out/twirl_grin \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single grin
python3 tools/merge_sheets.py out/twirl_spin/frames out/twirl_grin/frames \
  --skip-first out/twirl_grin/frames --match-scale \
  -o out/dahlia_twirl -n dahlia_twirl
$BUILD out/dahlia_twirl/frames -o out/dahlia_twirl -n dahlia_twirl \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15 \
  --holds 10,3,3,3,2,1,2,4,4,5,4,4,10,5,12 \
  --fps 24 --breathe 0 --bob 2 --sway 2

# Taking a hit. Three sheets, 24 drawings, 22 played -- two of the 24 are the
# duplicated attachment poses and --skip-first drops both.
#
# --match-scale measures the overlap pose here, not the sheet median, and this
# is the animation that forced the distinction. Her height genuinely changes
# inside a sheet: the stagger runs 374px at the top and 223px at the bottom,
# because she is crouching. A median across that measures the crouch and not
# the drift, and normalising on it would have shrunk the standing sheets to
# match a crouch. The last drawing of one sheet and the first of the next are
# meant to be the same drawing, so their heights are directly comparable
# whatever she is doing -- 342 against 374, then 223 against 227.
#
# --travel carries the knockback, which the sheets deliberately do not draw:
# every pose is re-registered on her body at the merge, so a slide drawn into
# a cell is taken straight back off it. She gives 64px of ground and recovers
# it as she stands, so the last frame sits where the idle does and the two cut
# together without a snap.
$SLICE assets/dahlia_hit_impact_sheet.png -o out/hit_impact \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single impact
$SLICE assets/dahlia_hit_stagger_sheet.png -o out/hit_stagger \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single stagger
$SLICE assets/dahlia_hit_recover_sheet.png -o out/hit_recover \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single recover
python3 tools/merge_sheets.py out/hit_impact/frames out/hit_stagger/frames \
  out/hit_recover/frames \
  --skip-first out/hit_stagger/frames --skip-first out/hit_recover/frames \
  --match-scale -o out/dahlia_hit -n dahlia_hit
$BUILD out/dahlia_hit/frames -o out/dahlia_hit -n dahlia_hit \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22 \
  --holds 8,1,6,2,2,2,2,4,3,3,3,3,3,4,8,4,3,3,3,6,4,10 \
  --travel 1:0,2:0,3:6,4:22,5:40,6:52,7:58,8:60,9:62,10:64,11:64,12:64,13:64,14:64,15:64,16:60,17:52,18:40,19:26,20:14,21:6,22:0 \
  --fps 24 --breathe 0 --bob 0 --sway 0 --shake 2:8,3:5

# The cocky attack. Three sheets, 24 drawings, 23 played -- only one of the 24
# is a duplicated attachment pose, because the flourish sheet came back without
# one. The overlap is measurable: the strike sheet opens on a copy of the
# beckon sheet's last drawing and scores 20 against a silhouette that is a
# different drawing at 70 or more. Nothing on the flourish sheet is within 67
# of anything on the strike sheet, so there is no copy there to drop and
# --skip-first names only the strike.
#
# Which is why --match-scale takes the flourish's median against the first
# sheet rather than the one before it. She spends all eight of the strike
# sheet's drawings lunging, so its median measures the lunge -- 328px against
# the beckon sheet's 360 -- and sizing the flourish off that shrinks it to 90%
# when the answer is 95.4%. Measured against the beckon sheet the tool lands on
# 95.4%, and the same figure taken by hand, the flourish's nearest standing
# pose against the beckon's guard, is 95.8%.
#
# The swagger goes either side of the strike and not during it: she beckons on
# 6 and grins on 21, both held a third of a second, and the two cuts cross in
# sixteen frames between them. Pose 9 is the launch smear and is held for one
# frame -- the whole point of a smear is that it is never seen twice.
$SLICE assets/dahlia_attack_beckon_sheet.png -o out/atk_beckon \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single beckon
$SLICE assets/dahlia_attack_strike_sheet.png -o out/atk_strike \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single strike
$SLICE assets/dahlia_attack_flourish_sheet.png -o out/atk_flourish \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single flourish
python3 tools/merge_sheets.py out/atk_beckon/frames out/atk_strike/frames \
  out/atk_flourish/frames \
  --skip-first out/atk_strike/frames --match-scale \
  -o out/dahlia_attack -n dahlia_attack
# Pose 9, the launch smear, is drawn and not played. It is the one drawing on
# all three sheets that is genuinely blurred -- its sharp-edge fraction is 2.4%
# against 11 to 15% everywhere else, where the soft alpha on 10 to 16 is the
# glow arcs and their line work stays crisp. A smear reads as motion at speed
# and as a smudge at rest, and this one sat between a held anticipation and a
# held cut, so it read as the smudge. Cutting straight from the coil to the
# landed arc is the older trick and the surer one.
#
# The frame it gave up goes to pose 8, the coil, because a cut that hard wants
# a longer wind-up behind it: the whole 66px of the lunge now crosses on that
# one cut, with nothing drawn in between to carry it.
#
# --travel carries the lunge. She faces left, so forward is negative: 12px of
# lean as she coils, 66 more across the cut, then the ground given back over
# the recovery, where she is visibly rising out of the lean and the motion
# reads as her stepping out of it. It is all returned by pose 20 so the grin
# plays still and the last drawing sits where the first one does. The travel
# and shake maps are keyed by drawing, not by playing order, so dropping a
# pose from --poses leaves the rest of their numbering alone.
$BUILD out/dahlia_attack/frames -o out/dahlia_attack -n dahlia_attack \
  --poses 1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23 \
  --holds 5,3,3,3,4,8,3,6,2,3,2,2,3,3,3,4,3,3,5,7,3,9 \
  --travel 1:0,2:0,3:0,4:0,5:0,6:0,7:-6,8:-12,10:-78,11:-86,12:-88,13:-88,14:-90,15:-88,16:-70,17:-50,18:-26,19:-8,20:0,21:0,22:0,23:0 \
  --fps 24 --breathe 0 --bob 0 --sway 0 --shake 11:7,14:5

# The slipping idle -- the one that runs when PMF drops. Three sheets, 24
# drawings, all 22 kept after the two copies are folded out.
#
# It is an idle, so it is built by the opposite rules to everything above. The
# other clips are one movement sampled evenly and every step matters; this one
# is a person failing to hold still. Step evenness comes out 1.6x, 3.7x and
# 5.8x per sheet, which would be a defect in the attack and is not one here:
# the biggest step on any of the three is 45 where the attack's smallest was
# larger than that. All the motion is small. Unevenness inside small motion is
# what shaking looks like.
#
# Both copies came back and both are real: 16.4 and 31.6, against a threshold
# of 35 for "the same drawing". That is the best pair of joins any clip here
# has had.
#
# And the scale needed almost nothing -- sheet 2 at 100.8%, sheet 3 at 95.1%,
# and after that her height runs 596 to 607px across all 22 poses with the loop
# closing at +0.8%. First clip in the set that did not need a --scale ramp to
# shut the loop.
#
# The loop WRAP is the one flaw and it is in the drawings, not the timing.
# Sheet 3's last pose and sheet 1's first come back 45.6 apart where a genuine
# copy scores under 35 -- the generator drew the return-to-start rather than
# repeating the start. That lands as a 21.0% change across the wrap. Worth
# writing down what does NOT fix it, because I tried all of it: shortening the
# holds on either side changes how long she dwells there, not how far she
# travels between the two drawings, so the number does not move. Nor does
# reseating the seam -- 22->1 is 45.6, 21->1 is 45.3, 20->1 is 44.3, 22->2 is
# 46.8, 21->2 is 48.9, against a biggest-internal-step of 47.2. There is no
# cheaper cut anywhere in the clip, and the wrap is not even an outlier against
# that internal maximum. Fixing it needs sheet 3 redrawn with a true copy of
# sheet 1's opening pose. At idle speed, under a shadow, it reads as one more
# tremor.
#
# --bob 2 --sway 2 and nothing else. The twirl idle gets breathe; this one does
# not, because steady breathing is exactly what she has lost.
$SLICE assets/dahlia_slip_lose_sheet.png -o out/sl_lose \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single lose
$SLICE assets/dahlia_slip_worst_sheet.png -o out/sl_worst \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single worst
$SLICE assets/dahlia_slip_back_sheet.png -o out/sl_back \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single back
python3 tools/merge_sheets.py out/sl_lose/frames out/sl_worst/frames out/sl_back/frames \
  --skip-first out/sl_worst/frames --skip-first out/sl_back/frames \
  --match-scale -o out/dahlia_slip -n dahlia_slip
$BUILD out/dahlia_slip/frames -o out/dahlia_slip -n dahlia_slip \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22 \
  --holds 4,4,4,4,4,4,4,4,4,4,4,4,4,4,3,3,3,4,4,4,4,4 \
  --fps 24 --breathe 0 --bob 2 --sway 2

# The block: panicked, played off cool. Three sheets, 24 drawings, 22 played --
# both duplicated attachment poses came back this time, scoring 34 and 17
# against a silhouette where a different drawing scores 45 or more, and the
# second is the closest copy any sheet has returned.
#
# Which is just as well, because the playoff sheet is drawn 11% smaller than
# the impact sheet and only the overlap pose could have measured that. The
# correction cross-checks: at 109.5% her standing height on that sheet lands
# within a few per cent of her standing height on the flinch sheet, which is
# the one drawing the two sheets do not share.
#
# Timing is the inverse of the attack -- fast at the front, slow at the back.
# Being caught out is quick; pretending it did not happen takes its time.
#
# Pose 20 is held for three frames where 19 and 21 get seven and six. The
# playoff sheet compressed the rise and the hair flick into single drawings, so
# 18->19 and 19->20 are both hard cuts with nothing drawn in between. A pose
# held as long as its neighbours reads as a third pose and the cut looks like a
# dropped frame; held short it reads as the movement between two, which is what
# it has to carry. The real fix is four more drawings on the rise, not timing.
$SLICE assets/dahlia_block_flinch_sheet.png -o out/blk_flinch \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single flinch
$SLICE assets/dahlia_block_impact_sheet.png -o out/blk_impact \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single impact
$SLICE assets/dahlia_block_playoff_sheet.png -o out/blk_playoff \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single playoff
python3 tools/merge_sheets.py out/blk_flinch/frames out/blk_impact/frames \
  out/blk_playoff/frames \
  --skip-first out/blk_impact/frames --skip-first out/blk_playoff/frames \
  --match-scale -o out/dahlia_block -n dahlia_block
$BUILD out/dahlia_block/frames -o out/dahlia_block -n dahlia_block \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22 \
  --holds 6,3,2,2,2,2,2,3,3,2,2,3,2,2,4,5,4,6,7,3,6,10 \
  --travel 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:10,10:26,11:38,12:44,13:46,14:46,15:46,16:44,17:40,18:34,19:18,20:8,21:3,22:0 \
  --shake 9:9,10:5 \
  --fps 24 --breathe 0 --bob 0 --sway 0

# The evade, second attempt. The first asked for the turn in degrees and the
# middle sheet came back at one angle throughout -- good blur, no rotation, she
# was dashing. Rewritten to name what can be SEEN of her on every drawing
# ("facing us straight on", "the back of her head, no face at all") with the
# degrees kept only as order labels. That fix is now in the standing format
# block, so every future prompt carries it.
#
# It worked, and it is measurable. Silhouette left-right symmetry is a rotation
# signature: a front view and a back view are both near-symmetric, a profile is
# not, so a full turn peaks twice. These sheets run 22 -> 80 (square to the
# viewer) -> 44 -> 74 (back turned) -> 27, crossing the midline 8 times. The
# first attempt peaked once at 80 and then sat flat between 30 and 38 for all
# eight drawings of its middle sheet: it never reached the back.
#
# Step evenness came in at 2.4x, 2.8x and 1.4x against a 3.4x median across
# every earlier sheet -- the first set where all three beat it.
#
# Again only one of the two copied poses was drawn. Sheet 2 does not open on a
# copy of sheet 1's last drawing (48, where the copy sheet 3 does carry scores
# 25) and it is drawn 26% larger, the worst drift yet, so its scale falls back
# to the median against the first sheet.
#
# Every drawing from the pivot through to the recovery gets exactly ONE frame.
# The first cut held the nerve pose for three frames in the middle of a run of
# one-frame drawings, which put five frozen frames inside the fastest part of
# the clip and read as the animation hitching. The timing rule for this was
# already written down and I broke it: a hold only works on a pose that is
# already at rest, and holding one caught mid-movement reads as a stutter. The
# nerve is caught mid-spin, so it is drawn and passed through rather than held.
# The turn now runs 12 drawings in 12 frames, half a second, with no frame
# repeated anywhere inside it.
#
# --scale 23:115 is the loop closing. Pose 23 and pose 1 are the same guard
# drawing, and pose 23 came back 15% smaller: same stance, 224px between the
# boots against 220, just drawn small. Everything else on that sheet measures
# right, so one pose is corrected rather than the sheet. First and last frames
# are now the same height to the pixel.
$SLICE assets/dahlia_evade2_pivot_sheet.png -o out/ev2_pivot \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single pivot
$SLICE assets/dahlia_evade2_back_sheet.png -o out/ev2_back \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single back
$SLICE assets/dahlia_evade2_land_sheet.png -o out/ev2_land \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single land
python3 tools/merge_sheets.py out/ev2_pivot/frames out/ev2_back/frames \
  out/ev2_land/frames \
  --skip-first out/ev2_land/frames --match-scale -o out/dahlia_evade -n dahlia_evade
$BUILD out/dahlia_evade/frames -o out/dahlia_evade -n dahlia_evade \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 \
  --holds 5,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,2,4,3,5,10 \
  --scale 23:115 \
  --travel 1:0,2:0,3:4,4:10,5:18,6:26,7:34,8:42,9:48,10:52,11:56,12:58,13:58,14:56,15:54,16:50,17:44,18:36,19:26,20:18,21:10,22:4,23:0 \
  --shake 20:5 \
  --fps 24 --breathe 0 --bob 0 --sway 0

# The dodge: weave, duck, back dash. Four sheets, 32 drawings, 31 played --
# this replaces the spin, which turned her back on a live attack and needed a
# nerve beat to apologise for doing it. It is also the easier thing to draw: no
# rotation, no back views, and the blur sits on a straight-line dash rather
# than a turn.
#
# The weave instruction held, which is the first time a named risk did not
# happen. Her boots were to stay planted through all eight of sheet 1 and they
# do: the right edge moves 1px across the sheet and the centre 11px, where the
# 28px on the left edge is her front foot drawing in as she leans, not a step.
#
# Only ONE of the three copied poses came back -- four sheets means three
# chances to lose it -- and the two that did not are exactly where --match-scale
# has nothing to work with. Her height genuinely collapses through the duck and
# the dash, so a median comparison would measure the crouch, and the one real
# copy (duck 8 against dash 1, scoring 28) says the dash sheet is drawn 36%
# larger than the duck sheet while the reset sheet's standing poses say it is
# drawn 45% larger than that. Those two constraints disagree and no measurement
# resolves them: the sheets are inconsistent with each other.
#
# So --sheet-scale sets them by hand, which is what that flag is for. Anchored
# on her standing height where a sheet has one -- weave 100%, duck 91%, reset
# 97% -- the loop closes exactly. The dash has no standing pose at all, so 80%
# splits the difference between the two constraints and leaves every join at 11
# to 19% instead of one at 42%. Re-rolling the dash sheet alone would fix it
# properly; it is the outlier, not the others.
#
# EVERY drawing gets one frame from the lean-back through to the landing, and
# the held time is all in the settle at the end. The first cut doubled each
# drawing of the lean, which put 11 repeated frames into an 18-frame section --
# move, freeze, move, freeze -- and that strobe is what read as strange. It was
# also 750ms for a slip, where a real one is nearer 250. It now runs 292ms with
# nothing repeated, and the same applies to the duck and the dash: no frame is
# shown twice anywhere she is still moving. Only the settle holds, because that
# is the one part where she is genuinely coming to rest.
$SLICE assets/dahlia_dodge_weave_sheet.png -o out/dg_weave \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single weave
$SLICE assets/dahlia_dodge_duck_sheet.png -o out/dg_duck \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single duck
$SLICE assets/dahlia_dodge_dash_sheet.png -o out/dg_dash \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single dash
$SLICE assets/dahlia_dodge_reset_sheet.png -o out/dg_reset \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single reset
python3 tools/merge_sheets.py out/dg_weave/frames out/dg_duck/frames \
  out/dg_dash/frames out/dg_reset/frames \
  --skip-first out/dg_dash/frames \
  --sheet-scale out/dg_duck/frames=91 --sheet-scale out/dg_dash/frames=80 \
  --sheet-scale out/dg_reset/frames=97 \
  -o out/dahlia_dodge -n dahlia_dodge
$BUILD out/dahlia_dodge/frames -o out/dahlia_dodge -n dahlia_dodge \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31 \
  --holds 3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,3,4,5,11 \
  --travel 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:2,11:4,12:6,13:8,14:9,15:10,16:10,17:30,18:60,19:95,20:125,21:145,22:158,23:165,24:160,25:150,26:135,27:115,28:85,29:55,30:25,31:0 \
  --shake 25:6 \
  --fps 24 --breathe 0 --bob 0 --sway 0

# The counter. Four sheets, 32 drawings, 29 played -- and the first set where
# ALL THREE copied poses came back: 37, 39 and 57, against a body silhouette
# where a genuinely different drawing scores 70 or more. Scale drift across the
# four is +16%, +3% and -6%, which is the tightest set so far and the reason
# --match-scale needed no help here.
#
# The named risk did not happen either. A deflection is a two-body idea drawn
# on a one-character sheet, so the obvious way to draw it is to draw the thing
# being turned aside. The enemy appears nowhere on any of the 32 drawings; the
# incoming attack is only ever the flare on her blade.
#
# --scale ramps the last seven poses from 100 to 117%. Pose 29 and pose 1 are
# the same guard drawing and 29 came back 15% smaller: same stance, 263px
# between the boots against 277, just drawn small. Spread across the settle it
# is 2 to 3% a drawing, and the first and last frames now match to the pixel.
#
# NOTHING IS HELD INSIDE THE SWEEP. Sheets 2 and 3 are one continuous movement
# -- the arc that turns the attack aside is the arc that lands -- so all 14 of
# their frames run at one drawing each with no frame repeated. The recovery is
# the same until she actually stops.
#
# The read is the exception and it is deliberate. Its drawings change 7% each,
# a third of what made the dodge's lean strobe, and she is decelerating into
# stillness rather than moving through it, so the holds read as her taking her
# time rather than as dropped frames. It is the one place in the set where
# holding mid-movement is the right call, and it is only right because the
# steps are small.
$SLICE assets/dahlia_counter_read_sheet.png -o out/ct_read \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single read
$SLICE assets/dahlia_counter_deflect_sheet.png -o out/ct_deflect \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single deflect
$SLICE assets/dahlia_counter_punish_sheet.png -o out/ct_punish \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single punish
$SLICE assets/dahlia_counter_reset_sheet.png -o out/ct_reset \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single reset
python3 tools/merge_sheets.py out/ct_read/frames out/ct_deflect/frames \
  out/ct_punish/frames out/ct_reset/frames \
  --skip-first out/ct_deflect/frames --skip-first out/ct_punish/frames \
  --skip-first out/ct_reset/frames \
  --match-scale -o out/dahlia_counter -n dahlia_counter
$BUILD out/dahlia_counter/frames -o out/dahlia_counter -n dahlia_counter \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29 \
  --holds 5,3,3,3,3,3,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,4,6,12 \
  --scale 23:100,24:103,25:106,26:109,27:112,28:115,29:117 \
  --travel 1:0,2:0,3:0,4:0,5:-2,6:-4,7:-6,8:-8,9:-14,10:-22,11:-30,12:-36,13:-40,14:-42,15:-44,16:-46,17:-48,18:-50,19:-52,20:-52,21:-50,22:-48,23:-44,24:-38,25:-30,26:-22,27:-14,28:-6,29:0 \
  --shake 9:6,19:8 \
  --fps 24 --breathe 0 --bob 0 --sway 0

# The taunt. Three sheets, 24 drawings, 21 played -- and it is the inverse of
# everything else here: she LOWERS her guard. The flex is foreknowledge rather
# than strength, so the payload is two fingers to her own temple, held.
#
# Both copied poses came back, 31 and 17, and the drift is +14% and 0%.
#
# Pose 14 is drawn and not played. It sits 7 away from pose 13 where the rest
# of that sheet steps 19 to 52 -- the same drawing twice, in the middle of the
# temple hold. Dropped, and the hold given to its neighbours instead: 13 and 15
# together carry a full second on the gesture.
#
# This is the ONE clip where long holds are unambiguously right, and it is
# worth saying why given how often the opposite has needed fixing. Everywhere
# else a doubled drawing is a freeze frame inside motion. Here she has actually
# stopped -- the whole taunt is that she is taking her time -- and a hold only
# ever works on a pose already at rest. Mean change across the clip is 4.2%.
#
# --scale on the last three poses closes the loop on HEIGHT, which is what
# pack_clips registers clips on. Her stance also comes back 17% wider than the
# opening guard, and that is the drawing rather than the scale: correcting it
# would need the width, and scaling for height makes the width worse. It is
# left as drawn, because stance width already runs 207 to 297px across the six
# clips that shipped before this one -- the variation is in the family.
#
# No --travel at all. Not a little: none. She never moves her feet, and that is
# part of the gesture -- she is not coming any closer because she does not have
# to.
$SLICE assets/dahlia_taunt_drop_sheet.png -o out/tn_drop \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single drop
$SLICE assets/dahlia_taunt_read_sheet.png -o out/tn_read \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single read
$SLICE assets/dahlia_taunt_flick_sheet.png -o out/tn_flick \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single flick
python3 tools/merge_sheets.py out/tn_drop/frames out/tn_read/frames out/tn_flick/frames \
  --skip-first out/tn_read/frames --skip-first out/tn_flick/frames \
  --match-scale -o out/dahlia_taunt -n dahlia_taunt
$BUILD out/dahlia_taunt/frames -o out/dahlia_taunt -n dahlia_taunt \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,15,16,17,18,19,20,21,22 \
  --holds 8,4,3,3,3,3,3,4,3,3,3,3,10,14,2,2,4,4,4,5,12 \
  --scale 20:102,21:104,22:107 \
  --fps 24 --breathe 0 --bob 0 --sway 0


# The fractured idle -- the one that runs after the Soul Engine has split.
# Three sheets, 24 drawings, 22 played, and it is the cleanest set of sheets
# this project has had.
#
# BOTH copied poses came back real, at 12.7 and 7.6 against a threshold of 35,
# and the scale correction was 100.0% and 99.8%. The overlap-pose instruction
# is the one the generator ignores most often -- roughly six times in ten --
# and here it landed twice, exactly.
#
# And the LOOP CLOSES. 26.3 across the wrap, under the same threshold, with the
# last pose the same height as the first to within a pixel. Every other loop in
# this set wraps at 45 or worse because the generator drew a return-to-start
# instead of repeating the start. This one repeated the start.
#
# Step evenness is 5.2x and mean change is 47.6%, which anywhere else in this
# project is a defect and here is the animation. The rule exists to stop ONE
# movement being sampled unevenly. There is no one movement here -- her weight
# throws forward, then hard back, then sideways, and none of it goes anywhere.
# Large steps at high speed read as snapping, which is what a convulsion is.
#
# Three holds and every one of them is on a pose that has actually stopped,
# which is the only condition under which a hold works: pose 5 is the jam,
# where she locks rigid; pose 11 is the brace, the first drawing where she is
# standing on something; pose 15 is the closest she gets, hand at her temple,
# and the step INTO it is 14.6 where the clip averages 47.6 -- the movement has
# already stopped by the time she arrives. Everything else gets two frames.
#
# --bob 0 --sway 0, reversing the slipping idle. Pipeline drift is smooth and
# sinusoidal, and under violent drawn motion that reads as floaty rather than
# unsteady. The instability is in the drawings. --shake takes its place, on the
# two drawings where it takes her.
#
# --travel lurches and returns to zero. Her feet are planted in all 22 drawings
# -- the foot row varies by 2px across the whole clip -- so a few pixels of
# whole-body shove reads as her being moved rather than as her walking.
$SLICE assets/dahlia_fracture_taken_sheet.png -o out/fr_taken \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single taken
$SLICE assets/dahlia_fracture_fight_sheet.png -o out/fr_fight \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single fight
$SLICE assets/dahlia_fracture_lose_sheet.png -o out/fr_lose \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single lose
python3 tools/merge_sheets.py out/fr_taken/frames out/fr_fight/frames out/fr_lose/frames \
  --skip-first out/fr_fight/frames --skip-first out/fr_lose/frames \
  --match-scale -o out/dahlia_fracture -n dahlia_fracture
#
# POSE 5 IS DRAWN AND NOT PLAYED, and dropping it was the right call rather
# than a shortening. It is the only drawing in the clip square-on to the
# camera -- arms down, feet planted, facing the viewer -- where every other
# drawing faces left. I had read it as "the jam, where she locks rigid" and
# given it a SIX FRAME HOLD, which made the flattest drawing in a convulsion
# the longest thing on screen. Dropping it costs nothing measurable: 4->6 is
# 66.4 against a biggest-step of 76.7 that the clip already contains.
#
# The fight-back is held nearly three times as long as it was. Poses 10 to 13
# are where she clamps her own arm and forces it down, and they now carry 6, 8,
# 5 and 4 frames against 2 before. Those poses are NOT at rest -- the steps
# into them run 25 to 47 -- so holding them alone would freeze-frame, which is
# the fault this project keeps having to correct. --shake is what makes it
# legitimate: a held strain pose with a tremor under it reads as effort against
# a load, which is what it is.
$BUILD out/dahlia_fracture/frames -o out/dahlia_fracture -n dahlia_fracture \
  --poses 1,2,3,4,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22 \
  --holds 3,2,2,2,2,2,2,3,6,8,5,4,3,8,2,2,2,2,2,2,3 \
  --travel 1:0,2:-8,3:6,4:-4,6:5,7:-6,8:0,9:0,10:0,11:0,12:0,13:0,14:0,15:0,16:0,17:-5,18:0,19:6,20:-3,21:-4,22:0 \
  --shake 10:3,11:5,12:4,13:3,19:6 \
  --fps 24 --breathe 0 --bob 0 --sway 0

# Her baseline frequency spec -- the clip that plays for EVERY MF spec she has,
# which is why nothing leaves her body on it. Two sheets, 16 drawings, 15
# played, and it is the first action written from her unit block in the tracker
# rather than from a description: her signature reads "micro-cinders below the
# visible spectrum, a Pyrelite still waiting to fully light", and the animation
# is that sentence drawn.
#
# The join is 11.8 and THE WRAP IS 2.8 -- the tightest match this project has
# measured, by a factor of four. The clip ends on her reference guard and hands
# back to the idle with nothing to see at the seam.
#
# --scale 15:108 and nothing else. The last drawing came back 11% smaller than
# its neighbour: body height runs 545, 567..583, 572, 572, 506, so the guard she
# ends on was drawn small. Body PIXEL COUNT confirms it is scale and not pose --
# 104,971 against 90,975, a 13% area difference, which is 7% linear. Corrected,
# the loop closes at +0.0%.
#
# Step evenness reads 4.8x and 5.8x and is not a fault here: the largest step on
# either sheet is 33 and 61, where the attack's SMALLEST was larger. She barely
# moves in this clip, which is the whole design -- her strength is 3 and her
# soul is 8, and the movement is small on purpose.
$SLICE assets/dahlia_spec_read_sheet.png -o out/sp_read \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single read
$SLICE assets/dahlia_spec_call_sheet.png -o out/sp_call \
  --keyed --components --component-min 20000 --cluster-gap 14 --fill-holes 4 \
  --align silhouette --single call
python3 tools/merge_sheets.py out/sp_read/frames out/sp_call/frames \
  --skip-first out/sp_call/frames \
  --match-scale -o out/dahlia_spec -n dahlia_spec
$BUILD out/dahlia_spec/frames -o out/dahlia_spec -n dahlia_spec \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15 \
  --holds 6,4,4,4,4,4,4,8,2,2,3,3,4,5,10 \
  --scale 15:108 \
  --fps 24 --breathe 0 --bob 0 --sway 0

# ---------------------------------------------------------------------
# PACKING COMES LAST, and that is load-bearing rather than tidy. It reads
# out/dahlia_* off disk, so anything rebuilt after it is packed in its
# PREVIOUS state. This block used to sit in the middle of the file, which
# meant a clean run packed the four clips defined below it from whatever
# happened to be on disk from the run before -- silently, since every clip
# was present and the atlas came out looking finished.
# ---------------------------------------------------------------------
# Every finished clip onto one shared canvas, and one atlas for all of them.
#
# --match-scale is the second half of that and it was missing for nine clips.
# Registering POSITION is not enough on its own: the sheets behind different
# clips came back at very different sizes, and in the packed atlas her body
# measured 269px on the idle and 450px on the slipping idle. Her feet were in
# the right place and she was 67% larger -- so she jumped size every time the
# panel changed clip, silently, because each clip looked correct on its own.
#
# The measure is sqrt(body area) rather than height, because height is a
# property of the POSE: she is 325px through the dodge because she spends it
# crouched and 603px through the slipping idle because she spends it upright.
# Normalising on height would make her grow every time she stood up. Across
# these clips the spread of sqrt(area) within a clip is under 6% where height
# varies by 17%.
#
# Everything is brought DOWN to the smallest clip, so no frame is ever
# enlarged: the newer sheets have resolution to spare and the idle does not.
# Cross-clip spread goes from 1.70x to 1.14x, and what is left is pose rather
# than scale.
#
# The assembler sizes each clip's canvas to that clip, which is right inside a
# clip and wrong between them: the idle, the hit and the attack came out
# 436x431, 459x378 and 485x385, with her boots 8, 12 and 16px off the bottom and
# 119px apart horizontally. That is a jump every time the animation changes.
# Registering the clips to each other brings it to 0px vertically and 3.3px
# horizontally -- the residual is two ways of measuring where her boots are
# disagreeing, not her moving.
#
# A clip is moved, not a frame. The frames inside a clip are already registered
# and some of their motion is deliberate, so they all take the same offset.
python3 tools/pack_clips.py out/dahlia_twirl out/dahlia_hit out/dahlia_attack \
  out/dahlia_block out/dahlia_dodge out/dahlia_counter out/dahlia_taunt out/dahlia_slip out/dahlia_fracture out/dahlia_spec \
  --match-scale -o out/atlas -n dahlia --preview --preview-scale 0.5

# The same clips sized for a web page, where she is displayed small and the
# bytes matter -- less than they did, since the tracker is opened off disk
# rather than fetched, so 0.75 buys real resolution for load time nobody waits
# on. --format webp here is a STILL image, not an animation: the
# atlas is one picture either way, and WebP stores it in a third of the PNG's
# bytes with the same pixels and the same alpha. At eight clips the same
# atlas is 23.4MB as PNG and 6.8MB as WebP.
# --role names each clip by what it IS rather than whose it is. With more than
# one character in the tracker the panel has to ask for "the hit", not for
# "dahlia_hit", so roles are what the manifest carries and the atlas basename
# is what matches a unit by name.
python3 tools/pack_clips.py out/dahlia_twirl out/dahlia_hit out/dahlia_attack \
  out/dahlia_block out/dahlia_dodge out/dahlia_counter out/dahlia_taunt out/dahlia_slip out/dahlia_fracture out/dahlia_spec \
  --role out/dahlia_twirl=idle --role out/dahlia_hit=hit \
  --role out/dahlia_attack=attack --role out/dahlia_block=block \
  --role out/dahlia_dodge=dodge --role out/dahlia_counter=counter \
  --role out/dahlia_taunt=taunt --role out/dahlia_slip=slipping --role out/dahlia_fracture=fractured --role out/dahlia_spec=spec \
  --match-scale -o out/web -n dahlia --scale 0.75 --format webp
cp out/web/dahlia_atlas.webp out/web/dahlia_atlas.json web/

# Put the sprite feed into the combat tracker. Re-runnable: the injected block
# is bounded by two markers and any earlier copy is removed first, so adding an
# animation to the atlas means re-running this and nothing else. Deleting the
# block between the markers restores the tracker byte for byte.
#
# The tracker is opened off disk, so the atlas cannot be fetched -- file://
# blocks it -- and it is inlined as a data URI, which is how that file already
# carries its battle-map backdrops.
# Every <name>_atlas.json in out/web becomes one member of the cast, and its
# basename is the match key: dahlia_atlas.json plays for any unit whose name
# contains "dahlia". Adding a character is packing an atlas next to the others
# and re-running this.
# python3 tools/inject_sprite_panel.py path/to/BLACKBOX_MERC_OS.html -a out/web
