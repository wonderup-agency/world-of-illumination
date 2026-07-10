/*
Component: location-map
Webflow attribute: data-component="location-map"

Single-location Mapbox map — a stripped-down sibling of tabs-map. No tabs, no
filters, no clusters, no floating card: just one map centered on one location
with one marker. Coordinates come from data-map-lat / data-map-lng attributes
on the wrapper (or any child carrying them). If a .location_logo image exists
inside the wrapper it becomes the circular marker face; otherwise a plain pin
is rendered.

Mapbox GL JS must be loaded globally via CDN in Webflow (window.mapboxgl) — it
is NOT bundled here. See .claude/rules/components/location-map.md.
*/

import '../styles/location-map.css'
import config from '../config.js'

const MAPBOX_TOKEN = config.mapboxToken
const MAPBOX_STYLE = config.mapboxStyle

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

    // Optional marker face: reuse a venue/event logo if present.
    this.logo = wrapper.querySelector('.location_logo')?.src || ''

    this.map = null
    this.initMap()
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
