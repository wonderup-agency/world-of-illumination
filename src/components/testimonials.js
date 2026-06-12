/*
Component: testimonials
Webflow attribute: data-component="testimonials"
*/

import Swiper from 'swiper'
import { Navigation, Pagination, A11y } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import '../styles/testimonials.css'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='testimonials']
 */
export default function (elements) {
  elements.forEach((el) => {
    const container = el.querySelector('.swiper')
    const prevEl = el.querySelector('.slider-prev-absolute')
    const nextEl = el.querySelector('.slider-next-absolute')
    const paginationEl = el.querySelector('.swiper-pagination')

    if (!container) return

    new Swiper(container, {
      modules: [Navigation, Pagination, A11y],
      slidesPerView: 1,
      loop: true,
      navigation: {
        prevEl,
        nextEl,
      },
      pagination: {
        el: paginationEl,
        clickable: true,
      },
      a11y: { enabled: true },
    })
  })
}
