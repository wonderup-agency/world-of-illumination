/* ==========================================================================
   LOCATION MAP — single-location map  ([data-component="location-map"])
   ==========================================================================

   A stripped-down version of the tabs-map component: no tabs, no filters, no
   clusters, no floating card. Just ONE Mapbox map centered on ONE location.

   The ONLY thing Webflow has to add are two custom attributes with the
   coordinates. They can live on the component wrapper itself:

     <div data-component="location-map"
          data-map-lat="35.1495"
          data-map-lng="-90.0490"> … </div>

   Marker, in priority order:
     <img data-map-marker src="…"> → the custom pin image IS the marker.
     <img class="location_logo" src="…"> → shown inside the circular marker.
     neither → a plain pin marker.

   A reset-view button restores the default centre/zoom. Design one in Webflow
   with data-map="reset", or let JS inject its own fallback.

   Requires window.mapboxgl (loaded via CDN in the site's custom code).
   Copy-paste to a Webflow Embed as-is.
   ========================================================================== */

// ⚠️ Your Mapbox public token — https://account.mapbox.com/access-tokens/
const MAPBOX_TOKEN =
  'pk.eyJ1IjoicGFibG9yb25kaW5hIiwiYSI6ImNtcjU2ZW5kdzBpenAyenE0a2RiMm1rc2kifQ.qxiMABe0NTNZgaCTfrW1yg'
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11'

// Default zoom when the map centers on the single location. Also the zoom the
// reset button returns to.
const ZOOM = 12

/*
Where a custom pin image sits relative to its coordinate. 'bottom' assumes a
pin/teardrop graphic whose tip should land exactly on the point. Switch to
'center' if the artwork is a badge or logo meant to be centred on it instead.
Default logo markers stay centred either way. Kept in sync with tabs-map.
*/
const CUSTOM_MARKER_ANCHOR = 'bottom'

/*
Rendered width of a custom pin. Must stay in sync with --lm-marker-width in
styles.css: it's passed as the <img sizes> value so the browser picks the
smallest srcset variant instead of the 2600px original (Webflow's CMS images
ship sizes="100vw", which would otherwise download a full-size photo to draw a
~56px pin). SVG pins have no srcset and ignore this entirely.
*/
const CUSTOM_MARKER_WIDTH = '56px'

/*
Optional custom pin: a hidden <img data-map-marker> (kept out of sight with the
`hide` class). Returns an empty src when the CMS image field is empty, in which
case the marker falls back to the logo face. Same two guards as tabs-map:

  - `.w-dyn-bind-empty` — with an empty CMS image field Webflow still renders
    the <img>, pointing at its own placeholder.svg and flagged with this class.
    Without the check an unset field would render the Webflow placeholder as the
    pin. A `/plugins/Basic/assets/placeholder` src is treated the same way, in
    case the class ever changes.
  - the src ATTRIBUTE (not img.src) — an <img> with an empty src resolves .src
    to the page URL, which would read as a valid image and render a broken pin.
*/
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

    // Optional marker face: reuse an event/venue logo if present.
    this.logo = wrapper.querySelector('.location_logo')?.src || ''
    // Optional custom pin image — takes precedence over the logo face.
    this.pin = markerImage(wrapper)

    this.map = null
    this.initMap()
  }

  initMap() {
    if (typeof mapboxgl === 'undefined') {
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
  container (styled by .lm-reset in styles.css) so the escape hatch exists on
  every map with no Designer work required.
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
    // With a logo → circular image marker (like tabs-map).
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
}

document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('[data-component="location-map"]')
    .forEach((el) => new LocationMap(el))
})
