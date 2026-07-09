/*
Component: text-fill
Webflow attribute: data-component="text-fill"
*/

import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

// Fraction of viewport height (0 = top, 1 = bottom) where the element's TOP
// must be for the fill to start. 1 = starts right as it enters; lower values
// delay the start until it's further into view.
const START_VH = 0.85
// Fraction of viewport height where the element's CENTER must be for the
// fill to be fully complete. Lower values = more scroll distance = slower.
const END_VH = 0.3
// How many words' worth of scroll progress each word takes to fully
// transition. 1 = hard word-by-word cutoff; higher = softer, overlapping fade.
const SPREAD = 4
const ease = gsap.parseEase('sine.inOut')

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='text-fill']
 */
export default function (elements) {
  const ticks = []

  elements.forEach((element) => {
    const split = SplitText.create(element, { type: 'words' })
    const words = split.words
    if (!words.length) return

    const startColor = getComputedStyle(words[0]).color
    const setters = words.map((word) => gsap.quickSetter(word, 'color'))
    const total = words.length
    const span = total - 1 + SPREAD

    function tick() {
      const rect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const center = rect.top + rect.height / 2
      const startCenter = viewportHeight * START_VH + rect.height / 2
      const endCenter = viewportHeight * END_VH
      const progress = Math.max(
        0,
        Math.min(1, (startCenter - center) / (startCenter - endCenter))
      )

      setters.forEach((set, i) => {
        const wordProgress = Math.max(
          0,
          Math.min(1, (progress * span - i) / SPREAD)
        )
        set(gsap.utils.interpolate(startColor, '#ffffff', ease(wordProgress)))
      })
    }

    let scheduled = false
    function onScroll() {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        tick()
        scheduled = false
      })
    }

    tick()
    window.addEventListener('scroll', onScroll, { passive: true })
    ticks.push(tick)
  })

  return {
    resize() {
      ticks.forEach((tick) => tick())
    },
  }
}
