/*
Component: subnav
Webflow attribute: data-component="subnav"
*/

import '../styles/subnav.css'

// Two unrelated fixes for the sticky location subnav, kept in one component
// because both are about the same element:
//
// 1. Closing the collapsed (tablet-down) menu when one of its links is tapped.
//    Webflow already does this itself — its navbar module binds a delegated
//    bubble-phase handler on `.w-nav-menu` that closes the menu for any link
//    whose href starts with "#". global.js's anchor handler runs in the capture
//    phase and calls stopPropagation(), so that handler never gets the event.
//    Rather than animate a close ourselves, we re-trigger Webflow's own toggle,
//    which plays the exact reverse of the open animation using the element's own
//    data-duration / data-easing2.
//
// 2. Hiding the whole subnav once the footer reaches it, so the two don't
//    overlap at the bottom of the page.

// Gap (px) between the subnav's bottom edge and the footer's top edge at the
// moment the subnav starts hiding — i.e. how early it gets out of the way.
const CLEARANCE = 24

// What the subnav hides against. Overridable per instance with
// data-subnav-hide-at="<css selector>".
const DEFAULT_TARGET = '[data-component="footer"]'

const HIDDEN_CLASS = 'is-hidden'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='subnav']
 */
export default function (elements) {
  const instances = elements.map((element) => ({
    element,
    // The Webflow Navbar widget — the attribute is expected on it directly, but
    // accept a wrapper around it too.
    nav: element.matches('.w-nav') ? element : element.querySelector('.w-nav'),
    target: document.querySelector(
      element.getAttribute('data-subnav-hide-at') || DEFAULT_TARGET
    ),
    // Where the subnav's bottom edge sits once it's stuck, measured below.
    threshold: 0,
  }))

  setupMenuClose(instances)

  return setupFooterHide(instances)
}

/**
 * Restores the menu close that global.js's capture-phase stopPropagation()
 * blocks. Listens on `window` rather than `document`: capture runs outermost
 * first, so this fires before global.js's own document-level listener and can't
 * be cut off by it, whatever order the two get registered in.
 */
function setupMenuClose(instances) {
  const navs = instances.map((instance) => instance.nav).filter(Boolean)
  if (!navs.length) return

  window.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest('a')
      if (!link) return

      // Same rule Webflow's own navbar handler applies: only in-page anchors
      // close the menu. Any other link navigates away, so there's nothing left
      // to close.
      const href = link.getAttribute('href')
      if (!href || href.charAt(0) !== '#') return

      const nav = navs.find((candidate) => candidate.contains(link))
      if (!nav) return

      const button = nav.querySelector('.w-nav-button')
      if (!button) return

      // Deferred, and re-checked, because clicking the button *toggles*. If the
      // event did reach Webflow's own handler (global.js lets `href="#"` through
      // untouched, for one), it has already closed the menu synchronously and
      // dropped `w--open` — toggling on top of that would open it right back up.
      requestAnimationFrame(() => {
        if (button.classList.contains('w--open')) button.click()
      })
    },
    { capture: true }
  )
}

/**
 * Fades the subnav out as the footer arrives, and back in on the way up.
 * Progress is read from the footer's own getBoundingClientRect() on the native
 * scroll event — same approach as footer.js / guests.js / text-fill.js, which
 * keeps ScrollTrigger (and any conflict with Lenis) out of it.
 */
function setupFooterHide(instances) {
  const active = instances.filter((instance) => instance.target)
  if (!active.length) return

  const measure = () => {
    active.forEach((instance) => {
      const { element } = instance
      // Read from computed style rather than the live rect: while hidden the
      // element carries a transform, and getBoundingClientRect() includes it —
      // which would feed the threshold back into itself. offsetHeight and the
      // sticky offset are both layout values, so neither moves when it hides.
      const stickyTop = parseFloat(getComputedStyle(element).top)
      instance.threshold =
        (Number.isNaN(stickyTop) ? 0 : stickyTop) +
        element.offsetHeight +
        CLEARANCE
    })
  }

  const render = () => {
    active.forEach(({ element, target, threshold }) => {
      const hidden = target.getBoundingClientRect().top <= threshold
      element.classList.toggle(HIDDEN_CLASS, hidden)
    })
  }

  const sync = () => {
    measure()
    render()
  }

  let queued = false
  const onScroll = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      render()
    })
  }

  sync()
  window.addEventListener('scroll', onScroll, { passive: true })
  // Fonts and images settle after DOMContentLoaded and move the footer.
  window.addEventListener('load', sync, { once: true })

  return {
    // Runs on window resize (debounced 150ms)
    resize: sync,
  }
}
