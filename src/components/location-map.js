/*
Component: location-map
Webflow attribute: data-component="location-map"

Single-location Mapbox map — a stripped-down sibling of tabs-map. No tabs, no
filters, no clusters, no floating card: just one map centered on one location
with one marker. Coordinates come from data-map-lat / data-map-lng attributes
on the wrapper (or any child carrying them).

Marker, in priority order: a custom pin image (a hidden <img data-map-marker>,
same CMS binding as tabs-map) → the .location_logo as a circular face → a plain
pin. A reset-view button restores the default centre/zoom.

Mapbox GL JS must be loaded globally via CDN in Webflow (window.mapboxgl) — it
is NOT bundled here. See .claude/rules/components/location-map.md.
*/

import '../styles/location-map.css'
import config from '../config.js'

const MAPBOX_TOKEN = config.mapboxToken
const MAPBOX_STYLE = config.mapboxStyle

// Default zoom when the map centers on the single location. Also the zoom the
// reset button returns to.
const ZOOM = 12

/*
Where a custom pin image sits relative to its coordinate. 'bottom' assumes a
pin/teardrop graphic whose tip should land exactly on the point. Switch to
'center' if the artwork is a badge or logo meant to be centred on it instead.
Default logo markers stay centred either way. Kept in sync with tabs-map.js.
*/
const CUSTOM_MARKER_ANCHOR = 'bottom'

/*
Rendered width of a custom pin. Must stay in sync with --lm-marker-width in
location-map.css: it's passed as the <img sizes> value so the browser picks the
smallest srcset variant instead of the 2600px original (Webflow's CMS images
ship sizes="100vw", which would otherwise download a full-size photo to draw a
~56px pin). SVG pins have no srcset and ignore this entirely.
*/
const CUSTOM_MARKER_WIDTH = '56px'

/*
Optional custom pin: a hidden <img data-map-marker> (kept out of sight with the
`hide` class). Returns an empty src when the CMS image field is empty, in which
case the marker falls back to the logo face. Same two guards as tabs-map.js:

  - `.w-dyn-bind-empty` — with an empty CMS image field Webflow still renders
    the <img>, pointing at its own placeholder.svg and flagged with this class.
    Without the check an unset field would render the Webflow placeholder as the
    pin. A `/plugins/Basic/assets/placeholder` src is treated the same way, in
    case the class ever changes.
  - the src ATTRIBUTE (not img.src) — an <img> with an empty src resolves .src
    to the page URL, which would read as a valid image and render a broken pin.
*/
/*
Where to look for that custom pin. In Webflow it's very easy to drop the hidden
marker <img> just OUTSIDE the map wrapper (a sibling inside the same section
wrapper), in which case a wrapper-only lookup silently falls back to the plain
pin. So: check the wrapper first, then walk up the ancestors and use the first
one that holds a [data-map-marker] — but stop as soon as an ancestor contains
more than one location-map, so a CMS list of maps can never borrow a
neighbour's pin. Returns null when there's no unambiguous scope.
*/
const markerScope = (wrapper) => {
  if (wrapper.querySelector('[data-map-marker]')) return wrapper

  let node = wrapper.parentElement
  while (node) {
    if (node.querySelectorAll("[data-component='location-map']").length > 1) {
      return null
    }
    if (node.querySelector('[data-map-marker]')) return node
    node = node.parentElement
  }
  return null
}

const markerImage = (scope) => {
  const none = { src: '', srcset: '' }
  const el = scope?.querySelector('[data-map-marker]')
  if (!el) return none
  const img = el.tagName === 'IMG' ? el : el.querySelector('img')
  if (!img || img.classList.contains('w-dyn-bind-empty')) return none
  const src = img.getAttribute('src') || ''
  if (src.includes('/plugins/Basic/assets/placeholder')) return none
  return { src, srcset: img.getAttribute('srcset') || '' }
}

class LocationMap {
  constructor(wrapper) {
    this.wrapper = wrapper
    this.mapContainer = wrapper.querySelector('[data-map="map"]') || wrapper

    // Coordinates come from data attributes (on the wrapper or a child).
    const source = wrapper.querySelector('[data-map-lat]') || wrapper
    this.lat = parseFloat(source.getAttribute('data-map-lat'))
    this.lng = parseFloat(source.getAttribute('data-map-lng'))

    if (Number.isNaN(this.lat) || Number.isNaN(this.lng)) {
      console.warn(
        '[location-map] Missing/invalid data-map-lat / data-map-lng.'
      )
      return
    }

    // Optional marker face: reuse a venue/event logo if present.
    this.logo = wrapper.querySelector('.location_logo')?.src || ''
    // Optional custom pin image — takes precedence over the logo face.
    this.pin = markerImage(markerScope(wrapper))

    this.setupLocationCard()

    this.map = null
    this.initMap()
  }

