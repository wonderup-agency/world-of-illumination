# guests

## Purpose

Parallax scroll effect for scattered decorative images. Each image moves vertically at its own speed as the section scrolls through the viewport, creating a depth effect.

## Webflow Setup

Add to the section wrapper:

data-component="guests"

## Behavior

- **Init**: On desktop (≥992px), reads `data-speed` from each image inside the section and creates a scrubbed ScrollTrigger tween — images travel from `y: speed×200` to `y: -(speed×200)` as the section scrolls from below to above the viewport. No effect on tablet/mobile (images are hidden via Webflow CSS at those breakpoints).
- **Resize**: Not used (gsap.matchMedia handles breakpoint cleanup automatically)
- **Breakpoint**: Not used

## Dependencies

- `gsap` — core
- `gsap/ScrollTrigger` — scroll-scrubbed animation

## DOM Expectations

Elements matching `[data-component='guests']` must contain:

- `[data-speed]` — one attribute per image (float, e.g. `0.15`). Higher value = more vertical travel. Typical range: `0.10`–`0.35`.

## Notes

- The `yTravel` multiplier is `200`. Increase it for more dramatic movement, decrease for subtler.
- `gsap.matchMedia('(min-width: 992px)')` scopes the effect to desktop only and auto-reverts on narrower viewports.
- `ease: 'none'` is required for scrubbed ScrollTrigger animations.
