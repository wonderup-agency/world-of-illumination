# location-year-filter

## Purpose

On a location page, keeps only the 2027 and 2028 "future show" cards that
belong to the **same venue** as the page's own 2026 card. Fixes a CMS
filtering gap: the 2027/2028 Collection Lists are filtered on the Themes
collection by "Next Year Show is set" / "In 2 Years Show is set" only —
Webflow's native filter can't drill into a reference field's own nested
field (confirmed in the Designer: the Filter dropdown only lists the
Themes collection's own fields, with no way to filter by
`Next Year Show > Location`), so those lists return every theme that has
*any* future show, regardless of venue. This component hides everything
except the one item per list whose venue text matches the 2026 card.

## Webflow Setup

Add to the wrapper that directly contains the three year Collection Lists
(`.location_year-cards`):

```
data-component="location-year-filter"
```

No other markup changes needed — the component reads the existing
`.w-dyn-list` / `.w-dyn-item` / `.location_tagline-wrapper` structure as-is.

## Behavior

- **Init**: Reads the wrapper's direct `.w-dyn-list` children in DOM order.
  The **first** list (2026) is treated as the reference — its single
  `.w-dyn-item` already renders the correct venue for this page (that list's
  own CMS filter works natively). For every **other** list (2027, 2028, and
  any future year list added the same way), each `.w-dyn-item`'s venue text
  is compared against the reference venue; non-matching items get
  `display: none`, the matching one is left visible. Venue text is read from
  the **last** `div` inside `.location_tagline-wrapper` (the row after the
  year and the "-" separator), trimmed and lowercased so a stray leading
  space or casing difference in the CMS "Venue - Name" field doesn't break
  the match.
- **Whole-section hide**: If, after filtering, the 2026 card is the *only*
  visible card (no 2027/2028 show exists yet for this venue), the entire
  wrapping `<section>` (found via `wrapper.closest('section')` —
  `section_location` in the current markup) is set to `display: none`. A
  "brand-new show every year" section showing a single year doesn't make
  sense, so the whole section is hidden rather than just the empty
  2027/2028 lists. With 2+ visible cards (2026 plus at least one future
  year), the section is left visible.
- **Resize**: Not used — nothing here depends on viewport size.
- **Breakpoint**: Not used.

## Dependencies

None — plain DOM only.

## DOM Expectations

`[data-component='location-year-filter']` must directly contain 2+
`.w-dyn-list` elements (Webflow's Collection List wrapper), each with
`.w-dyn-item` cards inside, each card containing a
`.location_tagline-wrapper` whose last child `div` is the venue name (the
existing `2026 / - / Tempe Diablo Stadium` row already on every card). Must
also sit inside a `<section>` ancestor (`section_location` in the current
build) — that's the element hidden when only the 2026 card survives.

## Notes

- **Why not fix this natively in Webflow**: confirmed directly in the
  Designer — the 2027/2028 Collection Lists' Filter panel (Source: Themes)
  only offers Themes' own fields (`Current Show`, `Next Year Show`,
  `In 2 Years Show`, plus plain fields) with no way to pick a field on the
  collection a reference points to (e.g. `Next Year Show`'s own `Location`
  field) and no way to compare it against the current page's own `Location`.
  Since venue/location only exists on the **Shows** collection (not on
  Themes), and the reference chain needed is two collections deep from the
  current page, this can't be expressed in Webflow's native filter at all —
  a plain DOM text comparison across the three already-rendered lists is
  the simplest reliable fix.
- **Matches by rendered venue text, not by a CMS ID** — deliberate: there's
  no reference field connecting a 2027/2028 Theme item back to "this page's
  Location" that the browser can read cheaply. The venue name is already
  unique per location and already rendered on every card, so comparing that
  text is the same signal a person reads to confirm "same place," with zero
  extra CMS field's needed.
- **First list is always the reference, never filtered itself** — if a
  future year (e.g. 2029) is added as a 4th `.w-dyn-list` inside the same
  wrapper, it's picked up automatically and filtered the same way as
  2027/2028, no code changes needed.
- If a list ends up with **no matching item** (e.g. a future year's Theme
  for this venue hasn't been created yet in the CMS), every item in that
  list is hidden rather than showing a wrong venue's card. If that leaves
  every other list empty too (only the 2026 card matched anything), the
  whole-section-hide behavior above takes over instead of showing an empty
  future-shows section. Check the browser console for the
  `[location-year-filter] Could not read the 2026 card venue text` warning
  if an entire page's cards disappear — that means the 2026 card's own
  markup changed and the reference venue can't be read at all.
