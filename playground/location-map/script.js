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

   Optionally, a logo/image inside the wrapper is used as the marker face:
     <img class="location_logo" src="…"> → shown inside the circular marker.
   If there's no logo, a plain pin marker is rendered instead.

   Requires window.mapboxgl (loaded via CDN in the site's custom code).
   Copy-paste to a Webflow Embed as-is.
   ========================================================================== */

// ⚠️ Your Mapbox public token — https://account.mapbox.com/access-tokens/
const MAPBOX_TOKEN =
  'pk.eyJ1IjoicGFibG9yb25kaW5hIiwiYSI6ImNtcjU2ZW5kdzBpenAyenE0a2RiMm1rc2kifQ.qxiMABe0NTNZgaCTfrW1yg'
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11'

// Default zoom when the map centers on the single location.
const ZOOM = 12

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

    this.map.on('load', () => {
      new mapboxgl.Marker({ element: this.createMarkerEl() })
        .setLngLat([this.lng, this.lat])
        .addTo(this.map)
    })
  }

  createMarkerEl() {
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
