# floating-parallax

## Purpose

Subtle horizontal parallax for images floating inside a panel that lives
**inside a `horizontal-scroll` section** (built for `section_floating-images`,
one panel of `section_horizontal`). Each image drifts left/right at its own
speed as the panel passes across the screen, giving a sense of depth without
touching the horizontal-scroll mechanism itself.

Not usable outside a `horizontal-scroll` panel — see Behavior for why.

## Webflow Setup

Add to the panel element (the one that already carries
`data-horizontal-scroll-panel`, inside a `[data-component='horizontal-scroll']`
wrapper):

```
data-component="floating-parallax"
```

Inside, each image that should drift needs:

```
data-speed="0.25"
```

Higher `data-speed` = more travel. Typical range `0.3`–`0.5` (same convention
as [`guests`](./guests.md)'s `data-speed`, reused here for consistency —
though the two components use it very differently, see Notes). Keep the
spread fairly narrow — see Notes on why a wide spread (e.g. `0.15`–`0.4`)
left every image but the fastest looking static.

## Behavior

- **Init**: Deferred until `window`'s `load` event (or runs immediately if the
  page has already finished loading) — see Notes for why this is required,
  not just cautious. Gated behind
  `gsap.matchMedia('(min-width: 992px) and (prefers-reduced-motion: no-preference)')`.
- **Finding the driver**: For each panel, walks up to its
  `[data-component='horizontal-scroll']` ancestor and finds that wrapper's own
  ScrollTrigger via `ScrollTrigger.getAll()` (read-only — `horizontal-scroll.js`
  is never imported or modified). That ScrollTrigger's `.animation` (the tween
  or timeline `horizontal-scroll.js` created for train/curtain mode) is passed
  as `containerAnimation` to a new, separate ScrollTrigger — GSAP's documented
  mechanism for syncing a nested effect to a "fake" horizontal scroll's own
  progress instead of the page's vertical scroll. The trigger for this nested
  ScrollTrigger is `.floating-image-wrapper` (a **child** of the panel, not
  the panel itself — see Notes), with horizontal-axis start/end
  (`'left right'` / `'right left'`).
- **Per-frame**: A plain `ScrollTrigger.create({ onUpdate })` (no separate
  scrubbed proxy tween — see Notes) reads `self.progress` directly (linear,
  `EASE = 'none'`) and drives every `[data-speed]` image's `x` transform
  between `-travel` and `+travel` (own `data-speed` × `TRAVEL`, 220px) —
  horizontal, the same axis the panel itself is already moving on.
- **Leaving desktop / reduced motion**: `gsap.matchMedia`'s cleanup kills the
  nested ScrollTrigger/tween and clears every image's transform
  (`clearProps: 'transform'`) — images sit exactly where Webflow's own
  `floating_image1`–`floating_image8` positioning classes put them, no JS
  residue.
- **Resize**: Not used — `ScrollTrigger`'s own `invalidateOnRefresh` and
  `gsap.matchMedia()` handle re-measuring and breakpoint crossing.
- **Breakpoint**: Not used — handled by `gsap.matchMedia()`.

## Dependencies

- `window.gsap` / `window.ScrollTrigger` (global, via CDN — not bundled), the
  same instance `horizontal-scroll.js` and `global.js`'s Lenis wiring use.
- `src/styles/floating-parallax.css` — a desktop-only `will-change: transform`
  hint on `[data-speed]` images while the effect is active. No positioning
  rules — Webflow's own `floating_image1`–`8` classes are untouched.

## DOM Expectations

- Must sit inside a `[data-component='horizontal-scroll']` wrapper, as one of
  its `[data-horizontal-scroll-panel]` panels.
- Must contain `.floating-image-wrapper` with one or more `[data-speed]`
  images inside it.

## Notes

