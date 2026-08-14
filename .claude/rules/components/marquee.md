# marquee

## Purpose

Infinite horizontal ticker/marquee — scrolls a row of repeated text + logo items continuously from right to left. CSS drives the animation; JS auto-fills the track with enough clones to cover the container width, then duplicates that filled set once more so the loop is seamless at any screen size.

## Webflow Setup

Add to the section wrapper:

data-component="marquee"

Optional attributes on the same wrapper (per-instance overrides — omit to keep the default behavior used by every other `marquee` instance):

- `data-marquee-speed="30"` — overrides the default scroll speed (px/second) for this instance only.
- `data-marquee-reverse` — boolean (presence only, no value needed). Reverses the scroll direction (left-to-right instead of right-to-left) for this instance only.
- `data-marquee-gap="3rem"` — extra spacing between an item's two headings (its 1st and 2nd children — e.g. a base Heading plus an optional second Heading added for a second phrase), on top of the `.marquee_item` flex `gap` that's already there. Accepts any CSS length (`3rem`, `48px`) or a bare number (treated as px, e.g. `48`). Only matters for items that actually have a 2nd child.

## Behavior

- **Init**: Reads `data-marquee-speed`/`data-marquee-reverse`/`data-marquee-gap` off the wrapper (falling back to `DEFAULT_SPEED` and normal direction if the first two are absent). If `data-marquee-gap` is present, applies it as `margin-left` on the 2nd child (`item.children[1]`) of every top-level `.marquee_item` currently in the track — this runs first, before the base pattern is captured, so the extra spacing is baked into every future clone. Then reads the original `.marquee_item` children of `.marquee_track` as the base pattern, clears the track, then re-appends clones of that pattern until the track's `scrollWidth` covers the component's width. Once filled, clones that entire filled set one more time (marked `aria-hidden="true"`) so the CSS `-50%` loop lines up exactly on the repeat boundary. Finally sets `animation-duration` inline based on the resulting width so scroll **speed** stays constant no matter how much content got filled in. No effect on tablet/mobile beyond the same fill logic (it's resolution-independent). Item content is arbitrary — text, a single logo image, or any mix — and the count of unique items doesn't matter; more items just means less cloning to fill the same width.
- **Resize**: Re-runs the fill + duration routine from the original base pattern, but only if the component's `offsetWidth` actually changed since the last run — needed because going from a narrow to a much wider viewport (e.g. mobile → ultrawide desktop) could otherwise leave the filled set narrower than the new container width, or make the fixed duration look faster/slower than intended. The width check exists because mobile browsers (Safari/Chrome) fire a `resize` event whenever the address bar shows/hides during scroll — that only changes viewport *height*, not width. Without the guard, every one of those resize events rebuilt the track from scratch (`innerHTML = ''` + re-clone + reset `animation-duration`), which restarted the CSS animation and looked like a flicker/refresh mid-scroll on mobile.
- **Breakpoint**: Not used

## Dependencies

- `src/styles/marquee.css` — animation, layout

## DOM Expectations

Elements matching `[data-component='marquee']` must contain, at any nesting depth:

- `.marquee_track` — flex row that gets animated (must have `overflow: hidden` on an ancestor — `.section_marquee` already has it, so extra wrapper divs like `.marquee-content` in between are fine)
- `.marquee_item` — one per **unique** item (a single logo image, text, or any content). Add each unique item **once** in Webflow — JS handles both filling the width and duplicating for the loop. No need to manually duplicate items in the Designer, and no fixed count required — works with as few or as many distinct items as the design needs.

Anything else inside `[data-component='marquee']` but outside `.marquee_track` (e.g. a `.marquee-heading` label) is untouched by the JS — style and position it freely.

**Class names are the shared contract across every `marquee` instance sitewide** — `.marquee_track` and `.marquee_item` must stay exactly these names in every section that uses this component. Don't rename them per-instance (e.g. to `.marquee-wrapper`) even if a specific section's content differs — the JS/CSS is shared, so a rename in one place silently breaks every other page already using the old names. Combo classes and extra wrapper/heading elements around them are free to differ per instance.

## Notes

- Add `overflow: hidden` to the parent section (`.section_marquee` is already styled this way) — it doesn't need to be the direct parent of `.marquee_track`, just an ancestor.
- Scroll speed defaults to `DEFAULT_SPEED` (px/second, `60`) at the top of `marquee.js`, overridable per instance via `data-marquee-speed`. JS computes `animation-duration` from the final filled width so speed stays constant regardless of item count/text length/screen size. The `20s` in `marquee.css` is only a pre-JS fallback and isn't the real duration in practice.
- Direction defaults to right-to-left (`translateX(0)` → `translateX(-50%)`); `data-marquee-reverse` on an instance sets `animation-direction: reverse` on its `.marquee_track` only, playing the same keyframe backwards (still seamless, since `-50%` and `0%` are visually identical thanks to the duplicated set).
- `white-space: nowrap` and `flex-shrink: 0` on `.marquee_item` prevent text wrapping or squishing, which would break the `-50%` loop math.
- **Spacing between items must be `margin-right` on `.marquee_item`, never `gap` on `.marquee_track`.** Flex `gap` only applies *between* elements (n-1 gaps for n items), so it doesn't divide evenly into the `-50%` transform and leaves a visible blank gap once per loop. `margin-right` on every item (including the last, cloned one) keeps each item's effective width uniform, so `-50%` lands exactly on the repeat boundary.
- **Extra spacing between two headings sharing one item** (e.g. the ticket banner's "PRESALE LIVE..." + "SAVE UP TO 30%" pair) is a different case from the item-to-item gap above — use `data-marquee-gap` on the wrapper, same place as `data-marquee-speed`/`data-marquee-reverse`, instead of touching `marquee.css`. It's read once at init (see Behavior) and baked into `baseItems`, so it survives every clone/resize with no extra code. It always targets the item's 2nd child specifically — useful for a second heading, but a no-op on any item that only has one child (e.g. a plain single-text or single-logo item elsewhere on the site).
- Different logos rarely share a natural width/height — constrain `.marquee_logo` (or whatever class the image carries) to a fixed height with `width: auto` in CSS so the row reads as aligned regardless of each source SVG's aspect ratio.
- **Why the JS fill step exists**: with `-50%`, the loop is only seamless if one full repeated set is already at least as wide as the container. With just 1-2 short items, the set can be narrower than the screen, so the second copy hasn't scrolled in yet when the first scrolls out — visible as a blank gap once per loop. The `fill()` step removes the guesswork by cloning until that's guaranteed, regardless of item count, text length, or screen width.
- Cloned filler/loop items are marked `aria-hidden="true"` so screen readers don't read the same repeated content multiple times.
- Respects `prefers-reduced-motion: reduce` (animation disabled).