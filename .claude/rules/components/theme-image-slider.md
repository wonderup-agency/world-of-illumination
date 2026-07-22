# theme-image-slider

## Purpose

Turns a CMS "multiphotos" nested Collection List (the scattered images inside
each Theme card) into a single-image auto-fading slider: one image visible at
a time, crossfading to the next automatically on a timer. No arrows, no drag —
purely automatic.

## Webflow Setup

Add to the wrapper that directly contains the multiphotos Collection List
(`.theme_image-wrapper`):

```
data-component="theme-image-slider"
```

Optional attribute on the same wrapper:

- `data-theme-slider-duration="5"` — overrides how many seconds each image
  stays visible before crossfading (default `4`, see `SLIDE_DURATION`).

No new classes were needed on the CMS list — the existing `.themes_image`
class on each multiphotos image is reused as-is.

**Important Webflow caveat:** once JS runs, every `.themes_image` is taken out
of normal flow (`position: absolute`) so they can stack and crossfade. This
means `.theme_image-wrapper` must have an explicit **height** (or
`aspect-ratio`) set in Webflow — it can no longer rely on the image's natural
size to size itself, since the image is no longer in flow.

## Behavior

- **Init**: Collects every `.themes_image` inside the component element. If
  there are fewer than 2, the component does nothing (a single image just
  renders normally, filling the box via the component's own CSS). Otherwise it
  hides all but the first image (`autoAlpha: 0` / `1`), then on a repeating
  timer crossfades the current image out and the next one in simultaneously,
  looping back to the first after the last. Wrapped in
  `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` — under
  reduced motion, the timer never starts and the first image just stays
  static.
- **Resize**: Not used — images are absolutely positioned at 100%/100% via
  CSS, no JS repositioning needed on resize.
- **Breakpoint**: Not used — same behavior at every breakpoint.

## Dependencies

- `gsap` — core (`gsap.set`, `gsap.to`, `gsap.matchMedia`, `gsap.delayedCall`,
  `autoAlpha`).
- `src/styles/theme-image-slider.css` — stacks every `.themes_image` inside
  the component absolutely over the wrapper (`inset: 0`, `object-fit: cover`).

## DOM Expectations

Elements matching `[data-component='theme-image-slider']` must contain 2+
`.themes_image` elements at any nesting depth (works through the Webflow
Collection List's wrapper divs — position is computed relative to the nearest
positioned ancestor, which is the component element itself, not the immediate
parent).

## Notes

- `SLIDE_DURATION` (4s) and `FADE_DURATION` (0.8s) are tunable constants at
  the top of `theme-image-slider.js`. `SLIDE_DURATION` can also be overridden
  per-instance via `data-theme-slider-duration` on the wrapper.
- CSS is scoped under `[data-component='theme-image-slider']` rather than
  applied to `.themes_image` globally, so it can't leak into any other
  unrelated use of that class elsewhere on the site.
- The component element itself gets `overflow: hidden` and `position:
  relative` from the CSS file — no need to set these in Webflow.
