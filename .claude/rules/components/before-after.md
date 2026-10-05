# before-after

## Purpose

Draggable image comparator: two stacked images, and a vertical divider the
user drags left/right to reveal more of one or the other. Built for the
day/night comparison in `section_skins` (Convertible Decor page), reusable
on any section. Listed in [`ANIMATIONS.md`](../ANIMATIONS.md).

## Webflow Setup

Already packaged as the Webflow Component **"Element / Before After"**
(props: `Day Image`, `Day Alt`, `Night Image`, `Night Alt`). Insert an
instance and set the two images — no attributes to add by hand.

To build it from scratch instead, on the frame:

```
data-component="before-after"
```

Inside it:

| Attribute | Purpose |
| --- | --- |
| (none) | base image — full frame, visible on the right side of the divider |
| `data-before-after="before"` | wrapper of the image shown on the left side (clipped by JS/CSS) |
| `data-before-after="handle"` | the divider (line + round button); positioned by CSS |

## Behavior

- **Init**: Starts at 50%. Writes the position as `--before-after-position`
  on the frame; `before-after.css` turns it into the `before` layer's
  `clip-path` and the handle's `left`. Makes the handle a keyboard slider
  (`role="slider"`, Arrow keys ±5%, Home/End).
- **Mouse / pen** (pointer events): click anywhere in the frame jumps the
  divider there; drag to move.
- **Touch** (plain touch events): the first 6px of movement (`TOUCH_LOCK`)
  decide the gesture — sideways → the slider owns it (`preventDefault`,
  divider follows the finger); up/down → the page scrolls normally. A tap
  with no movement jumps the divider to the tapped point. It never jumps on
  touchstart, which would fire at the start of every page scroll.
- **Resize / Breakpoint**: Not used — the position is a percentage.

## Dependencies

- `src/styles/before-after.css` — clip-path/handle position, touch-action,
  focus outline. Visual styles (radius, aspect ratio, labels) live on the
  Webflow `skins_compare*` classes.

## DOM Expectations

`[data-component='before-after']` containing `[data-before-after='before']`
(required) and `[data-before-after='handle']` (optional).

## Notes

- **Why touch uses touch events, not pointer events + `touch-action`**
  (fixed 2026-10-05): the first version relied on `touch-action: pan-y` so
  the browser would hand horizontal swipes to the pointer handlers. That
  worked in Chrome/Android (confirmed with a headless touch test, 50% → 7%)
  but the divider didn't move on the user's phone — iOS Safari doesn't
  reliably honor `pan-y` and keeps the gesture. Direction-locking on
  `touchmove` with `preventDefault` (same approach as Swiper) works on every
  mobile browser. `touch-action: pan-y` stays in the CSS as a hint only.
  Verified with a headless touch test: sideways drag 50% → 10% with no page
  scroll; vertical swipe scrolled the page 271px with the divider untouched;
  tap jumped to the tapped point; mouse click/drag unchanged. Not yet
  verified on a physical iPhone.
- Works inside hidden tab panes (`content-tabs`): no measuring at init, the
  pointer math reads the frame's size on each move.
- Aspect ratio of the frame: 17/10 desktop, 4/3 tablet, 1/1 mobile
  (`skins_compare` class). Both images use `object-fit: cover` in the same
  box, so a real matching day/night pair lines up exactly.
- Skins section status (2026-09-30): only Jack has real photos. The other
  8 skins use the same Jack pair as a placeholder. Swap each instance's
  `Day Image` / `Night Image` props once the real renders exist.
