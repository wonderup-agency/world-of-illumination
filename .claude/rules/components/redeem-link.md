# redeem-link

## Purpose

Mobile nav "Tickets" dropdown (WOI-68): each city that offers voucher
redemption shows a REDEEM VOUCHER button that should open **that city's**
redemption calendar, not the generic /redemption list. Webflow can't build a
link from a fixed path plus a CMS field, so the button links to plain
`/redemption` in Webflow and this component appends `?show=<show-slug>`.
[`redeem-modal`](./redeem-modal.md) reads that param on /redemption and opens
the matching show's modal on load.

## Webflow Setup

On the wrapper around the Collection List (the "Tickets Mobile" nav
dropdown):

```
data-component="redeem-link"
```

Inside each Collection Item (Shows), on the element that wraps the city's
buttons (the `nav_subdropdown` "City WITH voucher"):

| Attribute | Value | Purpose |
| --- | --- | --- |
| `data-redeem-show` | bound to **Shows › Slug** | slug added to the link |

The REDEEM VOUCHER button inside it links to `/redemption` (URL).

## Behavior

- **Init**: For each `[data-redeem-show]` inside the wrapper, finds links
  whose path is `/redemption` (trailing slash tolerated) and sets
  `?show=<slug>`, keeping any other query params. Empty slug → link left as
  plain `/redemption`. Other links (BUY TICKETS) are untouched.
- **Resize / Breakpoint**: Not used.

## Dependencies

None. The param name (`show`) must match `SHOW_PARAM` in `redeem-modal.js`.

## DOM Expectations

`[data-component='redeem-link']` containing `[data-redeem-show]` elements,
each with an `a[href="/redemption"]` inside.

## Notes

- The Shows slug is set as an attribute binding in the Designer: the Webflow
  MCP can't bind CMS fields inside a Collection List that lives inside a
  component (the navbar), same limitation noted in `faq-search.md`.
- Runs on every page (the navbar is global) but only touches the links above.
