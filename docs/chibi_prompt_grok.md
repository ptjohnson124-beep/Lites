# Chibi portraits for the Wavelengths — a Grok prompt

## Before the prompt: two things about Grok that decide its shape

**Use Grok Imagine, the app — not the image API.** The API has no documented
image-to-image or reference-image support, no background removal, and hands
back JPEG, which cannot carry an alpha channel at all. Its parameters are
`prompt`, `n`, `aspect_ratio`, `resolution` (1k/2k), `quality` (low/medium) and
`response_format`, and that is the whole surface. Grok Imagine Image 2.0 has
the two things this job needs: **multi-ref editing, up to five input images**,
and **Background Removal, which exports the subject with real transparency**.

**Grok's house guidance is short prose plus structured parameters** — one to
three sentences, then constraints. That is not an argument for a vague prompt;
it is an argument for putting the detail in *labelled fields* rather than in
paragraphs. Long rambling prose makes Grok worse. A long structured spec does
not. Everything below is built that way: three sentences of style, then twelve
labelled fields it can follow one at a time.

Two smaller ones: there is **no negative prompt** on Grok, so every exclusion is
written as what should be there instead; and **1:1 is a setting, not a
sentence** — pick the ratio in the UI rather than arguing for it in the text.

## What the slot really is

Read off the Ledger's own CSS, because every line of it decides a field below:

| | |
|---|---|
| `.wl-chibi-slot` | **56 × 56 px**, `border-radius: 12px` |
| `.wl-detail-chibi` | **76 × 76 px**, `border-radius: 16px` |
| both `img` | `width:100%; height:100%; **object-fit: cover**` |
| slot background | dark panel `#1a1722`, dashed border in that person's own colour |

`cover` centre-crops anything not square. 56px turns fine linework to grey mush.
Rounded corners clip whatever sits in them. The panel behind is *dark*, so a
character whose palette is mostly dark loses their silhouette entirely.

---

## The prompt

Attach the reference. Set **aspect ratio 1:1**, **resolution 1K**, **quality
medium**. Fill the four bracketed slots and send:

> Redraw the character in the reference image as a chibi bust sticker — a
> single figure, oversized head, tiny body, cropped at the chest, drawn as
> flat vector art with a heavy outline. It will be displayed as a 56-pixel
> avatar on a dark panel, so it must read at that size above all else. Keep
> them recognisably the same person as the reference.
>
> **PROPORTIONS**
> Head-to-body ratio about 1 : 1.6 — the head is the subject and the body is a
> plinth for it. The head occupies roughly 55% of the frame height and 60% of
> its width. Shoulders span about 1.15× the head's width, no wider. Crop the
> body just below the collarbone; no arms, no hands, no waist, no legs. Set
> the whole figure slightly high in the frame, with the eyeline at about 45%
> down from the top.
>
> **FACE**
> Large simple eyes, roughly 1/4 the head's width each, with a single flat
> highlight and no eyelashes or iris detail. Nose reduced to a small mark or
> omitted. Mouth a single simple shape. Brows readable as two solid strokes.
> Expression: **[EXPRESSION — their default resting face: wary, amused, flat,
> tired, openly delighted]** — one clear emotion, held plainly, not extreme.
>
> **HAIR**
> Hair matters more than the face at this size, because it is most of the
> silhouette. Reproduce its outline shape faithfully from the reference —
> length, parting, volume, any distinctive spike, braid, horn or shave — as
> two or three solid masses with a hard edge. No individual strands, no
> gradient, no wispy ends.
>
> **IDENTITY ANCHOR**
> For **[NAME]**, the one detail that must survive at 56 pixels is
> **[THE ONE READABLE FEATURE — the bone-white mask, the split-colour hair,
> the welding goggles, the bandaged eyes, the missing arm]**. Draw it large,
> in high contrast against whatever it sits on, and simplify literally
> anything else before you simplify this. If it competes with another detail
> for space, the other detail loses.
>
> **LINE**
> One heavy outline of consistent weight around the whole silhouette, about 3%
> of the image width — thick enough that it survives being scaled to 56px.
> Interior lines only where a shape genuinely needs separating, at roughly
> half the outer weight. Total interior line count in single digits. Corners
> and joins clean and rounded. No crosshatching, no sketch lines, no
> stippling, no line-weight tapering.
>
> **SHADING**
> Two tones per colour at most: the base and one shadow step, hard-edged, cel
> style. Light from the upper left, so shadow falls under the jaw, under the
> hair mass, and on the right side of the shoulders. No gradients, no ambient
> occlusion, no rim light, no glow, no bloom, no specular highlights beyond
> the single flat one in each eye.
>
> **PALETTE**
> Exactly five colours, no more, each doing one job: the accent **[HEX]**,
> which must be the loudest thing in the picture and cover roughly 25–35% of
> the figure; a skin tone; one garment colour; one dark for the outline and
> shadow steps; and one light for highlights. Everything that is not the
> accent should be visibly desaturated so the accent carries alone. Put the
> accent where the eye lands first — hair, hood, collar, visor, trim.
>
> **CONTRAST AGAINST THE PANEL**
> This sits on a dark background, near-black. Keep the outer silhouette
> lighter or more saturated than that so the figure separates from the panel.
> If the character's own palette is very dark, add a thin light rim inside the
> outline along the top and left of the silhouette so the shape still reads.
>
> **MATERIAL AND WEAR**
> The world is a grimy desert-cyberpunk one — worn fabric, taped repairs,
> patched armour, matte scuffed metal, dust in the seams. Show all of that as
> three or four bold flat shapes: a torn edge as one notch, a repair as one
> stripe of tape, grime as one darker block along a hem. Keep surfaces
> otherwise smooth and unrendered, with no photographic texture, no noise, no
> speckle and no visible grain.
>
> **FRAMING**
> The figure fills about 84% of the square, centred horizontally, with an even
> band of empty background on all four sides. Keep the entire silhouette clear
> of the four corners — the image is displayed with rounded corners and
> anything in them is cut away. Nothing touches or crosses the frame edge.
>
> **BACKGROUND**
> One flat, unbroken, perfectly even colour filling the frame edge to edge:
> no scenery, no floor, no horizon line, no gradient, no vignette, no glow
> around the figure, no drop shadow, no cast shadow, and no checkerboard
> pattern. The background colour must not appear anywhere on the character.
>
> **SURFACE**
> The image carries no lettering, numbers, logos, signatures, watermarks,
> speech bubbles, borders, frames or badges. One character only, facing
> roughly forward, no second figure and no companion animal.
>
> **ACCEPTANCE TEST**
> Scaled down to 56 pixels across, it should still be obviously
> **[NAME]** — silhouette distinct, **[THE ONE READABLE FEATURE]** still
> visible, accent colour still dominant. If a detail would vanish at that
> size, remove it now rather than drawing it small.

