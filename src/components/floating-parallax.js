/*
Component: floating-parallax
Webflow attribute: data-component="floating-parallax"

Subtle horizontal parallax for images floating inside a horizontal-scroll
panel (built for section_floating-images, one panel inside section_horizontal).
Reuses the data-speed convention from guests.js, but CANNOT reuse its driver:
guests.js reads a plain vertical ScrollTrigger ('top bottom' -> 'bottom top')
against the page's normal scroll — inside a pinned horizontal-scroll panel,
the panel never moves vertically at all (its ancestor is pinned, panels only
translate on X), so that vertical trigger would never produce a changing
progress value here.

Instead, this taps directly into the SAME ScrollTrigger horizontal-scroll.js
already created for the ancestor [data-component='horizontal-scroll'] wrapper
(found read-only via ScrollTrigger.getAll() — horizontal-scroll.js itself is
never touched or imported) and uses it as a GSAP `containerAnimation`, which
is exactly what containerAnimation is for: a nested ScrollTrigger whose
start/end are measured along the host tween's horizontal axis instead of the
page's vertical scroll. That makes this panel's own local progress (0 = just
entering from the right, 1 = fully exited to the left) fall out automatically
from horizontal-scroll's existing math, with zero coupling beyond reading its
already-public ScrollTrigger instance.

Drives images on X, not Y: the panel itself already moves horizontally (it's
one of horizontal-scroll's own train panels), so an *extra* independent X
offset on top of that reads as depth (some images drift a little faster/
slower than the panel itself) — the same axis the section is already moving
on, instead of a perpendicular wobble that looks disconnected from it.

Uses a plain ScrollTrigger.create() with onUpdate, not a scrubbed proxy tween:
the containerAnimation link already ties this trigger's progress 1:1 to the
host's own (already scroll-synced) tween, so adding a second, independently
timed scrub on top double-lags the images against the panel/text they share
the screen with — the mismatch reads as everything nearby wobbling, not just
the images. Reading progress directly (linear, no easing curve either — see
EASE) gives a smooth, constant-rate drift with zero extra lag layered on the
host, so the movement stays equally visible across the whole crossing instead
of tapering off near the panel's entry/exit.
*/

import '../styles/floating-parallax.css'

const TRAVEL = 250 // px, horizontal drift range for a speed=1 image
const EASE = 'none' // linear — constant rate across the whole crossing, no slow-down near the edges
const ACTIVE_CLASS = 'is-floating-parallax'
const HOST_SELECTOR = "[data-component='horizontal-scroll']"

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='floating-parallax']
 */
export default function (elements) {
  const { gsap, ScrollTrigger } = window
  if (!gsap || !ScrollTrigger) return
  gsap.registerPlugin(ScrollTrigger)

  const ease = gsap.parseEase(EASE)
  const mm = gsap.matchMedia()

  // Deferred to `load` (not run on init) so horizontal-scroll.js's own
  // ScrollTrigger — a separate dynamic import, resolved independently, no
  // ordering guarantee — is guaranteed to already exist by the time this
  // looks for it. Same reasoning as image-parallax.js's deferred setup.
  const setup = () => {
    elements.forEach((panel) => {
      mm.add(
        '(min-width: 992px) and (prefers-reduced-motion: no-preference)',
        () => {
          const host = panel.closest(HOST_SELECTOR)
          if (!host) return

          const hostTrigger = ScrollTrigger.getAll().find(
            (st) => st.trigger === host && st.animation
          )
          if (!hostTrigger) {
            console.warn(
              '[floating-parallax] No horizontal-scroll ScrollTrigger found on',
              host
            )
            return
          }

          const images = gsap.utils.toArray('[data-speed]', panel)
          if (!images.length) return

          const layers = images.map((el) => ({
            el,
            travel: (parseFloat(el.dataset.speed) || 0.2) * TRAVEL,
            setX: gsap.quickSetter(el, 'x', 'px'),
          }))

          panel.classList.add(ACTIVE_CLASS)

          // Trigger is a CHILD of the panel, never the panel itself — the
          // panel is already the element horizontal-scroll.js's own tween
          // applies `x` to directly (train mode has no separate wrapper), and
          // GSAP's own containerAnimation guidance is to trigger off a child
          // of whatever the driving animation moves, not that element itself.
          const stage = panel.querySelector('.floating-image-wrapper') || panel

          const trigger = ScrollTrigger.create({
            containerAnimation: hostTrigger.animation,
            trigger: stage,
            start: 'left right',
            end: 'right left',
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const eased = ease(self.progress)
              layers.forEach((l) =>
                l.setX(gsap.utils.interpolate(-l.travel, l.travel, eased))
              )
            },
          })

          return () => {
            panel.classList.remove(ACTIVE_CLASS)
            trigger.kill()
            layers.forEach((l) => {
              gsap.killTweensOf(l.el)
              gsap.set(l.el, { clearProps: 'transform' })
            })
          }
        }
      )
    })
  }

  if (document.readyState === 'complete') setup()
  else window.addEventListener('load', setup, { once: true })
}
