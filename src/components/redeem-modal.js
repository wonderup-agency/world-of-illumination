/*
Component: redeem-modal
Webflow attribute: data-component="redeem-modal"
*/

import './../styles/redeem-modal.css'

// TickX box-office loader (same snippet TickX provides for the <head>).
// Only injected if the global script isn't already on the page.
const TICKX_SRC = '//widgets.tickxcore.com/js/'
const LOCALE = 'en-US'

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='redeem-modal']
 */
export default function (elements) {
  const modal = buildModal()
  const slot = modal.querySelector('[data-redeem="slot"]')
  let lastFocused = null
  let count = 0

  elements.forEach((wrapper) => {
    wrapper.querySelectorAll('.w-dyn-item').forEach((item) => {
      const trigger =
        item.querySelector('[data-redeem="trigger"]') ||
        item.querySelector('.redeem-voucher')
      if (!trigger) return

      const ids = parseEmbed(item.querySelector('[data-redeem="embed"]'))

      // No redemption configured for this show → hide its button.
      if (!ids) {
        trigger.style.display = 'none'
        return
      }

      // Capture phase on window: runs before global.js's document-level
      // anchor handler, which would otherwise swallow the href="#" click.
      window.addEventListener(
        'click',
        (e) => {
          if (!trigger.contains(e.target)) return
          e.preventDefault()
          e.stopPropagation()
          open(ids)
        },
        true
      )
    })
  })

  function open({ widgetId, configId }) {
    lastFocused = document.activeElement

    // Fresh container each time so TickX always mounts a clean widget.
    count += 1
    const id = `redeem-widget-${count}`
    slot.innerHTML = `<div id="${id}"></div>`

    ensureTickx()
    window.tx({ widgetId, configId, selector: `#${id}`, locale: LOCALE })

    modal.classList.add('is-active')
    modal.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    window.lenis?.stop()
    modal.querySelector('[data-redeem="close"]').focus()
  }

  function close() {
    modal.classList.remove('is-active')
    modal.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
    window.lenis?.start()
    slot.innerHTML = ''
    lastFocused?.focus()
  }

  modal
    .querySelectorAll('[data-redeem="close"], [data-redeem="overlay"]')
    .forEach((el) => el.addEventListener('click', close))

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-active')) close()
  })
}

// Reads widgetId / configId out of the pasted TickX embed text.
function parseEmbed(source) {
  if (!source) return null
  const text = source.textContent || ''
  const widgetId = text.match(/widgetId\s*:\s*['"]([^'"]+)['"]/)?.[1]
  const configId = text.match(/configId\s*:\s*['"]([^'"]+)['"]/)?.[1]
  return widgetId && configId ? { widgetId, configId } : null
}

// Defines the tx() queue and injects box-office.js once, if missing.
function ensureTickx() {
  if (window.tx) return
  window.txp = []
  window.tx = (c) => window.txp.push(c)
  const s = document.createElement('script')
  s.id = 'tx'
  s.src = `${TICKX_SRC}${Date.now()}/box-office.js`
  document.head.appendChild(s)
}

function buildModal() {
  const modal = document.createElement('div')
  modal.className = 'redeem-modal'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-modal', 'true')
  modal.setAttribute('aria-label', 'Redeem voucher')
  modal.setAttribute('aria-hidden', 'true')
  modal.innerHTML = `
    <div class="redeem-modal_overlay" data-redeem="overlay"></div>
    <div class="redeem-modal_card">
      <button type="button" class="redeem-modal_close" data-redeem="close" aria-label="Close">✕</button>
      <div class="redeem-modal_slot" data-redeem="slot"></div>
    </div>`
  document.body.appendChild(modal)
  return modal
}
