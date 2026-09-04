/*
Component: popup
Webflow attribute: data-component="popup"
*/

import './../styles/popup.css'

// Small pause before the popup appears, so it doesn't flash the instant the
// page paints. Overridable per instance via data-popup-delay (ms).
const DEFAULT_DELAY = 600

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='popup']
 */
export default function (elements) {
  elements.forEach((popup) => {
    const overlay = popup.querySelector('[data-popup="overlay"]')
    // Webflow's "hide" utility class is commonly left on the overlay so it
    // doesn't render as a solid black box while editing in the Designer
    // canvas (custom code/CSS doesn't run there). On the published site,
    // strip it immediately so the overlay's visibility is controlled only
    // by the wrapper's own opacity/visibility (via .is-active) instead.
    overlay?.classList.remove('hide')
    const closeButtons = ensureCloseButton(popup, overlay)
    const delay =
      parseFloat(popup.getAttribute('data-popup-delay')) || DEFAULT_DELAY

    let lastFocused = null

    popup.setAttribute('role', 'dialog')
    popup.setAttribute('aria-modal', 'true')
    popup.setAttribute('aria-hidden', 'true')

    function open() {
      lastFocused = document.activeElement
      popup.classList.add('is-active')
      popup.setAttribute('aria-hidden', 'false')
      document.body.style.overflow = 'hidden'
      window.lenis?.stop()
      document.addEventListener('keydown', onKeydown)
      closeButtons[0]?.focus()
    }

    function close() {
      popup.classList.remove('is-active')
      popup.setAttribute('aria-hidden', 'true')
      document.body.style.overflow = ''
      window.lenis?.start()
      document.removeEventListener('keydown', onKeydown)
      if (lastFocused instanceof HTMLElement) lastFocused.focus()
    }

    function onKeydown(event) {
      if (event.key === 'Escape') close()
    }

    closeButtons.forEach((button) => button.addEventListener('click', close))
    overlay?.addEventListener('click', close)

    setTimeout(open, delay)
  })
}

// Uses a [data-popup="close"] element already in the Webflow markup if one
// exists, so the design stays fully custom-able there. Otherwise creates a
// plain "✕" button itself — no manual Webflow setup needed for this piece.
function ensureCloseButton(popup, overlay) {
  const existing = popup.querySelectorAll('[data-popup="close"]')
  if (existing.length) return existing

  const card = [...popup.children].find((child) => child !== overlay)
  if (!card) return []

  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('data-popup', 'close')
  button.setAttribute('aria-label', 'Close')
  button.textContent = '✕'
  card.appendChild(button)

  return [button]
}
