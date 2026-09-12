/* ==== BEGIN HUD DIALS — injected block, delete to the END marker to revert ====

   A radial gauge that actually tracks a number.

   The reference sheets are full of arc dials and none can be used as drawn: a
   picture of a gauge at 70% is a picture, and these numbers move. A real one
   is a conic-gradient whose sweep is a variable, which means something has to
   put the value INTO that variable, and CSS cannot read a number out of the
   document. This is the smallest script that can.

   It is small because the tracker already publishes the value where it is
   cheapest to take: every .bar holds an <i> whose inline style.width is a
   percentage. Nothing is parsed, computed or guessed.

   The first version ran once, at parse time, and attached nothing at all --
   the tracker builds its board in script, so at the moment this file executes
   there are no .bar elements to find, and it re-renders whole unit cards
   during play, which would have thrown away any dial that had been attached.
   So it does not run once: it watches, and adopts every bar it has not seen.
   ========================================================================= */
(function () {
  var SEEN = "hudDial";
  var ring = 0;

  function readInto(dial, fill) {
    /* The inline width is authoritative and the computed one is not: an
       untouched bar computes to its rendered pixels, and a bar in a collapsed
       card computes to 0. Falling back to 0 rather than to the computed value
       means a dial in a hidden panel reads empty instead of wrong. */
    var w = (fill && fill.style && fill.style.width) || "";
    var v = w.indexOf("%") > 0 ? parseFloat(w) : 0;
    dial.style.setProperty("--v", isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);
  }

  function adopt() {
    var bars = document.querySelectorAll(".bar");
    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i];
      if (bar.dataset[SEEN]) continue;
      var fill = bar.firstElementChild;
      if (!fill) continue;
      bar.dataset[SEEN] = "1";

      var dial = document.createElement("i");
      dial.className = "hud-dial";
      /* Which instrument ring this one wears. There are nine on the sheet and
         they are handed out in order rather than at random, so the same bar
         gets the same ring on every reload -- a gauge that changed its own
         face between sessions would read as a different gauge. */
      dial.setAttribute("data-ring", String(ring++ % 9));
      /* Inserted BEFORE the bar, never inside it. Inside would put it under
         the bar's clip-path, which is exactly what cut the chevron end caps
         off when those were attempted: a clip applies to a child the same way
         it applies to a pseudo-element. */
      bar.parentNode.insertBefore(dial, bar);
      readInto(dial, fill);

      /* The tracker sets the width by assigning to style.width, which fires an
         attribute mutation and nothing else -- there is no event to listen for
         and no value cheap enough to poll. One attribute filter is the cost. */
      (function (d, f) {
        try {
          new MutationObserver(function () { readInto(d, f); })
            .observe(f, { attributes: true, attributeFilter: ["style"] });
        } catch (e) {}
      })(dial, fill);
    }
  }

  /* Coalesced, because a single render() replaces many cards at once and
     adopting on every individual mutation would walk the document dozens of
     times for one repaint. */
  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(function () { queued = false; adopt(); }, 60);
  }

  function start() {
    adopt();
    try {
      new MutationObserver(schedule).observe(document.body,
        { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
/* ================= END HUD DIALS ========================= */
