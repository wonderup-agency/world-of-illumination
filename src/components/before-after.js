/*
Component: before-after
Webflow attribute: data-component="before-after"
*/

import '../styles/before-after.css'

const START = 50
const KEY_STEP = 5
// px a finger must travel before we decide "sideways = slider" vs "up/down = page scroll"
const TOUCH_LOCK = 3

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

    const positionFromX = (clientX) => {
      const rect = element.getBoundingClientRect()
      setPosition(((clientX - rect.left) / rect.width) * 100)
    }

    // Mouse / pen: pointer events. Click jumps to the point, drag follows.
    element.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      dragging = true
      element.setPointerCapture(event.pointerId)
      positionFromX(event.clientX)
    })

    element.addEventListener('pointermove', (event) => {
      if (dragging && event.pointerType !== 'touch')
        positionFromX(event.clientX)
    })

    const stop = () => {
      dragging = false
    }
    element.addEventListener('pointerup', stop)
    element.addEventListener('pointercancel', stop)

    // Touch: plain touch events, not pointer events + touch-action.
    //
    // iOS Safari commits a touch to native scrolling on the very first
    // touchmove that isn't preventDefault'ed — after that every touchmove is
    // non-cancelable and the divider can't win the gesture back. So:
    // 1. Touch starting on the handle (button or line) → ours from the first
    //    contact: preventDefault on touchstart, before Safari decides anything.
    //    This is the path that's guaranteed on iPhone.
    // 2. Touch anywhere else on the image → direction decided after
    //    TOUCH_LOCK px: sideways → divider follows; up/down → page scrolls.
    //    If Safari already claimed the gesture (cancelable === false) we
    //    leave it alone instead of fighting it.
    // A tap with no movement jumps the divider to the tapped point.
    let touchStart = null
    let touchAxis = null

    element.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length !== 1) return
        const touch = event.touches[0]
        touchStart = { x: touch.clientX, y: touch.clientY }
        touchAxis = null
        if (handle?.contains(event.target)) {
          touchAxis = 'x'
          event.preventDefault()
        }
      },
      { passive: false }
    )

    element.addEventListener(
      'touchmove',
      (event) => {
        if (!touchStart || event.touches.length !== 1) return
        const touch = event.touches[0]
        const dx = touch.clientX - touchStart.x
        const dy = touch.clientY - touchStart.y

        if (!touchAxis) {
          if (Math.abs(dx) < TOUCH_LOCK && Math.abs(dy) < TOUCH_LOCK) return
          touchAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        }
        if (touchAxis !== 'x' || !event.cancelable) return

        event.preventDefault()
        positionFromX(touch.clientX)
      },
      { passive: false }
    )

    element.addEventListener('touchend', () => {
      if (touchStart && !touchAxis) positionFromX(touchStart.x)
      touchStart = null
      touchAxis = null
    })

    element.addEventListener('touchcancel', () => {
      touchStart = null
      touchAxis = null
    })

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
