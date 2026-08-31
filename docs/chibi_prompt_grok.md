# Chibi portraits for the Wavelengths — Grok prompt

Written from scratch around measurements taken off the three style targets,
because the previous versions described the look in adjectives and adjectives
are what Grok keeps getting wrong.

## What the three targets actually have in common

Measured, and checked by drawing the detected head/body split back onto each
image to confirm it lands on the jaw:

| | head as % of figure height | head width vs shoulders | widest point of silhouette | stroke at 1024 |
|---|---|---|---|---|
| lab coat | 54%* | 1.04× | hair, 31% down | ≈ 6 px |
| teal hair | 68% | 1.50× | hair, 28% down | ≈ 10 px |
| swordsman | 68% | 1.24× | hair, 29% down | ≈ 10 px |

\* the lab-coat figure reads lower only because her raised hands extend the
body downward; her head is the same size.

Three constants fall out, and they are the whole prompt:

1. **The figure is about two head-heights tall.** The head fills the top
   two-thirds; everything below the jaw is the bottom third. This is the thing
   that was missing — "oversized head" is an adjective, "two heads tall" is a
   measurement, and it is standard art vocabulary an image model already knows.
2. **The head is as wide as the whole picture** — 87–96% of the figure's total
   width, and always at least as wide as the shoulders. The body is the
   narrowest part.
3. **The widest point of the silhouette is the hair, about 30% down.** Not the
   shoulders, not the chin. If the widest thing in the result is the shoulders,
   it is a bust portrait and not a chibi, whatever else is right about it.

One thing that is *not* constant, and should not be locked down: **eye shape.**
The teal one has big round eyes, the swordsman has narrow half-lidded ones, the
lab coat has wide startled ones. Eye shape is carrying the expression in all
three, so the prompt asks for the eye *construction* and leaves the shape to
the expression slot.

## What the slot needs

| | |
|---|---|
| `.wl-chibi-slot` | **56 × 56 px**, `border-radius: 12px` |
| `.wl-detail-chibi` | **76 × 76 px**, `border-radius: 16px` |
| both `img` | `object-fit: cover` — anything not square gets centre-cropped |
| slot background | near-black panel, dashed ring in that person's own colour |

The chibi build is the right shape for this: a head that is two-thirds of the
picture spends the pixels on the face and hair, which are the only things that
survive being shown at 56 pixels.

---

## The prompt

Attach the character reference **and one of the three style targets**. Set
**1:1 / 1K / medium**. Fill the slots. Send.

> Turn the attached character into a chibi sticker portrait, drawn in the style
> of the second attached image.
>
> **Proportions — the most important part.** The whole figure is **two
> head-heights tall**. The head, from the top of the hair to the chin, fills
> the **top two thirds** of the picture; the body is only the bottom third.
> The head is **as wide as the entire image and wider than the shoulders** —
> the body is the narrowest part of the figure. The widest point of the whole
> silhouette is the **hair, about 30% down from the top**. Crop at the chest:
> no waist, no legs.
>
> **Head:** large and round with a soft jaw and a small chin, ears visible.
> Eyes large, with a white sclera, a dark upper lash line and a coloured iris
> with one highlight — shaped to suit **[EXPRESSION]**. Nose barely indicated.
> Small simple mouth.
>
> **Hair:** the biggest shape in the picture. Layered solid masses with hard
> pointed tips, matching the reference's hairstyle exactly — length, parting,
> volume, any braid or shave.
>
> **Body:** small and narrow, but dress it properly. Reproduce the outfit they
> are actually wearing in the reference — collar, closure, straps, buckles,
> patches, seams — as clean flat shapes. Do not substitute a generic jacket.
> They are wearing **[OUTFIT]**. Hands: **[HANDS]**.
>
> **Rendering:** clean uniform lineart, about **10 pixels on a 1024 canvas**,
> near-black, the same weight on the outer contour as inside — no thick border.
> Flat cel colour, two tones per material. Palette built around **[HEX]**.
>
> **Frame:** square; the figure fills about 85% with an even margin all round
> and clear of the corners. Background one flat single colour, edge to edge —
> nothing else in the picture. No text, logos or watermark. One character.

### The slots

| slot | how to fill it |
|---|---|
| `[EXPRESSION]` | Their resting face — "narrow, half-lidded, unbothered", "wide and startled", "flat and tired". Drives the eye shape, which is what makes 66 portraits look like 66 people. |
| `[OUTFIT]` | The garment plus two or three details: "brown field jacket, white leather chest harness with steel rings". "Brown clothes" is not enough — this slot exists because vagueness here is what makes the model reach for a generic hoodie. |
| `[HANDS]` | Optional. "Not in frame" is a real answer — one target shows no hands at all. Use them when the character holds something. |
| `[HEX]` | The connection's own `color` value from the file, exactly. It also draws the ring around the slot. |

