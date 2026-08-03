# locations

## Purpose

Swiper-based locations slider with centered active card, scale and opacity effect on non-active slides, drag support, and prev/next navigation.

## Webflow Setup

Add to the wrapper element that contains the swiper container and controls:

data-component="locations"

Inside each card (on the slide itself or any descendant), bind a custom attribute to the CMS "New Show" switch field:

```
data-locations-new-show="true"  (bound to the switch — resolves to the string "true"/"false")
```

## Behavior

- **Init**: Forces every `.location_image` inside the slider to `loading="eager"` before anything else runs (see the dedicated bullet below), then initialises a Swiper with `slidesPerView: 'auto'` and `centeredSlides: true`, wiring `.slider-prev` / `.slider-next` as navigation. Before instantiating Swiper, if a slide's card has `[data-locations-new-show="true"]` (the CMS-flagged "new show") and it isn't already at the middle slot, that slide is physically moved (via `insertBefore`) to `Math.floor((slideCount - 1) / 2)` in the `.swiper-wrapper` — a true DOM reorder, not just a scroll-to, so it lands centered with real neighbor cards peeking on both sides. This only changes the browser's display order; the underlying CMS Collection List order is untouched. If no slide is flagged, the slider simply starts on that same middle index as-is. With an even slide count the index formula biases one extra slide to the right (e.g. 6 slides → index 2, so 2 peek left / 3 peek right); odd counts split evenly on both sides. No loop — slider stops at first/last slide. Non-active slides are scaled down (0.93) and dimmed (opacity 0.5) via CSS.
- **Forced eager image loading**: Webflow marks `.location_image` `loading="lazy"` by default, and native lazy-loading judges each image's distance from the viewport using the slider's *untransformed* layout — before `centeredSlides` shifts the row via `translateX`. On desktop (440px-wide slides), images that land far enough to the right in that pre-transform layout never get judged "near enough" to load and stay pending indefinitely. Since Webflow doesn't reserve an aspect-ratio/height for `.location_image`, an unloaded image collapses its card's height (confirmed via testing: ~326px collapsed vs. ~550-591px normal) until a drag or nav click repositions the row and happens to trigger the load. Only reproduces on desktop — narrower tablet/mobile slide widths (see Notes) keep every slide within the native lazy-load trigger distance. `locations.js` sidesteps this by setting `img.loading = 'eager'` on every `.location_image` in the slider right at init, before Swiper or anything else runs — a small, bounded set of images, so there's no meaningful lazy-load benefit being given up.
- **Resize**: Not used — Swiper's own `updateOnWindowResize: true` default already re-measures and re-centers internally on window resize (independent of this project's resize-hook system), which is why breakpoint-driven width changes (see Notes) don't need a hook here.
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
- `[data-locations-new-show="true"]` — optional, on the flagged card (or a descendant) for the CMS-driven "new show" — only needed on the item(s) that should start centered

## Notes

- `.locations-content .swiper` has `overflow: visible` so side cards peek out
- The parent section (`section_locations`) should have `overflow: hidden` to clip the bleed — set this in Webflow
- Slide width is fixed at `440px` in CSS (`320px` at ≤991px, `260px` at ≤479px) — adjust per breakpoint if needed
- If more than one card is flagged `data-locations-new-show="true"`, the first one in CMS order wins (`findIndex` stops at the first match) — keep the "new show" switch exclusive to one item at a time
- The CMS/Collection List order can stay in its natural default (e.g. by date) — no need to manually sort the flagged item to the front. JS re-centers whichever card is flagged at runtime, regardless of its position in that order.
