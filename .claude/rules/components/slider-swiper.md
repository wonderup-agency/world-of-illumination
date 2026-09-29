# slider-swiper

## Purpose

General-purpose "plain" carousel: shows several full slides at once (no
partial/peeking neighbors, no centering) and moves one slide at a time via
prev/next arrows. Meant to be reused on any section that needs a simple
Swiper slider regardless of what CMS collection feeds it — the JS only reads
structural classes, so multiple instances on the same page can point at
different Collection Lists (e.g. Press Releases and Media mentions) without
any changes.

## Webflow Setup

Add to the slider wrapper:

```
data-component="slider-swiper"
```

Required structure inside:

- `.swiper` — Swiper container
  - `.swiper-wrapper` — slides wrapper
    - `.swiper-slide` — one per item
- `.slider-prev` / `.slider-next` — prev/next arrow buttons

Example (matches the `scroll_list-wrapper` / `blog_card` Client-First markup
used on the Press Releases and Media sections):

```html
<div data-component="slider-swiper" class="releases-content">
  <div class="scroll_list-wrapper swiper w-dyn-list">
    <div role="list" class="scroll_list swiper-wrapper w-dyn-items">
      <div role="listitem" class="scroll_item swiper-slide w-dyn-item">
        <div class="blog_card">...</div>
      </div>
      <!-- more .scroll_item slides -->
    </div>
  </div>
  <div class="slider-control">
    <div class="slider-prev">...</div>
    <div class="slider-next">...</div>
  </div>
</div>
```

Only `.swiper`, `.swiper-wrapper`, `.swiper-slide`, `.slider-prev`,
`.slider-next` are read by the JS — any other class names/content inside a
slide (or around the swiper) are free to differ per section/CMS.

**Static Designer items (no Swiper classes, no CMS)** — e.g. `section_swiper`
on Studios (`swiper_list-wrapper` > `swiper_list` > `swiper_item`): instead of
adding Swiper classes by hand, put `data-slider-swiper-list` (no value) on the
element whose **direct children** are the slides (`swiper_list`). JS then adds
`.swiper` to its parent, `.swiper-wrapper` to it and `.swiper-slide` to every
child before init. Any number of items works. Skipped automatically if the
markup already has a `.swiper` (CMS case).

Optional attribute on the wrapper:

- `data-slider-swiper-per-view="1"` — max slides visible at once, caps the
  default `1 / 2 / 3` per breakpoint (e.g. `1` = one full slide at every
  breakpoint, `2` = `1 / 2 / 2`). Omit for the default. `section_swiper` uses
  `1` since each `block_card` is a wide two-column card.
- `data-slider-swiper-equal-height` — boolean (presence only). Every slide's
  direct child (the card) stretches to the tallest slide's height, so a
  short card fills the row instead of leaving an empty gap above the arrows.
  CSS only (slide becomes `display: flex`, child `flex: 1`) — flex rather
  than `height: 100%` since % heights of stretched flex items are unreliable
  in iOS Safari. `section_swiper` uses it.
- `data-slider-swiper-compact` — boolean (presence only). Below 768px,
  hides the slide body copy (`[data-text-size='m']` → `display: none`) and
  shrinks the title (`[data-text-size='h1']` → `--_typography---h3--size-h3`,
  1.375rem mobile vs 2.25rem). The long descriptions were what made card
  heights so uneven on mobile; shrinking them to 1rem (tried first) wasn't
  enough, so they're hidden there by request (2026-09-28). Tablet/desktop
  keep the full text. Scoped to this slider only — the shared
  "Element / Block Card" Webflow component (9 instances sitewide) is
  untouched. `section_swiper` uses it. Add more `data-text-size` values to
  the rule in `slider-swiper.css` if a future slider uses other sizes.
