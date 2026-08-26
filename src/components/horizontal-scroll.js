/*
Component: horizontal-scroll
Webflow attribute: data-component="horizontal-scroll"

Pins the section and reveals its panels as the user scrolls vertically
(Osmo-style). Works with any number of panels (2+) — nothing here is
hardcoded to a count. Two modes, chosen automatically by the markup:

- Train mode (default): all panels translate left together.
- Curtain mode (when a leading panel has data-horizontal-scroll-pin): the
  pinned panel stays in place as a static base, the next panel slides in from
  the right over it like a curtain, then the remaining panels scroll
  horizontally as a normal train. Put data-horizontal-scroll-pin on the first
  panel to keep the first one pinned.

Optional per-instance attributes on the wrapper (all optional, all fall back
to the original 1:1 behavior when omitted):

- data-horizontal-scroll-distance="1.5" — scroll-distance multiplier. Above 1,
  more vertical scroll is needed to cover the same horizontal travel (slower,
  more scroll "invested" per panel); below 1, less. Default 1.
- data-horizontal-scroll-scrub="0.3" — lag (in seconds) between scroll input
  and panel movement, for a softer, less mechanical feel. Default: no lag
  (scrub: true, 1:1 with scroll).

GSAP + ScrollTrigger are expected to be loaded globally (window.gsap /
window.ScrollTrigger) via CDN in Webflow — they are NOT bundled here.
*/

import './horizontal-scroll.css'

const PANEL_SELECTOR = '[data-horizontal-scroll-panel]'
const PIN_ATTR = 'data-horizontal-scroll-pin'
const DEFAULT_DISTANCE = 1

const vw = () => window.innerWidth

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

      const cleanups = []

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

        const moving = panels.filter((p) => !p.hasAttribute(PIN_ATTR))
        const pinned = panels.filter((p) => p.hasAttribute(PIN_ATTR))
        const tuning = readTuning(section)

        if (pinned.length && moving.length) {
          cleanups.push(buildCurtain(section, pinned, moving, tuning))
        } else {
          buildTrain(section, panels, tuning)
        }
      })

      // matchMedia auto-reverts every tween / ScrollTrigger created above.
      // The DOM/class changes from curtain mode need manual teardown.
      return () => cleanups.forEach((fn) => fn())
    }
  )

  // Reads the optional per-instance overrides off the wrapper (see header
  // comment). Missing/invalid attributes fall back to the original behavior.
  function readTuning(section) {
    const distance = parseFloat(
      section.getAttribute('data-horizontal-scroll-distance')
    )
    const scrub = parseFloat(
      section.getAttribute('data-horizontal-scroll-scrub')
    )

    return {
      distance: Number.isFinite(distance) ? distance : DEFAULT_DISTANCE,
      scrub: Number.isFinite(scrub) ? scrub : true,
    }
  }

  // Curtain: pinned panels become static bases; the rest move inside a single
  // track. The track slides in from the right (curtain over the base), then
  // continues translating left through the remaining panels (train).
  // Returns a teardown that unwraps the track and removes added classes.
  function buildCurtain(section, pinned, moving, { distance, scrub }) {
    section.classList.add('is-curtain')
    pinned.forEach((p) => p.classList.add('is-base'))

    const track = document.createElement('div')
    track.className = 'horizontal__track'
    section.appendChild(track)
    moving.forEach((p) => track.appendChild(p))

    const trainSteps = moving.length - 1

    gsap.set(track, { x: vw })

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + vw() * moving.length * distance,
        scrub,
        pin: true,
        invalidateOnRefresh: true,
      },
    })
    tl.to(track, { x: 0, duration: 1 }) // curtain
    if (trainSteps > 0) {
      tl.to(track, { x: () => -vw() * trainSteps, duration: trainSteps }) // train
    }

    return () => {
      while (track.firstChild) section.insertBefore(track.firstChild, track)
      track.remove()
      section.classList.remove('is-curtain')
      pinned.forEach((p) => p.classList.remove('is-base'))
    }
  }

  // Train: pin the section, translate all panels along X. ease:"none" keeps
  // scroll position and panel position in sync.
  function buildTrain(section, panels, { distance, scrub }) {
    gsap.to(panels, {
      x: () => -(section.scrollWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + (section.scrollWidth - window.innerWidth) * distance,
        scrub,
        pin: true,
        invalidateOnRefresh: true,
      },
    })
  }
}
