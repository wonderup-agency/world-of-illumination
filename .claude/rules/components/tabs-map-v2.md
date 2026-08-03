# tabs-map-v2

## Purpose

WIP fork of [`tabs-map`](./tabs-map.md) for the tickets-v2 redesign, tested in
parallel on its own `data-component` name so the live `/tickets` page (still
running the original `tabs-map`) keeps working untouched. Once tickets-v2
replaces the original page, this can be renamed back to `tabs-map` (and the
old file retired) — or kept as a permanent name, whichever Tadeo decides.

Airbnb-style list / map component. One tab renders a **flat** CMS Collection
List of every show (no per-state grouping); the other renders an interactive
Mapbox map with clustering. A separate filter pill list narrows both views by
state, matched via a hidden state **code** on each card (not the visible state
name) so cards and pills stay in sync regardless of label text. Selecting a
marker flies to it and shows a floating card that is a clone of the event's
own list card. Built on the client's existing `tickets-state_*` / `location_*`
Client-First markup so the visual design stays entirely in Webflow.

## Webflow Setup

Add to the component wrapper:

```
data-component="tabs-map-v2"
```

Required `data-tabs-map` roles inside the wrapper:

| Value | On | Purpose |
| --- | --- | --- |
| `tab-link` | the two view buttons | List / Map toggle (paired to panels by order) |
| `pill` | empty div, first child of `.tickets-state_tab-links` | JS-animated active-tab highlight (optional) |
| `list-view` / `map-view` | the two `.tickets-state_tab-item` panels | tab panels |
| `filter-all` | "All States" button | reset filter |
| `state` | each state filter item | per-state filter button |
| `state-code` | hidden text element inside each `state` filter item | the filter's own State Code, bound to the States collection — matched against `item-state` below |
| `item-lat` / `item-lng` | hidden text elements inside each card | coordinates, bound to the CMS Lat/Lng fields |
| `item-state` | hidden text element inside each card | the show's State Code (e.g. "TN"), bound to the CMS State field |
| `map` | empty div inside `.tickets-state_map-wrapper` | Mapbox mounts here |
| `map-card` | floating card wrapper | detail panel (JS toggles `.is-active`) |
| `mc-slot` | empty div inside the map-card | JS clones the selected `.cms_ticket-item` here |
| `mc-prev` / `mc-next` | buttons | cycle the filtered set |

The **List View** Collection List is bound directly to the Shows/Tickets
collection — no outer grouping collection, no `<h3>` per state. Every card
sits flat under the same list; the state pills are the only way to narrow by
state.

Coordinates + state code are the CMS bindings needed on each card: two Number
fields (Latitude, Longitude) bound to `item-lat` / `item-lng`, plus the show's
State field bound to `item-state` (its Code, e.g. "TN" — if State is a
Reference field, bind the referenced item's Code sub-field). Logo, title and
price are read from the existing card markup.

The filter pills (`tickets-state_state-list-wrapper`, in both List View and Map
View — two separate Collection List elements even though both point at the
States collection) each need the same `state-code` hidden binding added to
their item template, so pill clicks compare against the same code the cards
carry, not against the visible state name.

The map reads its data from the **List View** collection only; the Map View
panel holds just the map + floating card (no duplicate list).

Load Mapbox GL JS globally via CDN in Webflow (it is not bundled):

```html
<!-- Head -->
<link href="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css" rel="stylesheet" />
<!-- Before </body> -->
<script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script>
```

## Behavior

- **Init**: Parses the List View cards into data (coords from the hidden
  `item-lat`/`item-lng` elements, state from the hidden `item-state` code),
  wires the tab toggle, filters and nav, then activates the List tab. The
  Mapbox map is created lazily on the first switch to the Map tab.
- **Resize**: Uses the main.js `resize` hook — repositions the pill and calls
  `map.resize()`.
- **Breakpoint**: Not used.
- **Filtering**: Since the list is flat, filtering toggles `.is-hidden`
  directly on each `.cms_ticket-item` card (not a group wrapper). Pill clicks
  and the active-pill highlight both compare the pill's hidden `state-code`
  against each card's `item-state`, lowercased via the same `slug()` helper —
  matching codes ("TN" vs "TN"), not names ("Tennessee" vs "TN").
- **Clustering**: Clustered GeoJSON source + a transparent hitbox layer;
  unclustered points are rendered as HTML image markers (the event logo) and
  clusters as HTML bubbles, synced on the map's `render` event. Filtering calls
  `source.setData()` so clusters recompute for the visible subset.
- **Responsive height**: `[data-tabs-map='map']` height is driven by
  `aspect-ratio: 4 / 3` on its own rendered width (capped at
  `min(78vh, 42.5rem)`) on tablet/desktop, so it stays proportionate at any
  container width instead of being forced toward the same absolute height as
  a full-width desktop layout. On mobile (≤767px) that's overridden with a
  flat `height: 300px` — a plain fixed number, not relative to width/viewport,
  so the box is always small there regardless of device quirks.

## Dependencies

- `window.mapboxgl` (Mapbox GL JS v3, global via CDN — not bundled).
- `./tabs-map-v2.css` — structural CSS for markers, clusters, tab/panel
  toggling, the pill motion and Mapbox overrides.

## DOM Expectations

- Wrapper: `[data-component='tabs-map-v2']`.
- A `.tickets-state_tab-item[data-tabs-map='list-view']` containing a single,
  flat Collection List of `.cms_ticket-item` cards (no per-state grouping
  wrapper, no `<h3>`).
- Each card: hidden `[data-tabs-map='item-lat']` / `[data-tabs-map='item-lng']`
  / `[data-tabs-map='item-state']` text elements; `.location_logo`,
  `.location_text-wrapper`, `.price-wrapper` are read for the marker/floating
  card.
- Each filter pill (`[data-tabs-map='state']`): hidden
  `[data-tabs-map='state-code']` text element bound to the same States
  collection's Code field.
- A `.tickets-state_tab-item[data-tabs-map='map-view']` containing
  `[data-tabs-map='map']` and the `[data-tabs-map='map-card']` floating card.

## Testing

No dedicated standalone playground yet — `playground/events-map/` still
reflects the original `tabs-map` (grouped-by-state) structure. Test this
component live on the `/wip/tickets-v2` Webflow page via Preview mode or the
local dev server.