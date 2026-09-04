# popup

## Purpose

A promotional popup/modal that appears over the whole page shortly after
load, with a dimmed background, a close button, and free-form content
(heading, text, a "buy tickets" button, etc.) styled entirely in Webflow.
Shows on every page load — closing it and reloading (or revisiting) brings it
back every time. No frequency capping (no sessionStorage/localStorage) —
deliberate choice, see Notes.

## Webflow Setup

Add to the outer wrapper (a plain `div`, not a normal in-flow `section` — see
Notes for why the scaffold used by regular content sections doesn't apply
here):

```
data-component="popup"
```

Required `data-popup` role inside the wrapper:

| Value | On | Purpose |
| --- | --- | --- |
| `overlay` | a plain div, direct child of the wrapper | dimmed background; clicking it closes the popup |

Optional:

| Value | On | Purpose |
| --- | --- | --- |
| `close` | a close button/element | closes the popup on click. **No need to add this in Webflow** — if none exists, `popup.js` creates a plain "✕" `<button>` itself (top-right corner, via `popup.css`) inside the card. Only add one manually if the design needs a custom-styled close icon/text instead; more than one is fine (e.g. a visible X plus a "No thanks" text link) — all get wired up. |

Everything else inside the wrapper (the card, heading, description, the
"Get Tickets" button, etc.) is free-form — style and structure it however
the design needs. The card doesn't need a specific class name: `popup.css`
styles it as "whichever direct child of the wrapper isn't the overlay,"
so any name works. Example, matching the current WIP structure:

```html
<div data-component="popup" class="pop-up-wrapper">
  <div class="pop_up-card">
    <!-- no data-popup="close" element here — popup.js adds its own ✕ button -->
    <div class="text-wrapper">
      <div class="component-rich-text w-richtext">
        <h2><strong>presale live now</strong></h2>
      </div>
      <div class="description-wrapper">
        <div class="text-style-wrap-balance">Get your tickets!</div>
        <div data-component="elastic-pulse-button" data-elastic-pulse-btn class="button">
          <a href="/tickets" class="item-link w-inline-block"></a>
          <div data-elastic-pulse-target class="button_main-content">
            <div class="button_main-content-text">
              <span class="elastic-pulse-btn__span">GET TICKETS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div data-popup="overlay"></div>
</div>
```

Note `data-component="popup"` and `data-popup="overlay"` both sit on direct
children of the same wrapper as the card — the overlay must be a sibling of
the card, not a parent or a child of it.

Optional attributes on the wrapper:

- `data-popup-delay="600"` — milliseconds to wait after the component loads
  before showing the popup (default `600`, see `DEFAULT_DELAY`).
- `data-popup-start-date="2026-09-04"` / `data-popup-end-date="2026-09-13"` —
  date window (both optional, independent — set one, both, or neither). Format
  is always `YYYY-MM-DD`. Outside the window the popup doesn't show at all
  (not even the overlay/close button get set up) — same as if the component
  weren't on the page. Leave both empty/absent for the original
  always-on behavior. The end date counts through 23:59:59 of that day, not
  just its midnight — see Notes.

## Behavior

- **Init**: If `data-popup-start-date`/`data-popup-end-date` are set and
  "now" falls outside that window, the component does nothing at all for
  that instance — no overlay/close-button setup, no listeners, no popup —
  same as if `data-component="popup"` weren't there. With both empty/absent,
  this check always passes (original always-on behavior). Otherwise, strips
  a `hide` class off `[data-popup="overlay"]` if present (see
  Notes — Designer-only escape hatch, not needed on the live site), then makes
  sure a close trigger exists: if no `[data-popup="close"]` element is found,
  it creates a `<button>` one itself and appends it to the card (whichever
  direct child of the wrapper isn't the overlay). Then, after
  `data-popup-delay` ms, it adds `.is-active` to the wrapper (fades/scales it
  in via `popup.css`), locks background scrolling
  (`document.body.style.overflow = 'hidden'`, plus `window.lenis?.stop()` if
  Lenis is running on the page), and moves focus to the first close element.
  Runs the same way on every page load — nothing is remembered between loads.
- **Closing**: Clicking any `[data-popup="close"]` element, clicking the
  `[data-popup="overlay"]`, or pressing <kbd>Esc</kbd> all close the popup —
  removes `.is-active`, restores background scrolling
  (`window.lenis?.start()` if present), and returns focus to whatever was
  focused before the popup opened.
- **Resize**: Not used.
- **Breakpoint**: Not used.

## Dependencies

- `src/styles/popup.css` — the fixed overlay, dimmed background, and
  fade/scale-in transition. No animation library — plain CSS transitions
  triggered by the `.is-active` class toggle (same approach as
  [`footer`](./footer.md)/[`image-grow`](./image-grow.md), not a GSAP tween),
  since a simple show/hide fade doesn't need one.
- `window.lenis` (optional, global — see [`ARCHITECTURE.md`](../ARCHITECTURE.md)) —
  paused while the popup is open so the page can't be scrolled behind it,
  resumed on close. Falls back gracefully (plain `body` overflow lock only)
  on pages where Lenis isn't running (reduced motion, Finsweet pagination
  pages).

