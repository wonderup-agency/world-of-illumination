# guests

## Purpose

Parallax scroll effect for scattered decorative images. Each image moves vertically at its own speed as the section scrolls through the viewport, creating a depth effect.

## Webflow Setup

Add to the section wrapper:

data-component="guests"

## Behavior

- **Init**: On desktop (≥992px), waits via `requestAnimationFrame` until `section.offsetHeight > 0` (deferred to handle Webflow Interactions that initially hide the section), then calculates scroll progress via `getBoundingClientRect()` and applies `y` via `gsap.quickSetter` on each scroll tick. No effect on tablet/mobile.
- **Resize**: Not used (gsap.matchMedia handles breakpoint cleanup automatically)
- **Breakpoint**: Not used

## Dependencies

- `gsap` — core (`gsap.quickSetter` for performant DOM writes, `gsap.matchMedia` for breakpoint scoping)

## DOM Expectations

Elements matching `[data-component='guests']` must contain:

- `[data-speed]` — one attribute per image (float, e.g. `0.15`). Higher value = more vertical travel. Typical range: `0.10`–`0.35`.

## Notes

- The `yTravel` multiplier is `400`. Adjust for more/less dramatic movement.
- Progress formula: `1 - section.getBoundingClientRect().bottom / (window.innerHeight + section.offsetHeight)`. 0 = section entering from below, 1 = section fully above viewport.
- `gsap.matchMedia` auto-reverts and removes the scroll listener when dropping below 992px.
