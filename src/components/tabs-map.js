/*
Component: tabs-map
Webflow attribute: data-component="tabs-map"

List / map component (Airbnb-style). One tab shows the CMS Collection List
grouped by state; the other shows an interactive Mapbox map with clustering.
The map reads everything from the rendered List View cards — the only CMS
binding it needs is a hidden lat/lng element per card (see the doc). Selecting
a marker clones that event's own .cms_ticket-item into a floating card.

Mapbox GL JS must be loaded globally via CDN in Webflow (window.mapboxgl) — it
is NOT bundled here. See .claude/rules/components/tabs-map.md.
*/

import '../styles/tabs-map.css'
import config from '../config.js'

const MAPBOX_TOKEN = config.mapboxToken
const MAPBOX_STYLE = config.mapboxStyle

// Turn a visible state label into a stable key ("Tennesse" → "tennesse").
const slug = (s) =>
  (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

class TabsMap {
  constructor(wrapper) {
    this.wrapper = wrapper

    // View toggle: tab-links pair with tab-items by document order.
    this.tabLinks = [...wrapper.querySelectorAll('[data-tabs-map="tab-link"]')]
    this.tabItems = [
      ...wrapper.querySelectorAll(
        '[data-tabs-map="list-view"], [data-tabs-map="map-view"]'
      ),
    ]
    this.pill = wrapper.querySelector('[data-tabs-map="pill"]')

    // Filters (both bars — list-view + map-view — handled together).
    this.allButtons = [
      ...wrapper.querySelectorAll('[data-tabs-map="filter-all"]'),
    ]
    this.stateButtons = [...wrapper.querySelectorAll('[data-tabs-map="state"]')]

    // The map reads its data from the List View collection.
    this.listView = wrapper.querySelector('[data-tabs-map="list-view"]')
    this.mapView = wrapper.querySelector('[data-tabs-map="map-view"]')
    this.mapContainer = wrapper.querySelector('[data-tabs-map="map"]')
    this.mapCard = wrapper.querySelector('[data-tabs-map="map-card"]')

    // The floating card is position:absolute — anchor it to the MAP's wrapper
    // (the map's parent), not the card's own parent. With a Webflow Embed the
    // card's parent is a zero-height .w-embed sibling below the map, so
    // positioning against it drops the card off-screen.
    const mapWrapper = this.mapContainer?.parentElement
    if (
      mapWrapper &&
      window.getComputedStyle(mapWrapper).position === 'static'
    ) {
      mapWrapper.style.position = 'relative'
    }

    this.currentFilter = 'all'
    this.currentId = null
    this.map = null
    this.markerCache = {}
    this.markersOnScreen = {}

    this.data = this.parseCards()
    console.log('[tabs-map] init', {
      cards: this.data.length,
      tabLinks: this.tabLinks.length,
      states: this.stateButtons.length,
      mapContainer: !!this.mapContainer,
      mapCard: !!this.mapCard,
      pill: !!this.pill,
    })
    if (!this.data.length) {
      console.warn('[tabs-map] No cards with valid lat/lng found.')
    }

    this.bindEvents()
    this.setTab(0) // start on List view
  }

  // ── Parse the rendered cards into flat data ───────────────────────────────
  parseCards() {
    if (!this.listView) return []
    const cards = [...this.listView.querySelectorAll('.cms_ticket-item')]
    return cards
      .map((card, index) => {
        const group = card.closest('.tickets-state_item')
        const stateName = group?.querySelector('h3')?.textContent.trim() || ''
        const text = card.querySelector('.location_text-wrapper')
        const priceWrap = card.querySelector('.price-wrapper')
        // Coordinates live in hidden child elements bound to the CMS Lat/Lng
        // fields: <div data-tabs-map="item-lat" class="hide">35.13</div>
        const latText = card.querySelector(
          '[data-tabs-map="item-lat"]'
        )?.textContent
        const lngText = card.querySelector(
          '[data-tabs-map="item-lng"]'
        )?.textContent
        const price = priceWrap
          ? priceWrap.textContent.replace(/\s+/g, ' ').trim()
          : ''
        return {
          index,
          element: card,
          id: String(index),
          lat: parseFloat(latText),
          lng: parseFloat(lngText),
          state: slug(stateName),
          image: card.querySelector('.location_image')?.src || '',
          logo: card.querySelector('.location_logo')?.src || '',
          date: card.querySelector('.location_date')?.textContent.trim() || '',
          time: card.querySelector('.location_days')?.textContent.trim() || '',
          title:
            text?.querySelector('[data-text-size="h5"]')?.textContent.trim() ||
            '',
          venue:
            text?.querySelector('[data-text-size="m"]')?.textContent.trim() ||
            '',
          price, // full string, e.g. "$ 39.99"
          priceAmount: (price.match(/[\d.,]+/) || [''])[0], // number only, e.g. "39.99"
          cta: card.querySelector('.location_bottom-wrapper a')?.href || '#',
        }
      })
      .filter((d) => !Number.isNaN(d.lat) && !Number.isNaN(d.lng))
  }

  bindEvents() {
    this.tabLinks.forEach((link, i) =>
      link.addEventListener('click', () => this.setTab(i))
    )

    this.allButtons.forEach((b) =>
      b.addEventListener('click', () => this.setFilter('all'))
    )
    this.stateButtons.forEach((b) =>
      b.addEventListener('click', () => this.setFilter(slug(b.textContent)))
    )

    this.wrapper
      .querySelector('[data-tabs-map="mc-prev"]')
      ?.addEventListener('click', () => this.navigate(-1))
    this.wrapper
      .querySelector('[data-tabs-map="mc-next"]')
      ?.addEventListener('click', () => this.navigate(1))
  }

  // Called by main.js on the debounced window resize.
  onResize() {
    this.positionPill()
    if (this.map) this.map.resize()
  }

  // ── Tabs (view toggle) + pill ──────────────────────────────────────────────
  setTab(index) {
    this.tabLinks.forEach((l, i) =>
      l.classList.toggle('is-active', i === index)
    )
    this.tabItems.forEach((item, i) =>
      item.classList.toggle('is-active', i === index)
    )
    this.positionPill()

    const isMap =
      this.tabItems[index]?.getAttribute('data-tabs-map') === 'map-view'
    if (isMap) {
      if (!this.map) this.initMap()
      else setTimeout(() => this.map.resize(), 50)
    }
  }

  positionPill() {
    const active = this.tabLinks.find((l) => l.classList.contains('is-active'))
    if (!this.pill || !active) return
    // Reveal the pill even if it was set to Display:None in the Designer.
    if (window.getComputedStyle(this.pill).display === 'none')
      this.pill.style.display = 'block'
    this.pill.style.width = `${active.offsetWidth}px`
    this.pill.style.height = `${active.offsetHeight}px`
    this.pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  getFiltered() {
    return this.data.filter(
      (d) => this.currentFilter === 'all' || d.state === this.currentFilter
    )
  }

  setFilter(filter) {
    this.currentFilter = filter

    this.allButtons.forEach((b) =>
      b.classList.toggle('is-active', filter === 'all')
    )
    this.stateButtons.forEach((b) =>
      b.classList.toggle('is-active', slug(b.textContent) === filter)
    )

    this.wrapper.querySelectorAll('.tickets-state_item').forEach((group) => {
      const s = slug(group.querySelector('h3')?.textContent)
      group.classList.toggle('is-hidden', !(filter === 'all' || s === filter))
    })

    if (this.map) {
      const source = this.map.getSource('events')
      if (source) source.setData(this.buildGeoJSON())
      const filtered = this.getFiltered()
      if (filtered.length)
        this.map.fitBounds(this.calculateBounds(filtered), {
          padding: 60,
          maxZoom: 9,
        })
      if (this.currentId && !filtered.some((d) => d.id === this.currentId)) {
        this.currentId = null
        this.mapCard?.classList.remove('is-active')
      }
    }
  }

  // ── Map ─────────────────────────────────────────────────────────────────────
  initMap() {
    const mapboxgl = window.mapboxgl
    if (!mapboxgl) {
      console.error('[tabs-map] Mapbox GL JS not found on window.')
      return
    }
    if (!this.data.length) return

    mapboxgl.accessToken = MAPBOX_TOKEN
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: MAPBOX_STYLE,
      bounds: this.calculateBounds(this.data),
      fitBoundsOptions: { padding: 60, maxZoom: 9 },
      minZoom: 3,
    })
    this.map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right'
    )

    this.map.on('load', () => {
      this.addSourceAndLayers()
      this.map.on('render', () => {
        if (!this.map.isSourceLoaded('events')) return
        this.updateMarkers()
      })
    })
  }

  buildGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: this.getFiltered().map((d) => ({
        type: 'Feature',
        properties: { id: d.id, state: d.state, title: d.title, logo: d.logo },
        geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
      })),
    }
  }

  addSourceAndLayers() {
    this.map.addSource('events', {
      type: 'geojson',
      data: this.buildGeoJSON(),
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 50,
    })
    // Transparent layer forces the source's tiles to load so
    // querySourceFeatures() returns clusters + points; we draw HTML markers.
    this.map.addLayer({
      id: 'events-hitbox',
      type: 'circle',
      source: 'events',
      paint: { 'circle-radius': 1, 'circle-opacity': 0 },
    })
  }

  updateMarkers() {
    const mapboxgl = window.mapboxgl
    const newMarkers = {}
    const features = this.map.querySourceFeatures('events')

    for (const feature of features) {
      const coords = feature.geometry.coordinates
      const props = feature.properties

      if (props.cluster) {
        const key = `cluster-${props.cluster_id}`
        if (!this.markerCache[key]) {
          const el = this.createClusterEl(
            props.point_count,
            props.point_count_abbreviated
          )
          el.addEventListener('click', () =>
            this.zoomToCluster(props.cluster_id, coords)
          )
          this.markerCache[key] = new mapboxgl.Marker({
            element: el,
          }).setLngLat(coords)
        }
        newMarkers[key] = this.markerCache[key]
      } else {
        const key = `point-${props.id}`
        if (!this.markerCache[key]) {
          const el = this.createMarkerEl(props)
          el.addEventListener('click', (e) => {
            e.stopPropagation()
            this.selectMarker(props.id)
          })
          this.markerCache[key] = new mapboxgl.Marker({
            element: el,
          }).setLngLat(coords)
        }
        this.markerCache[key]
          .getElement()
          .classList.toggle('is-active', props.id === this.currentId)
        newMarkers[key] = this.markerCache[key]
      }
    }

    for (const key in newMarkers) {
      if (!this.markersOnScreen[key]) newMarkers[key].addTo(this.map)
    }
    for (const key in this.markersOnScreen) {
      if (!newMarkers[key]) this.markersOnScreen[key].remove()
    }
    this.markersOnScreen = newMarkers
  }

  createMarkerEl(props) {
    const el = document.createElement('button')
    el.className = 'em-marker'
    el.type = 'button'
    el.setAttribute('aria-label', props.title || 'Event')
    if (props.logo) {
      const img = document.createElement('img')
      img.src = props.logo
      img.alt = ''
      el.appendChild(img)
    }
    return el
  }

  createClusterEl(count, abbreviated) {
    const el = document.createElement('div')
    el.className = 'em-cluster'
    if (count >= 25) el.classList.add('is-large')
    else if (count >= 10) el.classList.add('is-medium')
    el.textContent = abbreviated ?? count
    return el
  }

  zoomToCluster(clusterId, coords) {
    this.map
      .getSource('events')
      .getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return
        this.map.easeTo({ center: coords, zoom })
      })
  }

  // ── Selection + navigation ────────────────────────────────────────────────
  selectMarker(id) {
    const item = this.data.find((d) => d.id === id)
    if (!item) return
    this.currentId = id
    console.log('[tabs-map] selectMarker', id, item.title, {
      mapCard: !!this.mapCard,
      slot: !!this.mapCard?.querySelector('[data-tabs-map="mc-slot"]'),
    })

    for (const key in this.markersOnScreen) {
      if (key.startsWith('point-')) {
        this.markersOnScreen[key]
          .getElement()
          .classList.toggle('is-active', key === `point-${id}`)
      }
    }

    this.map.flyTo({ center: [item.lng, item.lat], zoom: 8, duration: 800 })
    this.updateMapCard(item)
  }

  updateMapCard(item) {
    // Populate the dedicated map-card template (designed in Webflow) with the
    // selected event's data. Each field is located by its data-tabs-map role.
    if (!this.mapCard) {
      console.warn('[tabs-map] No [data-tabs-map="map-card"] element found.')
      return
    }
    const setText = (role, value) => {
      const el = this.mapCard.querySelector(`[data-tabs-map="${role}"]`)
      if (el) el.textContent = value || ''
    }
    const setImg = (role, src) => {
      const el = this.mapCard.querySelector(`[data-tabs-map="${role}"]`)
      if (!el || !src) return
      const img = el.tagName === 'IMG' ? el : el.querySelector('img')
      if (img) img.src = src
    }
    setText('mc-title', item.title)
    setText('mc-venue', item.venue)
    setText('mc-date', item.date)
    setText('mc-time', item.time)
    setText('mc-price', item.priceAmount || item.price)
    setImg('mc-image', item.image)
    setImg('mc-logo', item.logo)
    const cta = this.mapCard.querySelector('[data-tabs-map="mc-cta"]')
    if (cta) cta.href = item.cta || '#'
    this.mapCard.classList.add('is-active')
  }

  navigate(direction) {
    const list = this.getFiltered()
    if (!list.length) return
    let idx = list.findIndex((d) => d.id === this.currentId)
    idx = idx === -1 ? 0 : (idx + direction + list.length) % list.length
    this.selectMarker(list[idx].id)
  }

  calculateBounds(data) {
    const lats = data.map((d) => d.lat)
    const lngs = data.map((d) => d.lng)
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ]
  }
}

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='tabs-map']
 */
export default function (elements) {
  const instances = elements.map((element) => new TabsMap(element))

  return {
    // Reposition the pill and resize the map after the window settles.
    resize() {
      instances.forEach((instance) => instance.onResize())
    },
  }
}
