# Chibi portraits for the Wavelengths

A prompt for turning a reference image — art, a photo, a sketch, an earlier
portrait — into a chibi that actually works in the slot it has to live in.

## What the slot really is

Read off the Ledger's own CSS rather than guessed, because every one of these
changes what the image has to be:

| | |
|---|---|
| `.wl-chibi-slot` | **56 × 56 px**, `border-radius: 12px` |
| `.wl-detail-chibi` | **76 × 76 px**, `border-radius: 16px` |
| both `img` | `width:100%; height:100%; **object-fit: cover**` |
| slot background | dark panel (`--wood2`), dashed border in the person's own colour |

Three consequences, and they are the whole brief:

1. **`object-fit: cover` centre-crops anything that isn't square.** A portrait
   in 3:4 loses a third of its height. Generate **1:1**, always.
2. **56 pixels.** That is smaller than the text next to it. Fine linework,
   crosshatching, small props, faces with detailed features and anything
   written on the character all turn to grey mush. The image has to work as a
   *silhouette plus three or four values*.
3. **The corners get rounded off.** Nothing that matters — a horn tip, a
   weapon, a hand — can live in the corner 12px.

---

## The prompt

Attach the reference image, then paste this with the four bracketed slots
filled in:

> Redraw the attached character as a **chibi bust**, square 1:1 composition,
> for use as a 56-pixel avatar.
>
> **Proportions:** roughly 1:1.6 head-to-body — oversized head, small
> shoulders and upper chest only, cropped just below the collarbone. Large
> simplified eyes, minimal nose and mouth. Keep the head slightly off-centre
> vertically so it sits in the upper two-thirds of the frame.
>
> **Keep faithfully, in priority order:** silhouette of the hair, the single
> most identifying garment or piece of gear, and the palette. **[NAME]** —
> the one thing that must survive is **[THE ONE READABLE FEATURE: e.g. the
> bone-white mask, the split-colour hair, the welding goggles, the missing
> arm]**. Drop everything else before dropping that.
>
> **Style:** flat cel shading, two shadow steps at most, **thick clean outline
> (about 3% of the image width)**, no gradients, no texture, no rendering
> detail. Grimy near-future / desert-cyberpunk tone — worn fabric, taped
> repairs, matte metal — but rendered *simply*, damage as shape not as noise.
>
> **Palette:** limit to four or five colours total. Anchor them to
> **[HEX]** so the portrait reads as the same person the card frame does;
> use it for the strongest accent — hair, cloth, glow, or trim — and keep the
> rest desaturated around it.
>
> **Background: fully transparent.** No panel, no circle, no vignette, no
> ground shadow, no drop shadow. The alpha channel must be clean to the edge.
>
> **Framing:** subject fills about 84% of the frame, centred, with even
> margin. **Keep all silhouette away from the four corners** — the image is
> displayed with rounded corners and anything in them is cut off.
>
> **Legibility test — this is the actual pass/fail:** the result must still be
> recognisable as **[NAME]** when shrunk to 56×56. High contrast between the
> character and empty space. No text, no logos, no signature, no watermark.
>
> Output **PNG, square, 512×512, transparent background.**

### Negative prompt

If the tool takes one:

```
full body, legs, feet, background, scenery, ground shadow, drop shadow,
vignette, circle frame, badge, border, gradient, photorealistic, painterly,
heavy rendering, noisy texture, small details, crosshatching, text,
watermark, signature, logo, multiple characters, rectangular crop,
white background, off-centre crop
```

---

## Filled examples

Using the real accent colours out of the Ledger:

**Zazz** — `#d4af6a`
> …the one thing that must survive is **the scorekeeper's stopwatch on its
> cord and the too-big jacket**. Anchor the palette to **#d4af6a**…

**Psalmatron** — `#ff2f92`
> …the one thing that must survive is **the wrong-copy resemblance — her hair
> and eyes worn crooked**. Anchor the palette to **#ff2f92**…

**Anti-Rover Captain, Ridge** — `#8a8394`
> …the one thing that must survive is **the captain's coat and the
> dream-smoke pipe**. Anchor the palette to **#8a8394**…

**Bone Sage Nethra Volkesh** — `#b83fff`
> …the one thing that must survive is **the bone regalia framing the head**.
> Anchor the palette to **#b83fff**…

Every connection already carries its own hex in the file — that colour draws
the card's left bar and the dashed ring around the slot, so matching it is
what makes a portrait look *seated* rather than pasted on.

---

## Getting the PNG into the file

The `chibi` field is dropped straight into `<img src="…">`, so it takes either
a path or a data URI. The Ledger is opened off a disk as one file, and
`file://` will not reliably fetch a sibling image — so **a data URI is the one
that always works**:

```js
chibi: "data:image/png;base64,iVBORw0KGgo…"
```

All 66 connections currently sit at `chibi: null`, and there is no picker in
the UI to set them — right now it is a hand edit per person. Say the word and
that becomes a file button on the connection's edit view that does the
encoding itself.

### Before you encode

- Trim the transparent margin so the subject really does fill the frame;
  `object-fit: cover` will happily zoom into empty space.
- 512×512 is plenty. A 1024px PNG is roughly 4× the bytes for a 56px slot,
  and 66 of those is megabytes of file for nothing.
- Then **look at it at 56px**. Not at 100%. If you can't tell who it is,
  the prompt needs the "one readable feature" line sharpened, not more detail.
