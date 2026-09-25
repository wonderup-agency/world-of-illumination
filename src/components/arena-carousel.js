/*
Component: arena-carousel
Webflow attribute: data-component="arena-carousel"
*/

import Swiper from 'swiper'
import { Autoplay, A11y } from 'swiper/modules'
import '../styles/arena-carousel.css'

// Same timing as theme-carousel so both carousels in the section feel alike
const AUTOPLAY_DELAY = 4000 // ms each step stays still before advancing
const TRANSITION_SPEED = 800 // ms the slide-to-slide animation takes
const MIN_SLIDES_FOR_LOOP = 12 // pad the real set until at least this many exist

// Per breakpoint (min-width px): slides visible, gap in rem, and whether the
// active slide is centered (mobile only, so neighbors peek on both sides
// instead of the row starting flush left)
const BREAKPOINTS = {
  0: { slidesPerView: 1.3, gap: 1, centered: true },
  480: { slidesPerView: 2.2, gap: 1, centered: true },
  768: { slidesPerView: 3, gap: 1.5, centered: false },
  992: { slidesPerView: 4, gap: 1.5, centered: false },
}

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='arena-carousel']
 */
export default function (elements) {
  const instances = []
  // Swiper's spaceBetween only understands px (a "1rem" string is read as 1px)
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize)

  elements.forEach((el) => {
    const realSlides = Array.from(el.children)
    if (realSlides.length < 2) return

    // The items are plain divs placed in the Designer (no CMS list), so the
    // Swiper structure is built here: el becomes the container, a new
    // .swiper-wrapper holds the items, each item becomes a .swiper-slide.
    const wrapper = document.createElement('div')
    wrapper.className = 'swiper-wrapper'
    realSlides.forEach((slide) => {
      slide.classList.add('swiper-slide')
      // Same lazy-load + translateX bug as theme-carousel/locations
      slide.querySelectorAll('img').forEach((img) => (img.loading = 'eager'))
      wrapper.appendChild(slide)
    })
    el.classList.add('swiper', 'is-arena-carousel')
    el.appendChild(wrapper)

    // Loop needs enough slides around the boundary — pad with full rounds of
    // clones so any item count added in the Designer keeps looping cleanly.
    while (wrapper.children.length < MIN_SLIDES_FOR_LOOP) {
      realSlides.forEach((slide) => {
        const clone = slide.cloneNode(true)
        clone.setAttribute('aria-hidden', 'true')
        wrapper.appendChild(clone)
      })
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const breakpoints = Object.fromEntries(
      Object.entries(BREAKPOINTS).map(
        ([width, { slidesPerView, gap, centered }]) => [
          width,
          {
            slidesPerView,
            spaceBetween: gap * remPx,
            centeredSlides: centered,
          },
        ]
      )
    )

    const swiper = new Swiper(el, {
      modules: [Autoplay, A11y],
      breakpoints,
      loop: true,
      loopAdditionalSlides: 2,
      speed: TRANSITION_SPEED,
      allowTouchMove: false,
      simulateTouch: false,
      a11y: { enabled: true },
      autoplay: reducedMotion
        ? false
        : { delay: AUTOPLAY_DELAY, disableOnInteraction: false },
    })

    instances.push(swiper)
  })

  return {
    resize() {
      instances.forEach((swiper) => swiper.update())
    },
  }
}
