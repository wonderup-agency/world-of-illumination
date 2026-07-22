/*
Component: nested-dropdown-fix
Webflow attribute: data-component="nested-dropdown-fix"
*/

import gsap from 'gsap'

/*
Webflow's native `.w-dropdown` hover-close doesn't support nested dropdowns
(a `.w-dropdown` inside another `.w-dropdown`'s list). Leaving ANY nested
dropdown item (confirmed via testing: e.g. a CMS-rendered `.nav_subdropdown`
row) triggers Webflow's own close routine on the OUTER dropdown too,
regardless of where the pointer goes next, even though the pointer never
actually left the outer wrapper. That close runs as a `requestAnimationFrame`
loop that keeps decrementing opacity every frame, so a single reactive
"reopen" isn't enough to stop it - it just keeps fighting back to 0
afterward. This holds the open state by force instead, correcting it every
frame while the pointer is genuinely inside - any attempt Webflow makes to
close it gets corrected within one frame (imperceptible). On genuine leave,
this steps aside completely and lets Webflow's own native close run
untouched. Only shows up on wrappers that contain a nested dropdown - plain
single-level dropdowns are unaffected and don't need this.
*/

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='nested-dropdown-fix']
 */
export default function (elements) {
  gsap.matchMedia().add('(hover: hover) and (pointer: fine)', () => {
    const cleanupFns = []

    elements.forEach((dropdown) => {
      const toggle = dropdown.querySelector('.w-dropdown-toggle')
      const list = dropdown.querySelector('.w-dropdown-list')
      if (!toggle || !list) return

      let isPointerInside = false
      let rafId = null

      function forceOpen() {
        if (toggle.getAttribute('aria-expanded') !== 'true') {
          toggle.setAttribute('aria-expanded', 'true')
        }
        toggle.classList.add('w--open')
        list.classList.add('w--open')
        if (list.style.display === 'none') list.style.display = ''
        if (parseFloat(list.style.opacity || '1') < 1) list.style.opacity = '1'
      }

      function loop() {
        if (!isPointerInside) {
          rafId = null
          return
        }
        forceOpen()
        rafId = requestAnimationFrame(loop)
      }

      // mouseenter/mouseleave on the outer wrapper only fire on genuine
      // entry/exit of the whole subtree, never on transitions between its
      // own children - so this stays accurate no matter which nested item
      // triggers Webflow's faulty close.
      const onEnter = () => {
        isPointerInside = true
        if (!rafId) rafId = requestAnimationFrame(loop)
      }
      const onLeave = () => {
        isPointerInside = false
      }

      dropdown.addEventListener('mouseenter', onEnter)
      dropdown.addEventListener('mouseleave', onLeave)

      cleanupFns.push(() => {
        dropdown.removeEventListener('mouseenter', onEnter)
        dropdown.removeEventListener('mouseleave', onLeave)
        if (rafId) cancelAnimationFrame(rafId)
      })
    })

    return () => cleanupFns.forEach((fn) => fn())
  })
}
