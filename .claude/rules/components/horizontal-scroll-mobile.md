# horizontal-scroll-mobile

## Purpose

Tablet/mobile counterpart to [`horizontal-scroll`](./horizontal-scroll.md).
Below 992px — wherever `horizontal-scroll`'s own
`data-horizontal-scroll-disable` says its desktop horizontal-jack is off —
this pins the same wrapper in place with native `position: sticky` and
crossfades between its panels as the user scrolls vertically, instead of
just stacking them and letting the page scroll straight past. Same "hold and
reveal" feeling as desktop, but on the scroll axis touch users already use
(no sideways drag, no scroll-jacking the wrong axis). Works with any number
of panels (2+), same as `horizontal-scroll` itself.

## Webflow Setup

No new Webflow attributes needed. This component activates automatically on
any `[data-component='horizontal-scroll']` wrapper that already has
`data-horizontal-scroll-disable="tablet"` (or `"mobileLandscape"` /
`"mobile"`) set — the exact same attribute `horizontal-scroll` itself reads —
so any page already using `horizontal-scroll` with that attribute gets this
crossfade automatically, no markup changes.

Optional attribute, on the same wrapper:

- `data-horizontal-scroll-mobile-vh="80"` — how much scroll (in vh, i.e. % of
  the live viewport height) each panel holds the screen for before
  crossfading to the next. Default `80` (see `DEFAULT_STEP_VH`).

## Behavior

- **Init**: For each `[data-component='horizontal-scroll']` element, reads
  its `[data-horizontal-scroll-panel]` children (reusing the exact same
  marker `horizontal-scroll.js` uses — a read, not a change, so it can't
  affect that component). Skips wrappers with fewer than 2 panels. Gated
  behind `gsap.matchMedia()` with the same `isMobile` / `isMobileLandscape` /
  `isTablet` / `reduceMotion` conditions `horizontal-scroll.js` itself
  tracks. Inside, a wrapper only activates if its own
  `data-horizontal-scroll-disable` value matches the current breakpoint tier
  — i.e., only where `horizontal-scroll`'s desktop effect is actually off.
  Under reduced motion, does nothing (panels stay in plain stacked flow).
- **Activating**: Adds `.is-mobile-fade` to `section` (overrides its own
  `overflow: hidden` back to `visible` — see Notes for why that's required
  for sticky to work at all), moves every panel out of `section` and into a
  new `.horizontal-scroll-mobile_stage` div (JS-created, inserted where the
  panels used to sit), then appends the spacer right after that stage — so
  `section` ends up with exactly two children, the stage and the spacer, and
  nothing else. See Notes for why this indirection (not making `section`
  itself sticky) is required, not just tidier. Sets every panel to hidden
  (`autoAlpha: 0`) except the first, and sizes the spacer to
  `panels.length × (stepVh / 100) × viewport height` — one step of scroll
  per panel.
- **Scrolling**: A passive `scroll` listener (rAF-throttled, at most one
  calculation per animation frame regardless of how many scroll events fire)
  computes 0-1 progress off the spacer's own `getBoundingClientRect()` (same
  technique as `image-grow.js`'s `liveProgress` — the spacer moves 1:1 with
  scroll, so `viewport - spacer.top` divided by the spacer's height is
  exactly how far scroll has travelled since the sticky stage engaged), maps
  that into a panel index (`floor(progress × panelCount)`, clamped), and —
  only when that index actually changes — crossfades the previous panel out
  and the new one in (`autoAlpha`, 0.5s, `power1.inOut`, `overwrite: 'auto'`
  so a fast back-and-forth scroll cleanly replaces an in-flight fade instead
  of layering a second one on the same panel and flickering). A discrete
  step-change rather than a continuous per-pixel blend, so it reads as a
  clean "slide changed" moment tied to scroll direction, not a mushy fade
  smeared across every scrolled pixel. Every instance's progress/index is
  read first, then every instance's fade is triggered — same read-then-write
  discipline as `image-grow.js`'s `tick()`, so a page with more than one
  `horizontal-scroll` section active at once can't force an extra layout
  recalculation on one instance's read because another instance just wrote a
  style change.
- **Leaving the breakpoint / reduced motion**: `gsap.matchMedia`'s cleanup
  removes `.is-mobile-fade` from `section` (restoring its own
  `overflow: hidden`), clears every panel's inline opacity/visibility
  (`clearProps`), moves each panel back out of the stage into its original
  spot directly under `section` (in original order), then removes the
  now-empty stage and the spacer — `section` ends up exactly as it was
  before this component ran. Critical for desktop: if this didn't run,
  `section` would keep `overflow: visible` (breaking the horizontal-jack's
  own clipping) and panels 2+ would still carry `visibility: hidden` (and
  sit inside a leftover stage div) when `horizontal-scroll.js` takes over
  above 992px.
