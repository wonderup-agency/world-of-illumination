/*
Component: schedule
Webflow attribute: data-component="schedule"
*/

import '../styles/schedule.css'
import { getNow, resolveWindow } from '../utils/date-window.js'

const startAttr = 'data-schedule-start'
const endAttr = 'data-schedule-end'
const activeClass = 'is-scheduled'

// setTimeout breaks above ~24.8 days, and a page open that long doesn't
// need a live switch anyway
const maxTimer = 24 * 60 * 60 * 1000

/**
 * Shows a wrapper only inside its date window. Hidden by default via CSS,
 * so nothing flashes before the JS runs.
 * @param {HTMLElement[]} elements - All elements matching [data-component='schedule']
 */
export default function (elements) {
  elements.forEach((el) => {
    const { start, end } = resolveWindow(
      el.getAttribute(startAttr),
      el.getAttribute(endAttr)
    )

    const update = () => {
      const now = getNow()
      const inWindow = (!start || now >= start) && (!end || now < end)
      const wasActive = el.classList.contains(activeClass)
      el.classList.toggle(activeClass, inWindow)

      // Components inside (e.g. marquee) measured a hidden, 0px-wide box if
      // they ran first. A resize makes them re-measure now that it's visible.
      if (inWindow && !wasActive) {
        window.dispatchEvent(new window.Event('resize'))
      }
      return now
    }

    const now = update()

    // Switch on/off live if the page stays open across a boundary
    ;[start, end].forEach((boundary) => {
      if (!boundary) return
      const delay = boundary.getTime() - now.getTime()
      if (delay > 0 && delay < maxTimer) setTimeout(update, delay + 1000)
    })
  })
}
