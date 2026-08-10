/*
Component: theme-carousel
Webflow attribute: data-component="theme-carousel"
*/

import Swiper from 'swiper'
import { Autoplay, A11y } from 'swiper/modules'
import '../styles/theme-carousel.css'

const AUTOPLAY_DELAY = 4000 // ms each card stays centered before advancing
const TRANSITION_SPEED = 800 // ms the slide-to-slide animation takes
const MIN_SLIDES_FOR_LOOP = 16 // pad the real set until at least this many exist

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='theme-carousel']
 */
export default function (elements) {
  const instances = []

  elements.forEach((el) => {
    const container = el.querySelector('.swiper')
    const wrapper = container?.querySelector('.swiper-wrapper')
    const realSlides = wrapper
      ? Array.from(wrapper.querySelectorAll('.swiper-slide'))
      : []

    if (!container || !wrapper || realSlides.length < 2) return

    // Swiper's loop needs enough real slides to duplicate around the loop
    // boundary. With a fixed card width several cards peek at once (same
    // "many visible" look as locations), and a small CMS list (e.g. 5
    // themes) isn't enough on its own — Swiper silently disables the loop
    // and logs a warning ("not enough slides for loop mode... add more
    // slides or make duplicates"). Padding the real set with extra full
    // rounds of the same cards (same technique marquee.js uses to fill its
    // track) gives Swiper enough slides to loop cleanly, regardless of how
    // many themes the CMS has or how wide the screen is.
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

    const swiper = new Swiper(container, {
      modules: [Autoplay, A11y],
      slidesPerView: 'auto',
      centeredSlides: true,
      spaceBetween: 16,
      loop: true,
      loopAdditionalSlides: 2,
      speed: TRANSITION_SPEED,
      allowTouchMove: false,
      simulateTouch: false,
      grabCursor: false,
      a11y: { enabled: true },
      autoplay: reducedMotion
        ? false
        : {
            delay: AUTOPLAY_DELAY,
            disableOnInteraction: false,
          },
    })

    instances.push(swiper)
  })

  return {
    resize() {
      instances.forEach((swiper) => swiper.update())
    },
  }
}
