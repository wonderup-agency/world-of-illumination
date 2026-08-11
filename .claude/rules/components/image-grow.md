# image-grow

## Purpose

Pins a section in place while a centered image grows from a smaller "card"
look to full-screen, then releases the pin and lets scroll continue normally
into the next section. Same reference behavior as the Scout Motors
"traveler" page (`scoutmotors.com/traveler`).

## Webflow Setup

Add to the section wrapper:

```
data-component="image-grow"
```

Required `data-image-grow` roles inside the wrapper:

| Value | On | Purpose |
| --- | --- | --- |
| `pin` | a full-height wrapper (e.g. `.full-height_component`) | the element that gets stuck to the viewport while the grow plays out |
| `target` | the image wrapper inside `pin` (e.g. `.image_grows-wrapper`) | the element the clip-path growth is animated on |

Optional attributes on the `pin` element (all numbers, no unit in the
attribute value — all are rem except `distance`):

- `data-image-grow-width="22"` — rest-state card width, in rem (default `22`)
- `data-image-grow-height="26"` — rest-state card height, in rem (default `26`)
- `data-image-grow-radius="2"` — corner radius in rem at rest (default `2`)
- `data-image-grow-distance="1.6"` — how many viewports of scroll the grow takes (default `1.6`)

Width/height are a fixed rem size, not a percentage of the viewport — that's
deliberate. The rest-state shape (portrait, landscape, square) should read as
whatever was designed, not shift with however wide or tall the browser window
happens to be. `image-grow.js` converts these into the equivalent clip-path
inset percentages against the live viewport in `sync()`, so the card keeps
its designed shape across resizes and breakpoints down to 992px.

Example markup:

```html
<section data-component="image-grow" class="section_image-grow">
  <div class="padding-global">
    <div class="container-large">
      <div data-image-grow="pin" class="full-height_component">
        <div data-image-grow="target" class="image_grows-wrapper">
          <img class="image_grows" src="..." alt="" />
        </div>
      </div>
    </div>
  </div>
</section>
```

Anything else inside the section (background layers, other content) is
untouched by this component — style and position it freely.

**Required Webflow Overflow settings** — same requirement as
[`locations`](./locations.md)/[`gallery-slider`](./gallery-slider.md)/
[`theme-carousel`](./theme-carousel.md), just on the horizontal axis instead
of the vertical one: `pin` breaks out to the full viewport width (see Notes),
and that bleed has to reach the true screen edges.

- The outer `[data-component='image-grow']` **section** should have
  **Overflow: Hidden** in Webflow — this is what clips the breakout at the
  section's own edges instead of the page's.
