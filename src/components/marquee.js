/*
Component: marquee
Webflow attribute: data-component="marquee"
*/

import '../styles/marquee.css'

const DEFAULT_SPEED = 60 // pixels per second, used when data-marquee-speed is absent
const SPEED_ATTR = 'data-marquee-speed'
const REVERSE_ATTR = 'data-marquee-reverse'

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

    const baseItems = Array.from(track.children).map((item) =>
      item.cloneNode(true)
    )

    const fill = () => {
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
