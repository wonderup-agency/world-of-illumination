# show-gallery-marquee-v2

## Purpose

WIP fork of [`show-gallery-marquee`](./show-gallery-marquee.md) for a "two
rows, opposite direction, every breakpoint" redesign of the CMS "show images"
gallery — tested under its own `data-component` name so the original
(mobile-only, desktop grid) keeps working untouched wherever it's still used,
same pattern as [`tabs-map-v2`](./tabs-map-v2.md)/[`theme-carousel`](./theme-carousel.md).

Turns each `.location_slider` row into its own infinite horizontal marquee
built from that row's own CMS photos, at **every** breakpoint (not just
mobile). The first row scrolls one direction, the second scrolls the
opposite direction — like two conveyor belts crossing. Works with any number
of CMS photos per show.

## Webflow Setup

Add to the wrapper that directly contains the `.location_slider` rows
(`.location-cards.new` in the current build):

```
data-component="show-gallery-marquee-v2"
```

Each `.location_slider` row inside must contain its own real CMS Collection
List — same `.show_theme-gallery-list-wrapper` → `.show_gallery-list-wrapper`
→ `.show_gallery-list` → `.show_gallery-item` structure `show-gallery-marquee`
already reads, reused as-is with no new classes needed:

```html
<div data-component="show-gallery-marquee-v2" class="location-cards new">
  <div class="location_slider _1">
    <!-- .show_gallery-list-wrapper CMS Collection List (row 1 photos) -->
  </div>
  <div class="location_slider _2">
    <!-- .show_gallery-list-wrapper CMS Collection List (row 2 photos) -->
  </div>
</div>
```

Two rows is the expected/tested case (top row + bottom row), but any number
of `.location_slider` rows works — direction just alternates row by row.

Optional attribute, on the wrapper or on an individual `.location_slider`
row (row-level overrides wrapper-level):

- `data-gallery-marquee-speed="28"` — scroll speed in px/second (default `28`).

**Webflow layout note**: `.location-cards.new` needs to be set to stack its
two `.location_slider` rows vertically (e.g. `display: flex; flex-direction:
column;` with whatever gap looks right between rows) — this component only
handles the horizontal scroll inside each row, not the vertical spacing
between rows.

## Behavior