  /*
  Optional `.direction-card` (a floating address card rendered over the map in
  Webflow — the class name is Webflow's and predates this behaviour) becomes a
  "see this place on Google Maps" trigger: clicking/tapping it opens Google
  Maps centred on this.lat/this.lng, with the pin dropped and the place panel
  open, but WITHOUT starting navigation.

  `google.com/maps/search/?api=1&query=lat,lng` is the URL for that. Note the
  deliberate choice of `search` over the `dir` (directions) endpoint this
  shipped with first — `dir` opens straight into turn-by-turn routing from the
  user's current position, which is a heavier action than "show me where this
  is". Either way it's Google's own cross-platform Maps URL: the Google Maps
  app intercepts it automatically on Android/iOS when installed, otherwise it
  falls back to the Google Maps website — no user-agent sniffing or custom
  `comgooglemaps://` scheme needed (which has no web fallback if the app isn't
  installed). Directions are one tap away from there, inside Maps itself.

  Independent of Mapbox — still added even if Mapbox/the map itself fails to
  load.
  */
  setupLocationCard() {
    const card = this.wrapper.querySelector('.direction-card')
    if (!card) return

    const url = `https://www.google.com/maps/search/?api=1&query=${this.lat},${this.lng}`
    const open = () => window.open(url, '_blank', 'noopener,noreferrer')

    card.setAttribute('role', 'link')
    card.setAttribute('tabindex', '0')
    card.setAttribute('aria-label', 'View this location on Google Maps')
    card.addEventListener('click', open)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        open()
      }
    })
  }

  initMap() {
    const mapboxgl = window.mapboxgl
    if (!mapboxgl) {
      console.error('[location-map] Mapbox GL JS is not loaded.')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: MAPBOX_STYLE,
      center: [this.lng, this.lat],
      zoom: ZOOM,
      minZoom: 3,
      /*
      Cooperative gestures — Mapbox's own option, not custom code. Without it
      the map swallows the page scroll: a wheel over it zooms the map instead
      of scrolling past, and a one-finger drag on touch pans the map instead
      of the page. With it, a plain wheel / one-finger drag always goes to the
      page, and the map only takes over on a deliberate gesture — ctrl (⌘ on
      Mac) + scroll on desktop, two fingers on touch — with Mapbox's own hint
      overlay shown when a blocked gesture is attempted (restyled in
      location-map.css). Clicks, mouse drags and the zoom buttons are
      unaffected. Kept in sync with tabs-map.js / tabs-map-v2.js.
      */
      cooperativeGestures: true,
    })

    this.map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right'
    )
    this.setupResetButton()

    this.map.on('load', () => {
      new mapboxgl.Marker({
        element: this.createMarkerEl(),
        anchor: this.pin.src ? CUSTOM_MARKER_ANCHOR : 'center',
      })
        .setLngLat([this.lng, this.lat])
        .addTo(this.map)
    })
  }

  /*
  Reset control. Prefers a button designed in Webflow — add data-map="reset" to
  any element inside the wrapper and it gets wired up with the site's own
  styling. Without one, a minimal fallback button is injected into the map
  container (styled by .lm-reset in location-map.css) so the escape hatch exists
  on every map with no Designer work required.
  */
  setupResetButton() {
    let button = this.wrapper.querySelector('[data-map="reset"]')

    if (!button) {
      button = document.createElement('button')
      button.className = 'lm-reset'
      button.type = 'button'
      button.textContent = 'Reset view'
      this.mapContainer.appendChild(button)
    }

    button.setAttribute('aria-label', 'Reset map view')
    button.addEventListener('click', (e) => {
      e.preventDefault() // harmless on a <button>, needed if Webflow uses an <a>
      this.resetView()
    })
  }

  // Back to the location's default centre and zoom.
  resetView() {
    if (!this.map) return
    this.map.flyTo({ center: [this.lng, this.lat], zoom: ZOOM, duration: 800 })
  }

  createMarkerEl() {
    // Custom pin image → the artwork IS the marker (no frame, no crop).
    if (this.pin.src) {
      const el = document.createElement('div')
      el.className = 'lm-marker is-custom'
      const img = document.createElement('img')
      img.src = this.pin.src
      img.alt = ''
      if (this.pin.srcset) {
        img.srcset = this.pin.srcset
        img.sizes = CUSTOM_MARKER_WIDTH
      }
      el.appendChild(img)
      return el
    }
    // With a logo → circular image marker.
    if (this.logo) {
      const el = document.createElement('div')
      el.className = 'lm-marker'
      const img = document.createElement('img')
      img.src = this.logo
      img.alt = ''
      el.appendChild(img)
      return el
    }
    // Without a logo → plain pin.
    const el = document.createElement('div')
    el.className = 'lm-pin'
    return el
  }

  onResize() {
    if (this.map) this.map.resize()
  }
}

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='location-map']
 */
export default function (elements) {
  const instances = elements.map((element) => new LocationMap(element))

  return {
    // Keep the map sized to its container after the window settles.
    resize() {
      instances.forEach((instance) => instance.onResize())
    },
  }
}
