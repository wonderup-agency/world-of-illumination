# theme-carousel

## Purpose

Auto-playing Swiper carousel of theme cards (logo + image), a sibling of
[`locations`](./locations.md) that swaps user-driven navigation for a fully
automatic one: the centered card is shown at full size, neighbors are scaled
down and dimmed, and the carousel advances on its own timer — no arrows, no
drag, no click. Built as a simpler replacement for the orbital effect in
[`shows`](./shows.md) on the "New Show Every Season" section; kept as its own
component (not a rewrite of `shows.js` in place) so the live section keeps
working untouched until the new design is approved — same pattern used for
[`tabs-map-v2`](./tabs-map-v2.md).

## Webflow Setup

Add to the wrapper that contains the swiper container:

```
data-component="theme-carousel"
```

Required structure inside:

- `.swiper` — Swiper container
  - `.swiper-wrapper` — slides wrapper
    - `.swiper-slide` — one per theme
      - `.theme_card-wrapper` — the element that actually scales/dims (JS reads
        only the classes above; anything inside `.theme_card-wrapper` — logo,
        image, layout — is free to differ).

No prev/next buttons are needed or read by this component.

## Behavior

- **Init**: Before Swiper runs, pads the real `.swiper-slide` set with
  duplicate rounds of itself (cloned, `aria-hidden="true"`) until at least
  `MIN_SLIDES_FOR_LOOP` (16) exist in the DOM — see Notes for why. Then
  initializes a Swiper instance on `.swiper` with `centeredSlides: true` and
  `slidesPerView: 'auto'` (same centered/auto-width setup as `locations`),
  plus `loop: true` and the Autoplay module so it advances on its own every
  `AUTOPLAY_DELAY` (4s) with a `TRANSITION_SPEED` (800ms) transition — no
  user input required. `allowTouchMove`, `simulateTouch` and
  `grabCursor` are all disabled so the carousel can't be dragged or clicked
  through manually, per the design brief (fully automatic, no arrows). No
  pause-on-hover for now (removed by request — was there as a low-cost WCAG
  2.2.2 nod, can be re-added as `pauseOnMouseEnter: true` in the `autoplay`
  options if wanted later). Skips autoplay entirely under
  `prefers-reduced-motion: reduce` (Swiper still inits, centered on the first
  card, just static).
- **Resize**: Calls `swiper.update()` so Swiper re-measures auto-width slide
  sizing after a resize (mirrors `locations`, which relies on Swiper's own
  `updateOnWindowResize` default — done explicitly here since a lifecycle hook
  was already being returned).
- **Breakpoint**: Not used.

## Dependencies

- `swiper` — Autoplay, A11y modules.
- `src/styles/theme-carousel.css` — hides slides until Swiper initializes (to
  avoid an initial flash), switches `.swiper` to `overflow: visible` once
  initialized so peeking neighbor cards aren't clipped, and drives the
  active/inactive scale + opacity transition on `.theme_card-wrapper`.

## DOM Expectations

Elements matching `[data-component='theme-carousel']` must contain:

- `.swiper` — Swiper container
- `.swiper-wrapper` — slides wrapper
- `.swiper-slide` — individual slides (2+ required; the component pads the
  set with duplicates itself if the CMS list is small — see Notes)
  - `.theme_card-wrapper` — inside each slide, the element JS/CSS scales

## Notes

- **Slide width is fixed in CSS** (`440px` desktop, `320px` at ≤991px,
  `260px` at ≤479px — same values as `locations`), not left to Webflow.
  `slidesPerView: 'auto'` never sets a width itself, and without an explicit
  one the slide falls back to the bundled Swiper CSS's bare `.swiper-slide {
  width: 100% }` rule — which leaks sitewide via `testimonials.js`'s
  `swiper/css` import (same class-of-bug as documented in
  [`CONVENTIONS.md`](../CONVENTIONS.md)) and made every card fill the whole
  container with no peeking neighbors. Adjust the pixel values in
  `theme-carousel.css` if the design needs a different card size.
- `spaceBetween: 16` (gap between cards) is set in `theme-carousel.js`.
  Started at `24` (matching `locations`) but was brought down, together with
  the scale below, to tighten the visual gap between two adjacent
  non-active cards (see next note).
- **Why the gap between the two outer peeking cards looks bigger than the
  gap next to the active card**: `scale(0.9)` (down from an initial `0.85`)
  is applied to every non-active card equally, regardless of how far it is
  from the active one. `transform: scale()` shrinks a card inward from its
  own center, so when *two* non-active cards sit next to each other, both
  shrink inward on the side facing each other — doubling the visual gap
  versus the active card, which never shrinks. Purely a side effect of the
  binary active/inactive scale (locations has the exact same characteristic,
  just less noticeable there) — not a bug. `spaceBetween` and the scale
  amount are the two knobs to make it less noticeable; a fully graduated
  scale (near-active cards shrink less than far ones, like `shows`' orbit
  did) would remove it entirely but needs JS to tag each slide's distance
  from active, which hasn't been added here.
- **Why slides get duplicated in JS before Swiper runs**: Swiper's `loop`
  needs `slides.length >= slidesPerView + loopedSlides` (an internal value
  Swiper computes itself — not a config option, despite the similarly-named
  `loopedSlides` sometimes assumed to be settable). With `centeredSlides` and
  a fixed card width, several cards peek at once here (not just the one in
  the middle — same "many visible" look as `locations`), so the effective
  `slidesPerView` Swiper resolves at runtime is well above 1. A small CMS
  list (the Themes collection typically has 5-6 items) doesn't clear that
  bar — Swiper silently disables the loop and logs "not enough slides for
  loop mode... add more slides or make duplicates," which is exactly the
  empty-gap-at-the-end symptom this hit during development. Padding the real
  set with extra full rounds of the same cards (same technique `marquee.js`
  uses to fill its track) is Swiper's own suggested fix and adapts
  automatically to however many themes the CMS has. `loopAdditionalSlides: 2`
  gives Swiper's internal loop math a small extra buffer on top of that.
- No `watchOverflow` here (unlike `locations`/`gallery-slider`) — that option
  only exists elsewhere to dim disabled prev/next arrows, and this component
  has none.
- **The parent section needs `overflow: hidden`** in Webflow — same
  requirement as `locations`/`gallery-slider` — since peeking neighbor cards
  intentionally bleed past `.swiper` via `overflow: visible`. Conversely, no
  wrapper *between* the swiper and that section (e.g. the
  `[data-component='theme-carousel']` element itself, `.container-large`,
  `.padding-global`) should have Overflow set to Hidden in Webflow — any one
  of them clips the bleed early, which is what limited this to only 3 cards
  visible instead of several peeking further out like `locations`, until
  Overflow was set to Visible on `show_card-content`.
- `AUTOPLAY_DELAY`, `TRANSITION_SPEED` and `MIN_SLIDES_FOR_LOOP` are tunable
  constants at the top of `theme-carousel.js`. Raise `MIN_SLIDES_FOR_LOOP` if
  gaps ever reappear on very wide/ultra-wide monitors (more cards peek at
  once, raising the bar Swiper's loop math needs cleared).
- If/when this design is approved to replace the orbital `shows` section,
  swap the `data-component` attribute on the Webflow section (`shows` →
  `theme-carousel`) and retire `shows.js`/`shows.css` via `/delete-component`
  — no code changes needed here.
