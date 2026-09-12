# Chibi portraits for the Wavelengths — a Gemini prompt

For Gemini / Nano Banana, which needs a different prompt from most image tools
for two concrete reasons, not stylistic ones:

1. **Gemini cannot output transparency.** Not Nano Banana, not Nano Banana Pro,
   not Nano Banana 2 — none of that family writes an alpha channel. Ask for a
   transparent background and it *paints* one: flat white, flat black, or a
   drawn-on checkerboard that looks transparent and isn't. So the prompt asks
   for a **flat chroma field** and `tools/key_chibi.py` removes it (see also `chibi_prompt_grok.md`, where Grok's own Background Removal does that step for you).
2. **Gemini has no negative prompt.** Google's own guidance is to state things
   positively — "an empty street with no traffic", not "no cars". A keyword
   blocklist gets read as a list of things to *include*. Every exclusion below
   is therefore written as a description of what should be there instead.

Two smaller ones: say **"create an image of"** or the model may answer with
text about the image rather than the image, and in edit mode Gemini **preserves
the input's aspect ratio** — so crop your reference square first, or the
square-frame instruction fights the reference and usually loses.

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

Attach the reference image — **cropped square first** — and paste this with the
three bracketed slots filled in.

> Using the character in the attached image as reference, create an image of
> them redrawn as an anime sticker bust — the kind of clean, carefully lined
> vinyl sticker or Discord emote you would actually stick on something.
>
> Draw it as a true chibi, and get the proportions right before anything else:
> the whole figure should be **two head-heights tall**, with the head — top of
> the hair to the chin — filling the top two thirds of the picture and the body
> occupying only the bottom third. Make the head as wide as the entire image
> and wider than the shoulders, so the body is the narrowest part of the
> figure, and let the widest point of the whole silhouette be the hair, about
> thirty percent down from the top. Crop at the chest, with no waist and no
> legs. Hands are optional — **[HANDS — not in frame / one hand holding
> (thing) / both hands at the chest]** — and when they are in frame, draw the
> fingers as distinct simple tapered shapes with no knuckle or nail detail.
>
> Give them large eyes with a big clean white sclera, a heavy solid dark upper
> lash line that thickens toward the outer corner, and irises drawn as two or
> three concentric rings in their accent colour around a dark pupil rather than
> as a realistic eye or a plain dot. Draw the eyebrows as two tapered strokes
> in the hair's colour, reduce the nose to a tiny mark, and keep the mouth
> small and simple. Their expression should be **[EXPRESSION — wary, amused,
> flat, tired, caught out, openly delighted]**, one clear feeling held plainly.
>
> Hair is the biggest element and most of the silhouette, so draw it as three
> or four large solid masses with hard, slightly pointed tips, faithful to the
> reference's outline shape — length, parting, volume, spikes, braids, shave —
> with only two or three long interior strokes to show the flow, and no
> individual strands or gradients.
>
> Reproduce the clothing they are actually wearing in the reference rather than
> inventing an outfit — the collar, the closure, the straps, buckles, patches,
> seams and shoulder details, all drawn as flat shapes with the same clean line.
> Do not substitute a generic jacket, hoodie or coat: they are wearing
> **[OUTFIT — name the garment and its two or three distinguishing details]**.
>
> Keep their likeness through the hair silhouette and one detail above all
> else: for **[NAME]**, the thing that must survive is **[THE ONE READABLE
> FEATURE — the bone-white mask, the split-colour hair, the welding goggles,
> the bandaged eyes, the missing arm]**. Draw it large and in high contrast.
>
> Line it with a clean, fairly thin pen in a very dark warm brown, near-black —
> on a 1024-pixel image the strokes should be about ten pixels wide, roughly one
> percent of the width, the weight of a printed manga panel rather than a
> vinyl decal. Keep that one weight everywhere: the outer contour of the
> figure is drawn with exactly the same thin line as the folds in the cloth
> and the gaps between the fingers, so there is no heavy border around the
> character and no chunky mascot-logo stroke anywhere. Give the strokes a
> slight taper at their ends and clean rounded joins, and use no
> crosshatching, sketch lines or stippling.
>
> Shade it with exactly two tones per material — a base and one hard-edged
> shadow that is a darker, slightly desaturated version of the base rather
> than a grey wash — lit from the upper left so shadow falls under the hair
> mass, under the jaw and beneath the sleeves. Use no gradients, no glow, no
> rim light and no bloom; soft grey folds are fine on white or pale garments
> only.
>
> Keep the palette tight rather than counted: two tones per material — a base
> and one darker shade — built around their accent **[HEX]**, which should be
> the first thing the eye lands on, with everything that is not the accent
> muted around it. The outfit's own colours count as part of that palette and
> are not to be dropped to save room.
>
> The world is a grimy desert-cyberpunk one, so show wear as flat organic
> shapes rather than texture: grime, blood or rust as a few irregular blotches
> and drips with the same clean outline, a repair as one beige rectangle of
> tape with three or four hatch lines across it, a tear as one notch, and
> fasteners as small plain circles. Keep every surface otherwise smooth, with
> no photographic texture, noise, speckle or grain.
>
> Compose it as a square, 1:1, and crop tighter than a normal portrait so the
> head is large in the frame: the figure should fill about eighty-four percent
> of the square, centred, with an even band of background on all four sides
> rather than tall empty margins at the left and right. Keep the whole
> silhouette clear of the four corners, which are cut away when this is
> displayed.
>
> Put them on a completely flat, uniform pure green field, hex #00FF00,
> filling the entire background edge to edge with a single even colour — no scenery, no floor, no horizon, no gradient,
> no glow around the figure, no shadow cast on the green, and no checkerboard
> pattern. The green must be untouched and the same shade in every corner. Do
> not use any green anywhere on the character themself.
>
> The picture will be shown at fifty-six pixels across on a near-black panel,
> so it has to hold up tiny: the hair silhouette and the accent colour are what
> carry it at that size. Thin lines survive that downscale; thick ones ruin it
> by eating the colour area. The white cut edge that separates the figure from
> the dark panel is added afterwards by a tool and is not your job. Keep the surface clean
> of any lettering, numbers, logos, signature or watermark. One character only.

### Fixing it conversationally

Gemini keeps the thread, which is its real advantage here — correct in
follow-ups rather than rewriting the prompt:

- *"The outline is too thin — thicken it so it still reads when the image is 56 pixels wide."*
- *"There's a soft glow bleeding into the green. Make the background one perfectly flat #00FF00 with a hard edge against the character."*
- *"Their [feature] got lost. Bring it back and simplify the [other thing] to make room."*
- *"The lines are far too thick. Redraw with cleaner, thinner lineart — about ten pixels on a 1024 canvas — and make the outer contour the same weight as the interior lines."*
- *"Wrong outfit. They are wearing [OUTFIT] — reproduce it from the reference, including the [detail] and the [detail], as flat shapes. Do not substitute a generic jacket."*
- *"The head is too small. Make the whole figure exactly two head-heights tall — the head alone fills the top two thirds of the image, and the shoulders are narrower than the head."*
- *"The widest point of the silhouette must be the hair, about a third of the way down, not the shoulders."*
- *"Less bold and less graphic — the weight of a printed manga panel, not a vinyl decal."*
- *"Make the irises two or three concentric rings in [HEX] around a dark pupil."*
- *"Too many colours. Cut it to five, keeping [HEX] as the loudest."*
- *"Zoom out slightly — the top of their head is touching the frame."*

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

## Turning what Gemini gives you into the actual PNG

```
python3 tools/key_chibi.py ~/Downloads/zazz.png --rim 1.4 --uri
```

It pulls the green, ramps the edge instead of thresholding it — so the outline
keeps its antialiasing rather than becoming a staircase at 56px — suppresses
the green spill that would otherwise read as a lime halo against the dark
panel, trims to what is actually drawn, re-pads square, and writes:

- `zazz_keyed.png` — 512×512, real alpha
- `zazz_keyed.png.txt` — the `data:` URI, ready to paste
- `zazz_keyed_56.png` — **the 56-pixel view, magnified.** This is the only
  size that decides whether it worked. Judge it here, not at 100%.

Flags worth knowing: `-k magenta` or `-k '#rrggbb'` if a character's palette
collides with the green field, and `--inner` / `--outer` to widen or tighten
the edge ramp if the key eats the outline or leaves a fringe.

### Installing it

The `chibi` field goes straight into `<img src="…">`, and the Ledger is opened
off a disk where `file://` will not reliably fetch a sibling image — so the
data URI is the one that always works:

```js
chibi: "data:image/png;base64,iVBORw0KGgo…"
```

All 66 connections currently sit at `chibi: null`, and there is no picker in
the UI — right now it is a hand edit per person. Say the word and that becomes
a file button on the connection's edit view that runs the same keying in the
browser and saves the result itself.

---

Sources for the Gemini-specific constraints:
[Google's Nano Banana prompting guide](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana),
[Gemini image generation docs](https://ai.google.dev/gemini-api/docs/image-generation),
[how to prompt Gemini 2.5 Flash image generation](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/),
[why Gemini can't generate transparent backgrounds](https://ruky.me/nano-banana/).
