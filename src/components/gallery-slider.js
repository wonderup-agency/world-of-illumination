/*
Component: gallery-slider
Webflow attribute: data-component="gallery-slider"
*/

import Swiper from 'swiper'
import { Navigation, A11y } from 'swiper/modules'
import '../styles/gallery-slider.css'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='gallery-slider']
 */
export default function (elements) {
  elements.forEach((el) => {
    const container = el.querySelector('.swiper')
    const prevEl = el.querySelector('.slider-prev')
    const nextEl = el.querySelector('.slider-next')

    if (!container) return

    const slideCount = container.querySelectorAll('.swiper-slide').length
    const middleIndex = Math.floor((slideCount - 1) / 2)

    new Swiper(container, {
      modules: [Navigation, A11y],
      centeredSlides: true,
      slidesPerView: 1.2,
      spaceBetween: 16,
      grabCursor: true,
      initialSlide: middleIndex,
      navigation: {
        prevEl,
        nextEl,
      },
      breakpoints: {
        480: { slidesPerView: 1.6, spaceBetween: 16 },
        768: { slidesPerView: 2.4, spaceBetween: 20 },
        992: { slidesPerView: 3.4, spaceBetween: 24 },
      },
      a11y: { enabled: true },
    })
  })
}
