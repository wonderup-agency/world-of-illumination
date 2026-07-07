# marquee

## Purpose

Infinite horizontal ticker/marquee — scrolls a row of repeated text + logo items continuously from right to left. CSS drives the animation; JS auto-fills the track with enough clones to cover the container width, then duplicates that filled set once more so the loop is seamless at any screen size.

## Webflow Setup

Add to the section wrapper:

data-component="marquee"

## Behavior

- **Init**: Reads the original `.marquee_item` children of `.marquee_track` as the base pattern, clears the track, then re-appends clones of that pattern until the track's `scrollWidth` covers the component's width. Once filled, clones that entire filled set one more time (marked `aria-hidden="true"`) so the CSS `-50%` loop lines up exactly on the repeat boundary. Finally sets `animation-duration` inline based on the resulting width so scroll **speed** (`SPEED`, px/s) stays constant no matter how much content got filled in. No effect on tablet/mobile beyond the same fill logic (it's resolution-independent).
- **Resize**: Re-runs the same fill + duration routine from the original base pattern — needed because going from a narrow to a much wider viewport (e.g. mobile → ultrawide desktop) could otherwise leave the filled set narrower than the new container width, or make the fixed duration look faster/slower than intended.
- **Breakpoint**: Not used

## Dependencies

- `src/styles/marquee.css` — animation, layout

## DOM Expectations

Elements matching `[data-component='marquee']` must contain:

- `.marquee_track` — flex row that gets animated (must have `overflow: hidden` on the parent section)
- `.marquee_item` — one per **unique** item (heading + logo, or any content). Add each unique item **once** in Webflow — JS handles both filling the width and duplicating for the loop. No need to manually duplicate items in the Designer.

## Notes

- Add `overflow: hidden` to the parent section (`.section_marquee` is already styled this way).
- Scroll speed is controlled by `SPEED` (px/second) at the top of `marquee.js`, default `60`. JS computes `animation-duration` from the final filled width so speed stays constant regardless of item count/text length/screen size. The `20s` in `marquee.css` is only a pre-JS fallback and isn't the real duration in practice.
- `white-space: nowrap` and `flex-shrink: 0` on `.marquee_item` prevent text wrapping or squishing, which would break the `-50%` loop math.
- **Spacing between items must be `margin-right` on `.marquee_item`, never `gap` on `.marquee_track`.** Flex `gap` only applies *between* elements (n-1 gaps for n items), so it doesn't divide evenly into the `-50%` transform and leaves a visible blank gap once per loop. `margin-right` on every item (including the last, cloned one) keeps each item's effective width uniform, so `-50%` lands exactly on the repeat boundary.
- **Why the JS fill step exists**: with `-50%`, the loop is only seamless if one full repeated set is already at least as wide as the container. With just 1-2 short items, the set can be narrower than the screen, so the second copy hasn't scrolled in yet when the first scrolls out — visible as a blank gap once per loop. The `fill()` step removes the guesswork by cloning until that's guaranteed, regardless of item count, text length, or screen width.
- Cloned filler/loop items are marked `aria-hidden="true"` so screen readers don't read the same repeated content multiple times.
- Respects `prefers-reduced-motion: reduce` (animation disabled).