### The four slots, and how to fill them well

| slot | what actually goes in it |
|---|---|
| `[NAME]` | Their name as the Ledger has it. Grok uses it in the acceptance test line, which is where it does the most work. |
| `[THE ONE READABLE FEATURE]` | **One** thing, describable in under ten words, that is *visible in silhouette or in colour*. "Kind eyes" is not one. "Bandages over both eyes" is. |
| `[HEX]` | The connection's own `color` value out of the file. Not an approximation — this exact colour draws the card's left bar and the dashed ring around the slot. |
| `[EXPRESSION]` | Their resting face, one word or two. This is what stops 66 portraits looking like the same doll in different hats. |

### Fixing it without rerolling

Grok Imagine edits regionally, which is the part worth using — the **magic
wand** changes only the region you point at, and **segmentation** selects a
precise area like one garment. Correct in place instead of regenerating and
losing the version you liked:

| what's wrong | point at | say |
|---|---|---|
| mushy at small size | the outline | "Thicken this outline to about 3% of the image width so it survives at 56 pixels." |
| soft or busy background | the background | "Make this one perfectly flat, even colour with a hard edge against the character." |
| lost the anchor | that region | "Restore the [feature] at twice this size and simplify the [other thing] to make room." |
| too colourful | whole image | "Reduce to five colours, keeping [HEX] as the loudest and desaturating the rest." |
| head cropped | whole image | "Zoom out slightly so there is even empty space on all four sides and nothing touches the edge." |
| disappears on the panel | the silhouette | "Add a thin light rim inside the outline along the top and left so the shape separates from a dark background." |

Avoid **Smart Resize** here. It recomposes into a new ratio by *filling in* the
frame rather than cropping — right for a banner, wrong for an avatar, because
it invents body and background you then have to remove again. Generate square
in the first place.

---

## Filled examples, from the real roster

The hex is each connection's own `color` value out of the file.

