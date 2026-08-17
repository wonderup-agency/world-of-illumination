/*
Component: guests
Webflow attribute: data-component="guests"
*/

import '../styles/guests.css'

// Uses the global GSAP + ScrollTrigger that Webflow injects (not bundled), so
// its ScrollTriggers share the instance driven by Lenis in global.js.

// Travel in px for a speed=1 layer, per breakpoint — each layer's own
// data-speed scales it down from here. Below 992px Webflow hides the
// .hide-tablet spacers (160 + 160 + 80px), so the section collapses to roughly
// one viewport and the `top bottom -> bottom top` range shrinks with it.
// Reusing the desktop throw down there would play the same movement over about
// half the scroll distance, which is exactly how a parallax starts looking
// broken on a phone — hence a shorter throw at every step down, alongside the
// smaller cards guests.css lays out.
const Y_TRAVEL = {
  desktop: 760,
  tablet: 480,
  mobileLandscape: 320,
  mobile: 200,
}
const SCRUB = 0.6 // seconds of scrub catch-up (smooth follow, not 1:1)
const ACTIVE_CLASS = 'is-guests-parallax'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='guests']
 */
export default function (elements) {
  const { gsap, ScrollTrigger } = window
  if (!gsap || !ScrollTrigger) return
  gsap.registerPlugin(ScrollTrigger)

  // ScrollTrigger.config({ ignoreMobileResize: true }) — which this component
  // needs so the address bar retracting mid-scroll cannot refresh the parallax
  // into a jump — lives in global.js, next to the rest of the Lenis wiring,
  // since section-reveal runs below 992px now too and needs the same thing.

  const mm = gsap.matchMedia()

  elements.forEach((section) => {
    mm.add(
      {
        desktop: '(min-width: 992px)',
        tablet: '(min-width: 768px) and (max-width: 991px)',
        mobileLandscape: '(min-width: 480px) and (max-width: 767px)',
        mobile: '(max-width: 479px)',
        reduce: '(prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        if (ctx.conditions.reduce) return

        // The four width ranges are mutually exclusive, so at most one matches.
        const size = Object.keys(Y_TRAVEL).find((key) => ctx.conditions[key])
        if (!size) return

        // offsetParent is null for anything guests.css display:none's (the three
        // slowest cards on mobile portrait), so those never get a per-frame
        // write for a card that would not paint anyway.
        const images = gsap.utils
          .toArray('[data-speed]', section)
          .filter((el) => el.offsetParent)
        if (!images.length) return

        const layers = images.map((el) => ({
          el,
          travel: (parseFloat(el.dataset.speed) || 0.2) * Y_TRAVEL[size],
          setY: gsap.quickSetter(el, 'y', 'px'),
        }))

        // Only set while the parallax actually runs, so guests.css clips the
        // drift back to the section. Webflow sets .section_guests to
        // overflow: visible at <=479px and section-reveal's clip-path is
        // desktop-only, so without this the cards would drift out over the
        // neighbouring sections on a phone.
        section.classList.add(ACTIVE_CLASS)

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

        // Cleanup runs on every crossing between these queries, not just on the
        // way out to reduced motion — a card must never keep a transform sized
        // for the breakpoint it just left.
        return () => {
          section.classList.remove(ACTIVE_CLASS)
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
