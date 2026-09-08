/*
Component: horizontal-scroll-mobile
Webflow attribute: shares data-component="horizontal-scroll" (see Notes)

Tablet/mobile counterpart to horizontal-scroll.js's desktop horizontal-jack.
Below 992px (wherever horizontal-scroll.js's own data-horizontal-scroll-disable
attribute says its own effect is off), this pins the same wrapper in place
with native `position: sticky` and crossfades between its panels as the user
scrolls vertically — same "hold and reveal" feeling as desktop, but on the
scroll axis touch users already expect (no sideways drag). Never touches
horizontal-scroll.js, its data attributes, or its own scroll-jack — the two
components run on mutually exclusive breakpoints and never act on the same
element at the same time.

Works with any number of panels (2+) — nothing here is hardcoded to a count.

No new Webflow attributes needed: reuses the existing
data-horizontal-scroll-disable value to decide, per breakpoint, whether this
component should take over (see Notes for why sharing that attribute is safe
and correct, not just convenient).

Optional per-instance override, on the same wrapper:

- data-horizontal-scroll-mobile-vh="80" — how much scroll (in vh, i.e. % of
  viewport height) each panel holds the screen for before crossfading to the
  next. Default 80 (see DEFAULT_STEP_VH).

Runs on the bundled `gsap` package only (matchMedia + autoAlpha) — no
ScrollTrigger, no CDN dependency for this half of the component. Deliberately
native `position: sticky` + a plain scroll listener instead of ScrollTrigger's
pin, for the exact same reason image-grow.js/footer.js avoid it: ScrollTrigger
pin fights Lenis on this site (sub-pixel pin/spacer mismatches can trigger
Lenis's ResizeObserver and truncate in-flight scroll — felt as a stutter).
Native sticky never triggers that.
*/

import gsap from 'gsap'
import './horizontal-scroll-mobile.css'

const PANEL_SELECTOR = '[data-horizontal-scroll-panel]'
const DISABLE_ATTR = 'data-horizontal-scroll-disable'
const STEP_ATTR = 'data-horizontal-scroll-mobile-vh'
const DEFAULT_STEP_VH = 80 // % of viewport height each panel is held for
const FADE_DURATION = 0.5
const ACTIVE_CLASS = 'is-mobile-fade'
const STAGE_CLASS = 'horizontal-scroll-mobile_stage'
const SPACER_CLASS = 'horizontal-scroll-mobile_spacer'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='horizontal-scroll']
 */
