/*
Component: slider-swiper
Webflow attribute: data-component="slider-swiper"
*/

import Swiper from 'swiper'
import { Navigation, A11y } from 'swiper/modules'
import '../styles/slider-swiper.css'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='slider-swiper']
 */
export default function (elements) {
  elements.forEach((el) => {
    const container = el.querySelector('.swiper')
    const prevEl = el.querySelector('.slider-prev')
    const nextEl = el.querySelector('.slider-next')

    if (!container) return

    new Swiper(container, {
      modules: [Navigation, A11y],
      slidesPerView: 1,
      spaceBetween: 16,
      grabCursor: true,
      watchOverflow: true,
      navigation: {
        prevEl,
        nextEl,
      },
      breakpoints: {
        768: { slidesPerView: 2, spaceBetween: 20 },
        992: { slidesPerView: 3, spaceBetween: 24 },
      },
      a11y: { enabled: true },
    })
  })
}
