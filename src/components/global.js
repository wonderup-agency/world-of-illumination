import Lenis from 'lenis'
import '../styles/lenis.css'

/**
 * Site-wide setup. Runs on every page before components load.
 *
 * Initialises Lenis smooth scroll and wires it into GSAP's ticker + the global
 * ScrollTrigger (both provided by Webflow's GSAP library, not bundled) so every
 * scroll-driven component (e.g. guests) reads a smoothed scroll position.
 * Skipped entirely under prefers-reduced-motion.
 */
export default function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

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
