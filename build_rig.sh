#!/bin/sh
# The rig pipeline, which is not the animation pipeline.
#
# A pose sheet is sliced into frames that share a canvas, because an animation
# wants its drawings registered to each other. A rig piece wants its own tight
# crop and its own offset, because the skeleton decides where it goes — so
# there is no --align here, and the pieces are packed rather than stacked.
#
# --component-min is an order of magnitude below the animation builds: a
# forearm is a fraction of a pose's ink. The head sheet needs it lower again,
# because her eyes are two islands of about 5000 pixels and the threshold that
# keeps a boot from splitting will drop them entirely.
set -e
SLICE="python3 tools/slice_sheet.py"
KEY="--components --cluster-gap 8 --tol 6 --glow-tol 0 --fill-holes 3 --despeckle 24 --unmatte 0"

$SLICE assets/dahlia_rig_head_sheet.png -o out/rig_head $KEY --component-min 1200 --single head
$SLICE assets/dahlia_rig_body_sheet.png -o out/rig_body $KEY --component-min 4000 --single body
$SLICE assets/dahlia_rig_legs_sheet.png -o out/rig_legs $KEY --component-min 4000 --single legs

python3 tools/pack_atlas.py rig/dahlia.json -o out/rig -n dahlia
python3 tools/rig_skeleton.py rig/dahlia.json -o out/rig -n dahlia --preview --preview-anim

# The same file twice under two version claims. What this emits is the same
# either way -- bones, slots, an array of skins, rotate timelines keyed on
# "angle" -- so the only thing the version string changes is which editors
# accept it without argument. 4.2 is what a current editor and current runtimes
# expect; the 3.8 copy is there because a 4.x editor reads 3.8 and a 3.8 editor
# cannot read 4.x, so one of the two always works.
python3 tools/rig_skeleton.py rig/dahlia.json -o out/rig -n dahlia-3.8 --parts-name dahlia --spine 3.8.75