- **Init**: For each `.location_slider` row inside the wrapper, reads that
  row's own `.show_gallery-list` → `.show_gallery-item` CMS cards, forces
  their `.show_multi-image` to `loading="eager"` (small, bounded set — same
  reasoning as `show-gallery-marquee.js`/`locations.js`), then builds a
  `.show-gallery-marquee-v2_track` next to the real list: clones the cards
  until the track's width covers a generous fixed target (`Math.max(3200,
  window.innerWidth * 1.5)` px — see Notes for why this isn't based on the
  row's own width), then duplicates that whole filled set once more
  (`aria-hidden="true"`) so the CSS `-50%` loop has no visible seam — same
  technique as `marquee.js`/`tapes.js`/`show-gallery-marquee.js`. Sets
  `animation-duration` from the final track width so scroll speed stays
  constant regardless of photo count. The row
  gets `.is-gallery-marquee`, which is what `show-gallery-marquee-v2.css`
  uses to hide the real CMS grid and show the generated track instead — the
  **original CMS list is never modified or removed**, only hidden via CSS,
  so nothing here can affect its own markup or Webflow editability, and it's
  what renders if this component's JS fails to load. The very first fill
  (the one that sizes the track) is deferred two animation frames rather
  than running immediately — see Notes.
- **Direction**: Every row's track plays the exact same
  `show-gallery-marquee-v2-scroll` keyframe (`translateX(0)` →
  `translateX(-50%)`) — direction is never touched. Instead, odd rows (2nd,
  4th...) get `.is-reverse` on the **row** (`.location_slider`), which
  horizontally mirrors the whole row (`transform: scaleX(-1)`) with a
  counter-mirror on each item so the photos still render right-side-up —
  see Notes for why this replaced animating the row backwards. A 3rd row (if
  ever added) would go back to unmirrored, alternating every row.
- **Photo order**: Each row independently shuffles its own CMS photos
  (Fisher-Yates, re-randomized on every page load) before building its
  track, so the two rows show genuinely different photos at any given
  moment rather than just the same sequence mirrored — relying on the
  `.is-reverse` mirror alone for this (an earlier version) still showed the
  same order, just flipped, which read as too similar between rows. This
  also sidesteps the fact that this gallery can't be sorted natively in
  Webflow (it's a nested/referenced list, not a plain Collection List —
  confirmed no sort option reaches it), since no CMS-side ordering is
  needed at all.
- **Runs at every breakpoint** — unlike `show-gallery-marquee` (mobile-only,
  ≤767px, desktop keeps a static grid), this component has no breakpoint
  gate. Desktop, tablet and mobile all get the same two-row infinite marquee.
- **Resize**: Re-runs the fill for every row, but only actually rebuilds if
  a photo's own rendered width changed — i.e. a real breakpoint crossing
  (991px/479px), not generic window-resize noise. See Notes.
- **Breakpoint**: Not used.
- **Reduced motion**: The tracks are still built (so layout doesn't jump),
  but the scroll animation itself is disabled via CSS
  (`prefers-reduced-motion: reduce`).

## Dependencies

- `src/styles/show-gallery-marquee-v2.css` — hides each row's real CMS grid
  and shows its generated track once `.is-gallery-marquee` is present,
  drives the scroll keyframe, and mirrors odd rows (`.is-reverse`).

## DOM Expectations

Elements matching `[data-component='show-gallery-marquee-v2']` must contain
one or more `.location_slider` rows, each with its own
`.show_gallery-list-wrapper` CMS Collection List holding `.show_gallery-item`
cards (each with a `.show_multi-image`).

## Notes

- **Why a fork, not an edit to `show-gallery-marquee.js`**: that component is
  documented and possibly reused elsewhere as "mobile-only, desktop keeps the
  3-column grid" — editing it in place to run at every breakpoint would
  silently change behavior anywhere else it's attached. Forking under a new
  name keeps the original untouched and testable in isolation, per this
  project's convention (see `tabs-map-v2`/`theme-carousel`). If/when this
  two-row design is approved as the permanent gallery layout, swap the
  `data-component` attribute on the Webflow element (`show-gallery-marquee` →
  `show-gallery-marquee-v2`) and retire the old file/CSS/doc via
  `/delete-component` — no code changes needed here.
- **Why each row keeps its own real CMS Collection List** (instead of one
  list with JS cloning a 2nd row from it): resilience — if this component's
  JS ever fails to load, both rows still render as normal static CMS grids
  stacked vertically, instead of one grid + one empty row. Same isolation
  principle `show-gallery-marquee.js` already uses.
- Each item and its image get an explicit `border-radius: 1.5rem` — matches
  Webflow's own native `.show_multi-image` radius (confirmed via the Webflow
  MCP), forced on both the item and the image since a card-height bug (item
  was `400px` tall while the row was `320px`, cropping the bottom off every
  card — fixed) had been silently clipping the bottom corners.
- Card size is responsive, adjusted at the same breakpoint thresholds
  `locations.css`/`gallery-slider.css` use (`991px`, `479px`, flat px not
  rem — a pixel-perfect design size, not spacing/typography):
  `340px`×`320px` on desktop (gap `2rem`), `260px`×`240px` on tablet (gap
  `1.5rem`), `170px`×`160px` on mobile (gap `1rem`). `.location_slider` gets
  a matching flat height at each tier so the row never taller than the card
  it's actually showing. Speed paces itself to the card size instead of a
  flat px/second — see the `SECONDS_PER_ITEM` note below. Adjust any of
  these sizes directly in `show-gallery-marquee-v2.css` if the design needs
  different values. No JS changes needed for the responsive sizing —
  `resize()` already re-measures and rebuilds each row's track (see below),
  so it naturally picks up whatever size the current breakpoint's CSS is
  rendering.
- **Speed**: `data-gallery-marquee-speed` (on the wrapper or an individual
  row) still sets a literal px/second override when present, same as
  before. Without one, `SECONDS_PER_ITEM` (`15`) is used instead — how many
  seconds one card takes to fully scroll past — and `fill()` derives the
  actual px/second from the card's own rendered stride (width + its
  trailing gap) at the current breakpoint. A flat px/second default (the
  first version, `28px/s`) made mobile's much smaller cards zip by
  noticeably faster than desktop's; deriving speed from the rendered card
  size keeps the pace the same at every breakpoint instead, and `15` reads
  a bit slower overall than the original `28px/s` did on desktop.
- Loop-duplicate clones are marked `aria-hidden="true"` — same as
  `show-gallery-marquee`/`marquee`/`tapes`.
- **Why the first fill is deferred two `requestAnimationFrame`s, not run
  immediately on init**: reading `scrollWidth` right on init can race against
  the page's own CSS finishing loading — caught early enough, things render
  at their raw, unstyled size, inflating the measured width and baking a
  too-long `animation-duration` into the track. A full `window.load` defer
  was tried first (waits for every stylesheet *and every image* to finish),
  but this component eager-loads ~20 full-resolution CMS photos across both
  rows (see the `loading="eager"` note above) — on a normal connection that
  download can take several seconds, during which both rows sat empty,
  which read as "broken"/delayed rather than fixed. Two animation frames is
  enough for styles/layout to have settled without waiting on those
  downloads. Same class of deferred-measurement reasoning as
  `image-grow.js`/`guests.js`, just against a faster signal.
- **Mirrored row instead of animating the row backwards**: two different
  "reverse" animation approaches were tried first — `animation-direction:
  reverse` on the shared keyframe, then a dedicated
  `show-gallery-marquee-v2-scroll-reverse` keyframe going the opposite way
  (`translateX(-50%)` → `translateX(0)`). Both start the row's very first
  frame at what is, geometrically, the keyframe's *end* state — for a
  duplicated-content marquee to visually scroll rightward at all, the track
  has no choice but to begin pre-shifted by `-50%` (there's no content
  positioned further left to reveal otherwise); in testing this reliably
  rendered the second row mid-loop on page load instead of at its first
  photo. The mirror sidesteps the problem instead of chasing it: the row
  never animates backward at all — its track plays the *exact same* forward
  keyframe as every other row (already proven to start correctly), and
  `transform: scaleX(-1)` on the row (with a counter `scaleX(-1)` on each
  item so photos don't render backwards) makes that same forward motion
  read as right-to-left purely visually. A static `transform` has no
  starting-frame ambiguity the way an animation does, so this class of bug
  can't recur.
- **`!important` on the item's `width`/`height`/`margin-right` and on the
  hide/show `display` rules**: defensive insurance against Webflow's own
  Collection Item width rule for `.show_gallery-item` (typically scoped as
  `.show_gallery-list-wrapper .show_gallery-item`, which can tie or beat a
  single-class selector here) — same class of bundled-CSS collision
  documented in [`slider-swiper.md`](./slider-swiper.md#notes).
- **`width: 100%` / `min-width: 0` on `.location_slider`**: `.location_slider`
  is a flex item inside `.location-cards.new` (`flex-direction: column`,
  confirmed via the Webflow MCP) and has no width/min-width of its own (also
  confirmed empty via the MCP). Without an explicit width, a flex item can
  still be pulled wide by its own content (here, the marquee track's
  intentionally very wide `width: max-content`) instead of respecting
  `overflow: hidden` — a classic CSS flexbox trap, not a Webflow
  misconfiguration. This alone didn't fully hold up in testing though (see
  the fill-target note below) — it's defense in depth, not the real
  guarantee.
- **Fill target is no longer based on `row.offsetWidth` at all — the actual
  fix for both the "one row never loops back" and "runs out and goes blank
  before restarting" bugs**: `row.offsetWidth` went through several fix
  attempts (a `min-width: 0`/`width: 100%` CSS fix, then a
  `Math.min(row.offsetWidth, window.innerWidth)` clamp in JS) and still
  wasn't reliable enough — on a wide viewport the row could still end up
  filled with just barely enough content to cover it once, with zero
  margin, which read as the row reaching the end, sitting empty for a
  moment, then restarting. `show-gallery-marquee-v2.js` now fills to a
  fixed, generous target instead (`Math.max(3200, window.innerWidth * 1.5)`
  px) — derived from `window.innerWidth` (always a plain, reliable browser
  metric, unlike `row.offsetWidth` as a flex item) but with enough of a
  multiplier/floor that the row is never anywhere close to running out,
  regardless of exactly how wide it renders. A `currentWidth * 2` threshold
  (still based on the row) was tried in between and reverted — it brought
  back the "starts mid-loop" symptom on the first row, most likely because
  it also changed the fill/rebuild frequency in a way that re-triggered the
  mid-cycle `animation-duration` re-mapping described below.
- **Rebuilds are now gated on the photo's own rendered width, not the row's,
  and not on every resize event**: re-running `fill()` recomputes
  `animation-duration` from scratch, and changing a *running* CSS
  animation's duration re-maps its already-elapsed real time onto the new
  duration — e.g. 60% through a 100s loop, if the duration changes to 130s,
  the same elapsed time is now only 46% through, and the visible position
  snaps backward. `resize()` still calls `fill()` on every window resize
  (debounced 150ms) same as before, but `fill()` itself now bails out
  immediately unless the *rendered width of a photo already in the track*
  has changed — that only happens at a genuine breakpoint crossing
  (991px/479px), never from something like a scrollbar appearing/
  disappearing as the page's height changes (which does change
  `window.innerWidth` by a few px, and was a plausible source of the
  spurious mid-cycle jumps/gaps described above).
