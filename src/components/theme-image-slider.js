/*
Component: theme-image-slider
Webflow attribute: data-component="theme-image-slider"
*/

import gsap from 'gsap'
import '../styles/theme-image-slider.css'

const SLIDE_DURATION = 4 // seconds each image stays visible before crossfading
const FADE_DURATION = 0.8 // crossfade duration in seconds

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='theme-image-slider']
 */
export default function (elements) {
  elements.forEach((el) => {
    const slides = [...el.querySelectorAll('.themes_image')]
    if (slides.length < 2) return

    const duration =
      parseFloat(el.getAttribute('data-theme-slider-duration')) ||
      SLIDE_DURATION

    gsap.set(slides, { autoAlpha: 0 })
    gsap.set(slides[0], { autoAlpha: 1 })

    let index = 0
    let timer = null

    function advance() {
      const current = slides[index]
      index = (index + 1) % slides.length
      const next = slides[index]

      gsap.to(current, {
        autoAlpha: 0,
        duration: FADE_DURATION,
        ease: 'power1.inOut',
      })
      gsap.to(next, {
        autoAlpha: 1,
        duration: FADE_DURATION,
        ease: 'power1.inOut',
      })

      timer = gsap.delayedCall(duration, advance)
    }

    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      timer = gsap.delayedCall(duration, advance)

      return () => {
        if (timer) timer.kill()
        timer = null
      }
    })
  })
}
