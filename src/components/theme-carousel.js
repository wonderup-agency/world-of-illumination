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

    // Native loading="lazy" measures each image's distance from the viewport
    // using the slider's untransformed layout (before centeredSlides shifts
    // the row via translateX). On mobile especially, cards far enough to the
    // right in that pre-transform layout never get judged "near enough" to
    // load and stay pending until they're dragged/scrolled near — and since
    // nothing here reserves the card's size ahead of the image loading, the
    // card visibly snaps/grows to its real size the moment the image finally
    // loads (typically right as it nears the center). Forcing eager loading
    // sidesteps the wrong distance measurement entirely — same fix as
    // locations.js's `.location_image` handling, generalized here since this
    // component's card markup is free to differ per instance.
    realSlides.forEach((slide) => {
      slide.querySelectorAll('.theme_card-wrapper img').forEach((img) => {
        img.loading = 'eager'
      })
    })

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
