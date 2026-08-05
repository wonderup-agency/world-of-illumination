# gallery-slider

## Purpose

General-purpose "peek" carousel: a centered active view showing several full
slides at once, with the next/previous slides partially visible at both edges
so users see there's more to scroll. Meant to be reused on any section that
needs this look, not a one-off — a simplified sibling of
[`locations`](./locations.md), with the CMS "new show" reordering and the
eager-image-load workaround removed (this component has no CMS-specific
logic at all).

## Webflow Setup

Add to the slider wrapper:

```
data-component="gallery-slider"
```

Required structure inside:

- `.swiper` — Swiper container
  - `.swiper-wrapper` — slides wrapper
    - `.swiper-slide` — one per item
- `.slider-prev` / `.slider-next` — prev/next arrow buttons

Example (image gallery, matching the `gallery_*` Client-First classes used on
the first section this shipped on):

```html
<div data-component="gallery-slider" class="swiper_component">
  <div class="swiper_content">
    <div class="gallery_list-wrapper swiper">
      <div class="gallery_list swiper-wrapper">
        <div class="gallery_item swiper-slide">
          <div class="gallery_image-wrapper">
            <img class="gallery_image" src="..." alt="" />
          </div>
        </div>
        <!-- more .gallery_item slides -->
      </div>
    </div>
    <div class="slider-control">
      <div class="slider-prev">...</div>
      <div class="slider-next">...</div>
    </div>
  </div>
</div>
```

The `.gallery_*` classes above aren't required by the JS — only `.swiper`,
`.swiper-wrapper`, `.swiper-slide`, `.slider-prev`, `.slider-next` are read.
Any other class names/content inside a slide are free to differ per section.

**Important Webflow caveat:** don't give the slide element (e.g. `.gallery_item`)
a fixed or "Fill" width in Webflow — Swiper calculates and sets each slide's
width in JS (via `slidesPerView`, see Behavior below), and an inline style
always wins the cascade over a class rule, so any width set in Webflow on the
slide itself is simply overridden at runtime. Let the slide auto-size and put
your visual styling (background, radius, etc.) on a child instead.

## Behavior

- **Init**: Initialises a Swiper instance on `.swiper` inside the component
  with `centeredSlides: true` and a fractional `slidesPerView` (see
  breakpoints below) — this is what produces the "peek" look: 1+ full slides
  centered, with the next/previous slides' edges visible on both sides.
  Because `slidesPerView` is a number (not `'auto'`), Swiper sets each slide's
  width as an inline style computed from the container width — this also
  fixes the default Swiper CSS (`.swiper-slide { width: 100% }`), which would
  otherwise make every slide fill the whole container. Starts on the middle
  slide (`initialSlide`, computed from the slide count the same way
  `locations` does) so there's no empty gap on the left edge on load — with
  `centeredSlides`, starting on slide 0 would leave the "previous" side empty
  since there's nothing before the first slide. Wires `.slider-prev` /
  `.slider-next` as navigation.
- **Resize**: Not used — Swiper's own default resize handling re-measures
  and recalculates slide widths internally.
- **Breakpoint**: Not used — responsiveness is handled by Swiper's own
  `breakpoints` option (see Notes), not the project's `breakpoint` lifecycle
  hook.

## Dependencies

- `swiper` — Navigation, A11y modules
- `src/styles/gallery-slider.css` — hides slides until Swiper initializes (to
  avoid an initial flash of unstyled/stacked content), then switches the
  `.swiper` container to `overflow: visible` once initialized so the peeking
  neighbor slides aren't clipped.

## DOM Expectations

Elements matching `[data-component='gallery-slider']` must contain:

- `.swiper` — Swiper container
- `.swiper-wrapper` — slides wrapper
- `.swiper-slide` — individual slides (2+ recommended)
- `.slider-prev` / `.slider-next` — prev/next arrow buttons

## Notes

- **Slide counts per breakpoint** (`slidesPerView`, set in `gallery-slider.js`):
  `1.2` by default (mobile), `1.6` at 480px, `2.4` at 768px, `3.4` at 992px+ —
  i.e. roughly 3 full slides + peeking neighbors on desktop, scaling down on
  smaller screens. Adjust these numbers directly in the `breakpoints` object
  if a section needs to show more/fewer slides at once.
- **The parent section needs `overflow: hidden`** in Webflow (same
  requirement as `locations`) — the peeking neighbor slides intentionally
  bleed past the `.swiper` container via `overflow: visible`, and the section
  wrapper is what should clip that bleed at its own edges.
- `spaceBetween` (gutter between slides) is set per breakpoint alongside
  `slidesPerView` in the same `breakpoints` object.
- No CMS-specific logic (no "new show" reordering like `locations`, no
  forced eager-loading of images) — if a future section needs either of
  those, use `locations` or fork a new variant instead of adding it here.
