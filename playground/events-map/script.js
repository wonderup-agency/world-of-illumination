/* ==========================================================================
   TABS MAP — list / map component  ([data-component="tabs-map"])
   ==========================================================================

   Reads the DOM the Webflow Collection List already renders. The ONLY thing
   Webflow has to add for the map to work is `data-tabs-map-lat` /
   `data-tabs-map-lng` custom attributes on each Collection Item (they must be
   two DISTINCT attribute names — you can't reuse `data-tabs-map` for both).
   Everything else (state, logo, image,
   title, venue, date, time, price, ticket URL) is derived from the existing
   Client-First markup, so the design stays 100% in Webflow.

   Requires window.mapboxgl (loaded via CDN in the site's custom code).

   This whole file is copy-paste to a Webflow Embed as-is — there is no
   playground-only shim anymore; the cards are real DOM, same as Webflow.
   ========================================================================== */

// ⚠️ Your Mapbox public token — https://account.mapbox.com/access-tokens/
const MAPBOX_TOKEN =
  'pk.eyJ1IjoicGFibG9yb25kaW5hIiwiYSI6ImNtcjU2ZW5kdzBpenAyenE0a2RiMm1rc2kifQ.qxiMABe0NTNZgaCTfrW1yg'
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11'

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

    // View toggle: tab-links are paired with tab-items by document order.
    this.tabLinks = [...wrapper.querySelectorAll('[data-tabs-map="tab-link"]')]
    this.tabItems = [
      ...wrapper.querySelectorAll(
        '[data-tabs-map="list-view"], [data-tabs-map="map-view"]'
      ),
    ]
    this.pill = wrapper.querySelector('[data-tabs-map="pill"]')

    // Filters (both bars — list-view + map-view — are handled together).
    this.allButtons = [
      ...wrapper.querySelectorAll('[data-tabs-map="filter-all"]'),
    ]
    this.stateButtons = [...wrapper.querySelectorAll('[data-tabs-map="state"]')]

    // List lives in the list-view panel; the map reads its cards.
    this.listView = wrapper.querySelector('[data-tabs-map="list-view"]')
    this.mapView = wrapper.querySelector('[data-tabs-map="map-view"]')
    this.mapContainer = wrapper.querySelector('[data-tabs-map="map"]')
    this.mapCard = wrapper.querySelector('[data-tabs-map="map-card"]')

    this.currentFilter = 'all'
    this.currentId = null
    this.map = null
    this.markerCache = {}
    this.markersOnScreen = {}

    this.data = this.parseCards()
    if (!this.data.length) {
      console.warn('[tabs-map] No cards with valid data-lat/data-lng found.')
    }
    console.log(`🗺️ [tabs-map] Parsed ${this.data.length} events`)

    this.bindEvents()
    this.setTab(0) // start on List view
  }

  // ── Parse the rendered cards into flat data ───────────────────────────────
  parseCards() {
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
        return {
          index,
          element: card,
          id: String(index),
          lat: parseFloat(latText),
          lng: parseFloat(lngText),
          state: slug(stateName),
          stateName,
          title:
            text?.querySelector('[data-text-size="h5"]')?.textContent.trim() ||
            '',
          venue:
            text?.querySelector('[data-text-size="m"]')?.textContent.trim() ||
            '',
          date: card.querySelector('.location_date')?.textContent.trim() || '',
          time: card.querySelector('.location_days')?.textContent.trim() || '',
          image: card.querySelector('.location_image')?.src || '',
          logo: card.querySelector('.location_logo')?.src || '',
          price: priceWrap
            ? priceWrap.textContent.replace(/\s+/g, '').trim()
            : '',
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

    let raf
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        this.positionPill()
        if (this.map) this.map.resize()
      })
    })
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
    // Reveal the pill even if it was set to Display:None in the Designer
    // (keeps the canvas tidy while building; JS owns it at runtime).
    if (getComputedStyle(this.pill).display === 'none')
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

    // Keep both filter bars in sync visually.
    this.allButtons.forEach((b) =>
      b.classList.toggle('is-active', filter === 'all')
    )
    this.stateButtons.forEach((b) =>
      b.classList.toggle('is-active', slug(b.textContent) === filter)
    )

    // List: show/hide state groups.
    this.wrapper.querySelectorAll('.tickets-state_item').forEach((group) => {
      const s = slug(group.querySelector('h3')?.textContent)
      group.classList.toggle('is-hidden', !(filter === 'all' || s === filter))
    })

    // Map: recompute clusters for the visible subset.
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
        this.mapCard.classList.remove('is-active')
      }
    }
  }

  // ── Map ─────────────────────────────────────────────────────────────────────
  initMap() {
    if (typeof mapboxgl === 'undefined') {
      console.error('[tabs-map] Mapbox GL JS is not loaded.')
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
        properties: {
          id: d.id,
          state: d.state,
          title: d.title,
          logo: d.logo,
        },
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
    // Clone the selected event's own card so the floating card is identical
    // to the list card and inherits its Webflow styling.
    const slot = this.mapCard.querySelector('[data-tabs-map="mc-slot"]')
    if (slot) {
      const clone = item.element.cloneNode(true)
      clone.removeAttribute('role') // avoid duplicate listitem semantics off-list
      slot.replaceChildren(clone)
    }
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

document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('[data-component="tabs-map"]')
    .forEach((el) => new TabsMap(el))
})