- **Resize**: Re-measures the spacer height against the new viewport height
  (e.g. tablet rotation) — only meaningful while active.

## Dependencies

- `gsap` — core only (`gsap.matchMedia`, `gsap.set`/`gsap.to` with
  `autoAlpha`, `gsap.utils.toArray`). No ScrollTrigger, no CDN dependency for
  this half of the component — see Notes for why.
- `./horizontal-scroll-mobile.css` — the sticky/grid-stack geometry.

## DOM Expectations

Same wrapper as `horizontal-scroll`:
`[data-component='horizontal-scroll']` containing 2+
`[data-horizontal-scroll-panel]` children, with a
`data-horizontal-scroll-disable` value on the wrapper for whichever
breakpoint(s) should get this crossfade instead of the desktop effect.

## Notes

- **Why this shares `horizontal-scroll`'s own selector instead of getting its
  own `data-component` value**: an element can only carry one
  `data-component` attribute, but `src/components.js`'s registry is just an
  array — `main.js` runs `querySelectorAll(selector)` independently per
  entry, so two entries can legally point at the same selector and both load
  against the same elements with zero conflict (confirmed by reading
  `main.js`'s `loadComponent`, which has no dedup logic at all). That's what
  lets this component exist as a fully separate file — never touching
  `horizontal-scroll.js`, its data attributes, or its desktop behavior at
  all — while still reacting to the same wrapper. This is a new pattern for
  this project; see the note added to `CONVENTIONS.md`.
- **Why it reads `data-horizontal-scroll-disable` instead of a hardcoded
  `max-width: 991px`**: the two components must never both be active on the
  same element at the same time. Checking the exact same attribute
  `horizontal-scroll.js` itself checks (with the same three tiers,
  `mobile`/`mobileLandscape`/`tablet`) guarantees they stay mutually
  exclusive by construction — including for any *future* `horizontal-scroll`
  instance elsewhere that has no `disable` attribute at all (meaning it wants
  its horizontal-jack to run at every breakpoint, mobile included): this
  component correctly does nothing there, since `shouldRun` never matches
  without a `disable` value.
- **Why native `position: sticky`, not ScrollTrigger's `pin: true`**: same
  reasoning as `image-grow.js`/`footer.js` — ScrollTrigger's pin sets an
  explicit height and can desync by a sub-pixel from its spacer, which
  triggers Lenis's `ResizeObserver` and truncates in-flight scroll (a felt
  stutter). Native sticky never does this, and it means this half of the
  component needs no `window.ScrollTrigger` CDN dependency at all — it runs
  on the bundled `gsap` package alone.
- **Why the wrapper's `overflow: hidden` (from `horizontal-scroll.css`,
  unconditional — needed for desktop's horizontal-jack) gets overridden back
  to `visible` here**: confirmed live, via a console probe comparing
  `getBoundingClientRect()` of the stage/spacer/wrapper while scrolled, that
  the stage was moving in exact lockstep with the wrapper — `position:
  sticky` computed correctly (`getComputedStyle` genuinely said `"sticky"`)
  but had zero visible effect. Any `overflow` value other than `visible`
  (including `hidden`, unlike `clip` — see below) makes an element a
  candidate *scrolling container* for its sticky descendants, regardless of
  whether it ever actually has a scrollbar. The wrapper auto-sizes to
  exactly fit its own content (the stage + the spacer), so it never
  generates an actual scroll offset of its own — and a sticky element
  computed against a container that never scrolls simply never moves
  relative to it, i.e. never visibly sticks; it just rides along with
  whatever *does* scroll around it. `.is-mobile-fade` (added by JS to the
  wrapper alongside the stage, removed together on cleanup) overrides that
  `overflow: hidden` back to `visible` only while the stage exists, so the
  stage's next non-`visible`-overflow ancestor becomes irrelevant (there
  isn't a scrollable one before the real document scroller) and sticky
  correctly tracks real page scroll. Confirmed safe for desktop: this
  override only ever applies while `.horizontal-scroll-mobile_stage` exists,
  and that never happens at ≥992px.
- **Why `main-wrapper`'s sitewide `overflow: clip` doesn't cause the exact
  same problem**: `overflow: clip` is explicitly *not* a scroll container per
  spec (unlike `hidden`, `scroll`, or `auto`) — it forbids scrolling
  (including programmatic `scrollTop`) rather than merely hiding a
  scrollbar. That's also why `footer.js`/`image-grow.js`'s own sticky/pin
  elements, nested under this same sitewide `main-wrapper`, were never
  affected by it.
