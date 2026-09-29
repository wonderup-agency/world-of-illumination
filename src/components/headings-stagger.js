/*
Component: headings-stagger
Webflow attribute: data-component="headings-stagger"
*/

import gsap from 'gsap'

// Same entry point as text-fill's START_VH (0.85): fires once the wrapper's
// top passes 85% of the viewport height.
const ROOT_MARGIN = '0px 0px -15% 0px'
const Y_OFFSET = '1.5rem'
const DURATION = 0.6
const STAGGER = 0.15

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='headings-stagger']
 */
export default function (elements) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  elements.forEach((element) => {
    const items = [...element.children]
    if (!items.length) return

    gsap.set(items, { autoAlpha: 0, y: Y_OFFSET })

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        gsap.to(items, {
          autoAlpha: 1,
          y: 0,
          duration: DURATION,
          stagger: STAGGER,
          ease: 'power2.out',
          clearProps: 'transform',
        })
      },
      { rootMargin: ROOT_MARGIN }
    )
    observer.observe(element)
  })
}
