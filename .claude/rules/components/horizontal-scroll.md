# horizontal-scroll

## Purpose

Pins a section and scrolls its panels horizontally while the user scrolls vertically (Osmo-style). Optionally adds a "curtain" effect: when `data-horizontal-pin` is present, the previous sibling section is pinned and kept static while this section rises over it, then the horizontal scroll begins.

## Webflow Setup

Add to the section that wraps the panels:

```
data-component="horizontal-scroll"
```

Each panel inside it:

```
data-horizontal-scroll-panel
```

Optional attributes on the wrapper:

- `data-horizontal-scroll-disable="mobile" | "mobileLandscape" | "tablet"` — disables the effect at that breakpoint and below.
- `data-horizontal-pin` — boolean. Enables the curtain effect. Requires an opaque `<section>` immediately **before** this one in the DOM (its previous sibling).

GSAP + ScrollTrigger must be loaded globally (CDN) on the page — they are not bundled.

## Behavior

- **Init**: Registers ScrollTrigger, sets up `gsap.matchMedia()`. For each wrapper: skips it on the disabled breakpoint; if `data-horizontal-pin` is set and a previous sibling exists, pins that previous section (`pinSpacing: false`) for one viewport so this section overlaps it like a curtain; then pins this section and translates the panels along X (`ease: "none"`, `scrub: true`).
- **Resize**: Handled automatically — ScrollTrigger auto-refreshes on resize and `gsap.matchMedia()` reverts/recreates per breakpoint. No manual hook.
- **Breakpoint**: Handled by `gsap.matchMedia()` (not the main.js breakpoint hook).
- **Reduced motion**: Under `prefers-reduced-motion: reduce`, no pin and no horizontal scroll are created — panels stay in natural document flow.

## Dependencies

- `window.gsap` and `window.ScrollTrigger` (global, via CDN — not bundled).
- `./horizontal-scroll.css` — structural CSS (`overflow: hidden` on the wrapper; `position: relative` + `z-index: 2` when `data-horizontal-pin` is set so the curtain stacks above and covers the previous section).

## DOM Expectations

- Wrapper: `[data-component='horizontal-scroll']`.
- At least 2 child panels matching `[data-horizontal-scroll-panel]` (fewer → the wrapper is skipped).
- For the curtain: an opaque previous sibling `<section>`.

## Testing

Standalone playground at `playground/index.html` — open directly in a browser (GSAP via CDN, ScrollTrigger markers on via `DEBUG`). Reference markup at `structure/horizontal-scroll.html`.
