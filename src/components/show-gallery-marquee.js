/*
Component: show-gallery-marquee
Webflow attribute: data-component="show-gallery-marquee"

Mobile-only (<=767px): turns the CMS gallery grid (.show_gallery-list) into
an infinite horizontal marquee, so a long grid doesn't cost a long scroll on
small screens. The real Webflow grid is never touched or removed -- a
separate cloned track is built next to it, and CSS shows only one of the two
depending on the .is-gallery-marquee class gsap.matchMedia adds/removes on
breakpoint change. Above 767px, or if this component fails for any reason,
the original grid renders exactly as Webflow built it.

Same clone-fill-until-covered + duplicate-for-seamless-loop technique as
marquee.js/tapes.js, needed because the number of CMS photos varies per show.
*/

import gsap from 'gsap'
import '../styles/show-gallery-marquee.css'

const DEFAULT_SPEED = 28 // pixels per second, used when data-gallery-marquee-speed is absent
const SPEED_ATTR = 'data-gallery-marquee-speed'
const ACTIVE_CLASS = 'is-gallery-marquee'
const TRACK_CLASS = 'show-gallery-marquee_track'
const ITEM_CLASS = 'show-gallery-marquee_item'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='show-gallery-marquee']
 */
export default function (elements) {
  const instances = []

  elements.forEach((wrapper) => {
    const list = wrapper.querySelector('.show_gallery-list')
    if (!list) return

    // Same lazy-load workaround as locations.js/theme-carousel.js: a small,
    // bounded set of images, forced eager so nothing pops in mid-scroll once
    // the marquee track is animating.
    list.querySelectorAll('.show_multi-image').forEach((img) => {
      img.loading = 'eager'
    })

    const speed = parseFloat(wrapper.getAttribute(SPEED_ATTR)) || DEFAULT_SPEED
    instances.push({
      wrapper,
      list,
      speed,
      track: null,
      baseItems: null,
      lastWidth: null,
    })
  })

  if (!instances.length) return

  const fill = (instance) => {
    const { wrapper, track, baseItems, speed } = instance
    if (!track) return

    const currentWidth = wrapper.offsetWidth
    if (currentWidth === instance.lastWidth) return
    instance.lastWidth = currentWidth

    track.innerHTML = ''
    baseItems.forEach((item) => track.appendChild(item.cloneNode(true)))

    while (track.scrollWidth < currentWidth) {
      baseItems.forEach((item) => track.appendChild(item.cloneNode(true)))
    }

    // Duplicate the filled set once more so the -50% loop lines up seamlessly.
    // Marked aria-hidden since it's a visual-only repeat of the same photos.
    Array.from(track.children).forEach((item) => {
      const clone = item.cloneNode(true)
      clone.setAttribute('aria-hidden', 'true')
      track.appendChild(clone)
    })

    const setWidth = track.scrollWidth / 2
    track.style.animationDuration = `${setWidth / speed}s`
  }

  const build = (instance) => {
    const { wrapper, list } = instance

    const liveItems = Array.from(list.querySelectorAll('.show_gallery-item'))
    if (!liveItems.length) return

    instance.baseItems = liveItems.map((item) => {
      const clone = item.cloneNode(true)
      clone.classList.add(ITEM_CLASS)
      return clone
    })

    const track = document.createElement('div')
    track.className = TRACK_CLASS
    instance.track = track
    list.insertAdjacentElement('afterend', track)
    wrapper.classList.add(ACTIVE_CLASS)

    fill(instance)
  }

  const teardown = (instance) => {
    instance.wrapper.classList.remove(ACTIVE_CLASS)
    if (instance.track) {
      instance.track.remove()
      instance.track = null
    }
    instance.baseItems = null
    instance.lastWidth = null
  }

  let active = false

  gsap.matchMedia().add('(max-width: 767px)', () => {
    active = true
    instances.forEach(build)

    // Cleanup when leaving mobile -- undo everything build() did above so
    // the original grid is the only thing left in the DOM.
    return () => {
      active = false
      instances.forEach(teardown)
    }
  })

  return {
    // Runs on window resize (debounced 150ms) -- only meaningful while active;
    // gsap.matchMedia handles enter/leave of the 767px breakpoint itself.
    resize() {
      if (active) instances.forEach(fill)
    },
  }
}
