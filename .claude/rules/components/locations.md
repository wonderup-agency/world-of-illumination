# locations

## Purpose

Swiper-based locations slider with centered active card, scale and opacity effect on non-active slides, drag support, and prev/next navigation.

## Webflow Setup

Add to the wrapper element that contains the swiper container and controls:

data-component="locations"

## Behavior

- **Init**: Initialises a Swiper with `slidesPerView: 'auto'` and `centeredSlides: true`, wiring `.slider-prev` / `.slider-next` as navigation. No loop — slider stops at first/last slide. Non-active slides are scaled down (0.93) and dimmed (opacity 0.5) via CSS.
- **Resize**: Not used
- **Breakpoint**: Not used

## Dependencies

- `swiper` — Navigation, A11y modules
- `src/styles/locations.css` — overflow visible on swiper, scale/opacity transitions

## DOM Expectations

Elements matching `[data-component='locations']` must contain:

- `.swiper` — Swiper container (the `scroll_list-wrapper`)
- `.swiper-wrapper` — slides wrapper (the `scroll_list`)
- `.swiper-slide` — individual slides (the `scroll_item` items)
- `.slider-prev` / `.slider-next` — prev/next arrow buttons (centered below, not absolute)

## Notes

- `.locations-content .swiper` has `overflow: visible` so side cards peek out
- The parent section (`section_locations`) should have `overflow: hidden` to clip the bleed — set this in Webflow
- Slide width is fixed at `340px` in CSS — adjust per breakpoint if needed
