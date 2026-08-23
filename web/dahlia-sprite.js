/* Play the packed clips on a <canvas>, driven by whatever calls you make.
 *
 * An animated WebP or GIF in an <img> cannot be driven: it starts when it
 * loads, loops until the element is gone, and offers nothing to script. That
 * is fine for a preview and useless for a key press, which needs a clip to run
 * once, to be interruptible, and to say when it has finished. So the frames
 * are drawn one at a time out of the atlas instead.
 *
 *   const d = await DahliaSprite.load(canvas, 'dahlia_atlas.json');
 *   d.idle('dahlia_twirl');                 // the loop everything returns to
 *   d.play('dahlia_attack');                // once, then back to the idle
 *   d.play('dahlia_hit', { then: () => …}); // ... with something after it
 *
 * Time is counted in frames of the clip's own fps, accumulated against the
 * real clock rather than against animation-frame callbacks, so a 24fps clip
 * plays at 24fps on a 60Hz screen and on a 144Hz one, and a browser that
 * throttles the tab does not leave the animation behind.
 */
const DahliaSprite = (() => {
  class Sprite {
    constructor(canvas, atlas, image, scale) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.atlas = atlas;
      this.img = image;
      this.clip = null;      // the one-shot currently running, if any
      this.loop = null;      // the clip returned to when nothing else is on
      this.i = 0;
      this.acc = 0;
      this.last = 0;
      this.done = null;
      this.raf = 0;
      this.resize(scale);
    }

    /* The backing store is the cell at device resolution and the element is
     * the size you asked for, so the sprite is not resampled twice on a
     * retina screen. */
    resize(scale = 1) {
      const [w, h] = this.atlas.cell;
      const dpr = window.devicePixelRatio || 1;
      this.cv.width = Math.round(w * scale * dpr);
      this.cv.height = Math.round(h * scale * dpr);
      this.cv.style.width = `${w * scale}px`;
      this.cv.style.height = `${h * scale}px`;
      this.ctx.imageSmoothingQuality = 'high';
      return this;
    }

    /** The clip everything falls back to. Starts it if nothing else is on. */
    idle(name) {
      this.require(name);
      this.loop = name;
      if (!this.clip) this.start(name, null);
      return this;
    }

    /** Play once. Interrupts whatever is running; `then` fires at the end. */
    play(name, { then = null } = {}) {
      this.require(name);
      this.start(name, then);
      return this;
    }

    /** Cut straight back to the idle, dropping any pending callback. */
    stop() {
      this.done = null;
      if (this.loop) this.start(this.loop, null);
      return this;
    }

    get playing() { return this.clip; }

    require(name) {
      if (!this.atlas.clips[name]) {
        throw new Error(`no clip "${name}" in the atlas — have: ` +
                        Object.keys(this.atlas.clips).join(', '));
      }
    }

    start(name, then) {
      this.clip = name === this.loop ? null : name;
      this.current = name;
      this.done = then;
      this.i = 0;
      this.acc = 0;
      this.last = performance.now();
      this.draw();
      if (!this.raf) this.raf = requestAnimationFrame(t => this.tick(t));
    }

    tick(now) {
      this.raf = requestAnimationFrame(t => this.tick(t));
      const clip = this.atlas.clips[this.current];
      // A tab that was in the background hands back a huge delta. Clamping it
      // means the clip resumes rather than skipping most of the way through.
      this.acc += Math.min(now - this.last, 250);
      this.last = now;
      const step = 1000 / clip.fps;
      let drew = false;
      while (this.acc >= step) {
        this.acc -= step;
        this.i += 1;
        if (this.i >= clip.frames.length) {
          if (this.clip) {                     // a one-shot has finished
            const then = this.done;
            this.done = null;
            this.clip = null;
            this.current = this.loop || this.current;
            this.i = 0;
            if (then) then();
          } else {
            this.i = 0;                        // the idle just loops
          }
        }
        drew = true;
      }
      if (drew) this.draw();
    }

    draw() {
      const clip = this.atlas.clips[this.current];
      const cell = clip.frames[this.i];
      const [w, h] = this.atlas.cell;
      const sx = (cell % this.atlas.cols) * w;
      const sy = Math.floor(cell / this.atlas.cols) * h;
      this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      this.ctx.drawImage(this.img, sx, sy, w, h,
                         0, 0, this.cv.width, this.cv.height);
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  async function load(canvas, manifestUrl, { scale = 1 } = {}) {
    const atlas = await (await fetch(manifestUrl)).json();
    const src = new URL(atlas.image, new URL(manifestUrl, location.href)).href;
    const img = new Image();
    img.src = src;
    await img.decode();
    return new Sprite(canvas, atlas, img, scale);
  }

  return { load, Sprite };
})();

if (typeof module !== 'undefined') module.exports = DahliaSprite;
