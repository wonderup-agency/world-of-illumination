/*
Component: slider-swiper
Webflow attribute: data-component="slider-swiper"
*/

import Swiper from 'swiper'
import { Navigation, A11y } from 'swiper/modules'
import '../styles/slider-swiper.css'

// Default slides per view per breakpoint; capped per instance by
// data-slider-swiper-per-view.
const PER_VIEW = { base: 1, 768: 2, 992: 3 }

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='slider-swiper']
 */
export default function (elements) {
  elements.forEach((el) => {
    // Static Designer markup (no Swiper classes): the element tagged
    // data-slider-swiper-list holds the slides as direct children, and its
    // parent becomes the Swiper container. CMS markup with Swiper classes
    // already set skips this entirely.
    const list = el.querySelector('[data-slider-swiper-list]')
    if (list && !el.querySelector('.swiper')) {
      list.parentElement.classList.add('swiper')
      list.classList.add('swiper-wrapper')
      Array.from(list.children).forEach((slide) =>
        slide.classList.add('swiper-slide')
      )
    }

    const container = el.querySelector('.swiper')
    const prevEl = el.querySelector('.slider-prev')
    const nextEl = el.querySelector('.slider-next')

    if (!container) return

    // Offscreen slides' lazy images would load (and resize the card) only
    // when navigated to -- small bounded set, so load them upfront.
    container.querySelectorAll('.swiper-slide img').forEach((img) => {
      img.loading = 'eager'
    })

    const max = Number(el.getAttribute('data-slider-swiper-per-view')) || 3
    const perView = (bp) => Math.min(PER_VIEW[bp], max)

    new Swiper(container, {
      modules: [Navigation, A11y],
      slidesPerView: perView('base'),
      spaceBetween: 16,
      grabCursor: true,
      watchOverflow: true,
      navigation: {
        prevEl,
        nextEl,
      },
      breakpoints: {
        768: { slidesPerView: perView(768), spaceBetween: 20 },
        992: { slidesPerView: perView(992), spaceBetween: 24 },
      },
      a11y: { enabled: true },
    })
  })
}
