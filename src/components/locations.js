/*
Component: locations
Webflow attribute: data-component="locations"
*/

import Swiper from 'swiper'
import { Navigation, A11y } from 'swiper/modules'
import '../styles/locations.css'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='locations']
 */
export default function (elements) {
  elements.forEach((el) => {
    const container = el.querySelector('.swiper')
    const prevEl = el.querySelector('.slider-prev')
    const nextEl = el.querySelector('.slider-next')

    if (!container) return

    new Swiper(container, {
      modules: [Navigation, A11y],
      slidesPerView: 'auto',
      centeredSlides: true,
      grabCursor: true,
      spaceBetween: 24,
      navigation: {
        prevEl,
        nextEl,
      },
      a11y: { enabled: true },
    })
  })
}
