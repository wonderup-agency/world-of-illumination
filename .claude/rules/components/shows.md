# shows

## Purpose

Orbital carousel of show logos rotating around a central circular image. The active logo (slot 0) sits at the top of the orbit and is scaled up — it IS the featured display. Every few seconds the orbit rotates one step, the arriving logo scales up and the leaving logo scales back down, while the circle image crossfades to the new active show.

## Webflow Setup

Add to the wrapper element that contains `show_featured` and `show_orbit`:

data-component="shows"

**Important:** `show_featured-logo` is no longer used — hide or remove it from Webflow. Only `show_featured-img` is managed by JS.

**CMS-driven (current setup on Home)**: `show_orbit` is a Collection List bound to
the **Themes** collection (the same collection used by `theme-image-slider` and
the Themes page) — not a separate "Shows" collection (that name is already used
by the per-location/venue entity that powers `locations`/`tabs-map`). No JS
changes were needed for this — the component only ever queries by class, so a
CMS-rendered `.show_item` works identically to a static one. Field mapping:

| Class | CMS field |
| --- | --- |
| `.show_item-logo` | Theme Logo |
| `.show_item-featured` | Hero - Main Image |

The Collection Item element itself must carry the `show_item` class directly
(not just a wrapper around it) — `querySelectorAll('.show_item')` only finds it
there. No sort field is applied; items render in the collection's default
order. To pull a theme out of the orbit, set it to Draft in the CMS (Webflow
excludes draft items from the rendered list automatically) rather than adding
a `hide` class by hand.

## Behavior

- **Init**: On desktop (≥992px), reads orbit geometry from the DOM, places all logos in their elliptical slot positions (slot 0 is scaled up as the active logo), sets the circle image to the first active show, then auto-advances every `SHOW_DURATION` seconds. Each advance slides all logos one slot — the arriving logo naturally scales up and brightens, the leaving logo scales down and dims. No effect on tablet/mobile.
- **Resize**: Recomputes orbit geometry so positioning stays accurate after a resize.
- **Breakpoint**: Not used — `gsap.matchMedia` handles cleanup/restart automatically when crossing 992px.

## Dependencies

- `gsap` — core (`gsap.to`, `gsap.set`, `gsap.matchMedia`, `gsap.killTweensOf`, `gsap.delayedCall`, `autoAlpha`, `filter`)
- `src/styles/shows.css` — orbit and item absolute positioning, hides `show_item-featured`. Both rules are scoped as `.show_orbit .show_item` / `.show_orbit .show_item-featured` (not bare `.show_item`) — **deliberately**, so a future CMS Collection List elsewhere on the site that happens to reuse the `show_item`/`show_item-featured` class names doesn't inherit this component's `position: absolute` and get silently ripped out of the page's normal layout flow. This is exactly what broke the `location-map` map on the Locations template once it was nested inside a Collection List item that Webflow had named `show_item` — the fix was scoping these selectors, not touching `location-map` at all. If a future collision happens with a differently-named class, prefer scoping the colliding selector the same way over renaming the CMS list's classes.

## DOM Expectations

Elements matching `[data-component='shows']` must contain:

- `.show_featured` — wrapper (sized and positioned in Webflow)
  - `.show_featured-img` — `<img>` for the active show's circular photo (true crossfade on advance)
  - `show_featured-logo` — no longer used, hide/remove it
- `.show_orbit` — overlay container (`position: absolute; inset: 0`)
  - `.show_item` — one per show; add class `hide` to exclude from the orbit
    - `.show_item-logo` — `<img>` visible in the orbit (slot 0 displays at `ACTIVE_SCALE` with full brightness)
    - `.show_item-featured` — `<img>` hidden (`display: none`); its `src`/`srcset` is copied to `show_featured-img` when active

## Notes

- **Slot system**: N slots evenly distributed around an ellipse. Slot 0 = top/active position — visible, scaled up to `ACTIVE_SCALE` (default `2`) and at full brightness. Slots advance counter-clockwise (right side rises toward featured). Adjust `ACTIVE_SCALE` in JS to match the design.
- **Featured offset**: Slot 0 is pushed `FEATURED_OFFSET` (default `6rem`) above the natural orbit arc position, creating visual separation from the orbit logos.
- **Orbit math**: `cx/cy` = center of the visible arc. `ry` = half the visible arc height. `rx = imgWidth × 0.8`. Adjust the multiplier in `computeLayout()` for wider/narrower orbit.
- **Brightness**: Non-featured logos are dimmed via `filter: brightness(0.55)`. Featured logo is `brightness(1)`. Animates smoothly during slide transitions. Adjust in `slotFilter()`.
- **Visibility**: Items within 155° of the top are visible; beyond that they fade out over 20° (`VISIBLE_ANGLE`, `FADE_ANGLE`).
- **Timing**: `SHOW_DURATION` (4s) = static display time per show. `STEP_DURATION` (0.8s) = rotation animation time.
- **Circle crossfade**: True crossfade — a JS-created back layer fades the new image in while the old fades out simultaneously (no blank moment). Starts at 50% of `STEP_DURATION`, duration 0.5s.
- **srcset handling**: `swapImg()` updates both `src` and `srcset`/`sizes` — required because browsers prioritize `srcset` over `src`.
- **Hidden zone transitions**: Items arriving from the hidden zone teleport to position then fade in. Items going to the hidden zone slide straight down and fade out.
- **Dynamic N**: Works with any number of shows. CMS-driven via the Themes Collection List (see Webflow Setup) — adding/archiving/drafting a Theme item changes the orbit automatically, no code or manual `hide` class needed. The `hide` class mechanism described above still works too, for a manually-added `.show_item` outside the CMS template.