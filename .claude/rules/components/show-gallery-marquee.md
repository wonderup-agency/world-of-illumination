# show-gallery-marquee

## Purpose

Mobile-only (≤767px) infinite horizontal marquee for the CMS "show images"
gallery. Desktop/tablet keep the existing 3-column grid untouched; on mobile,
the same photos scroll continuously right-to-left instead of stacking into a
long vertical scroll. Works with any number of CMS photos — a small JS
duplication step (same technique as [`marquee`](./marquee.md)/
[`tapes`](./tapes.md)) makes the loop seamless regardless of count.

## Webflow Setup

Add to the wrapper that directly contains the gallery's Collection List
(`.show_gallery-list-wrapper` — the nested "multiphotos" list inside
`show_theme-gallery-item`, **not** the outer `show_theme-gallery-list-wrapper`):

```
data-component="show-gallery-marquee"
```

No other markup changes needed. Optional attribute on the same wrapper:

- `data-gallery-marquee-speed="50"` — overrides the default scroll speed
  (px/second) for this instance only.

## Behavior

- **Init**: Forces every `.show_multi-image` inside the gallery to
  `loading="eager"` (small, bounded set — same reasoning as `locations.js`/
  `theme-carousel.js`). Everything else is gated behind
  `gsap.matchMedia('(max-width: 767px)')`.
- **On mobile (≤767px)**: Reads the live `.show_gallery-item` cards from
  `.show_gallery-list` and clones them into a brand-new sibling element
  (`.show-gallery-marquee_track`), duplicating the set until it covers the
  screen width, then duplicating that whole filled set once more
  (`aria-hidden="true"`) so the `-50%` scroll loop has no visible seam. The
  wrapper gets `.is-gallery-marquee`, which is what `show-gallery-marquee.css`
  uses to hide the real `.show_gallery-list` and show the generated track
  instead. The **original CMS grid is never modified or removed** — only
  hidden via CSS — so nothing here can affect its own markup or Webflow
  editability.
- **Leaving mobile** (resize past 767px): `gsap.matchMedia`'s cleanup
  function removes `.is-gallery-marquee` and deletes the generated track
  entirely. CSS then reverts to showing the original grid, exactly as
  Webflow built it — no residue.
- **Resize**: While in mobile mode, re-runs the fill so the loop keeps
  covering the current width (skipped if the wrapper's width hasn't actually
  changed, same mobile-address-bar guard as `marquee.js`).
- **Reduced motion**: The track is still built (single static row instead of
  a grid), but the scroll animation itself is disabled via CSS.

## Dependencies

- `gsap` — core (`gsap.matchMedia`, for automatic enter/leave of the 767px
  breakpoint).
- `src/styles/show-gallery-marquee.css` — hides the generated track by
  default; when `.is-gallery-marquee` is present, hides the real grid, shows
  the track as a flex row, and drives the scroll keyframe.

## DOM Expectations

Elements matching `[data-component='show-gallery-marquee']` must contain
`.show_gallery-list` with one or more `.show_gallery-item` children, each
holding a `.show_multi-image`.

## Notes

- **Why the real grid is never touched**: unlike `marquee.js`/`tapes.js`
  (which own their content outright), this component sits in front of a
  Webflow Collection List. Cloning into a separate track and only toggling
  visibility means the CMS-rendered grid — and its editability in Webflow —
  is completely unaffected at every breakpoint, even if this component's JS
  fails to load (isolation: the grid is the default state, not something JS
  has to restore).
- **Breakpoint is 767px**, matching this project's own "mobile" cutoff (768px
  is where `ARCHITECTURE.md`'s Tablet breakpoint starts) — not 479px, since
  the long-scroll problem this fixes already shows up at mobile-landscape
  widths, not just mobile-portrait.
- `11rem` × `11rem` (square, = 176px at the default 16px root) and `0.75rem`
  gap (`show-gallery-marquee.css`) and `DEFAULT_SPEED` (28px/s,
  `show-gallery-marquee.js`) are the tunable constants — adjust directly in
  the CSS/JS if the design needs a different card size or speed. There is no
  Webflow-side size attribute — card size is plain CSS, not something set
  per-instance in the Designer. Speed is the one exception: it can be
  overridden per-instance via `data-gallery-marquee-speed`.
- **Width and height are both set explicitly, not via `aspect-ratio`**:
  the original `.show_gallery-item` card (Webflow) already carries its own
  height from the desktop/tablet grid. `aspect-ratio` only computes a missing
  dimension — it has no effect once another rule sets an explicit height, so
  an earlier version of this file that used `width` + `aspect-ratio` rendered
  tall rectangles instead of squares. Setting `height` directly here wins
  regardless of whatever the original grid's height rule is.
- Loop-duplicate clones are marked `aria-hidden="true"`; the first fill pass
  stays accessible since it's the only gallery content visible on mobile.
