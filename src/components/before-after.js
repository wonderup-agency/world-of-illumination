/*
Component: before-after
Webflow attribute: data-component="before-after"
*/

import '../styles/before-after.css'

const START = 50
const KEY_STEP = 5

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='before-after']
 */
export default function (elements) {
  elements.forEach((element) => {
    const handle = element.querySelector('[data-before-after="handle"]')
    if (!element.querySelector('[data-before-after="before"]')) return

    let position = START
    let dragging = false

    element.querySelectorAll('img').forEach((img) => {
      img.draggable = false
    })

    const setPosition = (value) => {
      position = Math.min(100, Math.max(0, value))
      element.style.setProperty('--before-after-position', `${position}%`)
      handle?.setAttribute('aria-valuenow', Math.round(position))
    }

    const positionFromEvent = (event) => {
      const rect = element.getBoundingClientRect()
      setPosition(((event.clientX - rect.left) / rect.width) * 100)
    }

    // Mouse jumps to the click point right away. Touch only follows a
    // horizontal move: jumping on touchstart would also fire when the user
    // is just starting a vertical page scroll (touch-action: pan-y hands
    // vertical swipes to the browser, which then sends pointercancel).
    element.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      dragging = true
      element.setPointerCapture(event.pointerId)
      if (event.pointerType === 'mouse') positionFromEvent(event)
    })

    element.addEventListener('pointermove', (event) => {
      if (dragging) positionFromEvent(event)
    })

    const stop = () => {
      dragging = false
    }
    element.addEventListener('pointerup', stop)
    element.addEventListener('pointercancel', stop)

    if (handle) {
      handle.setAttribute('role', 'slider')
      handle.setAttribute('tabindex', '0')
      handle.setAttribute('aria-label', 'Day and night comparison')
      handle.setAttribute('aria-valuemin', '0')
      handle.setAttribute('aria-valuemax', '100')

      handle.addEventListener('keydown', (event) => {
        const next = {
          ArrowLeft: position - KEY_STEP,
          ArrowDown: position - KEY_STEP,
          ArrowRight: position + KEY_STEP,
          ArrowUp: position + KEY_STEP,
          Home: 0,
          End: 100,
        }[event.key]
        if (next === undefined) return
        event.preventDefault()
        setPosition(next)
      })
    }

    setPosition(START)
  })
}
