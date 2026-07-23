import Lenis from 'lenis'
import '../styles/lenis.css'

// Fixed/sticky nav bars that can stack above page content (the site's main
// nav + the location-template subnav). Their live height is measured on
// every anchor click so in-page links land clear of them, regardless of
// breakpoint or future height changes in Webflow.
const FIXED_NAV_SELECTOR = '.nav_component, .subnav_component'

// Section wrappers in this project start with a fixed-height "Spacer / Section"
// element before their real content, so landing exactly at a section's top
// (its `id`) leaves that empty spacer visible as a gap. Scroll this many extra
// px past the nav offset to land closer to the section's actual content.
// Tune this if the gap still looks off — it's a flat estimate, not measured
// per section.
const SECTION_SPACER = 130

/**
 * Site-wide setup. Runs on every page before components load.
 *
 * Initialises Lenis smooth scroll and wires it into GSAP's ticker + the global
 * ScrollTrigger (both provided by Webflow's GSAP library, not bundled) so every
 * scroll-driven component (e.g. guests) reads a smoothed scroll position.
 * Also wires in-page anchor links (e.g. subnav `#section` links) to account
 * for fixed nav height — Lenis is skipped under prefers-reduced-motion, but
 * the anchor offset fix still applies.
 */
export default function () {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  setupAnchorScroll(reducedMotion)

  if (reducedMotion) return

  const { gsap, ScrollTrigger } = window

  // autoRaf: false — Lenis is driven by GSAP's ticker below, not its own loop.
  const lenis = new Lenis({ lerp: 0.08, smoothWheel: true, autoRaf: false })
  window.lenis = lenis

  if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger)
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)

    // Recompute scroll limit + trigger positions once async content
    // (Finsweet lists, fonts, images) has settled the page height.
    window.addEventListener('load', () => {
      lenis.resize()
      ScrollTrigger.refresh()
    })
  } else {
    // GSAP not present — drive Lenis with a plain rAF loop.
    const raf = (time) => {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
    window.addEventListener('load', () => lenis.resize())
  }
}

function setupAnchorScroll(reducedMotion) {
  // Capture phase + stopPropagation: some of these links are set up in Webflow
  // as native same-page "Section" links, which come with Webflow's own scroll-
  // to-section behavior baked in — running independently of (and un-cancelled
  // by) our preventDefault below, causing a visible "lands wrong, then corrects"
  // double-scroll. Intercepting on the way down (capture) stops it from ever
  // reaching Webflow's own click handling, so ours is the only one that runs.
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest('a[href^="#"]')
      if (!link || link.getAttribute('href') === '#') return

      const target = document.querySelector(link.getAttribute('href'))
      if (!target) return

      event.preventDefault()
      event.stopPropagation()
      const offset = getFixedNavHeight() - SECTION_SPACER

      // Until the window `load` event fires, the Lenis resize/ScrollTrigger.refresh
      // handler below can reset an in-progress scrollTo mid-animation (Lenis's own
      // resize() snaps targetScroll back to the current position), causing a visible
      // stop-then-correct jump. Jump immediately in that window; animate normally once
      // the page (and its images) have fully settled.
      const immediate = reducedMotion || document.readyState !== 'complete'

      if (window.lenis) {
        window.lenis.scrollTo(target, { offset: -offset, immediate })
      } else {
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - offset,
          behavior: immediate ? 'auto' : 'smooth',
        })
      }
    },
    { capture: true }
  )
}

function getFixedNavHeight() {
  let height = 0
  document.querySelectorAll(FIXED_NAV_SELECTOR).forEach((bar) => {
    const style = getComputedStyle(bar)
    if (style.position !== 'fixed' && style.position !== 'sticky') return
    if (style.visibility === 'hidden' || Number(style.opacity) === 0) return

    // A bar that hides itself on scroll (e.g. translateY off-screen) can stay
    // `position: fixed` the whole time — only count it while it's actually
    // occupying space at the top of the viewport, or hidden bars still get
    // added to the offset and leave an unwanted gap above the target section.
    const rect = bar.getBoundingClientRect()
    if (rect.bottom > 0) height += rect.height
  })
  return height
}
