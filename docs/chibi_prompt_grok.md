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
paragraphs, and for keeping the ones you send up front to the few that matter.
The prompt below is one sentence of style and eight short fields; everything
else has been moved into escalation lines you add only when something actually
goes wrong.

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

`cover` centre-crops anything not square. Rounded corners clip whatever sits in
them. The panel behind is *dark*, so a character whose palette is mostly dark
loses their silhouette entirely. And 56px destroys fine *detail* — crosshatching,
small props, written marks — though it treats a thin uniform outline kindly,
softening it rather than losing it. Thin lines are safe here; busy ones are not.

---

## The prompt

Attach two images — the character reference and the style target — set
**1:1 / 1K / medium**, fill the five slots and send. That is the whole prompt:

> Redraw the attached character as an anime sticker bust, matching the second
> image's style closely.
>
> - **Build:** oversized head — head and hair together about 60% of the
>   figure's height and the widest part of the silhouette — narrow shoulders,
>   cropped at mid-torso, both forearms and hands in frame.
>   Hands **[HAND POSE]**.
> - **Lines:** fine and thin, about 6 pixels on a 1024 canvas, near-black warm
>   brown. The outer contour is the **same thin weight** as the interior lines
>   — no bold border, no mascot-logo stroke.
> - **Eyes:** big white sclera, heavy dark upper lash line, irises as two or
>   three concentric rings in **[HEX]**.
> - **Hair:** three or four solid masses with hard pointed tips, faithful to
>   the reference's outline shape. No strands, no gradients.
> - **Colour:** flat cel, exactly two tones per material. Five colours built
>   around **[HEX]** as the loudest, about 30% of the figure.
> - **Keep:** this is **[NAME]** — **[THE ONE READABLE FEATURE]** must survive,
>   drawn large and high-contrast. Simplify anything else before that.
>   Expression **[EXPRESSION]**.
> - **Frame:** square, figure fills ~84%, even margin all round, whole
>   silhouette clear of the corners.
> - **Background:** one flat even colour edge to edge. No scenery, gradient,
>   glow or shadow. No text, logos or watermark. One character.

**About 200 words.** The version before it was 1100, and Grok's own
guidance is short prose plus structured parameters — so everything that used to
be stated up front is now a line you add *only when something actually goes
wrong.*

### The five slots, and how to fill them well

| slot | what actually goes in it |
|---|---|
| `[NAME]` | Their name as the Ledger has it. Naming them anchors the likeness — it is the difference between "a character" and "this character". |
| `[THE ONE READABLE FEATURE]` | **One** thing, describable in under ten words, that is *visible in silhouette or in colour*. "Kind eyes" is not one. "Bandages over both eyes" is. |
| `[HEX]` | The connection's own `color` value out of the file. Not an approximation — this exact colour draws the card's left bar and the dashed ring around the slot. |
| `[EXPRESSION]` | Their resting face, one word or two. This is what stops 66 portraits looking like the same doll in different hats. |
| `[HAND POSE]` | What their hands are doing. The second-strongest characteriser after the hair, and the reason this style beats a plain bust — a nervous clasp and folded arms are two different people. |

### Escalation lines

Paste one, not all. Each addresses a failure I have actually seen from this
prompt:

| if it comes back… | add |
|---|---|
| thick, bold, logo-like | "Much finer lineart — the weight of a printed manga panel, not a vinyl decal. The silhouette is drawn with the same thin pen as the cloth folds." |
| head only, no hands | "Include the forearms and both hands raised near the chest, fingers as distinct simple tapered shapes with no knuckle or nail detail." |
| filling the whole frame | "Zoom out — leave an even band of empty background on all four sides, nothing touching the edge." |
| flat and lifeless | "Two tones per material: a base and one hard-edged shadow that is a darker, desaturated version of it, lit from the upper left." |
| too many colours | "Cut to five colours, keeping [HEX] loudest and desaturating everything else." |
| grime looks like noise | "Show wear as flat organic shapes — blotches with the same clean outline, tape as one beige rectangle with hatch lines, a tear as one notch. No texture or grain." |
| wrong person | "Follow the first image for who they are and the second only for how it is drawn." |

