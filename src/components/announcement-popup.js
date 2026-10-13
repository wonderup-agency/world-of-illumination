/*
Component: announcement-popup
Webflow attribute: data-component="announcement-popup"
*/

import './../styles/popup.css'
import './../styles/announcement-popup.css'

// Same short pause as the presale popup, so it doesn't flash the instant the
// page paints. Overridable per instance via data-popup-delay (ms).
const DEFAULT_DELAY = 600

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='announcement-popup']
 */
export default function (elements) {
  elements.forEach((popup) => {
    // The popup holds a CMS Collection List already filtered to shows with
    // "Show MESSAGE" on. No items rendered = nothing to announce = stay hidden.
    if (!popup.querySelector('.w-dyn-item')) {
      console.log('[announcement-popup] No active announcements — not showing.')
      return
    }

    const overlay = popup.querySelector('[data-popup="overlay"]')
    // Designer-only "hide" helper class, same as popup.js
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
      if (lastFocused && typeof lastFocused.focus === 'function')
        lastFocused.focus()
    }

    function onKeydown(event) {
      if (event.key === 'Escape') close()
    }

    closeButtons.forEach((button) => button.addEventListener('click', close))
    overlay?.addEventListener('click', close)

    setTimeout(open, delay)
  })
}

// Uses a [data-popup="close"] element from the Webflow markup if there is
// one, otherwise creates a plain "✕" button inside the card.
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