- **Why the stage is a separate inner div, not `section` itself made
  sticky**: an earlier version made the wrapper (`section`, i.e. the
  `[data-component='horizontal-scroll']` element) the sticky element
  directly. Sticky releases its hold once its own *containing block*'s
  bottom edge scrolls past — normally the nearest ancestor's content box.
  `section`'s real ancestor on the page is whatever wraps every section on
  that page, not just this one, so with `section` itself sticky, the hold
  didn't release until scrolling past *every section after this one* —
  which is exactly what looked like the last panel "sticking" and covering
  the next real content for a long stretch of scroll. Wrapping the panels in
  a local `.horizontal-scroll-mobile_stage` div, and making the spacer its
  sibling (both the *only* children of `section`), gives the stage a small,
  local containing block — `section` itself — so its sticky hold is bounded
  to exactly this component's own scroll range, same as `image-grow.js`'s
  `pin` (also a dedicated inner element, never the outer section).
- **Why panel content is force-centered instead of trusting each panel's own
  alignment**: confirmed via the Webflow MCP that `.full-height_component`
  sets its own explicit `height: 100svh` (self-contained, correctly sized on
  its own) but every text panel also wraps it in a `padding-global` /
  `container-large` chain flanked by two `.section_spacer` elements — a
  real, non-zero height (bound to a Webflow variable), meant for normal
  page-flow breathing room between real sections. Inside this component's
  fixed one-screen box, those two spacers plus the full-height block add up
  to *more* than one screen, and since the panel wasn't a flex/grid
  container, they just stacked in normal flow — pushing the visible content
  up and off-center (the spacers and the excess simply overflowed the
  bottom, invisible, while the top of the stack — including empty spacer
  space — ate into the panel's visible area). `.image-block_component`
  (used by the two image-block panels) sets its own explicit
  `min-height: 100svh` too, but its `upper`/`bottom-right` combo variants
  set `align-items`/`justify-content` to push content to the top or bottom
  edge — a deliberate desktop design choice for a panel that never shares
  its top edge with a fixed navbar. Zeroing the spacers, making the panel a
  flex column with `justify-content: center`, and forcing
  `.image-block_component` to `justify-content: center; align-items: center`
  sidesteps all of it uniformly, regardless of which panel type is active.
- **CSS Grid stacking with a fixed `100svh` row, not auto-sized to content**:
  every panel shares `grid-area: 1 / 1` so they overlap instead of stacking
  in flow — but the row height is deliberately locked to one screen
  (`100svh`, `100vh` fallback), not left to CSS Grid's default "auto-size to
  the tallest item." An earlier version left it auto-sized, reasoning that a
  fixed height could clip the tallest panel (the floating-images one, which
  has far more natural content on mobile than the others) — but auto-sizing
  caused two real bugs instead: shorter panels didn't fill the screen (the
  next panel's own space peeked in below them, since the grid row was as
  tall as the *tallest* panel, not the *active* one), and the sticky hold
  lasted for however many screens tall that one panel happened to be —
  which, right as that panel's own long natural scroll played out, looked
  exactly like a sticky element drifting down and covering the next real
  section. Locking the row to `100svh` and giving each panel
  `overflow-y: auto` (same safety net as `popup.css`'s card scroll) fixes
  both: every panel now occupies exactly one screen, and any panel with more
  content than that scrolls internally instead of inflating the whole
  effect's height.
- **`svh` over plain `vh`**: mobile browsers' address bar can show/hide as
  you scroll, and plain `100vh` is defined against the *largest* possible
  viewport (chrome fully collapsed) — a box sized with it can render taller
  than what's actually visible while the address bar is showing, which was
  a second, independent source of the same "next panel peeking in" symptom.
  `100svh` (small viewport height) is always the *smallest* the visible area
  can be, so a box sized with it is guaranteed to never exceed what's
  currently on screen. The plain `100vh` line ships first purely as a
  fallback for browsers old enough not to support `svh`; the later
  `100svh` line wins in every browser that supports it (CSS silently ignores
  a value it doesn't recognize, so the two lines coexist safely).
- **Step size** (`data-horizontal-scroll-mobile-vh`, default `80`) is
  deliberately less than a full `100`: a full viewport per panel felt heavy
  to scroll through in testing reasoning (see the `horizontal-scroll.js`
  precedent of using less-than-1:1 distance multipliers for "less scroll
  invested" pacing) — `80` keeps each hold snappy without rushing past
  content. Tune per-instance if a specific page wants a slower/faster feel.
- **Discrete step-fade, not a continuously blended crossfade**: deliberately
  fires a single 0.5s fade only when the computed index changes, rather than
  interpolating opacity continuously with scroll position. A continuous
  blend would mean two panels are partially visible for most of the scroll
  range, which reads as muddy with this much text/imagery per panel — a
  clean step change reads more like "the slide changed," matching the spirit
  of desktop's own discrete curtain/train steps.
- If the stage doesn't visibly hold on screen while scrolling (panels
  crossfade instantly on load instead), check the console for this
  component's own `position: sticky` warning first — same troubleshooting
  order as `image-grow.md`. The usual cause is an ancestor between the
  wrapper and the page's real scrolling viewport with `overflow` set to
  anything other than `visible`.
