# location-map

## Purpose

Single-location Mapbox map — a stripped-down sibling of `tabs-map`. No tabs, no
filters, no clusters, no floating card: just one map centered on one location
with one marker. Reuses the tabs-map visual language (dark-v11 style, circular
marker, rounded map container, hidden Mapbox attribution/logo).

## Webflow Setup

Add to the map wrapper:

```
data-component="location-map"
data-map-lat="35.1495"
data-map-lng="-90.0490"
```

Optional roles/classes inside the wrapper:

| Selector | Purpose |
| --- | --- |
| `[data-map="map"]` | empty div where Mapbox mounts (falls back to the wrapper itself if absent) |
| `.location_logo` | `<img>` used as the circular marker face (optional — plain pin if missing) |

Coordinates are the only required binding. They can sit on the wrapper or on
any child element carrying `data-map-lat` / `data-map-lng`.

Load Mapbox GL JS globally via CDN in Webflow (it is not bundled):

```html
<!-- Head -->
<link href="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css" rel="stylesheet" />
<!-- Before </body> -->
<script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script>
```

## Behavior

- **Init**: Reads `data-map-lat` / `data-map-lng`, creates a Mapbox map centered
  on that point (`ZOOM = 12`, `minZoom = 3`) with a NavigationControl (no
  compass). On the map's `load` event, adds one marker — a circular image
  marker if a `.location_logo` is present, otherwise a plain pin.
- **Resize**: Uses the main.js `resize` hook — calls `map.resize()` so the map
  stays sized to its container.
- **Breakpoint**: Not used.

## Dependencies

- `window.mapboxgl` (Mapbox GL JS v3, global via CDN — not bundled).
- `../styles/location-map.css` — structural CSS for the map container shell, the
  marker/pin, and Mapbox overrides.

## DOM Expectations

- Wrapper: `[data-component='location-map']` with `data-map-lat` /
  `data-map-lng` (on it or a child).
- Optional `[data-map="map"]` mount point inside the wrapper.
- Optional `.location_logo` `<img>` for the marker face.

## Testing

Standalone playground at `playground/location-map/` — open with a local server
(`npx serve playground/location-map`). Same structure, attributes and logic as
this component.
