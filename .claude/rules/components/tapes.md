# tapes

## Purpose

Two diagonal text ribbons crossing in an X, each an infinite marquee loop
scrolling in the opposite direction from the other — like a "caution tape"
crossing. Text repeats automatically to fill each ribbon's width regardless
of phrase length, no manual copy-pasting. Replaces an older hardcoded
version that repeated the phrase by hand with `&nbsp;` inside a single
heading, which broke if the text length ever changed.

## Webflow Setup

Already built on the "test" page's `section_tapes` section:

```
section_tapes (section)
  tape-content        data-component="tapes"
    tape-element                — row 1 (normal direction)
      Heading (component)
    tape-element reverse        — row 2 (opposite direction)
      Heading (component)
```

`data-component="tapes"` goes on `.tape-content` (the wrapper containing both
rows), not on `section_tapes` itself. Each `.tape-element` row holds exactly
one Heading — JS turns that single Heading into a repeating, looping track at
runtime; nothing else needs to be pre-built.

Optional attribute, on the wrapper or on an individual `.tape-element` row
(row-level overrides the wrapper-level):

- `data-tapes-speed="50"` — scroll speed in px/second (default `50`).

## Behavior

- **Init**: For each `.tape-element` row inside the component wrapper,
  promotes the row's existing content (the Heading) into a JS-created
  `.tape_track > .tape_item` structure — moved, not cloned, so the Heading
  stays Webflow-editable. Then clones `.tape_item` into `.tape_track` until
  the track's width covers the row's own width (`140%` of the wrapper, via
  CSS — see Notes), duplicates the filled set once more for a seamless
  `-50%` loop (same technique as [`marquee`](./marquee.md)), and sets
  `animation-duration` from the final width so scroll speed stays constant
  regardless of phrase length. Every clone beyond the first is marked
  `aria-hidden="true"` — unlike `marquee.js`, which only hides the
  loop-duplicate half — since a tapes row repeats one heading purely for
  visual fill, and leaving several visible duplicate headings would clutter
  screen-reader heading navigation.
- **Resize**: Re-runs the fill for every row (skipped if the row's width
  hasn't actually changed, same mobile-address-bar guard as `marquee.js`).
- **Breakpoint**: Not used.
- **Direction**: Fixed per row via the `.reverse` class already present in
  Webflow (`[data-component='tapes'] .tape-element.reverse .tape_track`
  gets `animation-direction: reverse`) — not a runtime toggle, since each
  row's direction is a permanent property of that row, not something that
  changes.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables the
  scroll animation entirely (CSS only, same as `marquee.css`) — the rows
  stay static but still rotated/crossed.

## Dependencies

- `src/styles/tapes.css` — rotation/positioning, overflow clipping, the
  `@keyframes` loop, reduced-motion override. No JS animation library.

## DOM Expectations

Elements matching `[data-component='tapes']` must contain one or more
`.tape-element` rows, each with any content inside (expected: a single
Heading) — JS wraps it into a track/item structure automatically. A row
with class `.tape-element.reverse` scrolls in the opposite direction from a
plain `.tape-element`.

## Notes

- **Why not share code with `marquee.js`**: the clone-fill algorithm is
  nearly identical, but this project's convention is to keep visually/
  behaviorally similar components independent (e.g. `gallery-slider` vs
  `locations`, `theme-carousel` vs `shows`) rather than importing one from
  another — each stays a self-contained file.
- **Rotation is on the row (`.tape-element`), not the track**: the track's
  own `translateX(-50%)` animation only ever moves along its local
  (unrotated) horizontal axis. Rotating the parent row is what makes that
  read as diagonal movement — the track/item logic never needs to know
  about the rotation at all.
- **Angle is fixed at 6deg** (`rotate(-6deg)` / `rotate(6deg)` for
  `.reverse`), set directly in `tapes.css`, not exposed as a data attribute.
  At 6°, a row's `width: 140%` bleeds far more than the ~102% the geometry
  actually requires to avoid edge gaps — width was never the binding
  constraint here.
- **The real constraint is height, not width**: a wide rectangle rotated by
  a small angle needs much more *vertical* room than horizontal, because its
  rotated bounding-box height grows with `viewport width × tan(angle)`, not
  with the extra width bled past the container. `[data-component='tapes']`'s
  `height: clamp(11rem, 9.5rem + 10.51vw, 23rem)` encodes this: `10.51vw` is
  `100 × tan(6deg)`, and `9.5rem` is `.tape-element`'s own visual thickness
  (h4 line-height `2 rem × 1.3 ≈ 2.6rem`, plus the `1rem`/`1rem` padding
  Designer already sets on `.tape-element`, ≈ `4.6rem` total) plus the
  `4rem` vertical gap between the two rows' centers (the `±2rem` in each
  row's `transform`), plus a small safety margin. A fixed per-breakpoint
  height (what shipped in early drafts of this component) undersizes at
  wide viewports since the required height keeps growing with width — the
  `vw`-based term is what makes it correct at every width instead of just
  the breakpoint it was tuned against. **Re-derive this constant if the
  Heading's font size, the `.tape-element` padding, or the `±2rem` gap ever
  change** — recompute as `rowThickness + gap + safety margin`, and recompute
  the `vw` coefficient as `100 × tan(newAngle)` if the angle changes too.
- **`overflow: hidden` exists at two levels, clipping two different
  things**: `.tape-element` clips its own `.tape_track` (deliberately ~2×
  wider than the row, for the `-50%` loop) to the row's own rotated shape —
  Designer had this set to `visible`, overridden to `hidden` here.
  `[data-component='tapes']` (i.e. `.tape-content`) clips the whole tilted
  assembly to an axis-aligned box; `section_tapes` itself already has
  `overflow: hidden` set in Designer too, so the bleed is caught either way.
- **No `100vw` breakout hack needed**: unlike `image-grow`'s `pin`, neither
  `section_tapes` nor `.tape-content` sits inside a padded
  `container`/`padding-global` wrapper — both are already full-bleed, so
  `.tape-element`'s `140%` width and rotation never reach past the true
  viewport edge into a horizontal scrollbar. Re-check this if `tape-content`
  is ever nested inside a padded container in the future.
- `DEFAULT_SPEED` (50px/s) is a tunable constant at the top of `tapes.js`,
  overridable via `data-tapes-speed` on the wrapper (all rows) or on an
  individual `.tape-element` (that row only).
- The legacy hardcoded version (manually repeated text with `&nbsp;`) still
  exists on the page inside a collapsed/hidden group in the Designer
  Navigator — left untouched; delete it manually once this version is
  confirmed working.
