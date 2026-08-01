/*
Component: footer
Webflow attribute: data-component="footer"
*/

import '../styles/footer.css'

// Sticky curtain reveal — the geometry lives in footer.css, this only opts in,
// feeds it the one measurement CSS can't take itself, and drives the parallax.
//
// The image sits above the footer as a full-screen curtain that lifts away while
// the footer stays pinned underneath (so it reads as being uncovered, not just
// scrolling). It stops with only the viewport's leftover above the footer still
// showing, so the page ends on the whole footer visible at once.
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
    })
  })

  if (!instances.length) return

  const measure = () => {
    instances.forEach((instance) => {
      // The footer's own height is what sizes the strip of curtain left on
      // screen — see --footer-strip in footer.css. Sticky positioning never
      // changes the content's own height, so this is safe to re-read any time.
      instance.section.style.setProperty(
        '--footer-height',
        `${instance.content.offsetHeight}px`
      )
      // The image overflows its wrapper by exactly the parallax travel.
      instance.travel = instance.image
        ? instance.image.offsetHeight - instance.wrapper.offsetHeight
        : 0
    })
  }

  const render = () => {
    const viewport = window.innerHeight
    instances.forEach(({ wrapper, image, travel }) => {
      if (!image || travel <= 0) return
      const rect = wrapper.getBoundingClientRect()
      // 0 = curtain entering from the bottom, 1 = fully past the top. Freezes on
      // its own once the curtain parks, since the rect stops moving too.
      const progress = 1 - rect.bottom / (viewport + rect.height)
      const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress
      // Starts bottom-aligned and drifts down to top-aligned, so the image
      // travels up slower than the curtain carrying it.
      image.style.transform = `translate3d(0, ${(clamped - 1) * travel}px, 0)`
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
