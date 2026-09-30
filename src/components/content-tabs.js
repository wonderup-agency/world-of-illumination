/*
Component: content-tabs
Webflow attribute: data-component="content-tabs"
*/

import '../styles/content-tabs.css'

const ACTIVE_CLASS = 'is-active'

let uid = 0

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='content-tabs']
 */
export default function (elements) {
  elements.forEach((element) => {
    const menu = element.querySelector('[data-content-tabs="menu"]')
    const links = [...element.querySelectorAll('[data-content-tabs="link"]')]
    const panes = [...element.querySelectorAll('[data-content-tabs="pane"]')]
    const count = Math.min(links.length, panes.length)
    if (!count) return

    if (links.length !== panes.length) {
      console.warn(
        `[content-tabs] ${links.length} links vs ${panes.length} panes — extra ones are ignored`
      )
    }

    const id = `content-tabs-${++uid}`
    menu?.setAttribute('role', 'tablist')

    for (let i = 0; i < count; i++) {
      links[i].id = links[i].id || `${id}-tab-${i}`
      panes[i].id = panes[i].id || `${id}-pane-${i}`
      links[i].setAttribute('role', 'tab')
      links[i].setAttribute('aria-controls', panes[i].id)
      panes[i].setAttribute('role', 'tabpanel')
      panes[i].setAttribute('aria-labelledby', links[i].id)
    }

    // Keeps the active tab visible when the menu scrolls horizontally
    // (tablet/mobile). Only scrolls the menu itself, never the page.
    const centerInMenu = (link, behavior) => {
      if (!menu || menu.scrollWidth <= menu.clientWidth) return
      const menuRect = menu.getBoundingClientRect()
      const linkRect = link.getBoundingClientRect()
      const offset =
        linkRect.left - menuRect.left - (menu.clientWidth - linkRect.width) / 2
      menu.scrollBy({ left: offset, behavior })
    }

    const activate = (index, { focus = false, behavior = 'smooth' } = {}) => {
      for (let i = 0; i < count; i++) {
        const active = i === index
        links[i].classList.toggle(ACTIVE_CLASS, active)
        links[i].setAttribute('aria-selected', String(active))
        links[i].setAttribute('tabindex', active ? '0' : '-1')
        panes[i].classList.toggle(ACTIVE_CLASS, active)
      }
      if (focus) links[index].focus()
      centerInMenu(links[index], behavior)
    }

    links.slice(0, count).forEach((link, index) => {
      link.addEventListener('click', () => activate(index))
      link.addEventListener('keydown', (event) => {
        const next = {
          ArrowRight: (index + 1) % count,
          ArrowLeft: (index - 1 + count) % count,
          Home: 0,
          End: count - 1,
        }[event.key]
        if (next !== undefined) {
          event.preventDefault()
          activate(next, { focus: true })
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activate(index)
        }
      })
    })

    // Default tab = whichever link already carries is-active in Webflow.
    const initial = links.findIndex((link) =>
      link.classList.contains(ACTIVE_CLASS)
    )
    activate(initial >= 0 && initial < count ? initial : 0, {
      behavior: 'auto',
    })
  })
}
