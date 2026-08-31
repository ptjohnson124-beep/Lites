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
medium**. Fill the five bracketed slots and send:

> Redraw the character in the reference image as an anime **sticker bust** —
> one figure, head and hands, cropped at mid-torso, clean uniform lineart,
> flat cel colour, and a white die-cut sticker border around the whole
> silhouette. Think a high-quality Discord emote or vinyl sticker, not a
> super-deformed cartoon: the head is enlarged but the drawing stays
> anime-proportioned and carefully lined. It will be shown as a 56-pixel
> avatar on a near-black panel, so the silhouette and the hair mass have to
> carry it. Keep them recognisably the same person as the reference.
>
> **PROPORTIONS**
> Semi-chibi, not full chibi: head-to-body roughly 1 : 2. The head and hair
> together are about 60% of the figure's height and are the widest part of
> the silhouette — as wide as the shoulders or slightly wider. Crop the body
> at mid-torso, below the elbows. Include the forearms and both hands.
> Shoulders are narrow and sloped. Set the eyeline about 45% down the frame.
>
> **HANDS**
> Both hands raised near the chest, held in a pose that says something about
> them — **[HAND POSE — clasped nervously, one hand up mid-gesture, arms
> folded, fingers splayed, holding their one object]**. Draw the fingers as
> distinct simple tapered shapes with the same outline weight as everything
> else. Hands are a real part of the picture here, not an afterthought, but
> keep them simplified: no knuckle creases, no nail detail, no fingernails
> drawn separately.
>
> **FACE**
> Large eyes with a big clean white sclera, a heavy solid dark upper lash
> line thickening toward the outer corner, and a thin lower lid line. The
> iris is a **ring pattern — two or three concentric circles** in the accent
> colour around a dark pupil, not a realistic iris and not a plain dot.
> Eyebrows as two clean tapered strokes, drawn in the hair's colour. Nose
> reduced to a tiny mark or omitted. Mouth small and simple. Expression:
> **[EXPRESSION — their default resting face: wary, amused, flat, tired,
> caught out, openly delighted]** — one clear emotion, held plainly.
>
> **HAIR**
> Hair is the single biggest element and most of the silhouette. Draw it as
> three or four large solid masses with hard, slightly pointed tips, and
> reproduce its outline shape faithfully from the reference — length,
> parting, volume, spikes, braids, shave, horns. Two or three long interior
> strokes only, to show the parting and the flow. No individual strands, no
> gradients, no wispy feathering.
>
> **IDENTITY ANCHOR**
> For **[NAME]**, the one detail that must survive at 56 pixels is
> **[THE ONE READABLE FEATURE — the bone-white mask, the split-colour hair,
> the welding goggles, the bandaged eyes, the missing arm]**. Draw it large
> and in high contrast against whatever it sits on, and simplify literally
> anything else before you simplify this.
>
> **LINE**
> Clean uniform lineart in a very dark warm brown, near-black, about 1.5% of
> the image width, with a slight taper at the ends of strokes and clean
> rounded joins. The same weight everywhere: outline, interior folds and
> fingers all sit on one line weight. No crosshatching, no sketch lines, no
> stippling.
>
> **STICKER BORDER**
> Outside that lineart, a **solid white die-cut border** offset evenly all
> the way around the outer silhouette, about 2% of the image width, following
> the shape including the hair tips. This is the sticker cut edge — it must
> be a hard, even, unbroken band with nothing outside it.
>
> **SHADING**
> **Exactly two tones per material** — a base and one shadow, hard-edged, no
> third step. The shadow is a darker, slightly desaturated version of the
> base, not a grey wash. Light from the upper left, so shadow falls under the
> hair mass, under the jaw, and on the underside of the sleeves and hands. No
> gradients, no glow, no rim light, no bloom, no ambient occlusion. Soft grey
> folds are allowed on white or pale garments only.
>
> **PALETTE**
> Seven colours, each doing one job: the accent **[HEX]** as the hair or the
> loudest garment, plus its one darker shade; a skin tone plus its one darker
> shade; one pale garment colour; one secondary garment colour; and the
> near-black line. The accent should cover roughly 30% of the figure and be
> the first thing the eye lands on. Everything not the accent stays muted.
>
> **MATERIAL AND WEAR**
> Grimy desert-cyberpunk wear, drawn as flat organic shapes rather than
> texture: grime, blood or rust as a few irregular blotches and drips with
> the same clean outline; a repair as one beige rectangle of tape with three
> or four straight hatch lines across it; a tear as one notch. Buttons,
> studs and fasteners as small plain circles. Keep every surface otherwise
> smooth — no photographic texture, no noise, no speckle, no visible grain.
>
> **FRAMING**
> Compose for a **square**, which means a tighter crop than a normal portrait:
> the figure fills about 84% of the square with an even band of empty
> background on all four sides, centred horizontally. Do not leave tall empty
> margins at the left and right — bring the crop in until the head is large in
> the frame. Keep the entire silhouette, sticker border included, clear of the
> four corners, which are cut away when this is displayed. Nothing touches or
> crosses the frame edge.
>
> **BACKGROUND**
> One flat, unbroken, perfectly even colour filling the frame edge to edge
> outside the white sticker border: no scenery, no floor, no gradient, no
> vignette, no glow, no drop shadow, no cast shadow, and no checkerboard
> pattern of any kind. The background colour must not appear anywhere on the
> character.
>
> **SURFACE**
> No lettering, numbers, logos, signatures, watermarks, speech bubbles,
> panel frames or badges. One character only, facing roughly forward, no
> second figure and no companion animal.
>
> **ACCEPTANCE TEST**
> Scaled to 56 pixels across on a near-black background, it should still be
> obviously **[NAME]**: hair silhouette distinct, white sticker border
> separating the figure from the panel, **[THE ONE READABLE FEATURE]** still
> visible, accent colour still dominant. If a detail would vanish at that
> size, draw it larger or remove it — do not draw it small.

