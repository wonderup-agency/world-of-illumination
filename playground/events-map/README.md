# Tabs Map — Playground

Standalone list / map component built on the **client's real Webflow structure**
(`data-component="tabs-map"`, Client-First classes). Validate the JS + map here
before touching the live site.

```
events-map/
├── index.html   ← the client's DOM + 3 marked additions (data-lat/lng, pill, map)
├── styles.css   ← [A] embed layer (copy to Webflow) + [B] playground-only preview
├── script.js    ← the TabsMap component — copy to a Webflow Embed as-is
└── README.md
```

## Run it

```bash
npx serve playground/events-map
# or
python3 -m http.server 8000 --directory playground/events-map
```

Open the printed URL. The Mapbox token is already in `script.js`.

## The one thing the map needs from the CMS: coordinates

Cards carry `data-lat` / `data-lng`. Everything else (state, logo, image, title,
venue, date, time, price, ticket URL) is **derived from the existing markup**, so
the design stays in Webflow. See the Webflow steps below.

## Test checklist (green before Webflow)

- [ ] List/Map tab switches; pill slides between them
- [ ] State filters work in **both** tabs, stay in sync, and add `.is-active`
- [ ] List groups hide/show on filter
- [ ] Map re-clusters on filter; clusters split on zoom / click
- [ ] Clicking a marker fills + shows the floating card
- [ ] Prev/Next cycles the filtered set
- [ ] Fly-to is smooth; mobile card sits at the bottom (DevTools device mode)
- [ ] No console errors

---

# Moving to Webflow

## 1. CMS — add coordinates

In the Events collection add two **Number** fields: `Latitude`, `Longitude`, and
fill them for every event. (Geocode addresses once — see the Mapbox lookup we used.)

## 2. Collection Item — 2 hidden lat/lng elements

Inside the card (`.cms_ticket-item`) add two text elements, bind each to a CMS
field, give them the global `hide` class, and set the custom attribute:

| Element text (bound to) | class | Custom attribute |
| --- | --- | --- |
| Latitude field | `hide` | `data-tabs-map="item-lat"` |
| Longitude field | `hide` | `data-tabs-map="item-lng"` |

The JS reads the coordinate from each element's text. That's the **only** binding
the map requires — state/logo/image/etc. are read from your existing elements.

## 3. Map View tab — swap the duplicated list for the map

Your `map-view` panel currently holds a copy of the list. Replace that inner
list with (keep the filters bar above it):

```
.tickets-state_map-wrapper
├── div  data-tabs-map="map"                  (the Mapbox canvas mounts here)
└── .tickets-state_map-card  data-tabs-map="map-card"
    ├── .tickets-state_mc-nav
    │   ├── data-tabs-map="mc-prev"   (button)
    │   └── data-tabs-map="mc-next"   (button)
    └── div  data-tabs-map="mc-slot"          (empty — JS clones the card here)
```

The floating card **reuses your own card**: on marker click the JS clones the
selected event's `.cms_ticket-item` into `mc-slot`, so it looks identical to the
list card with zero duplicate markup. You only style the wrapper (position/size)
and the nav buttons; the card itself already carries its Webflow styles.

## 4. Pill (optional)

Add one empty div `data-tabs-map="pill"` as the **first child** of
`.tickets-state_tab-links`. Give it a background + radius in Webflow; JS animates
its position/size. Skip it and the tabs still work.

## 5. Load Mapbox (Site Settings → Custom Code)

**Head:**
```html
<link href="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css" rel="stylesheet" />
```

**Before `</body>`:**
```html
<script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script>
```

## 6. The component

Two options:

- **Quick (Embed):** paste the whole contents of `script.js` inside
  `<script>…</script>` in an Embed on the page (or a Before-`</body>` code block),
  and paste the `[A] embed layer` block from `styles.css` inside `<style>…</style>`.
- **Clean (repo):** register it as a real component
  (`npm run create-component tabs-map`) — its `data-component="tabs-map"` selector
  already matches. The map/marker CSS still goes in the site's custom code (or an
  imported `.css`), since it targets runtime-created elements.

## 7. Class defaults to set in Webflow

- `.tickets-state_tab-item` → **Hidden** by default; style `.is-active` visible
  (the embed CSS also enforces this, so it works even if you forget).
- `.tickets-state_tab-link` / `.tickets-state_state-item` → style the `.is-active`
  combo class (colours only — the JS just toggles the class).
