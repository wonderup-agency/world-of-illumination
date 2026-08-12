/*
Component: tapes
Webflow attribute: data-component="tapes"

Two diagonal ribbons crossing in an X, each an infinite marquee loop moving
in opposite directions. Adapted from marquee.js's clone-fill-until-covered
technique, kept as an independent copy rather than a shared import (same
convention as gallery-slider/locations, theme-carousel/shows). Differs from
marquee.js in two ways:
1. Promotes each row's existing content (a single Heading) into a
   `.tape_track` > `.tape_item` structure on first run, instead of requiring
   that structure pre-built in Webflow.
2. Marks every clone aria-hidden, not just the loop-duplicate half — a row
   repeats the same heading purely for visual fill, so leaving several
   non-hidden duplicate headings would clutter screen-reader heading
   navigation.
*/

import '../styles/tapes.css'

const DEFAULT_SPEED = 50 // pixels per second, used when data-tapes-speed is absent
const SPEED_ATTR = 'data-tapes-speed'
const ROW_SELECTOR = '.tape-element'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='tapes']
 */
export default function (elements) {
  const fillers = []

  elements.forEach((wrapper) => {
    const wrapperSpeed =
      parseFloat(wrapper.getAttribute(SPEED_ATTR)) || DEFAULT_SPEED

    Array.from(wrapper.querySelectorAll(ROW_SELECTOR)).forEach((row) => {
      const speed = parseFloat(row.getAttribute(SPEED_ATTR)) || wrapperSpeed

      // Promote once: wrap whatever the row already contains (a single
      // Heading) into a track/item structure it can clone from.
      let track = row.querySelector('.tape_track')
      if (!track) {
        track = document.createElement('div')
        track.className = 'tape_track'

        const item = document.createElement('div')
        item.className = 'tape_item'
        Array.from(row.childNodes).forEach((node) => item.appendChild(node))
        track.appendChild(item)

        row.appendChild(track)
      }

      const baseItems = Array.from(track.children).map((item) =>
        item.cloneNode(true)
      )

      let lastWidth = null

      const fill = () => {
        // Mobile browsers fire `resize` when the address bar shows/hides on
        // scroll — skip the rebuild in that case (same guard as marquee.js).
        const currentWidth = row.offsetWidth
        if (currentWidth === lastWidth) return
        lastWidth = currentWidth

        track.innerHTML = ''
        baseItems.forEach((item) => track.appendChild(item.cloneNode(true)))

        while (track.scrollWidth < currentWidth) {
          baseItems.forEach((item) => track.appendChild(item.cloneNode(true)))
        }

        // Every clone repeats identical text for visual fill only — hide all
        // of them, keep just the first (the original, moved Heading).
        Array.from(track.children).forEach((item, index) => {
          if (index > 0) item.setAttribute('aria-hidden', 'true')
        })

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
  })

  return {
    resize() {
      fillers.forEach((fill) => fill())
    },
  }
}