### If it comes back wrong

Add **one** line, not all of them:

| symptom | line to add |
|---|---|
| still looks like a bust | "The head is too small. Make the whole figure exactly two head-heights tall — the head alone fills the top two thirds of the image, and the shoulders are narrower than the head." |
| shoulders are the widest thing | "The widest point of the silhouette must be the hair, about a third of the way down, not the shoulders." |
| lines too thick | "Thinner, cleaner lineart — about 10 pixels on a 1024 canvas — and the outer contour the same weight as the interior lines, with no heavy border." |
| generic clothes | "Wrong outfit. They wear [OUTFIT] — reproduce it from the first image including the [detail] and the [detail], as flat shapes." |
| whole face is one expression | "Reshape the eyes to suit [EXPRESSION] — keep the white sclera and lash line, change the lid shape." |
| filling the frame | "Zoom out; leave an even band of background on all four sides with nothing touching the edge." |
| wrong person | "Use the first image for who they are and the second only for how it is drawn." |

Grok Imagine edits regionally — the **magic wand** changes only the area you
point at — so on a version you mostly like, point and give it one line rather
than rerolling. Avoid **Smart Resize**: it fills in a new frame rather than
cropping, which invents body and background you then have to remove.

---

## Examples from the roster

Their `color` values, straight out of the file:

| | hex | outfit hook | expression | hands |
|---|---|---|---|---|
| **Zazz** | `#d4af6a` | jacket several sizes too big, stopwatch on a cord | busy, unimpressed | clutching the stopwatch |
| **Neven Ishmael** | `#cc6b3f` | motel keeper's apron, ring of keys at the belt | patient, tired | keys on one hooked finger |
| **Iss** | `#b83fff` | bandages wrapped over both eyes | calm, unreadable | not in frame |
| **Loriel** | `#ff9b1f` | cook's whites, rag over one shoulder | retired, watchful | wiping both hands |
| **Bone Sage Nethra Volkesh** | `#b83fff` | bone regalia framing the head and shoulders | composed, cold | not in frame |
| **Gadget** | `#ffd873` | oversized salvage coat, far too big for her | indignant | both fists planted |
| **Vireth** | `#5c8a7a` | patched room-clothes, strange metal arm | withdrawn | metal arm forward |
| **Adam** | `#ff6b4a` | facility jumpsuit, cut restraint still on one wrist | wired, alert | both wrists up |
| **Jamie** | `#c9a6ff` | recon rig, tattoos visibly mid-shift | clinical | one hand raised |
| **Psalmatron** | `#ff2f92` | a crooked copy of someone else's clothes | grieving, wrong | one hand reaching |

**Pairs** — Dau-Lu and Chi-Mika, Riv and Rev, the Namesins. Two figures in a
56-pixel square is two smudges. Draw one and suggest the other with a single
object. **Not people** — The Junkyard Demon, SWORD. Drop the head and body
fields, keep the rendering and frame fields, use an object in the same style.
**Never seen** — Thessun Volkesh. A flat silhouette in his accent colour with
one detail picked out is more honest than an invented face, and reads as
deliberate next to the others.

---

## From the generated image to the file

```
python3 tools/key_chibi.py ~/Downloads/zazz.png --checker --rim 1.4 --uri
```

- `--checker` removes a painted transparency checkerboard by flooding in from
  the frame edge, so a white coat or a pale prop inside the outline survives.
  Use `--alpha` instead if Grok's Background Removal gave you real
  transparency, or drop both and pass `-k green` if you asked for a chroma
  field.
- `--rim 1.4` draws the white die-cut sticker border. It is done here rather
  than asked for in the prompt because image models read "border" next to
  "outline" and draw a thick black ring. Drawn here it is exact, even, and
  identical on all 66.
- It then trims to what is drawn, re-pads square, resizes to 512, and writes
  the `data:` URI plus **a magnified 56-pixel view — the only size that decides
  whether it worked.**

Export **PNG, never JPEG.** JPEG cannot carry transparency and silently
discards the background removal.

Then paste it in. The `chibi` field goes straight into `<img src="…">`, and the
Ledger runs off a disk where `file://` will not reliably fetch a sibling image,
so the data URI is the one that always works:

```js
chibi: "data:image/png;base64,iVBORw0KGgo…"
```

All 66 connections sit at `chibi: null` and there is no picker in the UI — it
is a hand edit per person for now. Say the word and it becomes a file button on
the connection's edit view that does all of the above in the browser.
