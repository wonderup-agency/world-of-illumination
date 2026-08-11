/*
Component: image-grow
Webflow attribute: data-component="image-grow"

Pins the section in place while a centered image grows from a rectangular
"card" to fill the screen, then releases and lets scroll continue normally.

No ScrollTrigger / pin: the hold is native `position: sticky` (same technique
as footer.js) and the growth is `clip-path` with an animated corner radius
(same technique as section-reveal.js's `expand` variant) — both chosen
specifically because ScrollTrigger's pin fights Lenis on this site (see the
comment above buildExpand in section-reveal.js for the full mechanism). Runs
on the bundled `gsap` package only (matchMedia + parseEase) — no CDN script
tag required in Webflow, unlike horizontal-scroll/tabs-map/section-reveal.

Desktop only (gsap.matchMedia, ≥992px, no-preference motion): below that, or
under reduced motion, the image renders as a plain static image — no pin, no
clip-path, no spacer.
*/

import gsap from 'gsap'
import '../styles/image-grow.css'

const PIN = "[data-image-grow='pin']"
const TARGET = "[data-image-grow='target']"

// Rest-state card size, in rem — a fixed size rather than a viewport
// percentage, so the shape (portrait/landscape/square) stays whatever was
// designed regardless of the browser window's own aspect ratio. Converted to
// a clip-path inset % against the live viewport in sync(), so it still holds
// its shape across breakpoints/resizes.
const DEFAULT_REST_WIDTH = 22 // rem
const DEFAULT_REST_HEIGHT = 26 // rem
const DEFAULT_RADIUS = 2 // rem corner radius at rest
const DEFAULT_DISTANCE = 1.6 // viewports of scroll the grow takes

// Fraction of the pin held back as dead scroll after the clip-path finishes,
// so the growth reads as done before the pin releases rather than snapping
// mid-grow on a fast scroll.
const TAIL = 0.15

// How much of the gap to the live scroll position is closed per frame — same
// value global.js uses for Lenis's own lerp, so this reads as consistent with
// the rest of the page's scroll feel. Lower = smoother/slower to catch up.
const SMOOTH = 0.08

// Below this gap between the smoothed and live values, treat the animation as
// settled and stop ticking rather than chasing a fraction of a percent forever.
const SETTLE_EPSILON = 0.0008

const ACTIVE_CLASS = 'is-image-grow'
const SPACER_CLASS = 'image-grow_reveal-spacer'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='image-grow']
 */
