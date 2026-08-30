# Chibi portraits for the Wavelengths — a Gemini prompt

For Gemini / Nano Banana, which needs a different prompt from most image tools
for two concrete reasons, not stylistic ones:

1. **Gemini cannot output transparency.** Not Nano Banana, not Nano Banana Pro,
   not Nano Banana 2 — none of that family writes an alpha channel. Ask for a
   transparent background and it *paints* one: flat white, flat black, or a
   drawn-on checkerboard that looks transparent and isn't. So the prompt asks
   for a **flat chroma field** and `tools/key_chibi.py` removes it.
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
> them redrawn as a chibi bust portrait.
>
> Draw the head large and the body small, about a one-to-one-point-six ratio,
> so the head dominates. Show only the head, shoulders and upper chest, cropped
> just below the collarbone, sitting in the upper two-thirds of a square frame.
> Give them large simplified eyes and a minimal nose and mouth.
>
> Keep their likeness through three things and let everything else go: the
> shape of their hair in silhouette, their single most identifying piece of
> clothing or gear, and their colours. For **[NAME]**, the one detail that must
> survive is **[THE ONE READABLE FEATURE — the bone-white mask, the split-colour
> hair, the welding goggles, the missing arm]**. If something has to be
> simplified away, simplify anything else first.
>
> Render it flat, the way a clean vector sticker is rendered: solid blocks of
> colour, at most two steps of cel shading, a thick dark outline about three
> percent of the image width running around the whole silhouette, and even
> lighting with no gradients and no visible brush or paper texture. The world
> is a grimy desert-cyberpunk one — worn fabric, taped repairs, matte scuffed
> metal — but show that wear as a few bold simple shapes rather than as fine
> detail or grain.
>
> Use four or five colours in total and no more. Build them around **[HEX]**,
> which should be the loudest thing in the picture — their hair, cloth, glow or
> trim — with everything else muted and desaturated so that one colour carries
> the character.
>
> Put them on a **completely flat, uniform pure green field, hex #00FF00**,
> filling the entire background edge to edge with a single even colour — no
> scenery, no floor, no horizon, no gradient, no glow around the figure, no
> shadow cast on the green, and no checkerboard pattern. The green must be
> untouched and the same shade in every corner. Do not use any green anywhere
> on the character themself.
>
> Compose it as a **square, 1:1**. The figure should fill about eighty-four
> percent of the frame, centred, with an even band of green all the way around.
> Keep the whole silhouette clear of the four corners, which are cut off when
> this is displayed.
>
> The picture will be shown at fifty-six pixels across, so it has to hold up
> tiny: strong contrast between the figure and the background, bold readable
> shapes, and a surface clean of any lettering, numbers, logos, signature or
> watermark. One character only.

### Fixing it conversationally

Gemini keeps the thread, which is its real advantage here — correct in
follow-ups rather than rewriting the prompt:

- *"The outline is too thin — thicken it so it still reads when the image is 56 pixels wide."*
- *"There's a soft glow bleeding into the green. Make the background one perfectly flat #00FF00 with a hard edge against the character."*
- *"Their [feature] got lost. Bring it back and simplify the [other thing] to make room."*
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
python3 tools/key_chibi.py ~/Downloads/zazz.png --uri
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
