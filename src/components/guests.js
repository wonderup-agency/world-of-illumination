/*
Component: guests
Webflow attribute: data-component="guests"
*/

// Uses the global GSAP + ScrollTrigger that Webflow injects (not bundled), so
// its ScrollTriggers share the instance driven by Lenis in global.js.
const Y_TRAVEL = 760 // px of travel for a speed=1 layer, scaled per data-speed
const SCRUB = 0.6 // seconds of scrub catch-up (smooth follow, not 1:1)

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='guests']
 */
export default function (elements) {
  const { gsap, ScrollTrigger } = window
  if (!gsap || !ScrollTrigger) return
  gsap.registerPlugin(ScrollTrigger)

  const mm = gsap.matchMedia()

  elements.forEach((section) => {
    mm.add(
      {
        isDesktop: '(min-width: 992px)',
        reduce: '(prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        if (!ctx.conditions.isDesktop || ctx.conditions.reduce) return

        const images = gsap.utils.toArray('[data-speed]', section)
        if (!images.length) return

        const layers = images.map((el) => ({
          el,
          travel: (parseFloat(el.dataset.speed) || 0.2) * Y_TRAVEL,
          setY: gsap.quickSetter(el, 'y', 'px'),
        }))

        // Scrub-driven vertical parallax. A proxy tween gives the scrub-smoothed
        // progress; each layer drifts up at its own rate (from data-speed).
        const proxy = { p: 0 }
        const driver = gsap.to(proxy, {
          p: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: SCRUB,
            invalidateOnRefresh: true,
          },
          onUpdate: () =>
            layers.forEach((l) =>
              l.setY(gsap.utils.interpolate(l.travel, -l.travel, proxy.p))
            ),
        })

        // Cleanup when leaving the breakpoint (matchMedia auto-reverts tweens).
        return () => {
          driver.scrollTrigger && driver.scrollTrigger.kill()
          driver.kill()
          layers.forEach((l) => {
            gsap.killTweensOf(l.el)
            gsap.set(l.el, { clearProps: 'transform' })
          })
        }
      }
    )
  })
}