export default function (elements) {
  const instances = elements
    .map((section) => {
      const pin = section.querySelector(PIN)
      const target = pin ? pin.querySelector(TARGET) : null

      if (!pin || !target) {
        console.warn(
          "[image-grow] missing [data-image-grow='pin'] or [data-image-grow='target'] — skipping.",
          section
        )
        return null
      }

      return {
        section,
        pin,
        target,
        restWidth: numberAttr(pin, 'data-image-grow-width', DEFAULT_REST_WIDTH),
        restHeight: numberAttr(
          pin,
          'data-image-grow-height',
          DEFAULT_REST_HEIGHT
        ),
        radius: numberAttr(pin, 'data-image-grow-radius', DEFAULT_RADIUS),
        distance: numberAttr(pin, 'data-image-grow-distance', DEFAULT_DISTANCE),
        insetX: 0,
        insetY: 0,
        spacer: null,
        spacerHeight: 0,
        // The smoothed, displayed progress — null until the first tick seeds
        // it from the live scroll position, so a page that loads mid-section
        // (e.g. restored scroll position) doesn't visibly animate in from 0.
        current: null,
      }
    })
    .filter(Boolean)

  if (!instances.length) return

  const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value)
  const clampInset = (value) => (value < 0 ? 0 : value > 49 ? 49 : value)
  // 'none' (linear) on purpose — an 'out' curve (power2.out, the previous
  // value here) front-loads the visual change: fast in the first stretch of
  // scroll, then decelerating hard as it approaches full-bleed, which reads
  // as "rushes at first, drags at the end". Linear keeps the growth rate
  // constant across the whole range instead.
  const ease = gsap.parseEase('none')

  const rootFontSize = () =>
    parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

  // Progress is read off the spacer's own rect rather than the pin's — the pin
  // is sticky, so its rect stays clamped at top:0 the whole time it is stuck
  // and can't tell us how far through that stuck window the scroll is. The
  // spacer is a plain, unpositioned element that keeps moving 1:1 with scroll,
  // so `viewport - spacer.top` is exactly the scroll consumed since the pin
  // engaged, and dividing by the spacer's own height turns that into 0-1.
  const liveProgress = (instance) => {
    const viewport = window.innerHeight
    return clamp01(
      (viewport - instance.spacer.getBoundingClientRect().top) /
        instance.spacerHeight
    )
  }

  const paint = (instance) => {
    const { target, insetX, insetY, radius, current } = instance
    const grown = ease(clamp01(current / (1 - TAIL)))
    const remaining = 1 - grown

    target.style.clipPath = `inset(${insetY * remaining}% ${
      insetX * remaining
    }% ${insetY * remaining}% ${insetX * remaining}% round ${
      radius * remaining
    }rem)`
  }

  // Runs every frame while any instance hasn't caught up to the live scroll
  // position yet, then stops itself — a short-lived loop, not a permanent
  // page-wide ticker. onScroll restarts it on the next scroll event.
  //
  // Every read first, then every write — same discipline as footer.js. A
  // clip-path write is layout-neutral on its own, but most browsers still
  // force a synchronous layout flush on the next getBoundingClientRect() if
  // anything on the page was written since the last frame, so interleaving
  // read-then-write per instance would cost one extra forced layout per
  // instance whenever more than one image-grow section is on the same page.
  let ticking = false
  const tick = () => {
    let unsettled = false

    instances.forEach((instance) => {
      if (!instance.spacer || !instance.spacerHeight) return

      const raw = liveProgress(instance)
      if (instance.current === null) {
        instance.current = raw
      } else {
        instance.current += (raw - instance.current) * SMOOTH
        if (Math.abs(raw - instance.current) > SETTLE_EPSILON) {
          unsettled = true
        }
      }
    })

    instances.forEach((instance) => {
      if (instance.spacer && instance.spacerHeight) paint(instance)
    })

    if (unsettled) {
      requestAnimationFrame(tick)
    } else {
      ticking = false
    }
  }

  const requestTick = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(tick)
  }

  const onScroll = () => requestTick()

  // Re-measures everything that depends on the live viewport: the spacer's
  // length and — since the rest-state card size is a fixed rem, not a
  // viewport percentage — the clip-path insets that reproduce it at the
  // current window size.
  const sync = () => {
    const rootPx = rootFontSize()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    instances.forEach((instance) => {
      instance.insetX = clampInset(
        ((1 - (instance.restWidth * rootPx) / viewportW) / 2) * 100
      )
      instance.insetY = clampInset(
        ((1 - (instance.restHeight * rootPx) / viewportH) / 2) * 100
      )
      instance.spacerHeight = instance.distance * viewportH
      if (instance.spacer) {
        instance.spacer.style.height = `${instance.spacerHeight}px`
      }
    })

    requestTick()
  }

  // Every invariant here is enforced by image-grow.css. A failure means the
  // stylesheet never made it onto the page (a cached dist/styles.css is the
  // usual culprit) or something in Webflow is winning over it — not something
  // to fix per instance. Checked once, right after activation: the pin's
  // `position` doesn't depend on images/fonts settling, so there is no need
  // to wait for load. Without this CSS the pin stays in normal flow (not
  // centered, not full-bleed) and the target never grows past its natural
  // size, which reads as "nothing is happening" even though the clip-path is
  // still being written every frame.
  const verify = () => {
    instances.forEach((instance) => {
      if (getComputedStyle(instance.pin).position !== 'sticky') {
        console.warn(
          "[image-grow] the pin isn't rendering position: sticky — image-grow.css may not be loaded (check for a cached dist/styles.css) or a Webflow rule is overriding it. The pin will stay in normal flow and the image will not grow.",
          instance.pin
        )
      }
    })
  }

  // Call window.imageGrowDebug() from the console at the exact moment
  // something looks wrong — it dumps the live geometry of every instance.
  // Deliberately not behind a DEBUG flag, same reasoning as
  // section-reveal.js's window.sectionRevealDebug(): needing a rebuild and a
  // reload to inspect a bug means inspecting it after it is gone.
  window.imageGrowDebug = () => {
    if (!instances.length) {
      console.warn('[image-grow] no instances — nothing to report.')
      return
    }

    const rows = instances.map((instance) => {
      const pinRect = instance.pin.getBoundingClientRect()
      const spacerRect = instance.spacer
        ? instance.spacer.getBoundingClientRect()
        : null

      return {
        active,
        'pin position': getComputedStyle(instance.pin).position,
        'pin width': Math.round(pinRect.width),
        'window width': window.innerWidth,
        'pin top': Math.round(pinRect.top),
        'spacer top': spacerRect ? Math.round(spacerRect.top) : '—',
        spacerHeight: instance.spacerHeight,
        insetX: instance.insetX.toFixed(1),
        insetY: instance.insetY.toFixed(1),
        raw: instance.spacer ? liveProgress(instance).toFixed(3) : '—',
        current: instance.current === null ? '—' : instance.current.toFixed(3),
        clipPath: instance.target.style.clipPath,
      }
    })

    console.groupCollapsed(`[image-grow] ${rows.length} instance(s)`)
    console.table(rows)
    console.log(JSON.stringify(rows))
    console.groupEnd()
  }

  let active = false

  gsap
    .matchMedia()
    .add(
      '(min-width: 992px) and (prefers-reduced-motion: no-preference)',
      () => {
        active = true

        instances.forEach((instance) => {
          instance.section.classList.add(ACTIVE_CLASS)

          const spacer = document.createElement('div')
          spacer.className = SPACER_CLASS
          spacer.setAttribute('aria-hidden', 'true')
          instance.pin.after(spacer)
          instance.spacer = spacer
        })

        sync()
        verify()
        window.addEventListener('scroll', onScroll, { passive: true })
        // Images/fonts settle the final page height after DOMContentLoaded.
        window.addEventListener('load', sync, { once: true })

        // Cleanup when leaving desktop/motion-safe — undo everything above so
        // the image falls back to a plain static image.
        return () => {
          active = false
          window.removeEventListener('scroll', onScroll)
          window.removeEventListener('load', sync)
          instances.forEach((instance) => {
            instance.section.classList.remove(ACTIVE_CLASS)
            instance.spacer.remove()
            instance.spacer = null
            instance.spacerHeight = 0
            instance.current = null
            instance.target.style.clipPath = ''
          })
        }
      }
    )

  return {
    // Runs on window resize (debounced 150ms) — only meaningful while active;
    // gsap.matchMedia handles enter/leave of the 992px breakpoint itself.
    resize: () => {
      if (active) sync()
    },
  }
}

function numberAttr(element, attribute, fallback) {
  if (!element.hasAttribute(attribute)) return fallback
  const value = parseFloat(element.getAttribute(attribute))
  return Number.isFinite(value) ? value : fallback
}
