# image-parallax

## Purpose

Simple scroll parallax for a single full-bleed image: the image drifts
vertically inside its own frame as the section scrolls through the
viewport. Desktop only (≥992px). Generic — works on any wrapper containing
an `<img>`, regardless of Webflow class names (see Notes). First used on
`section_full-image`, reusable as-is on any other section. Listed in
[`ANIMATIONS.md`](../ANIMATIONS.md), the catalog of reusable animations.

## Webflow Setup

Add to the section wrapper (the ancestor containing the image, not the image
itself):

```
data-component="image-parallax"
```

Optional attribute on the same wrapper:

- `data-image-parallax-speed="0.8"` — how much of the available slack (see
  Behavior) the drift actually uses, `0`–`1` (default `0.8`). Higher = more
  travel, capped at `1` so it can never exceed the slack and expose an edge.

No other markup changes needed — the component reads the first `<img>`
inside the wrapper.

## Behavior

- **Init**: The whole setup below is deferred until `window`'s `load` event
  (or runs immediately if the page has already finished loading) — see
  Notes for why. Gated behind `gsap.matchMedia('(min-width: 992px) and (prefers-reduced-motion: no-preference)')`.
  Scales the image up 30% around its own center (`scale: 1.3`), then reads
  its real rendered height (`img.offsetHeight` — unaffected by the `scale`
  transform) to compute the actual slack that scale created: `(height ×
  0.3) / 2` px per side. Travel is `slack × speed`, so it is always
  measured from the image's own real size at that breakpoint, never a fixed
  px guess. Drives the image's `y` transform from a scrub-smoothed 0-1
  scroll proxy (same technique as [`guests`](./guests.md)'s layers) as the
  section crosses the viewport (`top bottom` → `bottom top`), mapping it
  from `-travel` to `+travel` so the image drifts symmetrically around its
  resting position.
- **Resize**: Not used — `ScrollTrigger`'s own `invalidateOnRefresh` and
  `gsap.matchMedia()` handle re-measuring and breakpoint crossing. Slack and
  travel are recomputed from scratch every time `gsap.matchMedia()`
  re-activates (e.g. crossing 992px), so a breakpoint change always gets a
  freshly-measured value, never a stale one.
- **Breakpoint**: Not used — handled by `gsap.matchMedia()`.
- **Below desktop / reduced motion**: `gsap.matchMedia`'s cleanup clears the
  image's transform (both the scale and the drift) and removes the active
  class — the section renders as a plain static Webflow banner, no JS
  involvement, at its exact original size.

## Dependencies

- `window.gsap` / `window.ScrollTrigger` (global, via CDN — not bundled), so
  it shares the Lenis-driven instance from `global.js`.
- `src/styles/image-parallax.css` — desktop-only `will-change: transform`
  hint on the image. Nothing else — no aspect-ratio, no forced width/height,
  no class-name-specific clipping rule (see Notes for why).

## DOM Expectations

Elements matching `[data-component='image-parallax']` must contain one
`<img>` as a direct child of some wrapper (any class name — `image-parallax.js`
sets `overflow: hidden` on that wrapper itself at runtime, in JS, not via a
CSS rule tied to a specific class — see Notes).

## Notes

- **Why there's no fixed aspect-ratio or frame height, and why that's not
  a corner cut**: earlier versions of this component forced the image's
  frame to a guessed `aspect-ratio` (first an arbitrary `16 / 7`, then the
  image's own real `1440 / 500` intrinsic ratio, read directly off the AVIF
  file). Both still read as badly cropped in testing, because the frame's
  ratio interacting with the parallax offset is sensitive to the exact
  rendered size at whatever the current viewport happens to be, and a
  static ratio can't track that. Scaling the *actual* rendered image
  (whatever size Webflow already gives it) instead of imposing a different
  shape on it removes the whole class of bug: there is no ratio to get
  wrong, because none is set. This is also why `data-image-parallax-speed`
  is a `0`–`1` fraction of the measured slack now, not a raw px value —
  a fixed px travel (tried first) needed its own separate guess about how
  much slack was safely available at each breakpoint, which was the same
  mistake one level down.
- **Generic by design**: earlier versions clipped the frame via a CSS rule
  scoped to `.full-image_component` specifically (`section_full-image`'s
  own Webflow class), which meant reusing this on a different section
  required that section's image wrapper to carry that exact class name.
  `image-parallax.js` now sets `overflow: hidden` directly on `img.parentElement`
  at runtime instead — so any `[data-component='image-parallax']` wrapper
  containing an `<img>` works immediately, no matter what its parent div is
  named. Cleaned up on breakpoint/reduced-motion revert, same as the
  transform.
- **Trigger spans the whole section** (`top bottom` → `bottom top`), which
  on `section_full-image` also includes its two `section_spacer` blocks —
  not scoped to just the image's own frame. Scoping it to the frame alone
  was tried and reverted — it read worse in practice on that section. Don't
  re-apply that change without checking with Tadeo first.
- **Why not `data-section-reveal`**: `section-reveal.js`'s `expand` variant
  is a completely different effect — a pinned "curtain" reveal that grows a
  section from a small inset card to full-bleed over the previous section's
  own scroll, not a parallax. It also requires a same-wrapper
  `[data-component="section-reveal"]` ancestor to ever load at all, which
  `section_full-image` didn't have — that attribute silently did nothing.
  Use `image-parallax` for "image moves inside its frame while scrolling"
  and `section-reveal` only for an actual pinned grow/curtain transition
  between two sections.
- `SCALE = 1.3` (30% bigger) is the one tunable constant left in
  `image-parallax.js` — raise it for more available slack (and therefore
  room for more travel at the same `speed`), at the cost of the image
  reading more zoomed-in at rest. `DEFAULT_SPEED = 0.8` uses 80% of
  whatever slack that scale produces.
- `SCRUB = 0.8` (seconds of catch-up lag) — slightly softer than
  [`guests`](./guests.md)'s `0.6`, tuned for a smoother feel on a large
  full-bleed image.
- **Setup is deferred until `window` `load`, run once, never re-measured on
  this component's own initiative afterward**: this section sits right
  after [`horizontal-scroll`](./horizontal-scroll.md)'s pinned wrapper,
  which builds its pin — and the spacer that reserves its scroll distance —
  synchronously the moment *its own* module runs. That's a separate dynamic
  import (see `main.js`), resolved independently of this component's, with
  no ordering guarantee between the two. Two things were tried and reverted
  before landing on this:
  1. A single `ScrollTrigger.refresh()` on `load` alone (no deferred setup)
     — `load` firing doesn't guarantee horizontal-scroll's chunk has
     finished running by then if this component's own trigger was already
     created earlier. Confirmed live via the HUD (see below): `progress`
     pinned at exactly `1.000` even with the section barely visible at the
     very bottom of the viewport — the classic sign of a trigger whose
     `end` was computed far too small, against a page that looked shorter
     than it really was at creation time.
  2. A `ResizeObserver` on `document.body`, refreshing `ScrollTrigger`
     whenever the page's height changed after that. This one is a known
     GSAP rough edge on a page with pinned sections: calling `refresh()`
     while the user is actively scrolling through (or just past) a *pinned*
     trigger can briefly measure the page mid pin-transition and hand back
     the wrong `start`/`end` for triggers positioned after it — confirmed
     live via the HUD, this component's `progress` was visibly swinging
     around *during* the horizontal-scroll section itself instead of
     staying at `0` until reaching this one.

  Deferring the *entire* setup (not just a refresh) to `load` sidesteps
  both: `load` only fires once every image and font has settled, by which
  point every component's dynamic import has long since resolved and run
  (module fetch/parse is trivially fast next to image loading), so the
  whole page's real layout — horizontal-scroll's pin included — is
  guaranteed final by the time this component ever measures anything, in
  one clean pass, with nothing calling `refresh()` again afterward to
  destabilize it.
- **Debugging**: call `window.imageParallaxDebug()` from the console at the
  exact moment something looks wrong — dumps, per active instance, the
  trigger's `start`/`end` (px), live `progress`, `isActive`, the measured
  `slack`/`travel`, the image's real rendered height, and the section's
  current rect. There is also a live on-page HUD (`HUD`, currently `false`
  — flip to `true` for live debugging without opening the console) — a
  fixed strip at the bottom of the page showing the same numbers updated
  every scroll frame. This is what surfaced the pinned-section timing bug
  above: with the HUD on, `progress` visibly changing *during* the
  horizontal-scroll section (instead of staying at `0` until reaching this
  one) was the tell. Neither this nor `window.imageParallaxDebug()` is
  gated behind a rebuild-required flag beyond that one boolean — needing a
  rebuild and reload to inspect a bug means inspecting it after it's gone
  (same reasoning as `image-grow.js`'s `window.imageGrowDebug()`). `DEBUG`
  (currently `false`) only toggles ScrollTrigger's on-screen start/end
  markers, separate from `HUD`.
- **Perf**: `img` gets `will-change: transform` (in `image-parallax.css`,
  desktop-only) so the browser promotes it to its own compositor layer up
  front rather than on the first scroll frame the trigger activates.
  `gsap.quickSetter` is used for the per-frame write (bypasses the tween
  engine's overhead for a plain repeated numeric set) and the `scale` is
  set once at init, never re-set per frame.
