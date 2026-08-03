/*
Component: footer
Webflow attribute: data-component="footer"
*/

import '../styles/footer.css'

// Sticky curtain reveal — the geometry lives in footer.css, this feeds it the
// measurements CSS can't take itself and drives the three per-frame values.
//
// The image sits above the footer as a curtain that lifts away while the footer
// stays pinned underneath (so it reads as being uncovered, not just scrolling).
// It stops with only the viewport's leftover above the footer still showing, so
// the page ends on the whole footer visible at once.
//
// The curtain is --footer-image tall, which is usually less than the screen, so
// covering the footer is not what hides it — the footer is clipped to the part
// below the curtain's bottom edge, and that line rises with the curtain. Written
// here per frame, along with the corner radius (0 → full across the lift) and
// the image's parallax.
//
// No ScrollTrigger / pin, so nothing conflicts with Lenis smooth scroll — Lenis
// scrolls the window, so the native scroll event drives the parallax (same
// approach as text-fill.js).

const SPACER_CLASS = 'footer_reveal-spacer'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='footer']
 */
export default function (elements) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const instances = []

  elements.forEach((section) => {
    const wrapper = section.querySelector('.footer_image-wrapper')
    const content = section.querySelector('.footer_component')
    if (!wrapper || !content) return

    const spacer = document.createElement('div')
    spacer.className = SPACER_CLASS
    spacer.setAttribute('aria-hidden', 'true')
    section.append(spacer)

    section.classList.add('is-reveal')

    instances.push({
      section,
      wrapper,
      content,
      image: wrapper.querySelector('.footer_image'),
      travel: 0,
      radius: 0,
      height: 0,
    })
  })

  if (!instances.length) return

  const clamp = (value) => (value < 0 ? 0 : value > 1 ? 1 : value)

  const measure = () => {
    instances.forEach((instance) => {
      // The footer's own height is what sizes the strip of curtain left on
      // screen — see --footer-strip in footer.css. Sticky positioning never
      // changes the content's own height, so this is safe to re-read any time.
      instance.height = instance.content.offsetHeight
      instance.section.style.setProperty(
        '--footer-height',
        `${instance.height}px`
      )
      // The image overflows its wrapper by exactly the parallax travel.
      instance.travel = instance.image
        ? instance.image.offsetHeight - instance.wrapper.offsetHeight
        : 0
      // The radius the geometry is built around, read back from CSS because that
      // is where it is capped against the band (--footer-applied-radius) and a
      // custom property would only hand back its unresolved token. The live
      // override comes off first or this reads back its own last write.
      instance.wrapper.style.removeProperty('--footer-live-radius')
      instance.radius =
        parseFloat(getComputedStyle(instance.wrapper).borderBottomLeftRadius) ||
        0
    })
  }

  const render = () => {
    const viewport = window.innerHeight

    instances.forEach((instance) => {
      const { wrapper, content, image, travel, radius, height } = instance

      // Every read first, then every write: the writes below invalidate layout,
      // so interleaving them would force a recalc per instance.
      const rect = wrapper.getBoundingClientRect()
      const contentTop = content.getBoundingClientRect().top

      // The curtain's bottom edge travels from the viewport bottom to where it
      // parks, which is the band plus the radius it overlaps the footer by.
      const parked = Math.max(0, viewport - height) + radius
      const lift = viewport - parked
      const lifted = lift > 0 ? clamp((viewport - rect.bottom) / lift) : 1

      // Corners open up as the curtain lifts: square on the way in, full radius
      // by the time it parks.
      const live = radius * lifted

      // The footer is only uncovered below the curtain's bottom edge, so it is
      // clipped to exactly that line and the line rises with the curtain. Kept a
      // radius higher than the edge itself, so what shows through the two rounded
      // notches is footer rather than a hole. Above the line the curtain covers
      // the screen, which is why clipping the footer's own background is safe.
      const wipe = Math.max(0, rect.bottom - live - contentTop)

      wrapper.style.setProperty('--footer-live-radius', `${live}px`)
      content.style.setProperty('--footer-wipe', `${wipe}px`)

      if (!image || travel <= 0) return

      // 0 = curtain entering from the bottom, 1 = fully past the top. Freezes on
      // its own once the curtain parks, since the rect stops moving too. Its own
      // progress, not the lift above: the image keeps drifting for the whole time
      // the curtain is on screen, not just while it is uncovering.
      const drift = clamp(1 - rect.bottom / (viewport + rect.height))
      // Starts bottom-aligned and drifts down to top-aligned, so the image
      // travels up slower than the curtain carrying it.
      image.style.transform = `translate3d(0, ${(drift - 1) * travel}px, 0)`
    })
  }

  let queued = false
  const onScroll = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      render()
    })
  }

  const sync = () => {
    measure()
    render()
  }

  sync()
  window.addEventListener('scroll', onScroll, { passive: true })
  // Fonts and images settle after DOMContentLoaded and change the footer height.
  window.addEventListener('load', sync, { once: true })

  return {
    // Runs on window resize (debounced 150ms)
    resize: sync,
  }
}
