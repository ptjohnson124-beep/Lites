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
# Evasion: thirteen drawings, not twelve — the top row of this sheet holds five.
# She gives 34px of ground at the furthest point and walks it back.
$SLICE assets/dahlia_dodge_v2_sheet.png -o out/dahlia_dodge \
  --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN --single dahlia_dodge
$BUILD out/dahlia_dodge/frames -o out/dahlia_dodge -n dahlia_dodge \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13 --holds 12,3,2,2,2,2,3,5,3,3,4,5,10 \
  --fps 20 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --travel 1:0,2:0,3:-8,4:-18,5:-28,6:-34,7:-30,8:-20,9:-12,10:-6,11:-2,12:0,13:0

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

# Special / skill, from the v7 sheet: eleven drawings, and the smoothest layout
# of the seven. Measured as the mean pixel change between consecutive drawings,
# its average step is 82 against v6's 93, and only 2 of its 10 transitions are
# large where 4 of v6's 9 were — v6 crossed its whole vortex section in a run of
# big jumps, this one spends four drawings climbing into the peak and six coming
# down. It is also the first skill sheet whose effect never blinks in reading
# order: none, glitch, orb, vortex, peak, wake, trail, none, none. Nothing has
# to be reordered.
#
# 3.67s, against v6's 2.17s. The skill had been getting shorter with every sheet
# — 5.45, 3.75, 2.67, 2.25, 2.17 — and had run past deliberate into hurried.
#
# The release and the recovery are timed against each other rather than evenly.
# Poses 4 to 6 — the vortex closing, the beam, the punch through it — run 0.63s
# together, half what they held before: an unleash reads as force when it snaps
# and as a slideshow when it is savoured. Everything after it slows down and
# keeps slowing, 0.33s to 0.58s per drawing across the five recovery poses, so
# the clip lands heavily instead of stopping.
#
# Grain filter swept on this sheet as on v6: 10 takes 19% for no measurable loss
# of line work (100.2%), 14 starts cutting into the drawing (94%).
$SLICE assets/dahlia_skill_v7_sheet.png -o out/dahlia_skill \
  --components --tol 14 --glow-tol 0 --fill-holes 3 \
  --despeckle 24 --denoise 10 --unmatte 45 --align silhouette --single dahlia_skill
$BUILD out/dahlia_skill/frames -o out/dahlia_skill -n dahlia_skill \
  --poses 1,2,3,4,5,6,7,8,9,10,11 \
  --holds 10,6,7,4,7,4,8,9,10,9,14 \
  --fps 24 --breathe 0 --bob 2 --sway 2 \
  --shake 4:4,5:7,6:5 \
  --travel 1:0,2:0,3:0,4:4,5:10,6:20,7:14,8:8,9:4,10:0,11:0

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

# Soul attack: energy gathers, the flame peak, gold, then the lunge into the
# vortex, lightning, and two slash frames before settling. Retimed from 4.0s to
# 2.7s — at 20fps with eight- and ten-frame holds it dragged. The two extremes
# still get the longest holds, the ignition and the burst; everything between
# them now moves. Only the smear at pose 9 is short enough to read as speed.
$SLICE assets/dahlia_soul_sheet.png -o out/dahlia_soul \
  --components --tol 14 --glow-tol 0 --fill-holes 3 $CLEAN_SMALL --single dahlia_soul
$BUILD out/dahlia_soul/frames -o out/dahlia_soul -n dahlia_soul \
  --poses 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16 \
  --holds 4,3,3,3,3,7,3,5,2,8,3,3,3,4,4,6 \
  --fps 24 --breathe 1.2 --breathe-cycles 2 --breathe-levels 12 --sway 2 \
  --shake 6:3,10:8,11:4 --travel 9:12,10:16,11:10,12:6,13:2

# Grab: six drawings — rest, set, the lunging reach, the seize, the hold, the
# release. The highest resolution in the whole set at 436px tall, because the
# sheet spends 1091x976 on six poses.
#
# It needs a different key from every other sheet. The background here is dark
# (49,54,60) rather than mid-grey, and her trousers average (37,37,42) and her
# boots (39,42,47) — closer to that backdrop than her hair is to anything. At
# the usual --tol 14 the flood walks down her outline and hollows out both legs.
# The background is a flat fill, though, no gradient and no grain: 99% of the
# sheet edge sits within 2 levels of one colour. So the tolerance goes down to
# 3, which takes the backdrop and nothing else.
#
# That leaves the antialiased rim standing as a dark speckled fringe, invisible
# against this sheet and obvious against anything lighter — which is what
# --glow-tol is for. At 20 with --glow-depth 3 it clears the rim while staying
# three pixels from the silhouette, so the trousers never come into range.
#
# Timed as a snatch: the reach and the seize are the two fastest beats in any
# animation here, 0.13s and 0.17s, and the hold that follows is 0.58s. A grab
# is not a swing — it is quick, quick, then nothing moves at all.
$SLICE assets/dahlia_grab_sheet.png -o out/dahlia_grab \
  --components --tol 3 --glow-tol 20 --glow-depth 3 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_grab
