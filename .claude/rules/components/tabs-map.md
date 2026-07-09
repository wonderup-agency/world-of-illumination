# tabs-map

## Purpose

Airbnb-style list / map component. One tab renders the CMS Collection List
grouped by state; the other renders an interactive Mapbox map with clustering.
State filters apply to both views; selecting a marker flies to it and shows a
floating card that is a clone of the event's own list card. Built on the
client's existing `tickets-state_*` / `location_*` Client-First markup so the
visual design stays entirely in Webflow.

## Webflow Setup

Add to the component wrapper:

```
data-component="tabs-map"
```

Required `data-tabs-map` roles inside the wrapper:

| Value | On | Purpose |
| --- | --- | --- |
| `tab-link` | the two view buttons | List / Map toggle (paired to panels by order) |
| `pill` | empty div, first child of `.tickets-state_tab-links` | JS-animated active-tab highlight (optional) |
| `list-view` / `map-view` | the two `.tickets-state_tab-item` panels | tab panels |
| `filter-all` | "All States" button | reset filter |
| `state` | each state filter item | per-state filter (key = its text, slugified) |
| `item-lat` / `item-lng` | hidden text elements inside each card | coordinates, bound to the CMS Lat/Lng fields |
| `map` | empty div inside `.tickets-state_map-wrapper` | Mapbox mounts here |
| `map-card` | floating card wrapper | detail panel (JS toggles `.is-active`) |
| `mc-slot` | empty div inside the map-card | JS clones the selected `.cms_ticket-item` here |
| `mc-prev` / `mc-next` | buttons | cycle the filtered set |

Coordinates are the only CMS binding: add two Number fields (Latitude,
Longitude) and bind them to the hidden `item-lat` / `item-lng` elements. State,
logo, title and price are read from the existing card markup.

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
  `item-lat`/`item-lng` elements), wires the tab toggle, filters and nav, then
  activates the List tab. The Mapbox map is created lazily on the first switch
  to the Map tab.
- **Resize**: Uses the main.js `resize` hook — repositions the pill and calls
  `map.resize()`.
- **Breakpoint**: Not used.
- **Clustering**: Clustered GeoJSON source + a transparent hitbox layer;
  unclustered points are rendered as HTML image markers (the event logo) and
  clusters as HTML bubbles, synced on the map's `render` event. Filtering calls
  `source.setData()` so clusters recompute for the visible subset.

## Dependencies

- `window.mapboxgl` (Mapbox GL JS v3, global via CDN — not bundled).
- `./tabs-map.css` — structural CSS for markers, clusters, tab/panel toggling,
  the pill motion and Mapbox overrides.

## DOM Expectations

- Wrapper: `[data-component='tabs-map']`.
- A `.tickets-state_tab-item[data-tabs-map='list-view']` containing a Collection
  List of `.tickets-state_item` groups (each with an `<h3>` state name) and
  `.cms_ticket-item` cards.
- Each card: hidden `[data-tabs-map='item-lat']` / `[data-tabs-map='item-lng']`
  text elements; `.location_logo`, `.location_text-wrapper`, `.price-wrapper`
  are read for the marker/floating card.
- A `.tickets-state_tab-item[data-tabs-map='map-view']` containing
  `[data-tabs-map='map']` and the `[data-tabs-map='map-card']` floating card.

## Testing

Standalone playground at `playground/events-map/` — open with a local server
(`npx serve playground/events-map`). Same structure, attributes and logic as
this component, with dummy cards and real coordinates.
