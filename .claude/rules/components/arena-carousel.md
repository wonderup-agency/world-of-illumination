# arena-carousel

## Purpose

Automatic, infinite-loop Swiper carousel for a **static** (non-CMS) row of
items placed by hand in the Designer — built for the four `arena_item`
images in `section_show` ("Stadiums and arenas"), under the
[`theme-carousel`](./theme-carousel.md). No arrows, no drag: it advances on
its own. Same timing as `theme-carousel` (4s delay, 800ms transition) so the
two carousels in the section feel consistent. Works with any number of items
(2+); adding/removing items in the Designer needs no JS change.

## Webflow Setup

Add to the wrapper that directly contains the items (`.arena_item-wrapper`):

```
data-component="arena-carousel"
```

No Swiper classes are needed in Webflow — every **direct child** of the
wrapper becomes a slide (`arena_item` today). Don't add Swiper classes by
hand.

## Behavior

- **Init**: Builds the Swiper structure itself: the wrapper gets `.swiper`
  + `.is-arena-carousel`, a new `.swiper-wrapper` is created inside it, and
  every original child is moved into it with `.swiper-slide`. Images are
  forced to `loading="eager"` (same lazy-load/translateX bug as
  `theme-carousel`/`locations`). The set is then padded with full rounds of
  clones (`aria-hidden="true"`) up to `MIN_SLIDES_FOR_LOOP` (12) so Swiper's
  loop never gets disabled for having too few slides. Autoplay is skipped
  under `prefers-reduced-motion: reduce`.
- **Slides per breakpoint** (`BREAKPOINTS` in the JS, gap in rem converted
  to px at runtime — Swiper reads a `"1rem"` string as 1px):
  `1.3` / 1rem gap (<480px), `2.2` / 1rem (≥480), `3` / 1.5rem (≥768),
  `4` / 1.5rem (≥992). Below 768px `centeredSlides` is on, so the active
  slide sits in the middle with neighbors peeking on both sides (without it
  the row started flush left and looked off-center on mobile). Tablet and
  desktop stay left-aligned since several full slides fill the row.
- **Resize**: `swiper.update()`.
- **Breakpoint**: Not used — Swiper's own `breakpoints` option.

## Dependencies

- `swiper` — Autoplay, A11y modules.
- `src/styles/arena-carousel.css` — only active once `.is-arena-carousel`
  exists: forces the wrapper to `display: block; overflow: hidden; gap: 0`
  (its Designer grid/flex layout would fight Swiper's single track), makes
  slide images fill the slide width.

## DOM Expectations

`[data-component='arena-carousel']` with 2+ direct children (each an item,
usually containing an `<img>`).

## Notes

- **Why a separate component instead of reusing `theme-carousel`**:
  `theme-carousel` expects pre-built `.swiper` / `.swiper-wrapper` /
  `.swiper-slide` markup from a CMS Collection List and styles a centered,
  scaled "active card" (`.theme_card-wrapper`). This row is plain divs with
  no Swiper classes and shows several equal slides at once, so the shared
  part is only ~10 lines of Swiper options. Parametrizing `theme-carousel`
  would have meant editing a working, live component for that; per this
  project's convention (see `tapes` vs `marquee`), similar components stay
  independent.
- If the JS fails, the wrapper keeps its original Designer layout — nothing
  is hidden before init.
