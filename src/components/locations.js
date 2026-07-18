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

    const wrapper = container.querySelector('.swiper-wrapper')
    const slides = Array.from(container.querySelectorAll('.swiper-slide'))
    // Biases toward more items on the right for even slide counts (odd counts stay symmetric)
    const middleIndex = Math.floor((slides.length - 1) / 2)
    const newShowIndex = slides.findIndex(
      (slide) =>
        slide.matches('[data-locations-new-show="true"]') ||
        slide.querySelector('[data-locations-new-show="true"]')
    )

    // Physically move the flagged slide to the middle slot (CMS order stays untouched, only the DOM display order changes) so it lands centered with real neighbors on both sides, instead of just scrolling to it.
    if (wrapper && newShowIndex !== -1 && newShowIndex !== middleIndex) {
      const flaggedSlide = slides[newShowIndex]
      const remainingSlides = slides.filter((_, i) => i !== newShowIndex)
      wrapper.insertBefore(flaggedSlide, remainingSlides[middleIndex] ?? null)
    }

    new Swiper(container, {
      modules: [Navigation, A11y],
      slidesPerView: 'auto',
      centeredSlides: true,
      grabCursor: true,
      spaceBetween: 24,
      initialSlide: middleIndex,
      navigation: {
        prevEl,
        nextEl,
      },
      a11y: { enabled: true },
    })
  })
}