- **Why this can't reuse `guests.js` as-is**: `guests.js` drives its parallax
  off a plain vertical ScrollTrigger (`top bottom` → `bottom top` against the
  page's normal scroll). A panel inside a pinned `horizontal-scroll` section
  never moves vertically at all — the section is pinned and only its panels
  translate on `x` — so that vertical trigger would report a constant,
  meaningless progress here. This component reads horizontal-scroll's own
  `x` progress instead (via `containerAnimation`), which is the only
  progress value that actually changes while this panel is on screen.
- **Why the trigger is `.floating-image-wrapper`, not the panel itself**:
  GSAP's own `containerAnimation` guidance is to trigger off a *child* of
  whatever element the driving animation moves, never that element itself —
  in this project, `horizontal-scroll.js`'s train mode applies `x` directly
  to each panel (no separate wrapper), so the panel itself is exactly the
  element to avoid using as a nested trigger.
- **Why setup is deferred to `window` `load`**: `horizontal-scroll.js` and
  this component are two independent dynamic imports with no ordering
  guarantee between them (see `ARCHITECTURE.md`). This component's
  `ScrollTrigger.getAll()` lookup only succeeds if horizontal-scroll's own
  ScrollTrigger already exists — deferring to `load` (same technique as
  [`image-parallax`](./image-parallax.md)) guarantees every component's
  module has already run by the time this looks for it, since script
  fetch/parse is trivially fast next to image/font loading.
- **Zero coupling to `horizontal-scroll.js`**: this component never imports,
  edits, or reads any internal state from `horizontal-scroll.js` beyond its
  already-public `ScrollTrigger` instance — the horizontal-scroll mechanism
  itself is completely unmodified by this component's presence or absence.
- **X-axis, deliberately, not Y**: an earlier version drove `y` (a
  perpendicular wobble, borrowed as-is from `guests.js`'s vertical-scroll
  convention). In practice this read as the *panel/text* also wobbling —
  the images' off-axis motion drew the eye and made the otherwise-static
  text and background look like they were parallaxing too, even though
  nothing was ever applied to them. Driving `x` instead — the same axis the
  panel is already moving on — reads as depth (some images drift slightly
  ahead of/behind the panel's own pace) instead of a distracting wobble.
- **No separate scrubbed proxy tween, deliberately**: an earlier version used
  `gsap.to(proxy, { scrollTrigger: { containerAnimation, scrub: 0.6 } })`,
  layering its own independent lag on top of a progress value that's already
  1:1 synced to horizontal-scroll's own (already scroll-linked) tween via
  `containerAnimation`. Two independently-timed lags fighting each other is
  exactly what produced the "everything nearby looks like it's wobbling"
  symptom above — the images visibly lagged behind the panel's real
  position. A plain `ScrollTrigger.create({ onUpdate })` reads `self.progress`
  every frame with zero extra lag; "smooth" instead means continuous,
  scroll-linked motion with no discrete jumps — not a time-based lag layered
  on top of an already-synced value.
- **Linear (`EASE = 'none'`), not an eased curve**: a `sine.inOut` shape was
  tried first, but it decelerates hardest right at the panel's entry/exit —
  exactly the part of the crossing most likely to be on screen when someone
  glances at it — which read as "barely moves." Linear keeps the drift rate
  constant across the whole crossing, so it's equally visible start to
  finish.
- **`TRAVEL` had to go up a lot from its first value (80px) to actually
  read as movement**: at 80px, a `data-speed` range of `0.18`–`0.4` only
  produces ~14px–32px of travel — confirmed via the live DOM (inspecting the
  rendered `transform: translate(...)` on each image mid-scroll) that this
  was too subtle against images this size (200–400px).
- **Why only one image read as "moving" even after the first bump (`TRAVEL
  = 220`, ~40px–88px)**: checked each `floating_imageN` class's own
  position via the Webflow MCP — most sit well inside the panel over plain
  background, where a pixel shift has no nearby edge/reference to judge it
  against, so it reads as barely perceptible. `floating_image7` (the one
  data-speed = 0.4, the fastest at the time) is positioned at `right: -7%`
  — right at the panel's own edge, where the same shift is much easier to
  see (it visibly crosses in/out of the clipped viewport strip, a much
  stronger cue than a shift over plain background).
- **Why the same speed value still read very differently between images**
  (second round of tuning): `floating_image3` (`left: -14%`) also bleeds off
  its edge, same as `image7` — both read clearly even at moderate speed.
  `floating_image1`, `2`, `6`, `8` all sit fully inside the panel (`left`/
  `right` values are positive, no edge bleed), so *the same* travel amount
  reads noticeably weaker on them purely from lacking that edge reference.
- **Ceiling on how far the interior images (`1`, `2`, `6`, `8`) can be
  pushed — a real tradeoff, not a bug**: raising their `data-speed` to
  `0.5`–`0.6` (to match the edge images' perceived motion) made the static
  heading text *look* like it was drifting too — confirmed on request that
  the text element genuinely has no `transform` applied at all (it isn't
  targeted by this component and never was). This is **induced motion**: a
  static object next to a large, independently-moving one reads as if it's
  moving itself, and `1`/`2`/`6`/`8` all sit spatially close to
  `.floating-header`'s text block, unlike `3`/`4`/`7`. Pushing those four
  far enough to visually match the edge images' impact reliably reintroduces
  this illusion; there is no `data-speed` value that avoids it while still
  fully matching the edge images. Current live values settle for a middle
  ground — clearly more motion than the original subtle pass, without
  pushing far enough to disturb the text (all speeds, high → low):
  `image2 0.46, image1/image6 0.42, image7 0.5, image8 0.4, image4 0.48,
  image3 0.36`. If a future request wants the interior images to fully
  match the edge ones' visible motion, that requires either moving the
  text block itself further from those images, or accepting some induced
  motion on it as a tradeoff — not a `data-speed` tweak.
- `TRAVEL` (250px) and `EASE` (`'none'`) are tunable constants at the top of
  `floating-parallax.js`. Per-image feel is tuned via each image's own
  `data-speed` in Webflow, not by editing these — see the two notes above
  before changing any single image's value in isolation.