export default function (elements) {
  const instances = elements
    .map((section) => {
      const panels = gsap.utils.toArray(PANEL_SELECTOR, section)
      if (panels.length < 2) return null

      return {
        section,
        panels,
        disable: section.getAttribute(DISABLE_ATTR),
        stepVh: numberAttr(section, STEP_ATTR, DEFAULT_STEP_VH),
        activeIndex: 0,
        stage: null,
        spacer: null,
        spacerHeight: 0,
      }
    })
    .filter(Boolean)

  if (!instances.length) return

  const clampIndex = (value, max) => (value < 0 ? 0 : value > max ? max : value)

  // Same math as image-grow.js's liveProgress: the spacer is a plain,
  // unpositioned element that keeps moving 1:1 with scroll, so
  // (viewport - spacer.top) / spacer height is exactly how far scroll has
  // travelled since the sticky wrapper engaged, as a clean 0-1 value.
  const progressOf = (instance) => {
    const viewport = window.innerHeight
    const raw =
      (viewport - instance.spacer.getBoundingClientRect().top) /
      instance.spacerHeight
    return raw < 0 ? 0 : raw > 1 ? 1 : raw
  }

  const setActive = (instance, index) => {
    if (index === instance.activeIndex) return
    const current = instance.panels[instance.activeIndex]
    const next = instance.panels[index]
    // overwrite: 'auto' matters here specifically — a fast back-and-forth
    // scroll can call this again on the same panel before its previous fade
    // finishes, and without it GSAP layers the two tweens instead of the new
    // one cleanly replacing the old, which flickers.
    gsap.to(current, {
      autoAlpha: 0,
      duration: FADE_DURATION,
      ease: 'power1.inOut',
      overwrite: 'auto',
    })
    gsap.to(next, {
      autoAlpha: 1,
      duration: FADE_DURATION,
      ease: 'power1.inOut',
      overwrite: 'auto',
    })
    instance.activeIndex = index
  }

  let raf = null
  // Every instance's progress is read first, then every instance's active
  // panel is written — same read-then-write discipline as image-grow.js's
  // tick(). A fade tween's opacity/visibility write is layout-neutral on its
  // own, but most browsers still force a synchronous layout recalculation on
  // the next getBoundingClientRect() read if anything was written since the
  // last frame — interleaving read+write per instance would cost one extra
  // forced layout per instance whenever 2+ horizontal-scroll sections share
  // a page.
  const updateAll = () => {
    raf = null
    const next = []
    instances.forEach((instance) => {
      if (!instance.spacer) return
      const progress = progressOf(instance)
      const index = clampIndex(
        Math.floor(progress * instance.panels.length),
        instance.panels.length - 1
      )
      next.push([instance, index])
    })
    next.forEach(([instance, index]) => setActive(instance, index))
  }

  const onScroll = () => {
    if (raf) return
    raf = requestAnimationFrame(updateAll)
  }

  // Recomputes the spacer height (panels.length steps of stepVh% of the live
  // viewport height each) — only meaningful while active.
  const sync = () => {
    instances.forEach((instance) => {
      if (!instance.spacer) return
      instance.spacerHeight =
        instance.panels.length * (instance.stepVh / 100) * window.innerHeight
      instance.spacer.style.height = `${instance.spacerHeight}px`
    })
    onScroll()
  }

  // Same troubleshooting pattern as image-grow.js's verify(): a failure here
  // means horizontal-scroll-mobile.css never loaded, or a Webflow rule is
  // still forcing this element's own layout — not something to fix per
  // instance.
  const verify = () => {
    instances.forEach((instance) => {
      if (!instance.stage) return
      if (getComputedStyle(instance.stage).position !== 'sticky') {
        console.warn(
          "[horizontal-scroll-mobile] the stage isn't rendering position: sticky — horizontal-scroll-mobile.css may not be loaded, or an ancestor with overflow other than visible is breaking sticky. Panels will crossfade in place but won't hold on screen while scrolling.",
          instance.stage
        )
      }
    })
  }

  let active = false

  gsap.matchMedia().add(
    {
      isMobile: '(max-width:479px)',
      isMobileLandscape: '(max-width:767px)',
      isTablet: '(max-width:991px)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const { isMobile, isMobileLandscape, isTablet, reduceMotion } =
        context.conditions

      if (reduceMotion) return

      const cleanups = []

      instances.forEach((instance) => {
        // Only take over where horizontal-scroll.js's own disable attribute
        // says its desktop effect is OFF at this breakpoint — see Notes for
        // why this, not a hardcoded 991px check, is what keeps the two
        // components from ever fighting over the same element.
        const shouldRun =
          (instance.disable === 'tablet' && isTablet) ||
          (instance.disable === 'mobileLandscape' && isMobileLandscape) ||
          (instance.disable === 'mobile' && isMobile)
        if (!shouldRun) return

        active = true

        // section_horizontal carries overflow:hidden unconditionally (from
        // horizontal-scroll.css, needed for desktop's horizontal-jack) —
        // confirmed live (via a console probe) that this alone is enough to
        // make the browser treat `section` as the stage's scrolling
        // container for sticky purposes, even though `section` never
        // actually scrolls itself (it just auto-sizes to fit its content).
        // A sticky element positioned against a container that never
        // generates a scroll offset never visually sticks — it just moves
        // in lockstep with the page, which is exactly what was observed.
        // Since horizontal-scroll.js's own horizontal overflow never exists
        // at this breakpoint (it doesn't run here at all), this override is
        // safe — it only applies while this component's own stage exists.
        instance.section.classList.add(ACTIVE_CLASS)

        // Panels move into a local "stage" div, and the spacer sits right
        // after it — both as the ONLY two children of `section`. This is
        // what keeps the sticky hold correctly bounded: sticky releases
        // once its own containing block's bottom edge is reached, and if
        // `section` itself were the sticky element (an earlier version did
        // this), that containing block would be whatever ancestor wraps
        // the WHOLE page — meaning the hold wouldn't release until
        // scrolling past every section after this one. With `section` as a
        // plain, local, two-child box (stage + spacer, nothing else), the
        // stage's sticky hold is bounded to exactly this component's own
        // scroll range.
        const stage = document.createElement('div')
        stage.className = STAGE_CLASS
        instance.section.insertBefore(stage, instance.panels[0])
        instance.panels.forEach((panel) => stage.appendChild(panel))
        instance.stage = stage

        gsap.set(instance.panels, { autoAlpha: 0 })
        gsap.set(instance.panels[0], { autoAlpha: 1 })
        instance.activeIndex = 0

        const spacer = document.createElement('div')
        spacer.className = SPACER_CLASS
        spacer.setAttribute('aria-hidden', 'true')
        stage.after(spacer)
        instance.spacer = spacer

        cleanups.push(() => {
          instance.section.classList.remove(ACTIVE_CLASS)
          gsap.set(instance.panels, { clearProps: 'opacity,visibility' })
          instance.panels.forEach((panel) =>
            instance.section.insertBefore(panel, stage)
          )
          stage.remove()
          spacer.remove()
          instance.stage = null
          instance.spacer = null
          instance.spacerHeight = 0
          instance.activeIndex = 0
        })
      })

      if (!cleanups.length) return

      sync()
      verify()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('load', sync, { once: true })

      return () => {
        active = false
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('load', sync)
        cleanups.forEach((fn) => fn())
      }
    }
  )

  return {
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