### What actually survives at 56 pixels

I ran the reference through the pipeline and looked at it at the real size.
Honest result: **the hair mass, the accent colour, the pale garment and the
white sticker border all read clearly. The hands, the ring irises and the fine
grime do not** — they become a suggestion of shape.

That is fine, and it is why the fields are ordered the way they are. The hands
and the eyes are doing their work in the **76-pixel detail view** and when
someone opens the image; the hair silhouette and the accent are doing all the
work on the card. It also means the **white sticker border is the most valuable
single thing in this style for our purposes** — it is what stops a
dark-palette character dissolving into a near-black panel, and it does that job
better than the light inner rim the previous version of this prompt asked for.

### The four slots, and how to fill them well

| slot | what actually goes in it |
|---|---|
| `[NAME]` | Their name as the Ledger has it. Grok uses it in the acceptance test line, which is where it does the most work. |
| `[THE ONE READABLE FEATURE]` | **One** thing, describable in under ten words, that is *visible in silhouette or in colour*. "Kind eyes" is not one. "Bandages over both eyes" is. |
| `[HEX]` | The connection's own `color` value out of the file. Not an approximation — this exact colour draws the card's left bar and the dashed ring around the slot. |
| `[EXPRESSION]` | Their resting face, one word or two. This is what stops 66 portraits looking like the same doll in different hats. |
| `[HAND POSE]` | What their hands are doing. The second-strongest characteriser after the hair, and the reason this style beats a plain bust — a nervous clasp and folded arms are two different people. |

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
| disappears on the panel | the silhouette | "Thicken the white die-cut sticker border evenly all the way around so the figure separates from a dark background." |
| hands look wrong | the hands | "Simplify these into distinct tapered finger shapes on the same line weight, with no knuckle or nail detail." |
| eyes look generic | the eyes | "Make the irises two or three concentric rings in [HEX] around a dark pupil, with a heavy solid upper lash line." |

Avoid **Smart Resize** here. It recomposes into a new ratio by *filling in* the
frame rather than cropping — right for a banner, wrong for an avatar, because
it invents body and background you then have to remove again. Generate square
in the first place.

---

## Filled examples, from the real roster

The hex is each connection's own `color` value out of the file.

| | hex | anchor | expression | hands |
|---|---|---|---|---|
| **Zazz** | `#d4af6a` | stopwatch on a cord, jacket several sizes too big | busy, unimpressed | clutching the stopwatch in both hands |
| **Psalmatron** | `#ff2f92` | her hair and eyes worn crooked, like a bad copy | grieving, wrong | one hand reaching toward you, the other held back |
| **Bone Sage Nethra Volkesh** | `#b83fff` | bone regalia framing the head | composed, cold | hands folded, perfectly still |
| **Anti-Rover Captain, Ridge** | `#8a8394` | captain's coat, dream-smoke pipe | unbothered | one hand up holding the pipe |
| **Neven Ishmael** | `#cc6b3f` | motel keeper's apron, ring of keys | patient, tired | keys hanging off one hooked finger |
| **Iss** | `#b83fff` | bandages over both eyes, red hair | calm | hands open and low, palms out |
| **Loriel** | `#ff9b1f` | cook's rag over the shoulder, gunslinger's stance | retired, watchful | wiping both hands on the rag |
| **Kevanna** | `#c1503f` | — pick from her art — | guarded | arms folded |
| **Jamie** | `#c9a6ff` | tattoos that reshape, visibly mid-shift | clinical | one hand up, tattoos mid-shift across the back of it |
| **Gadget** | `#ffd873` | reads far too young and is furious about it | indignant | both fists planted, indignant |
| **Vireth** | `#5c8a7a` | strange metal arm, stranger rifle | withdrawn | the metal arm forward, the other hand hidden |
| **Carmine** | `#7ef0ff` | — pick from her art — | sharp | one hand flicking something away |
| **Adam** | `#ff6b4a` | facility escapee's cut restraint still on the wrist | wired | both wrists up, cut restraint still on one |
| **Zene** | `#a4c94a` | unlicensed researcher's improvised rig | absorbed | holding the rig in both hands, looking at it not you |

### Awkward cases, because your roster has them

- **Pairs** — Dau-Lu and Chi-Mika, Riv and Rev, Mavira and Zelthar, Maxium and
  Veion, Mr. and Mrs. Namesin. Two figures in a 56-pixel square is two
  unreadable smudges. Draw **one** of them as the portrait and put the other's
  presence in a single accessory or a shoulder overlap, or give the pair one
  shared emblem instead. Add to the prompt: *"One figure only; suggest the
  second person with a single object rather than drawing them."*
- **Not a person** — The Junkyard Demon, SWORD, The Engineer whose entry is
  blank. Drop the FACE and HAIR fields and replace the anchor with an object or
  a sigil rendered in the same flat style — drop HANDS too — then keep every
  other field, the sticker border included, exactly as written. A consistent object among faces reads as deliberate; a vague face
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

Check the export is genuinely transparent before you trust it. The reference
image that set this style **had a checkerboard painted into it** — a flat RGB
file with no alpha channel at all, which looks transparent and is not. If that
happens, use `--checker`:

```
python3 tools/key_chibi.py ~/Downloads/zazz.png --checker --uri
```

It removes the background by flooding in from the frame edge rather than by
colour, which is what lets a white lab coat, a bandage or any other pale prop
inside the outline survive — matching the checker by colour would delete those
too. Verified on the reference: the coat came through intact.

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
