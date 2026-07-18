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

- **Init**: Initialises a Swiper with `slidesPerView: 'auto'` and `centeredSlides: true`, wiring `.slider-prev` / `.slider-next` as navigation. Before instantiating Swiper, if a slide's card has `[data-locations-new-show="true"]` (the CMS-flagged "new show") and it isn't already at the middle slot, that slide is physically moved (via `insertBefore`) to `Math.floor((slideCount - 1) / 2)` in the `.swiper-wrapper` — a true DOM reorder, not just a scroll-to, so it lands centered with real neighbor cards peeking on both sides. This only changes the browser's display order; the underlying CMS Collection List order is untouched. If no slide is flagged, the slider simply starts on that same middle index as-is. With an even slide count the index formula biases one extra slide to the right (e.g. 6 slides → index 2, so 2 peek left / 3 peek right); odd counts split evenly on both sides. No loop — slider stops at first/last slide. Non-active slides are scaled down (0.93) and dimmed (opacity 0.5) via CSS.
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
- `[data-locations-new-show="true"]` — optional, on the flagged card (or a descendant) for the CMS-driven "new show" — only needed on the item(s) that should start centered

## Notes

- `.locations-content .swiper` has `overflow: visible` so side cards peek out
- The parent section (`section_locations`) should have `overflow: hidden` to clip the bleed — set this in Webflow
- Slide width is fixed at `340px` in CSS — adjust per breakpoint if needed
- If more than one card is flagged `data-locations-new-show="true"`, the first one in CMS order wins (`findIndex` stops at the first match) — keep the "new show" switch exclusive to one item at a time
- The CMS/Collection List order can stay in its natural default (e.g. by date) — no need to manually sort the flagged item to the front. JS re-centers whichever card is flagged at runtime, regardless of its position in that order.
