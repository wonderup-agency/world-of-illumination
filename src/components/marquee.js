/*
Component: marquee
Webflow attribute: data-component="marquee"
*/

import '../styles/marquee.css'

const DEFAULT_SPEED = 60 // pixels per second, used when data-marquee-speed is absent
const SPEED_ATTR = 'data-marquee-speed'
const REVERSE_ATTR = 'data-marquee-reverse'
const GAP_ATTR = 'data-marquee-gap'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='marquee']
 */
export default function (elements) {
  const fillers = []

  elements.forEach((el) => {
    const track = el.querySelector('.marquee_track')
    if (!track) return

    const speed = parseFloat(el.getAttribute(SPEED_ATTR)) || DEFAULT_SPEED
    if (el.hasAttribute(REVERSE_ATTR)) {
      track.style.animationDirection = 'reverse'
    }

    // Extra spacing between specific children inside a .marquee_item (e.g. the
    // gap between two headings), on top of the flex `gap` already there.
    // Applied before baseItems is captured so every clone carries it.
    track.querySelectorAll(`[${GAP_ATTR}]`).forEach((node) => {
      const raw = node.getAttribute(GAP_ATTR).trim()
      if (!raw) return
      node.style.marginLeft = /^-?\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw
    })

    const baseItems = Array.from(track.children).map((item) =>
      item.cloneNode(true)
    )

    let lastWidth = null

    const fill = () => {
      // Mobile browsers fire `resize` when the address bar shows/hides on
      // scroll (viewport height changes, width doesn't) — skip the rebuild
      // in that case so the animation doesn't restart/flicker mid-scroll.
      const currentWidth = el.offsetWidth
      if (currentWidth === lastWidth) return
      lastWidth = currentWidth

      track.innerHTML = ''
      baseItems.forEach((item) => track.appendChild(item.cloneNode(true)))

      while (track.scrollWidth < el.offsetWidth) {
        baseItems.forEach((item) => track.appendChild(item.cloneNode(true)))
      }

      // Duplicate the filled set once more so the -50% loop lines up seamlessly
      Array.from(track.children).forEach((item) => {
        const clone = item.cloneNode(true)
        clone.setAttribute('aria-hidden', 'true')
        track.appendChild(clone)
      })

      // Keep scroll speed constant regardless of how much content got filled in
      const setWidth = track.scrollWidth / 2
      track.style.animationDuration = `${setWidth / speed}s`
    }

    fill()
    fillers.push(fill)
  })

  return {
    resize() {
      fillers.forEach((fill) => fill())
    },
  }
}