- **Tried and dropped: Swiper `autoHeight`** (container follows the active
  slide's height). It removed the gap but made the arrows and everything
  below jump on each slide change — equal height + compact text was
  preferred instead (2026-09-28).

## Behavior

- **Init**: If `[data-slider-swiper-list]` exists and there's no `.swiper`,
  builds the Swiper classes first (see Webflow Setup). Forces every slide
  `<img>` to `loading="eager"` (offscreen lazy images would otherwise load —
  and resize the card — only once navigated to). Then initialises a Swiper
  instance on `.swiper` inside the component
  with an integer `slidesPerView` per breakpoint (see Notes) — unlike
  [`gallery-slider`](./gallery-slider.md), there's no `centeredSlides` and no
  fractional `slidesPerView`, so slides fill the row edge-to-edge with no
  neighbor peeking past the container. Wires `.slider-prev` / `.slider-next`
  as navigation. No loop — stops at the first/last slide. The arrows are
  always visible (per design) and dim automatically (`opacity: 0.4`,
  `pointer-events: none`, via `slider-swiper.css`'s `.swiper-button-disabled`
  rule) whenever they can't be used — both when there aren't enough CMS items
  to ever scroll (`watchOverflow: true` — e.g. a single item, or fewer items
  than `slidesPerView` at the current breakpoint marks both arrows disabled)
  and when you're at the first/last slide of a longer list (only that one
  arrow gets dimmed). No extra logic needed to "light up" an arrow again —
  Swiper removes the disabled class itself the moment navigation becomes
  possible again (e.g. once the CMS has more items).
- **Resize**: Not used — Swiper's own default resize handling re-measures
  and recalculates slide widths internally.
- **Breakpoint**: Not used — responsiveness is handled by Swiper's own
  `breakpoints` option (see Notes), not the project's `breakpoint` lifecycle
  hook.

## Dependencies

- `swiper` — Navigation, A11y modules
- `src/styles/slider-swiper.css` — hides slides until Swiper initializes (to
  avoid an initial flash of unstyled/stacked content), and styles the dimmed
  arrow state (see Notes for why it needs `!important`).

## DOM Expectations

Elements matching `[data-component='slider-swiper']` must contain:

- `.swiper` — Swiper container
- `.swiper-wrapper` — slides wrapper
- `.swiper-slide` — individual slides (2+ recommended)
- `.slider-prev` / `.slider-next` — prev/next arrow buttons

## Notes

- **Slide counts per breakpoint** (`PER_VIEW` in `slider-swiper.js`):
  `1` by default (mobile), `2` at 768px, `3` at 992px+, each capped by
  `data-slider-swiper-per-view` per instance. Prefer the attribute over
  editing `PER_VIEW` (that changes every instance, e.g. Press).
- **Why `section_swiper` extends this instead of `gallery-slider` or a new
  component**: it originally carried `data-component="gallery-slider"`, which
  silently did nothing (no `.swiper` in the markup) and is a centered "peek"
  carousel anyway. This component is already the project's plain arrows-only
  slider; the two additions are opt-in, so Press (CMS) behaves exactly as
  before. `locations` stays separate (centered, CMS-specific reordering).
- `spaceBetween` (gutter between slides) is set per breakpoint alongside
  `slidesPerView` in the same `breakpoints` object.
- No CMS-specific logic — each instance's slides come straight from whichever
  Collection List renders inside it. Multiple instances of this component can
  coexist on the same page (each matched independently), one per CMS source.
- If a future section needs peeking neighbor slides or centering, use
  [`gallery-slider`](./gallery-slider.md) instead of adding that behavior
  here — keep this component's identity as the plain, no-peek slider.
- **Why the dimmed-arrow CSS needs `!important`**: [`testimonials.js`](./testimonials.md)
  imports `swiper/css/navigation` for its own default nav button styling.
  Since the project bundles all CSS into one shared `dist/styles.css` (see
  [`CONVENTIONS.md`](../CONVENTIONS.md)), that stylesheet's bare
  `.swiper-button-lock { display: none }` rule ends up applying sitewide —
  including to this component's `.slider-prev`/`.slider-next`, which pick up
  that class whenever Swiper locks the slider (not enough slides to scroll).
  Without the `!important` override here, the arrows would stay hidden even
  though this component never asked for that rule. Any future component that
  imports Swiper's own CSS should keep this in mind — its default classes
  (`swiper-button-lock`, `swiper-button-disabled`, pagination bullets, etc.)
  aren't scoped and can silently affect every other Swiper instance sitewide.