**Need the full spec?** The long-form version — every field spelled out — lives
in `chibi_prompt_gemini.md`. Gemini rewards that kind of rich prose; Grok
punishes it. Same style, same numbers, two lengths.

### What actually survives at 56 pixels

I ran the reference through the pipeline and looked at it at the real size.
Honest result: **the hair mass, the accent colour and the pale garment read
clearly. The hands, the ring irises and the fine grime do not** — they become
a suggestion of shape.

That is fine, and it is why the fields are ordered the way they are. The hands
and the eyes do their work in the **76-pixel detail view** and when someone
opens the image; the hair silhouette and the accent do all the work on the
card. Thin lines survive the downscale perfectly well — they blur into a
softer edge rather than disappearing, which is what you want. It is *thick*
lines that ruin a small avatar, by eating the colour area that carries the
character.

### Why there is no "draw a white sticker border" field any more

There was one, asking for a white die-cut band around the silhouette, and it
was the single worst-behaved instruction in the prompt: models read "border"
next to "heavy outline" and drew a thick **black** ring instead. It also fought
the thin-line instruction directly.

So the border moved out of the prompt and into the tool. `--rim` draws it after
the fact, at an exact width, perfectly even, identical across all 66 portraits,
using a round pen so the cut edge has no square corners. It still does the job
it was there for — separating a dark-palette character from the near-black
panel — and it no longer costs you a line-weight argument with the generator.

### The failure to watch for, with numbers

The first thing that goes wrong is line weight, and it goes wrong by a lot.
Measured off a real run:

| | median stroke, as % of image width | at a 1024 canvas |
|---|---|---|
| the style target | **0.56%** | ≈ 6 px |
| what came back | **2.13%** | ≈ 22 px |

Nearly **four times too thick** — and thick lines do not merely look wrong,
they crowd out the flat colour that is doing all the work at 56 pixels. An
earlier version of this prompt asked for 1.5%, which was itself almost three
times the target; that number was guessed rather than measured, and it is now
0.5% because the reference was measured.

Two other things went with it in the same run, and they are worth checking for
together, because they arrive as a set — the model drifts toward a bold mascot
logo and takes everything with it:

- **head only, no hands.** The style target's subject is 838 × 1161, a tall
  bust including forearms. The bad run was a head filling the whole square.
- **no margin, and a solid background.** The target fills 50% of its frame with
  empty space around it; the bad run filled 100% edge to edge, with a flat teal
  field baked in and nothing to remove.

If you see any one of the three, re-prompt for all three. They fail together.

### Fixing it in place rather than rerolling

The escalation lines above are for the next generation. For a version you
mostly like, edit it instead: Grok Imagine's **magic wand** changes only the
region you point at and **segmentation** selects a precise area like one
garment, so you can point at the outline, the hands or the background and give
it that one line without losing the rest.

Avoid **Smart Resize** here. It recomposes into a new ratio by *filling in* the
frame rather than cropping — right for a banner, wrong for an avatar, because
it invents body and background you then have to remove again. Generate square
in the first place.

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
  other field exactly as written. A consistent object among faces reads as deliberate; a vague face
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
python3 tools/key_chibi.py ~/Downloads/zazz.png --checker --rim 1.4 --uri
```

It removes the background by flooding in from the frame edge rather than by
colour, which is what lets a white lab coat, a bandage or any other pale prop
inside the outline survive — matching the checker by colour would delete those
too. Verified on the reference: the coat came through intact.

**2. Run it through the shaper anyway:**

```
python3 tools/key_chibi.py ~/Downloads/zazz.png --alpha --rim 1.4 --uri
```

`--rim 1.4` draws the white die-cut border the prompt no longer asks for, at an
exact even width with a round pen so the cut edge has no square corners.
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