- Every wrapper **between** the section and `pin` — `padding-global`,
  `container-large`, or any other div in between — must have **Overflow:
  Visible** (Webflow's default). If any one of them has Overflow set to
  Hidden or Clip, it clips the bleed early: `pin`'s width/position math is
  still correct, but only the slice of it inside that wrapper's own box
  survives, which looks exactly like the image staying centered but cut off
  on both sides instead of reaching the screen edges.

## Behavior

- **Init**: Gated behind `gsap.matchMedia('(min-width: 992px) and (prefers-reduced-motion: no-preference)')`.
  For each instance, adds `.is-image-grow` to the section (this is what
  `image-grow.css`'s rules key off of), then appends a spacer element
  (`image-grow_reveal-spacer`) right after `pin`, sized to
  `distance × 100vh`. `pin` becomes `position: sticky; top: 0; height: 100vh`
  and breaks out to the full viewport width; `target` becomes
  `position: absolute; inset: 0` — i.e. it is already at its full-screen size
  from the start. What makes it read as a smaller centered card at rest is a
  `clip-path: inset(...)` on `target`, computed in `sync()` from the
  `width`/`height`/`radius` attributes against the live viewport, animated
  down to `inset(0% 0% 0% 0% round 0rem)` as the section scrolls through its
  pinned range.
- **Scroll**: A native `scroll` listener (`passive: true`) restarts a short
  `requestAnimationFrame` loop (`tick`) rather than rendering once per event.
  Each frame, the *live* 0-1 scroll progress is read off the JS-appended
  spacer's own `getBoundingClientRect()` — not the pin's, since the pin is
  sticky and its rect stays clamped at `top: 0` for the whole time it's stuck,
  which can't tell you how far through that stuck window the scroll is (the
  spacer is a plain, unpositioned element that keeps moving 1:1 with scroll,
  so `viewport - spacer.top` is exactly the scroll consumed since the pin
  engaged, divided by the spacer's own height). A *displayed* progress value
  is then eased toward that live value by `SMOOTH` (0.08 — same lerp factor
  `global.js` gives Lenis, so the feel matches the rest of the page's scroll)
  every frame, and the loop keeps re-scheduling itself only while the two are
  still more than `SETTLE_EPSILON` apart — a short catch-up burst per scroll
  input, not a permanent page-wide ticker. `tick()` reads every instance's
  live progress in one pass before writing any instance's `clip-path` in a
  second pass — same read-then-write discipline as `footer.js` — so that with
  more than one `image-grow` section on the same page, one instance's write
  can't force an extra layout flush on the next instance's
  `getBoundingClientRect()` read. The displayed value is then mapped
  linearly (`ease: 'none'`) to the first `1 - TAIL` (85%) of the range, so the
  clip-path finishes before the pin releases rather than snapping mid-grow on
  a fast flick — same reasoning as `CLIP_TAIL` in `section-reveal.js`. These
  are two different kinds of smoothing solving two different problems: the
  lerp softens jerky per-frame scroll input over *time*, `ease` shapes how
  the growth is paced over *scroll distance* — deliberately linear rather
  than an `'out'` curve (`power2.out` shipped first), since an `'out'` curve
  front-loads the visual change (fast in the first stretch of scroll,
  decelerating hard as it nears full-bleed), which read as "rushes at first,
  drags at the end." Swap the `ease` constant for a gentler curve like
  `'sine.out'` if a *slight* deceleration near the end is wanted back without
  the harsher `power2.out` feel.
- **Resize**: Re-measures the spacer height and the width/height-derived
  clip-path insets against the new viewport size — only meaningful while
  active; `gsap.matchMedia` handles entering/leaving the 992px breakpoint
  itself.
- **Breakpoint**: Not used — `gsap.matchMedia` reverts everything
  automatically below 992px or under reduced motion: the spacer is removed,
  `.is-image-grow` comes off, and `target`'s clip-path is cleared, leaving a
  plain static image in normal Webflow flow.

## Dependencies

- `gsap` — core (`gsap.matchMedia`, `gsap.parseEase`), bundled via npm — no
  CDN script tag needed in Webflow for this component (unlike
  `horizontal-scroll`/`tabs-map`/`section-reveal`, which need
  `window.ScrollTrigger`).
- `src/styles/image-grow.css` — the sticky/breakout geometry for `pin`, the
  full-size absolute positioning for `target`, and the reduced-motion
  fallback.

## DOM Expectations

Elements matching `[data-component='image-grow']` must contain:

- `[data-image-grow='pin']` — a full-height wrapper
- `[data-image-grow='target']` — inside `pin`, wrapping the `<img>`

## Notes

- **Why no ScrollTrigger**: `horizontal-scroll.js`/`tabs-map.js`/
  `section-reveal.js` all pin via `window.ScrollTrigger` loaded globally via
  CDN, because `global.js` wires that specific global instance to Lenis.
  `section-reveal.js`'s `buildExpand` deliberately avoids ScrollTrigger's own
  `pin: true` for the same reason this component avoids it entirely: pinning
  switches an element to `position: fixed` and writes an explicit height,
  and any sub-pixel mismatch with its spacer nudges document height, which
  fires Lenis's `ResizeObserver` and truncates whatever scroll is in flight —
  felt as a stutter on the pin-engage frame. Native `position: sticky` never
  does any of that, so this component needs no ScrollTrigger — and therefore
  no CDN script tag in Webflow — at all.
- **Why clip-path, not width/height/transform**: same reasoning as
  `section-reveal.js`'s `expand` variant — no layout work per frame, and the
  corner radius rides along in the same `round` syntax without needing to be
  counter-scaled against a `transform: scale()` the way a plain
  `border-radius` would.
- **Why progress is read off the spacer, not the pin**: see the Scroll bullet
  above — the pin's own rect is sticky-clamped, the spacer's isn't. This also
  means the pin's parent element can contain anything else in the future
  without breaking the math — the spacer is a self-contained reference point.
- **Desktop only (≥992px)**: below that, or under reduced motion, the image
  renders exactly as Webflow laid it out — no pin, no clip-path, no spacer.
  This mirrors `footer.js`'s desktop-only gate for the same class of reason:
  the sticky/clip-path geometry is designed around a full viewport and isn't
  expected to hold up on tablet/mobile.
- **Width breakout**: `pin` uses `width: 100vw; margin-left/right:
  calc(50% - 50vw)` to reach the true screen edges regardless of
  `padding-global`/`container-large` — deliberately margin, not `left: 50%` +
  a negative margin (the more common version of this trick). `left` on a
  `position: sticky` element isn't a plain offset the way it is on
  `position: relative` — it only takes effect to satisfy sticky's own
  stick-to-this-edge constraint, which is never triggered here since the page
  never scrolls horizontally, so a `left: 50%` on the pin is simply inert.
  Margin is unaffected by the positioning scheme, so `calc(50% - 50vw)` is
  what actually re-centers a `100vw` box under a max-width, centered ancestor.
  Getting this wrong doesn't error — it silently renders the pin
  off-center and clipped on one side, which is exactly what shipped in the
  first pass of this component. Check for a horizontal scrollbar after adding
  this to a page — same check already done for `locations`/`gallery-slider`'s
  peeking slides.
- **`max-height: none` on `pin` is required, not decorative**: confirmed via
  the Webflow MCP (querying `.full-height_component`'s own properties
  directly, rather than guessing) that Webflow's base style for it ships with
  `max-height: 60rem` — a sensible cap for that class's usual "roughly full
  viewport" use elsewhere on the site, but wrong here. `height` and
  `max-height` are different properties, so setting `height: 100vh` alone
  never overrides Webflow's `max-height`, and without also overriding it, the
  pin — and the spacer/grow-range math derived from it — is silently capped
  at 60rem tall on any viewport taller than that.
- **`max-width: none` on the `<img>` itself is required too, same reason**:
  this project's `.image_grows` class (confirmed via the Webflow MCP) sets
  `max-width: 28rem` as part of its original centered-card look, plus
  `position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)`
  to center it. That positioning recipe is compatible with this component —
  once `width`/`height` are forced to `100%`, the centered anchor point and
  the transform's own `-50%` cancel out to exactly the same edge-to-edge box
  a plain `inset: 0` would give — but `max-width: 28rem` caps the rendered
  width at 448px regardless, since `max-width` always wins over `width` when
  they conflict. Without overriding it, the image can never render wider than
  448px no matter how big `pin`/`target` grow — which is exactly the "stays
  centered but never reaches the screen edges" symptom this shipped with
  before the override was added.
- **Checked and ruled out via the Webflow MCP**: `padding-global`,
  `container-large`, and the section itself all have no `overflow` override
  (Designer default, i.e. visible) on this project, so none of them clip the
  width breakout. `main-wrapper` (sitewide, every page) does have
  `overflow: clip`, but since it carries no width/padding of its own it
  already spans the full viewport — leave it alone; it isn't the cause of a
  clipped breakout and removing it would be a sitewide change for no reason.
  When a future instance of this component looks clipped or off-center, check
  the same way — via the Webflow MCP's style/element tools directly (styles
  on the pin/target *and* on whatever's actually inside them, like the `img`
  here) — before asking Tadeo to open the Designer.
- **If the pin isn't sticking at all** (image stays small, un-centered, never
  grows, and scrolling past the section doesn't visibly pin anything): the
  first thing to check is whether `image-grow.css` actually loaded — a
  cached `dist/styles.css` from before this component existed is the usual
  culprit locally. `image-grow.js` checks this itself once on activation
  (`getComputedStyle(pin).position !== 'sticky'` → `console.warn`), so check
  the browser console first. The other classic cause of `position: sticky`
  silently not sticking: an **ancestor with `overflow` set to anything other
  than `visible`** (including just `overflow-x: hidden`, which per spec forces
  the other axis to a used value of `auto` — still enough to create a new
  sticky containing block) between the pin and the page's real scrolling
  viewport. If the console warning isn't firing but the pin still won't
  stick, check every ancestor between it and `<body>` for an `overflow` rule.
- `DEFAULT_REST_WIDTH` (22rem), `DEFAULT_REST_HEIGHT` (26rem), `DEFAULT_RADIUS`
  (2rem) and `DEFAULT_DISTANCE` (1.6 viewports) are tunable constants at the
  top of `image-grow.js`, all overridable per-instance via the
  `data-image-grow-*` attributes above. `SMOOTH` (0.08, the lerp factor) and
  `TAIL` (0.15) aren't exposed as attributes — edit the constants directly if
  a future instance needs a different feel.
- **Debugging**: call `window.imageGrowDebug()` from the console at the exact
  moment something looks wrong — mirrors `section-reveal.js`'s
  `window.sectionRevealDebug()`. Dumps, per instance: the pin's computed
  `position` and rendered width (compare against `window.innerWidth` — if
  they don't match, something's still clipping the breakout), the spacer's
  live rect, the computed insets, the raw vs. smoothed (`current`) progress,
  and the current `clip-path` string. Not gated behind a debug flag on
  purpose — needing a rebuild and a reload to inspect a bug means inspecting
  it after it's gone.
