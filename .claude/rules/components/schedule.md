# schedule

## Purpose

Shows a wrapper only during a date window and hides it the rest of the
time, with no publish needed at the start or end. Built for the Black
Friday ribbons (WOI-72) on the Shows and Ticket Pages templates, reusable
for any timed banner, ribbon or section.

## Webflow Setup

On a plain div wrapping whatever should be timed (e.g. an
`Element / Marquee` instance):

```
data-component="schedule"
data-schedule-start="2026-11-27T00:00:00-07:00"
data-schedule-end="2026-12-01T00:00:00-07:00"
```

Both dates are optional and independent. Two formats:

- `YYYY-MM-DD` — midnight in the **visitor's** timezone. A date-only end
  includes that whole day.
- Date-time with an explicit offset (`-07:00` = Arizona, all year) or `Z` —
  the same exact instant for every visitor. Use this when the client says
  "midnight" in a specific timezone. The end is exclusive.

A value in any other format is ignored (treated as "no limit" on that
side). Per-page exclusions (e.g. Memphis) are Webflow conditional
visibility on the same wrapper, not part of this component.

## Behavior

- **Init**: Resolves the window (`src/utils/date-window.js`). Inside it,
  adds `.is-scheduled`, which un-hides the wrapper, and fires a `resize`
  event so components inside it that measured a hidden 0px box (e.g.
  `marquee`) re-fill now that it's visible. Outside it, stays hidden.
- **Live switch**: if the page is open when a boundary passes (start or
  end within 24h), a timer re-checks 1s after it and shows/hides the
  wrapper.
- **Preview**: `?preview-date=<date>` in the page URL (same formats) replaces
  "now", e.g. `?preview-date=2026-11-28` to see the ribbon before the sale.
- **Resize / Breakpoint**: Not used.

## Dependencies

- `src/utils/date-window.js` — date parsing, window check, preview param
  (shared with [`popup`](./popup.md)).
- `src/styles/schedule.css` — hides `[data-component='schedule']` until
  `.is-scheduled` is set, so nothing flashes before the JS runs.

## DOM Expectations

Elements matching `[data-component='schedule']`. Any content inside.

## Notes

- Hidden by default in CSS, so if the JS fails the wrapper stays hidden
  (fails closed). The Designer canvas doesn't run the bundled CSS, so the
  wrapper is always visible there.
- Timezone is decided by the attribute, not the visitor: with `-07:00`,
  a visitor in Georgia sees it switch at 2am their time.
- The `resize` it dispatches goes through `main.js`'s debounced resize
  hooks, so it's cheap and every component with a `resize` hook re-checks.
  `marquee` only rebuilds when its width actually changed (0 → real).