| | hex | anchor | expression |
|---|---|---|---|
| **Zazz** | `#d4af6a` | stopwatch on a cord, jacket several sizes too big | busy, unimpressed |
| **Psalmatron** | `#ff2f92` | her hair and eyes worn crooked, like a bad copy | grieving, wrong |
| **Bone Sage Nethra Volkesh** | `#b83fff` | bone regalia framing the head | composed, cold |
| **Anti-Rover Captain, Ridge** | `#8a8394` | captain's coat, dream-smoke pipe | unbothered |
| **Neven Ishmael** | `#cc6b3f` | motel keeper's apron, ring of keys | patient, tired |
| **Iss** | `#b83fff` | bandages over both eyes, red hair | calm |
| **Loriel** | `#ff9b1f` | cook's rag over the shoulder, gunslinger's stance | retired, watchful |
| **Kevanna** | `#c1503f` | — pick from her art — | guarded |
| **Jamie** | `#c9a6ff` | tattoos that reshape, visibly mid-shift | clinical |
| **Gadget** | `#ffd873` | reads far too young and is furious about it | indignant |
| **Vireth** | `#5c8a7a` | strange metal arm, stranger rifle | withdrawn |
| **Carmine** | `#7ef0ff` | — pick from her art — | sharp |
| **Adam** | `#ff6b4a` | facility escapee's cut restraint still on the wrist | wired |
| **Zene** | `#a4c94a` | unlicensed researcher's improvised rig | absorbed |

### Awkward cases, because your roster has them

- **Pairs** — Dau-Lu and Chi-Mika, Riv and Rev, Mavira and Zelthar, Maxium and
  Veion, Mr. and Mrs. Namesin. Two figures in a 56-pixel square is two
  unreadable smudges. Draw **one** of them as the portrait and put the other's
  presence in a single accessory or a shoulder overlap, or give the pair one
  shared emblem instead. Add to the prompt: *"One figure only; suggest the
  second person with a single object rather than drawing them."*
- **Not a person** — The Junkyard Demon, SWORD, The Engineer whose entry is
  blank. Drop the FACE and HAIR fields and replace the anchor with an object or
  a sigil rendered in the same flat style, then keep every other field as
  written. A consistent object among faces reads as deliberate; a vague face
  reads as a failure.
- **Never seen** — Thessun Volkesh, never confirmed sighted. A silhouette in
  the accent colour with the anchor detail alone picked out is more honest than
  an invented face, and it will look intentional next to the others.

Whatever you choose, keep **every other field identical across all 66**. The
consistency of the treatment is what makes them a set; the anchor and the hex
are what make them individuals.

---

## Getting it into the file

**1. Background Removal** in Grok Imagine, then export **PNG — never JPEG.**
JPEG cannot carry transparency, so a JPEG export silently discards the removal
you just did.

**2. Run it through the shaper anyway:**

```
python3 tools/key_chibi.py ~/Downloads/zazz.png --alpha --uri
```

`--alpha` skips the keying and does the rest, which is still the part no image
tool does for you: trim to what is actually drawn (the slot is
`object-fit: cover` and will happily zoom into an empty margin), re-pad square,
resize to 512, and write

- `zazz_keyed.png` — 512×512 with its alpha intact
- `zazz_keyed.png.txt` — the `data:` URI, ready to paste
- `zazz_keyed_56.png` — **the 56-pixel view, magnified.** The only size that
  decides whether it worked. Judge it here, not at 100%.

It refuses, with the reason, if the export has no alpha channel or if the alpha
is effectively solid — both of which mean the background is still painted on.

**If Background Removal isn't on your tier**, change the BACKGROUND field to
*"one flat pure green, hex #00FF00"* and drop `--alpha`. The tool keys it,
ramping the edge so the outline keeps its antialiasing rather than becoming a
staircase at 56px, and suppressing the green spill that would otherwise read as
a lime halo against the dark panel.

**3. Paste it in.** The `chibi` field goes straight into `<img src="…">`, and
the Ledger is opened off a disk where `file://` will not reliably fetch a
sibling image — so the data URI is the one that always works:

```js
chibi: "data:image/png;base64,iVBORw0KGgo…"
```

All 66 connections currently sit at `chibi: null`, and there is no picker in
the UI — right now it is a hand edit per person. Say the word and that becomes
a file button on the connection's edit view that does all of this in the
browser.

---

Sources for the Grok-specific constraints:
[Imagine Image 2.0 announcement](https://x.ai/news/grok-imagine-image-2),
[xAI image generation API docs](https://docs.x.ai/developers/model-capabilities/images/generation),
[Grok Imagine editing and Smart Resize guide](https://morphic.com/resources/how-to/grok-imagine-image-2-guide),
[Grok Imagine complete guide](https://help.scenario.com/articles/6027124401-grok-imagine-the-complete-guide-to-ai-generation-and-editing).
