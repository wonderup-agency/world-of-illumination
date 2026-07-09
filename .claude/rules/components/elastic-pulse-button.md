# elastic-pulse-button

## Purpose

Adds a bouncy "elastic pulse" hover effect to buttons: on mouseenter the target
briefly stretches horizontally (squash & stretch) then springs back to its
natural size with an elastic ease. Hover-only — skipped on touch devices and
when the user prefers reduced motion.

## Webflow Setup

Add to a container that holds one or more buttons, or directly to the button:

```
data-component="elastic-pulse-button"
```

Inside, each button must carry `data-elastic-pulse-btn`. The element that
actually animates is `data-elastic-pulse-target` (falls back to the button
itself if absent), so the transform can be scoped to an inner content wrapper
while the outer button stays static.

Example markup:

```html
<div data-elastic-pulse-btn class="button">
  <a href="/tickets" class="item-link w-inline-block"></a>
  <div data-elastic-pulse-target class="button_main-content">
    <div class="button_main-content-text">
      <span class="elastic-pulse-btn__span">GET TICKETS</span>
    </div>
  </div>
</div>
```

## Behavior

- **Init**: Wraps setup in `gsap.matchMedia()` gated to
  `(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`.
  Collects every `[data-elastic-pulse-btn]` inside each component element (plus
  the element itself if it matches) and binds a `mouseenter` handler. On hover
  it computes a stretch based on the target's font size, then runs a GSAP
  timeline: a fast `scaleX/scaleY` stretch (`power1.out`, 0.1s) followed by a
  spring back to `1` (`elastic.out(1, 0.3)`, 1s). A 500ms lock prevents
  re-triggering mid-pulse.
- **Resize**: Not used — `gsap.matchMedia()` reverts/re-runs automatically.
- **Breakpoint**: Not used — handled by `gsap.matchMedia()`.
- **Reduced motion / touch**: The whole effect is skipped; no listeners bound.
  When the media query stops matching, listeners are removed, running timelines
  killed and transforms cleared.

## Dependencies

- `gsap` — core (`gsap.timeline`, `gsap.matchMedia`, `clearProps`).

## DOM Expectations

Elements matching `[data-component='elastic-pulse-button']` containing (or being)
one or more `[data-elastic-pulse-btn]`, each optionally with a
`[data-elastic-pulse-target]` child to animate.

## Notes

- `HOVER_LOCK` (500ms) and `STRETCH_RATIO` (0.75 × font size) are tunable
  constants at the top of the file.
- Scaling uses `transformOrigin` default (center). Set a different origin in CSS
  on the target if the stretch should anchor elsewhere.
