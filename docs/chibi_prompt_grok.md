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

Attach two images — the character reference and a style target — set
**1:1 / 1K / medium**, fill the slots and send. That is the whole prompt:

> Redraw the attached character as a **chibi sticker portrait**, matching the
> second image's style closely.
>
> - **Build:** true chibi. Head and hair together are about **65% of the whole
>   figure's height**, and the **widest point of the entire silhouette is the
>   hair, roughly a third of the way down** — the shoulders are clearly
>   narrower than the head. Tiny body, cropped at the chest.
>   Hands: **[HANDS — not in frame / one hand holding (thing) / both hands at
>   the chest]**.
> - **Lines:** clean and fairly thin, about **10 pixels on a 1024 canvas**,
>   near-black. The outer contour is the **same weight** as the interior lines
>   — no bold border, no thick mascot-logo stroke.
> - **Eyes:** large, big white sclera, dark upper lash line, irises in
>   **[HEX]** or their own colour with a small highlight.
> - **Hair:** solid masses with hard pointed tips, faithful to the reference's
>   outline shape. No strands, no gradients.
> - **Outfit — do not invent this:** reproduce the clothing they are actually
>   wearing in the reference — collar, closure, straps, buckles, patches,
>   seams, shoulder details — drawn as flat shapes with the same line. Do not
>   substitute a generic jacket, hoodie or coat. **[OUTFIT — name the garment
>   and its two or three distinguishing details]**.
> - **Colour:** flat cel, two tones per material — a base and one hard-edged
>   shadow. Tight palette built around **[HEX]** as the loudest element.
> - **Keep:** this is **[NAME]** — **[THE ONE READABLE FEATURE]** must survive,
>   drawn large. Expression **[EXPRESSION]**.
> - **Frame:** square, figure fills ~84%, even margin all round, clear of the
>   corners. Background one flat even colour, edge to edge — no scenery,
>   gradient, glow or shadow. No text or watermark. One character.

**About 275 words.** Everything not in it is an escalation line below — one
sentence you add *only* when a specific thing comes back wrong.

### The numbers, measured off three style targets

Two of these are properly chibi and one is a bust portrait, and the difference
is not vibes — it is two measurements:

| | head+hair, % of figure height | widest point of the silhouette | stroke at a 1024 canvas |
|---|---|---|---|
| chibi swordsman | **62%** | the hair, 29% down | ≈ 10 px (0.96%) |
| chibi teal-hair | **67%** | the hair, 28% down | ≈ 10 px (0.96%) |
| lab-coat bust | 53% | the shoulders, 71% down | ≈ 6 px (0.56%) |
| *a bad run, for scale* | *head only* | *— filled the frame —* | *≈ 22 px (2.13%)* |

**Where the silhouette is widest is the tell.** In a real chibi the hair is the
widest thing in the picture and it happens near the top; in a bust portrait the
shoulders are, and it happens near the bottom. That one line in the prompt does
more than any amount of "make it cuter".

The stroke number moved too. The earlier version of this asked for 6px, taken
off the lab-coat reference; both chibi targets measure **10px**, so that is the
number now. Still less than half the 22px a bad run produced — thin, just not
as thin as a finely-inked bust.

### The five slots, and how to fill them well

| slot | what actually goes in it |
|---|---|
| `[NAME]` | Their name as the Ledger has it. Naming them anchors the likeness — it is the difference between "a character" and "this character". |
| `[THE ONE READABLE FEATURE]` | **One** thing, describable in under ten words, that is *visible in silhouette or in colour*. "Kind eyes" is not one. "Bandages over both eyes" is. |
| `[HEX]` | The connection's own `color` value out of the file. Not an approximation — this exact colour draws the card's left bar and the dashed ring around the slot. |
| `[EXPRESSION]` | Their resting face, one word or two. This is what stops 66 portraits looking like the same doll in different hats. |
| `[HANDS]` | Optional now. "Not in frame" is a perfectly good answer and the two chibi targets do exactly that — one shows a single hand holding a sword, the other shows none. Use hands when the character *has* a thing they hold; skip them otherwise rather than inventing a pose. |
| `[OUTFIT]` | Name the garment and its two or three distinguishing details — "brown field jacket, white leather chest harness with steel rings" beats "brown clothes". This slot exists because the outfit was the thing the prompt kept losing, and it was losing it for a reason: see below. |

