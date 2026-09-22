/*
Component: image-parallax
Webflow attribute: data-component="image-parallax"

Simple scroll parallax for a single full-bleed image: the image drifts
vertically inside its own frame as the section scrolls through the
viewport. Desktop only (>=992px).

Generic — works on any [data-component="image-parallax"] wrapper containing
an <img> anywhere inside it, regardless of Webflow class names. Reuse this
on any other section that needs the same effect (see
.claude/rules/ANIMATIONS.md for the catalog of reusable animations).

Deliberately does not force any aspect-ratio or fixed height onto the
image's frame — that was tried and repeatedly produced a badly-cropped
frame, because it required guessing a ratio that matched the source photo.
Instead the image keeps its exact natural Webflow size (untouched), gets
scaled up slightly around its own center, and the travel distance is
measured from its own real rendered height at runtime — so there is no
fixed px value that can ever be wrong for a given image/breakpoint, and
the frame can never show an edge.

Uses the global GSAP + ScrollTrigger that Webflow injects (not bundled), so
its ScrollTrigger shares the instance driven by Lenis in global.js — same
pattern as guests.js.
*/

import '../styles/image-parallax.css'

// ScrollTrigger's start/end markers. window.imageParallaxDebug() works with
// this off — see the note where it is assigned.
const DEBUG = false

// Temporary — an on-page readout (no console needed) so the live numbers are
// visible just by looking at the page while scrolling. Flip to true again if
// this ever needs live debugging without opening the console.
const HUD = false

// How much bigger than its natural size the image is scaled, around its own
// center — this is what creates the slack it can drift inside without ever
// exposing an edge. 1.3 = 30% bigger, giving 15% of the image's own
// rendered height as slack on each side.
const SCALE = 1.3

// How much of that available slack the parallax actually uses (0-1).
// Kept under 1 so the travel never touches the very edge of the slack, even
// with a slightly-late resize. Overridable per instance via
// data-image-parallax-speed.
const DEFAULT_SPEED = 0.8

const SCRUB = 0.8 // seconds of scrub catch-up (smooth follow, not 1:1)
const ACTIVE_CLASS = 'is-image-parallax'
const instances = []

// Temporary on-page readout — see HUD above.
function buildHud() {
  const el = document.createElement('div')
  el.textContent = 'image-parallax — waiting for the page to settle'
  el.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;' +
    'background:#000;color:#4ade80;font:12px/1.4 monospace;' +
    'padding:6px 10px;pointer-events:none;'
  document.body.appendChild(el)
  return el
}

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='image-parallax']
 */
