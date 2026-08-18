import Lenis from 'lenis'
import '../styles/lenis.css'
import '../styles/nav.css'

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

// The collapsed (<= 991px) nav menu scrolls inside .nav_menu-inner. How far
// down the viewport it starts is set in Webflow and can change there, so it is
// measured live rather than hardcoded — same reasoning as getFixedNavHeight().
const NAV_MENU_SELECTOR = '.nav_component .nav_menu-inner'

// Breathing room (px) left below the open menu, so it never runs edge to edge
// with the bottom of the screen.
const NAV_MENU_BOTTOM_GAP = 24

// Lenis is desktop-only. On touch devices it adds nothing — touch scrolling is
// native either way with syncTouch off — while still owning programmatic
// scrolls and feeding ScrollTrigger, which is exactly where mobile scroll bugs
// come from. Matching on pointer type rather than a width query keeps a phone
// consistent when it is rotated into landscape (> 767px wide, still a phone).
const TOUCH_DEVICE = '(pointer: coarse)'

// Where the nav collapses into the hamburger menu (Webflow's own
// data-collapse="medium" on .nav_component).
const NAV_COLLAPSED = '(max-width: 991px)'

// How long a collapsed dropdown takes to open/close, in seconds. Roughly
// matches the 400ms Webflow uses for the menu itself.
const NAV_DROPDOWN_DURATION = 0.35

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
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  const touchDevice = window.matchMedia(TOUCH_DEVICE).matches

  setupAnchorScroll(reducedMotion)
  setupCollapsedNavMenu()
  setupCollapsedNavDropdowns(reducedMotion)

  const { gsap, ScrollTrigger } = window

  if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger)

    // Mobile browsers fire `resize` every time the address bar slides in or out
    // during a scroll, and that is a height-only change. Without this,
    // ScrollTrigger re-measures the whole page mid-scroll and every scrub-driven
    // effect visibly jumps. Set here rather than per component because more than
    // one now runs below 992px (guests, section-reveal). Same address-bar quirk
    // marquee.js guards against with its own width check.
    ScrollTrigger.config({ ignoreMobileResize: true })

    // Recompute trigger positions once async content (Finsweet lists, fonts,
    // images) has settled the page height. Needed with or without Lenis —
    // without it, ScrollTrigger just listens to native scroll instead.
    window.addEventListener('load', () => ScrollTrigger.refresh())
  }

  // No Lenis on touch devices or under reduced motion. Everything above still
  // runs: the anchor offset falls back to window.scrollTo, and every
  // scroll-driven component reads native scroll position instead of a smoothed
  // one.
  if (reducedMotion || touchDevice) return

  // autoRaf: false — Lenis is driven by GSAP's ticker below, not its own loop.
  const lenis = new Lenis({ lerp: 0.08, smoothWheel: true, autoRaf: false })
  window.lenis = lenis

  if (gsap && ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  } else {
    // GSAP not present — drive Lenis with a plain rAF loop.
    const raf = (time) => {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }

  // Recompute the scroll limit once the page height has settled.
  window.addEventListener('load', () => lenis.resize())
}

/**
 * Gives the collapsed (<= 991px) nav menu a real scroll container.
 *
 * Webflow's own styles already mark .nav_menu-inner `overflow: auto`, but no
 * ancestor bounds its height, so it never actually scrolls — see nav.css. The
 * max height is written here as a custom property instead of being hardcoded
 * in CSS, because the menu's offset from the top of the viewport lives in
 * Webflow and can be changed there without touching this file.
 */
function setupCollapsedNavMenu() {
  const menu = document.querySelector(NAV_MENU_SELECTOR)
  if (!menu) return

  const nav = menu.closest('.nav_component')
  const button = nav.querySelector('.w-nav-button')

  // Lenis owns the wheel globally, so without this it scrolls the page behind
  // the menu instead of the menu itself. No-op on touch, where Lenis is off.
  menu.setAttribute('data-lenis-prevent', '')

  let queued = false

  const measure = () => {
    queued = false
    const top = menu.getBoundingClientRect().top
    // While the menu is closed, Webflow's overlay is display:none and every
    // rect reads 0 — nothing worth measuring until it opens.
    if (top <= 0) return
    const available = window.innerHeight - top - NAV_MENU_BOTTOM_GAP
    nav.style.setProperty(
      '--nav-menu-max-height',
      `${Math.max(available, 0)}px`
    )
  }

  const schedule = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(measure)
  }

  // Webflow toggles `w--open` on the hamburger button as the menu opens and
  // closes — the one signal that fires however the menu was triggered.
  if (button) {
    new MutationObserver(schedule).observe(button, {
      attributeFilter: ['class'],
    })
  }

  window.addEventListener('resize', schedule)
  schedule()
}

/**
 * Animates the collapsed nav's dropdowns open and closed.
 *
 * Below 991px a dropdown list switches to `position: static`, so it pushes the
 * rest of the menu down instead of floating over it. Webflow only toggles
 * `display` on it, which makes that push — and especially the snap back when
 * opening one dropdown closes another — read as an abrupt jump. This plays a
 * height tween around Webflow's own state change: it never opens or closes a
 * dropdown itself, it only animates what Webflow already decided.
 */
function setupCollapsedNavDropdowns(reducedMotion) {
  const { gsap } = window
  const nav = document.querySelector('.nav_component')
  if (!gsap || !nav || reducedMotion) return

  const collapsed = window.matchMedia(NAV_COLLAPSED)

  nav.querySelectorAll('.w-dropdown').forEach((dropdown) => {
    // Direct child only — a top-level dropdown also contains the nested
    // location sub-dropdowns' own lists, and each one manages itself.
    const list = dropdown.querySelector(':scope > .w-dropdown-list')
    if (!list) return

    let isOpen = list.classList.contains('w--open')

    const observer = new MutationObserver(() => {
      const nowOpen = list.classList.contains('w--open')
      if (nowOpen === isOpen) return
      isOpen = nowOpen

      // Above the collapse breakpoint the list floats over the page, so
      // there is no layout jump to smooth out — leave Webflow's own
      // hover open/close untouched.
      if (!collapsed.matches) return

      gsap.killTweensOf(list)

      if (nowOpen) {
        // Drop any inline display left behind by an interrupted close, so
        // Webflow's own `.w--open { display: block }` applies again.
        gsap.set(list, { clearProps: 'display' })
        gsap.fromTo(
          list,
          { height: 0, overflow: 'hidden' },
          {
            height: 'auto',
            duration: NAV_DROPDOWN_DURATION,
            ease: 'power2.out',
            clearProps: 'height,overflow',
          }
        )
        return
      }

      // Webflow has already hidden it by dropping `w--open`. Put it back for
      // the length of the outro only, then hand display back to Webflow.
      gsap.set(list, { display: 'block', height: 'auto', overflow: 'hidden' })
      gsap.to(list, {
        height: 0,
        duration: NAV_DROPDOWN_DURATION,
        ease: 'power2.in',
        onComplete: () =>
          gsap.set(list, { clearProps: 'display,height,overflow' }),
      })
    })

    observer.observe(list, { attributeFilter: ['class'] })
  })
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

      // Webflow's native Tabs widget also uses href="#w-tabs-...-pane-..." on
      // its tab links to switch panes — not a page anchor to scroll to. Left
      // alone, our stopPropagation below would block Webflow's own tab-switch
      // click handling the same way it blocks its dropdown-close handling
      // (see nested-dropdown-fix.md), leaving tabs stuck/unresponsive.
      if (link.matches('.w-tab-link')) return

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
