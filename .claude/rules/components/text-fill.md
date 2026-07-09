# text-fill

## Purpose

Scroll-driven text reveal: splits a text element into words and animates each word's color from its existing (muted/gray) CSS color to white, one word after another, as the element scrolls through the viewport.

## Webflow Setup

Add to a plain text/heading element (not a Webflow Rich Text/CMS rich-text element — see Notes below), not the parent section:

data-component="text-fill"

## Behavior

- **Init**: Splits the element's text into words via GSAP `SplitText`, reads the element's starting color (whatever `.text-style-muted` or similar already sets), then on every scroll tick (rAF-throttled) computes progress directly from `getBoundingClientRect()` (same technique as `guests.js`, no `ScrollTrigger` plugin involved) — 0 when the element's top reaches `START_VH` of the viewport height, 1 when the element's center reaches `END_VH` of the viewport height. Each word gets its own overlapping slice of that 0–1 range (width controlled by `SPREAD`, eased with `sine.inOut`) so several words fade together in a soft wave in reading order, and reverse back to gray if you scroll back up.
- **Resize**: Re-runs the tick for every instance so progress/geometry stays correct after a resize.
- **Breakpoint**: Not used — runs the same at all breakpoints.

## Dependencies

- `gsap` — core (`quickSetter`, `utils.interpolate`, `parseEase`), `SplitText` (word splitting)

## DOM Expectations

Elements matching `[data-component='text-fill']` — no required children; the element's own text content is split into words. Works with any starting text color (e.g. Webflow's `.text-style-muted` utility) since the starting color is read live from the DOM, not hardcoded.

## Notes

- **Do not put this on a Webflow Rich Text / CMS rich-text element** (`.w-richtext`, the component with Highlight toggles). Confirmed by testing: on this project, the rich-text component's own runtime processing stomped on the `SplitText`-generated word spans, so the fill never visibly animated. A plain Heading/Text element works correctly.
- Can coexist on a page with a different `data-component` on an ancestor element (e.g. `guests` on the parent section for parallax images) — each `data-component` attribute is matched independently per element, so they don't conflict.
- Deliberately avoids `ScrollTrigger` in favor of computing progress from `getBoundingClientRect()` on every scroll tick — like `guests.js` already does. Simpler, no cached start/end state that can go stale. Scroll handling is throttled to one calculation per animation frame via `requestAnimationFrame`.
- Tuning knobs, all at the top of `text-fill.js`: `START_VH` (when the fill starts — lower delays it further into the scroll), `END_VH` (when it's fully complete — lower means more scroll distance, i.e. slower), `SPREAD` (how many words overlap in the fade — higher is softer/smoother, `1` would be a hard word-by-word cutoff).
- End color is hardcoded to `#fff` (white) to match the dark-background design. If the site's "white" text token isn't pure white, update the `'#ffffff'` value in `text-fill.js`.
- Custom code never runs inside the Webflow Designer canvas — test this component via Webflow's Preview mode or the local dev server, not the Designer.