$BUILD out/dahlia_grab/frames -o out/dahlia_grab -n dahlia_grab \
  --poses 1,2,3,4,5,6 \
  --holds 8,6,3,4,14,8 \
  --fps 24 --breathe 0 --bob 2 --sway 2 \
  --shake 4:6 \
  --travel 1:0,2:0,3:26,4:14,5:8,6:2

# Throw: its own eight-drawing sheet, replacing the version built by replaying
# the grab sheet backwards. That trick worked — pose 3 there was the reach when
# the arm was opening and the release when it was closing — but this sheet has
# what a reordering cannot invent: a drawn motion-blur frame at the hurl, and a
# separate arm-cocked-back pose to coil on. 374px tall.
#
# White background this time, which the keying handles at --tol 12 without help:
# her hoodie is white too, but it is outlined all the way round, so the flood
# has no path in. No --unmatte — there is nothing glowing on this sheet, and on
# a white backdrop the "glow is brighter than the background" assumption it
# rests on is meaningless.
#
# Timed on the coil and on the held release, not on the hurl. The wind-up holds
# 0.54s and the extension after it 0.38s, while the hurl between them stays at
# 0.13s: what sells a throw is the time either side of the fast frame, since the
# fast frame is over before the eye resolves it. Travel goes 8px backwards on
# the coil before 32px forward — a small move against the throw is what makes
# the throw look like it cost something. 2.75s.
$SLICE assets/dahlia_throw_sheet.png -o out/dahlia_throw \
  --components --tol 12 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_throw
$BUILD out/dahlia_throw/frames -o out/dahlia_throw -n dahlia_throw \
  --poses 3,5,6,4,7,2,1 \
  --holds 12,13,3,9,8,8,13 \
  --fps 24 --breathe 0 --bob 2 --sway 2 \
  --shake 6:6 \
  --travel 3:0,5:-8,6:32,4:22,7:14,2:6,1:0

# Stagger: ready, the hit, the reel, dazed, recovering, ready. Six drawings and
# no anticipation on the impact — you do not wind up to be hit, so pose 2 lands
# straight out of the stance at 0.13s. The daze is where the time goes, 0.58s on
# a single drawing, and the recovery is slower than the reel.
#
# --travel supplies what the sheet does not draw: she gives 22px of ground over
# the reel and walks it back as she recovers. The drawings stay in place on
# their sheet, so without it a stagger reads as a wobble rather than as being
# knocked off balance.
#
# --unmatte 0, and that matters on a white sheet. The flag assumes glow is
# brighter than the backdrop; against white nothing is, so instead of lifting
# the aura it eats her hoodie — 8631 near-white pixels gone and 976 more turned
# half-transparent when it was left at 45. The dagger's teal is drawn in real
# colour here rather than blended over the paper, so it needs no help.
$SLICE assets/dahlia_stagger_sheet.png -o out/dahlia_stagger \
  --components --tol 12 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_stagger
$BUILD out/dahlia_stagger/frames -o out/dahlia_stagger -n dahlia_stagger \
  --poses 1,2,3,4,5,6 \
  --holds 6,3,5,14,8,10 \
  --fps 24 --breathe 0 --bob 2 --sway 2 \
  --shake 2:9,3:5,4:2 \
  --travel 1:0,2:-14,3:-22,4:-18,5:-8,6:0

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
# Both sheets are ruled with a full-width ground line under each row, which
# fuses every pose in the row into one component. --panels erases it, but two
# things in the detector had to change before it could see it, both recorded in
# the README: an absolute darkness threshold means nothing on a navy backdrop
# darker than the threshold itself, and line uniformity has to be measured
# against the median, because a ground line is uniform along its length and wild
# where eight pairs of boots cross it.
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
  --panels --components --component-min 3000 --tol 8 --glow-tol 0 --fill-holes 4 \
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
  --panels --components --component-min 3000 --tol 8 --glow-tol 0 --fill-holes 4 \
  --despeckle 24 --denoise 10 --unmatte 0 --align silhouette --single dahlia_getup
$BUILD out/dahlia_getup/frames -o out/dahlia_getup -n dahlia_getup \
  --poses 1,2,3,4,5,6,7,8 \
  --holds 10,7,7,6,6,5,6,12 \
  --fps 24 --breathe 0 --bob 2 --sway 2 \
  --shake 6:3 \
  --travel 1:0,2:0,3:4,4:8,5:10,6:8,7:4,8:0
