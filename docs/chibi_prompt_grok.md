# Chibi portraits for the Wavelengths — a Grok prompt

Shorter than the Gemini one on purpose. Two things about Grok decide the shape
of this, and neither is stylistic:

**Use Grok Imagine, the app — not the image API.** The API has no documented
image-to-image or reference-image support, no background removal, and hands
back JPEG, which cannot carry an alpha channel at all. Its parameters are
`prompt`, `n`, `aspect_ratio`, `resolution` (1k/2k), `quality` and
`response_format`, and that is the whole surface. Grok Imagine Image 2.0 has
the two things this job actually needs: **multi-ref editing, up to five input
images**, and **Background Removal, which exports the subject with a real
transparent background**.

**Grok wants a short prompt.** The house guidance is one to three sentences
plus a few structured parameters — context, style, constraints — where Gemini
wants rich paragraphs. Padding it out makes Grok worse, not better. So the
prompt below is deliberately compact and the specifics live in a parameter
block underneath it.

Two smaller ones: there is **no negative prompt** on Grok either, so every
exclusion is written as what should be there instead. And **1:1 is a setting,
not a sentence** — choose the ratio in the UI (or `aspect_ratio: "1:1"`) rather
than arguing for it in prose.

## What the slot really is

Read off the Ledger's own CSS, because each line decides something in the prompt:

| | |
|---|---|
| `.wl-chibi-slot` | **56 × 56 px**, `border-radius: 12px` |
| `.wl-detail-chibi` | **76 × 76 px**, `border-radius: 16px` |
| both `img` | `width:100%; height:100%; **object-fit: cover**` |
| slot background | dark panel, dashed border in that person's own colour |

`cover` centre-crops anything not square. 56px turns fine linework to grey mush.
Rounded corners clip whatever sits in them.

---

## The prompt

Attach the reference image, set the ratio to **1:1** and the resolution to
**1K**, then send this with the three bracketed slots filled in:

> Redraw the character in the reference as a chibi bust sticker: oversized
> head, tiny shoulders, cropped below the collarbone, large simple eyes,
> centred in the upper two-thirds of the frame. Flat vector style — solid
> colour blocks, two steps of cel shading at most, a heavy dark outline around
> the whole silhouette, even lighting. Grimy desert-cyberpunk wear shown as a
> few bold shapes, not fine detail.
>
> - **Must survive:** hair silhouette, and **[THE ONE READABLE FEATURE — the
>   bone-white mask, the split-colour hair, the welding goggles, the missing
>   arm]**. Simplify anything else first.
> - **Palette:** five colours maximum, built around **[HEX]** as the loudest
>   element; everything else muted around it.
> - **Outline:** about 3% of the image width, so it survives being shown at 56
>   pixels across.
> - **Background:** one flat unbroken colour, edge to edge — no scenery, no
>   floor, no gradient, no glow, no cast shadow. Nothing on the character in
>   that same colour.
> - **Framing:** figure fills ~84% of the square, even margin all round, whole
>   silhouette clear of the four corners.
> - **Surface:** clean of lettering, numbers, logos, signature or watermark.
>   One character only.

### Fixing it

Grok Imagine edits regionally, which is the part worth using — the **magic
wand** changes the region you point at and leaves everything else alone, and
**segmentation** selects a precise area like one garment. So correct in place
rather than rerolling and losing the version you liked:

- Point at the outline → *"thicken this outline so it reads at 56 pixels."*
- Point at the background → *"make this one perfectly flat colour with a hard edge against the character."*
- Point at the feature that got lost → *"restore the [feature] and simplify the [other thing] to make room."*
- Whole image → *"cut to five colours, keeping [HEX] loudest."*

Avoid **Smart Resize** here. It recomposes into a new ratio by *filling in* the
frame rather than cropping — which is the right behaviour for a banner and the
wrong one for an avatar, because it invents body and background you then have
to remove. Generate square in the first place.

---

## Filled examples

Using the real accent colours out of the Ledger:

| | colour | the one readable feature |
|---|---|---|
| **Zazz** | `#d4af6a` | the scorekeeper's stopwatch on its cord, and the too-big jacket |
| **Psalmatron** | `#ff2f92` | the wrong-copy resemblance — her hair and eyes worn crooked |
| **Bone Sage Nethra Volkesh** | `#b83fff` | the bone regalia framing the head |
| **Anti-Rover Captain, Ridge** | `#8a8394` | the captain's coat and the dream-smoke pipe |
| **Neven Ishmael** | `#cc6b3f` | the motel keeper's apron and the ring of keys |

Every connection already carries its own hex in the file, and that colour draws
the card's left bar and the dashed ring around the slot. Matching it is what
makes a portrait look *seated* rather than pasted on.

---

## Getting it into the file

**1. Run Background Removal** in Grok Imagine and export the PNG. This is the
step that makes Grok easier than Gemini for this — Gemini cannot write alpha at
all, so it needs a chroma field keyed out afterwards.

**2. Run it through the shaper anyway:**

```
python3 tools/key_chibi.py ~/Downloads/zazz.png --alpha --uri
```

`--alpha` skips the keying and does the rest, which is still most of the value:
it trims to what is actually drawn (the slot is `object-fit: cover` and will
zoom into an empty margin), re-pads square, resizes to 512, and writes

- `zazz_keyed.png` — 512×512 with its alpha intact
- `zazz_keyed.png.txt` — the `data:` URI, ready to paste
- `zazz_keyed_56.png` — **the 56-pixel view, magnified.** The only size that
  decides whether it worked. Judge it here, not at 100%.

It refuses rather than guessing if the export has no alpha channel or if the
alpha is effectively solid, both of which mean the background is still painted
on. **Export PNG, never JPEG** — JPEG cannot carry transparency, so a JPEG
export silently throws away the background removal you just did.

**If Background Removal isn't available** on your tier, ask for the background
as flat `#00FF00` instead and drop `--alpha` — the tool keys it, ramping the
edge so the outline keeps its antialiasing and suppressing the green spill that
would otherwise read as a lime halo against the dark panel.

**3. Paste it in.** The `chibi` field goes straight into `<img src="…">`, and
the Ledger is opened off a disk where `file://` will not reliably fetch a
sibling image — so the data URI is the one that always works:

```js
chibi: "data:image/png;base64,iVBORw0KGgo…"
```

All 66 connections currently sit at `chibi: null`, and there is no picker in
the UI — right now it is a hand edit per person. Say the word and that becomes
a file button on the connection's edit view that does this in the browser.

---

Sources for the Grok-specific constraints:
[Imagine Image 2.0 announcement](https://x.ai/news/grok-imagine-image-2),
[xAI image generation API docs](https://docs.x.ai/developers/model-capabilities/images/generation),
[Grok Imagine editing and Smart Resize guide](https://morphic.com/resources/how-to/grok-imagine-image-2-guide),
[Grok Imagine complete guide](https://help.scenario.com/articles/6027124401-grok-imagine-the-complete-guide-to-ai-generation-and-editing).
