/*
Component: gallery-slider
Webflow attribute: data-component="gallery-slider"
*/

import Swiper from 'swiper'
import { Navigation, A11y } from 'swiper/modules'
import '../styles/gallery-slider.css'

// Swiper's loop needs enough real slides to duplicate around the loop
// boundary — with centeredSlides and up to 3.4 slides peeking at once on
// desktop, a short CMS/Webflow list (e.g. 6-9 images) isn't always enough on
// its own and Swiper silently disables the loop ("not enough slides for loop
// mode... add more slides or make duplicates"). Padding the real set with
// extra rounds of the same slides guarantees a clean loop regardless of item
// count or screen width — same technique as theme-carousel.js.
const MIN_SLIDES_FOR_LOOP = 16

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='gallery-slider']
 */
export default function (elements) {
  elements.forEach((el) => {
    const container = el.querySelector('.swiper')
    const wrapper = container?.querySelector('.swiper-wrapper')
    const prevEl = el.querySelector('.slider-prev')
    const nextEl = el.querySelector('.slider-next')

    if (!container || !wrapper) return

    const realSlides = Array.from(wrapper.querySelectorAll('.swiper-slide'))
    const middleIndex = Math.floor((realSlides.length - 1) / 2)
    // Loop mode needs 2+ real slides to mean anything — with fewer, fall
    // back to the normal stop-at-the-ends behavior instead of asking Swiper
    // to loop a single slide.
    const loop =
      el.hasAttribute('data-gallery-slider-loop') && realSlides.length > 1

    if (loop) {
      while (wrapper.children.length < MIN_SLIDES_FOR_LOOP) {
        realSlides.forEach((slide) => {
          const clone = slide.cloneNode(true)
          clone.setAttribute('aria-hidden', 'true')
          wrapper.appendChild(clone)
        })
      }
    }

    new Swiper(container, {
      modules: [Navigation, A11y],
      centeredSlides: true,
      slidesPerView: 1.2,
      spaceBetween: 16,
      grabCursor: true,
      watchOverflow: !loop,
      loop,
      loopAdditionalSlides: loop ? 2 : 0,
      initialSlide: loop ? 0 : middleIndex,
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