## DOM Expectations

Elements matching `[data-component='popup']` must contain:

- `[data-popup="overlay"]` — dimmed background layer
- one other direct child element — the card. `[data-popup="close"]` is
  optional; a plain `<button>` is auto-created inside the card if none
  exists.

## Notes

- **If you need to hide the overlay while editing in the Webflow Designer
  canvas** (custom code and the bundled CSS don't run there, so the overlay
  would otherwise render as a plain solid black box over the canvas), add
  Webflow's `hide` combo class to the `[data-popup="overlay"]` element. On
  the published site, `popup.js` strips that class automatically on init, so
  the overlay's real show/hide is driven only by the wrapper's `.is-active`
  toggle (opacity/visibility), same as everywhere else in this component. Do
  **not** rely on removing `hide` by hand before publishing — it's easy to
  forget and was the cause of the overlay never darkening in production.
- **The close button is created by JS, not built in Webflow**: keeps the
  Webflow setup down to two things (the `data-component` attribute and the
  `overlay` div) instead of three, and can't be forgotten/mis-nested by hand.
  `popup.css`'s `[data-popup='close']` positioning rule (top-right corner) and
  its `button[data-popup='close']` reset both work identically whether the
  button came from JS or was hand-built in Webflow, so switching to a custom
  one later is a drop-in replacement — add a `[data-popup="close"]` element
  anywhere in the card and `popup.js` uses it instead of generating its own.
- **Why this isn't a normal Webflow "section"**: the usual content-section
  scaffold (`Spacer / Section` + `padding-global` + `container-large`) exists
  to space out and constrain things that sit *in the page's normal scroll
  flow*. This component is the opposite — `position: fixed; inset: 0` in
  `popup.css` takes it out of flow entirely and overlays the whole viewport,
  so those wrappers only add unwanted height/margins and should be removed
  from the WIP structure rather than kept "just in case." The card's own
  max-width/centering is handled by `popup.css` (targeting "whichever direct
  child of `[data-component='popup']` isn't `[data-popup='overlay']`"), not
  by `container-large`.
- **Shows on every page load, on purpose — no frequency capping**: an earlier
  version used `sessionStorage` to show it only once per browser tab. Changed
  by explicit request (2026-09-03): the popup should appear every time the
  page is reloaded or revisited, not just the first time in a tab. If a
  future request wants it capped again (once per visit, or once per N days),
  that's a `sessionStorage`/`localStorage` check added back at the top of the
  default export — ask before making that change, since it's a real behavior
  change, not just an implementation detail.
- `DEFAULT_DELAY` is a tunable constant at the top of `popup.js`.
- **Card has `max-height: calc(100vh - 2rem)` + `overflow-y: auto`** (matching
  the wrapper's `1rem` padding on top and bottom): a safety net for short
  viewports (landscape mobile, small/older phones). Without it, a card whose
  content is taller than the screen would get clipped top/bottom with no way
  to reach the cut-off part, since background scroll is locked while the
  popup is open. With it, the card scrolls internally instead. Doesn't affect
  normal desktop/mobile-portrait sizes where the card is already shorter than
  the viewport.
- **Card width**: `popup.css`'s `width: 100%; max-width: 40rem` on the
  `:not([data-popup='overlay'])` selector wins over any width/max-width set
  directly on the card's own Webflow class (e.g. `.pop_up-card`) — two
  attribute selectors outrank one class selector in CSS specificity. Change
  the width here, not in Webflow, if it ever needs to be different; a
  Designer-side width/max-width change on the card class will have no visible
  effect.
- **Date window parsing (`parseLocalDate`)**: `data-popup-start-date`/
  `data-popup-end-date` are parsed as a *local* date (midnight in the
  visitor's own timezone) via manual `YYYY-MM-DD` splitting — deliberately
  not `new Date("YYYY-MM-DD")`, which the JS spec parses as UTC midnight and
  would silently shift the cutoff by several hours depending on the
  visitor's timezone (this project's shows tour multiple US states/
  timezones). A malformed or partial value (wrong format, typo) parses to
  `null` and is treated as "no limit" on that side rather than crashing or
  permanently hiding the popup. The end date's comparison is built up to
  `23:59:59.999` of that day so the last day is fully included, not cut off
  at its midnight.
- **Component is a Webflow Component now**: added 2026-09-04. Custom
  attributes (including the two date ones above and `data-popup-delay`) are
  set the same way as on any element — inside the component definition, or
  bound to a Text-type component property so each instance can have its own
  value without entering "Edit component" mode. Ask before restructuring
  the component's props — that's a Designer-side decision, not something
  this file drives.
