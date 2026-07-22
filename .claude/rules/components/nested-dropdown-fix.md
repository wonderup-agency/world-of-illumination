# nested-dropdown-fix

## Purpose

Works around a native Webflow bug: a `.w-dropdown` set to open on hover
(`data-hover="true"`) that contains another `.w-dropdown` **nested inside its
list** (e.g. a "Locations" mega-menu whose items each expand their own
flyout) closes itself prematurely. Confirmed via testing: leaving ANY nested
dropdown item (e.g. a CMS-rendered `.nav_subdropdown` row) triggers Webflow's
own close routine on the outer dropdown too, regardless of where the pointer
goes next — even though the pointer never actually left the outer wrapper.
Webflow doesn't officially support nested dropdowns, so this only affects
wrappers that contain one — plain single-level dropdowns are unaffected and
don't need this component.

## Webflow Setup

Add to the **outer** `.w-dropdown` wrapper only (the one that already has
Webflow's own `data-hover="true"` / `data-delay="…"`, and that contains a
nested `.w-dropdown` somewhere inside its list):

```
data-component="nested-dropdown-fix"
```

Do not add this to dropdowns that don't contain a nested dropdown — they
already work correctly natively.

## Behavior

- **Init**: Gated behind `gsap.matchMedia('(hover: hover) and (pointer: fine)')`
  (desktop mouse only — this bug doesn't apply on touch). For each wrapper,
  tracks real hover state with its own `mouseenter`/`mouseleave` on the outer
  element only — these never fire on transitions between the wrapper's own
  children, only on genuine entry/exit of the whole subtree, so it stays
  accurate regardless of which nested item triggers Webflow's faulty close.
  While the pointer is genuinely inside, a `requestAnimationFrame` loop
  forcibly re-asserts the open state every frame (`aria-expanded="true"`,
  `w--open` class on the toggle and list, `display` cleared, `opacity: 1`).
  Webflow's own close runs as its own rAF loop that keeps decrementing
  opacity every frame once triggered — a single reactive "reopen" isn't
  enough to stop it (it keeps fighting back to 0 afterward), so this
  continuously corrects the state every frame instead of reacting once. Any
  attempt Webflow makes to close it gets corrected within one frame
  (imperceptible). The moment the pointer genuinely leaves the whole wrapper,
  this steps aside completely — no custom close logic — and lets Webflow's
  own native close run untouched, whatever that looks like.
- **Resize**: Not used — `gsap.matchMedia()` reverts/removes listeners and
  cancels the rAF loop automatically on breakpoint/query change.
- **Breakpoint**: Not used — handled by `gsap.matchMedia()`.

## Dependencies

- `gsap` — core (`gsap.matchMedia`).

## DOM Expectations

Elements matching `[data-component='nested-dropdown-fix']` must be a
`.w-dropdown` containing (at any depth) a `.w-dropdown-toggle` and a
`.w-dropdown-list` — i.e. Webflow's own dropdown widget structure. No custom
markup required beyond the attribute itself.

## Notes

- Currently used on the **Locations** nav dropdown, the only one on the site
  with nested `.nav_subdropdown` flyouts per item (CMS-rendered).
- If a future dropdown is built with the same nested-dropdown pattern, add
  the same attribute to its outer wrapper — no code changes needed.
- Deliberately doesn't touch the close transition at all (an earlier version
  tried to take over the close fade too, to make it consistent across every
  exit path — dropped by request: Webflow's own native close, however it
  looks per exit path, is preferred over a custom animation here).
- Diagnosed by attaching a temporary `MutationObserver`/timeline logger
  directly in the browser console and reproducing the bug — confirmed
  Webflow decrementing the list's inline `opacity` every frame down to 0 and
  flipping the toggle's `aria-expanded` to `false`, immediately after leaving
  a nested `.nav_subdropdown` item, regardless of where the pointer went
  next.
