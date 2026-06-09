/*
Component: horizontal-scroll
Webflow attribute: data-component="horizontal-scroll"

Pins the section and scrolls its panels horizontally as the user scrolls
vertically (Osmo-style). Optional curtain effect via data-horizontal-pin:
the previous sibling section is pinned (kept static) while this section
rises over it like a curtain, then the horizontal scroll begins.

GSAP + ScrollTrigger are expected to be loaded globally (window.gsap /
window.ScrollTrigger) via CDN in Webflow — they are NOT bundled here.
*/

import './horizontal-scroll.css'

const PANEL_SELECTOR = '[data-horizontal-scroll-panel]'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='horizontal-scroll']
 */
export default function (elements) {
  const gsap = window.gsap
  const ScrollTrigger = window.ScrollTrigger

  if (!gsap || !ScrollTrigger) {
    console.warn(
      '[horizontal-scroll] GSAP or ScrollTrigger not found on window — skipping.'
    )
    return
  }

  gsap.registerPlugin(ScrollTrigger)

  const mm = gsap.matchMedia()

  mm.add(
    {
      isMobile: '(max-width:479px)',
      isMobileLandscape: '(max-width:767px)',
      isTablet: '(max-width:991px)',
      isDesktop: '(min-width:992px)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const { isMobile, isMobileLandscape, isTablet, reduceMotion } =
        context.conditions

      // Reduced motion: leave panels in natural flow, no pin, no scroll-jack.
      if (reduceMotion) return

      elements.forEach((section) => {
        // Per-breakpoint opt-out via data-horizontal-scroll-disable.
        const disable = section.getAttribute('data-horizontal-scroll-disable')
        if (
          (disable === 'mobile' && isMobile) ||
          (disable === 'mobileLandscape' && isMobileLandscape) ||
          (disable === 'tablet' && isTablet)
        ) {
          return
        }

        const panels = gsap.utils.toArray(PANEL_SELECTOR, section)
        if (panels.length < 2) return

        // Curtain effect: pin the previous section while this one rises over it.
        // Created before the horizontal trigger so refresh runs in page order.
        if (section.hasAttribute('data-horizontal-pin')) {
          const prev = section.previousElementSibling
          if (prev) {
            ScrollTrigger.create({
              trigger: prev,
              start: 'top top',
              end: '+=100%',
              pin: true,
              pinSpacing: false,
              invalidateOnRefresh: true,
            })
          } else {
            console.warn(
              '[horizontal-scroll] data-horizontal-pin set but no previous section found — skipping curtain.'
            )
          }
        }

        // Horizontal scroll: pin the section, translate panels along X.
        // ease:"none" keeps scroll position and panel position in sync.
        gsap.to(panels, {
          x: () => -(section.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => '+=' + (section.scrollWidth - window.innerWidth),
            scrub: true,
            pin: true,
            invalidateOnRefresh: true,
          },
        })
      })

      // matchMedia auto-reverts every tween / ScrollTrigger created above
      // when this combination of conditions stops matching.
    }
  )
}