export default function (elements) {
  const { gsap, ScrollTrigger } = window
  if (!gsap || !ScrollTrigger) {
    console.warn(
      '[image-parallax] GSAP or ScrollTrigger not found on window — skipping.'
    )
    return
  }
  gsap.registerPlugin(ScrollTrigger)

  const hud = HUD ? buildHud() : null

  // Everything below — matchMedia, every ScrollTrigger this component
  // creates — is deliberately deferred until window 'load', run exactly
  // once, and never re-measured after that on our own initiative.
  //
  // Why: this section sits right after horizontal-scroll's pinned wrapper.
  // horizontal-scroll.js builds its pin (and the spacer that reserves its
  // scroll distance) synchronously the moment its own module runs — but
  // that's a separate dynamic import (see main.js), resolved independently
  // of this component's, with no ordering guarantee between the two. If
  // this component measures its own trigger before that pin/spacer exists,
  // the page looks shorter than it really is and this trigger's start/end
  // land too close to the top. 'load' fires only once every image and font
  // has settled, by which point every component's dynamic import has long
  // since resolved and run (module fetch/parse is trivially fast next to
  // image loading) — so it's a safe, single point where the whole page's
  // real layout, pin included, is guaranteed final.
  //
  // A `ScrollTrigger.refresh()` re-triggered on every later layout change
  // (a ResizeObserver on document.body) was tried in between and reverted:
  // calling refresh() while the user is actively scrolling through (or
  // just past) a *pinned* trigger is a known rough edge in GSAP — it can
  // briefly measure the page mid pin-transition and hand back the wrong
  // start/end for triggers after it, which is what produced this
  // component's progress visibly swinging around *during* the
  // horizontal-scroll section instead of only reacting after it. A single
  // clean measurement, taken once when the page is genuinely idle, doesn't
  // have that failure mode.
  const init = () => {
    const mm = gsap.matchMedia()

    elements.forEach((section) => {
      const img = section.querySelector('img')
      if (!img) {
        console.warn(
          '[image-parallax] no <img> found inside — skipping.',
          section
        )
        return
      }

      mm.add(
        '(min-width: 992px) and (prefers-reduced-motion: no-preference)',
        () => {
          const speed =
            parseFloat(section.dataset.imageParallaxSpeed) || DEFAULT_SPEED

          // scale() doesn't change offsetHeight (transforms don't affect
          // layout), so this reads the image's real, untouched rendered
          // height — whatever it actually is at this breakpoint, for this
          // photo, no guessing.
          gsap.set(img, { scale: SCALE, transformOrigin: '50% 50%' })
          const slack = (img.offsetHeight * (SCALE - 1)) / 2
          const travel = slack * Math.min(speed, 1)
          const setY = gsap.quickSetter(img, 'y', 'px')

          // The image's own direct parent is the "frame" — clipped here in
          // JS rather than requiring a specific Webflow class in CSS, so
          // this component works on any wrapper > img structure, not just
          // section_full-image's own .full-image_component.
          const frame = img.parentElement
          const previousOverflow = frame.style.overflow
          frame.style.overflow = 'hidden'

          section.classList.add(ACTIVE_CLASS)

          // Scrub-driven proxy: a 0-1 proxy tween gives the smoothed scroll
          // progress, the image is mapped from -travel to +travel across it
          // so it drifts both ways symmetrically around its resting
          // position (same technique as guests.js's layers).
          const proxy = { p: 0 }
          const driver = gsap.to(proxy, {
            p: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: SCRUB,
              markers: DEBUG,
            },
            onUpdate: () => {
              const y = gsap.utils.interpolate(-travel, travel, proxy.p)
              setY(y)
              if (hud) {
                hud.textContent = `image-parallax — progress ${proxy.p.toFixed(3)} · offset ${y.toFixed(1)}px · travel ±${travel.toFixed(1)}px · slack ${slack.toFixed(1)}px`
              }
            },
          })

          const instance = { section, img, driver, travel, slack }
          instances.push(instance)

          return () => {
            instances.splice(instances.indexOf(instance), 1)
            section.classList.remove(ACTIVE_CLASS)
            frame.style.overflow = previousOverflow
            driver.scrollTrigger && driver.scrollTrigger.kill()
            driver.kill()
            gsap.set(img, { clearProps: 'transform' })
          }
        }
      )
    })
  }

  if (document.readyState === 'complete') {
    init()
  } else {
    window.addEventListener('load', init, { once: true })
  }

  // Call window.imageParallaxDebug() from the console to see the live
  // numbers for every active instance. Not gated behind a debug flag —
  // needing a rebuild and reload to inspect a bug means inspecting it after
  // it's gone.
  window.imageParallaxDebug = () => {
    if (!instances.length) {
      console.warn(
        "[image-parallax] no active instances (below 992px, or the page hasn't finished loading yet?)."
      )
      return
    }
    console.table(
      instances.map(({ section, driver, travel, slack, img }) => {
        const st = driver.scrollTrigger
        const rect = section.getBoundingClientRect()
        return {
          start: st ? Math.round(st.start) : '—',
          end: st ? Math.round(st.end) : '—',
          progress: st ? st.progress.toFixed(3) : '—',
          isActive: st ? st.isActive : '—',
          slack: Math.round(slack),
          travel: Math.round(travel),
          'img height': img.offsetHeight,
          'section top': Math.round(rect.top),
          'section bottom': Math.round(rect.bottom),
          scrollY: Math.round(window.scrollY),
        }
      })
    )
  }
}
