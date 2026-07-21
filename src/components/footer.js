/*
Component: footer
Webflow attribute: data-component="footer"
*/

import '../styles/footer.css'

// Pure-CSS sticky reveal (see footer.css). JS only opts the footer in by adding
// `.is-reveal`, and skips it under reduced-motion. No ScrollTrigger / pin, so
// nothing conflicts with Lenis smooth scroll.

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='footer']
 */
export default function (elements) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  elements.forEach((section) => {
    const image = section.querySelector('.footer_image-wrapper')
    const content = section.querySelector('.footer_component')
    if (!image || !content) return
    section.classList.add('is-reveal')
  })
}
