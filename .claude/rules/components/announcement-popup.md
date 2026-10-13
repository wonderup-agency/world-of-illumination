# announcement-popup

## Purpose

Homepage popup that shows the "Show MESSAGE" announcements (cancellations,
weather closures, notices) set on the **Shows - Ticket Pages** CMS items.
Same banner/ticket-page messages the client already manages, now also
surfaced on the home. A separate component from [`popup`](./popup.md) (the
presale popup), which is left untouched except for the priority rule below.

Shows only when at least one show has the message switch on; otherwise it
stays hidden. Multiple shows with a message → one entry each, in the same
popup. Opens on **every page load** (no sessionStorage), same as `popup`.

## Webflow Setup

Add to the outer wrapper (plain div, direct children: the card + the
overlay), same structure as `popup`:

```
data-component="announcement-popup"
```

- `data-popup="overlay"` on the dimmed-background div (direct child).
- Inside the card, a **Collection List of Shows - Ticket Pages** filtered by
  `Show MESSAGE = On` and `Show MESSAGE TEXT is set`, showing the show name
  and the message text.
- `data-popup="close"` is optional; a "✕" button is auto-created if missing.
- Optional: `data-popup-delay="600"` (ms before opening).
- **No** `data-popup-start-date` / `data-popup-end-date` — this popup is
  driven by the CMS, not by dates.

## Behavior

- **Init**: If the wrapper contains no `.w-dyn-item` (the filtered list
  rendered empty), does nothing — the popup stays hidden by CSS. Otherwise
  wires overlay/close/Esc, and after the delay adds `.is-active`, locks
  scroll (`lenis.stop()` if present) and focuses the close button.
- **Priority over presale**: `popup.js` checks for
  `[data-component='announcement-popup'] .w-dyn-item` at the top and skips
  itself when found, so the presale popup never shows while an announcement
  is active. It's a plain DOM check (no load-order race between the two
  dynamic imports).
- **Resize / Breakpoint**: Not used.

## Dependencies

- `src/styles/announcement-popup.css` — fixed overlay + fade/scale, scoped to
  this component (z-index 1000, above `popup`).
- `src/styles/popup.css` — shared `[data-popup='overlay']` / `close` rules.

## DOM Expectations

`[data-component='announcement-popup']` with a direct-child
`[data-popup="overlay"]`, one card child, and a Webflow Collection List
(`.w-dyn-item`) inside.

## Notes

- Visibility logic lives in the CMS filter, so the client turns the switch
  on/off in the CMS and publishes — no code change.
- Empty-list detection relies on Webflow's `.w-dyn-item` class; the list's
  own "no items" state is irrelevant (never shown, popup doesn't open).
