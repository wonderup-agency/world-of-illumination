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
    const startDate = popup.getAttribute('data-popup-start-date')
    const endDate = popup.getAttribute('data-popup-end-date')

    if (!isWithinDateRange(startDate, endDate)) {
      console.log(
        '[popup] Outside configured date range (data-popup-start-date/data-popup-end-date) — not showing.'
      )
      return
    }

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

// Parses a "YYYY-MM-DD" string as a *local* date (midnight in the visitor's
// own timezone) — deliberately not `new Date("YYYY-MM-DD")`, which the spec
// parses as UTC midnight and would silently shift the cutoff by several
// hours depending on the visitor's timezone. Returns null for anything
// missing/malformed so a typo just falls back to "no limit" instead of
// crashing or hiding the popup forever.
function parseLocalDate(value) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? null : date
}

// True when there's no date gating at all (both attributes empty — the
// popup always shows, same as before this feature existed), or when "now"
// falls inside the configured range. The end date counts through the end
// of that whole day, not just its midnight.
function isWithinDateRange(startDateAttr, endDateAttr) {
  const start = parseLocalDate(startDateAttr)
  const end = parseLocalDate(endDateAttr)
  if (!start && !end) return true

  const now = new Date()
  if (start && now < start) return false
  if (end) {
    const endOfDay = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
      23,
      59,
      59,
      999
    )
    if (now > endOfDay) return false
  }
  return true
}
