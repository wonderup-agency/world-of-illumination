# redeem-modal

## Purpose

Redemption page: each show card's "REDEEM VOUCHER" button opens a modal with
that show's TickX redemption calendar. The widget/config IDs come from the
**Shows** CMS field `Redemption Embed` (one field, full TickX snippet pasted
as-is — same idea as `Ticket Embed` on Shows - Ticket Pages).

## Webflow Setup

On the wrapper around the Collection List (`redeem_component`):

```
data-component="redeem-modal"
```

Inside each Collection Item:

| Attribute | On | Purpose |
| --- | --- | --- |
| `data-redeem="embed"` | hidden Text Block bound to **Redemption Embed** | source of widgetId/configId |
| `data-redeem="trigger"` (optional) | the button | falls back to `.redeem-voucher` if absent |
| `data-redeem-slug` (optional) | the item or any child, bound to **Shows › Slug** | enables the `?show=` deep link below |

The modal itself is created by JS — no markup in Webflow.

## Behavior

- **Init**: For each `.w-dyn-item`, reads `widgetId` / `configId` from the
  embed text with a regex. No IDs → the item's button is hidden.
- **Click**: Listener on `window` (capture) so `global.js`'s anchor handler
  can't swallow the `href="#"` click. Creates a fresh `#redeem-widget-N` div
  in the modal and calls `tx({ widgetId, configId, selector, locale })`.
- **Deep link**: `/redemption?show=<show-slug>` opens that show's modal right
  after init (used by the mobile nav, see [`redeem-link`](./redeem-link.md)).
  Matches the param against each item's `data-redeem-slug`. No param, an
  unknown slug or a show without redemption IDs → nothing happens, the page
  loads as before. Param name: `SHOW_PARAM` (`show`).
- **TickX loader**: if `window.tx` doesn't exist (global head script not
  installed), defines the `tx` queue and injects `box-office.js` once.
- **Layout**: header bar ("Redeem Voucher" + ✕) stays fixed while the
  calendar scrolls below it. z-index `10000`, above the fixed navbar
  (`.nav_component`, 9999) — at 1001 the navbar covered the ✕ on mobile.
  Mobile (≤767px): full-screen sheet, no rounded corners.
- **Chat**: hides the Zendesk launcher (`zE('messenger', 'hide')`) while
  open and shows it again on close; it covered the calendar on mobile.
  No-op if Zendesk isn't on the page.
- **Close**: ✕, overlay click or Esc. Restores scroll (`lenis.start()`),
  clears the widget, returns focus.
- **Resize / Breakpoint**: Not used.

## Dependencies

- TickX `box-office.js` (global via head, or lazy-loaded by this component).
- `src/styles/redeem-modal.css` — fixed overlay, card, close button, mobile
  padding.

## DOM Expectations

`[data-component='redeem-modal']` containing `.w-dyn-item`s, each with a
`[data-redeem="embed"]` element and a `.redeem-voucher` / `[data-redeem="trigger"]`.

## Notes

- The calendar itself is TickX's own iframe and can't be resized from here
  (scaling it would make the days hard to tap). The "Enter Text Here" button
  under it comes from the TickX widget config, not from this component.

- One modal for all cards avoids TickX's repeated `#tickx-widget` id.
- The pasted snippet's own `selector: '#tickx-widget'` is ignored — only the
  two IDs are read. The `<script>` inside the CMS text never runs (it's
  rendered as plain text in a hidden element).
- Card background uses the Webflow variable `--base--blue-800` (Base/blue
  800), close button in white. Change it in `redeem-modal.css`, always with a
  project variable, not a hardcoded hex.
