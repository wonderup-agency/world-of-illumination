/*
Component: elastic-pulse-button
Webflow attribute: data-component="elastic-pulse-button"
*/

import { gsap } from 'gsap'

// Lock duration (ms) — ignores repeated mouseenter while the pulse plays
const HOVER_LOCK = 500
// Horizontal stretch as a fraction of the target's font size
const STRETCH_RATIO = 0.75

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='elastic-pulse-button']
 */
export default function (elements) {
  const mm = gsap.matchMedia()

  // Only run on devices with a real hover pointer and no reduced-motion preference
  mm.add(
    '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    () => {
      const cleanups = []

      elements.forEach((element) => {
        // Support data-component on a container (find buttons inside) or on the button itself
        const buttons = [
          ...element.querySelectorAll('[data-elastic-pulse-btn]'),
        ]
        if (element.matches('[data-elastic-pulse-btn]')) buttons.push(element)

        buttons.forEach((btn) => {
          const target = btn.querySelector('[data-elastic-pulse-target]') || btn
          let hoverLocked = false
          let tl

          const onEnter = () => {
            if (hoverLocked) return
            hoverLocked = true
            setTimeout(() => {
              hoverLocked = false
            }, HOVER_LOCK)

            const w = target.offsetWidth
            const h = target.offsetHeight
            const fs = parseFloat(getComputedStyle(target).fontSize)
            const stretch = STRETCH_RATIO * fs
            const sx = (w + stretch) / w
            const sy = (h - stretch * 0.33) / h

            tl?.kill()
            tl = gsap
              .timeline()
              .to(target, {
                scaleX: sx,
                scaleY: sy,
                duration: 0.1,
                ease: 'power1.out',
              })
              .to(target, {
                scaleX: 1,
                scaleY: 1,
                duration: 1,
                ease: 'elastic.out(1, 0.3)',
              })
          }

          btn.addEventListener('mouseenter', onEnter)
          cleanups.push(() => {
            btn.removeEventListener('mouseenter', onEnter)
            tl?.kill()
            gsap.set(target, { clearProps: 'transform' })
          })
        })
      })

      // Runs when the media query stops matching (e.g. hover → touch)
      return () => cleanups.forEach((fn) => fn())
    }
  )
}