### Why the clothes kept disappearing

It was the prompt's fault, not the model's. Two instructions were quietly
telling it to throw the outfit away:

- **"Simplify anything else before that."** Written to protect the one
  identifying feature, it reads as licence to discard everything that is not
  that feature — and the outfit is the largest single thing in that category.
- **"Exactly five colours."** A brown jacket with a white harness, steel rings
  and a taped patch is already four colours before you have drawn the face.
  A hard cap makes dropping the garment the cheapest way to comply.

Both are gone. There is a dedicated **Outfit** line that says *do not invent
this*, the colour cap is now "a tight palette" rather than a number, and the
Keep line no longer tells it to simplify everything else. Name the garment in
the slot and the model has something concrete to hold on to.

### Escalation lines

Paste one, not all. Each addresses a failure I have actually seen from this
prompt:

| if it comes back… | add |
|---|---|
| thick, bold, logo-like | "Much finer lineart — the weight of a printed manga panel, not a vinyl decal. The silhouette is drawn with the same thin pen as the cloth folds." |
| you wanted hands and got none | "Include the forearms and hands, fingers as distinct simple tapered shapes with no knuckle or nail detail." |
| filling the whole frame | "Zoom out — leave an even band of empty background on all four sides, nothing touching the edge." |
| flat and lifeless | "Two tones per material: a base and one hard-edged shadow that is a darker, desaturated version of it, lit from the upper left." |
| too colourful / muddy | "Fewer colours: two tones per material, and desaturate everything that is not [HEX] so it stays the loudest. Keep the outfit's own colours — cut the incidental ones." |
| grime looks like noise | "Show wear as flat organic shapes — blotches with the same clean outline, tape as one beige rectangle with hatch lines, a tear as one notch. No texture or grain." |
| generic clothes | "Wrong outfit. They are wearing [OUTFIT] — reproduce it from the first image, including the [detail] and the [detail], as flat shapes. Do not substitute a generic jacket." |
| not chibi enough | "Bigger head, smaller body: head and hair should be about 65% of the figure's height, and the hair should be the widest thing in the whole picture, near the top. Shoulders clearly narrower than the head." |
| wrong person | "Follow the first image for who they are and the second only for how it is drawn." |

**Need the full spec?** The long-form version — every field spelled out — lives
in `chibi_prompt_gemini.md`. Gemini rewards that kind of rich prose; Grok
punishes it. Same style, same numbers, two lengths.

### What actually survives at 56 pixels

I ran the reference through the pipeline and looked at it at the real size.
Honest result: **the hair mass, the accent colour and the pale garment read
clearly. The hands, the ring irises and the fine grime do not** — they become
a suggestion of shape.

That is fine, and it is the argument for the chibi build over the bust: a head
that is 65% of the figure puts the hair and the face — the two things that do
survive — across most of the image, where a bust spends half its height on a
torso that becomes a coloured block. It is also why the outfit still matters
even though its details vanish: at 56px the garment is reduced to its *colour
block and its silhouette*, and a black buckled jacket and a white lab coat
are still instantly different things.

Thin lines survive the downscale perfectly well — they blur into a softer edge
rather than disappearing. It is *thick* lines that ruin a small avatar, by
eating the colour area that carries the character.

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

### The drift to watch for

Line weight is the first thing that goes, and it never goes alone. In a real
bad run it came back at 2.13% — nearly four times the chibi targets — and it
brought three friends: **head only with no body, no margin at all, and a solid
background baked in with nothing to remove.** The model drifts toward a bold
mascot logo and takes everything with it.

If you see any one of those, re-prompt for all of them. They fail as a set.

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

| | hex | anchor | expression | hands (optional) |
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
