/*
Component: faq-search
Webflow attribute: data-component="faq-search"
*/

import '../styles/faq-search.css'

const MAX_RESULTS = 8 // cap the dropdown so a broad query doesn't dump all 32

let instanceCounter = 0

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='faq-search']
 */
export default function (elements) {
  elements.forEach((root) => {
    const input = root.querySelector('[data-faq-search="input"]')
    const submitBtn = root.querySelector('[data-faq-search="submit"]')
    const dropdown = root.querySelector('[data-faq-search="dropdown"]')
    const resultsEl = root.querySelector('[data-faq-search="results"]')
    const emptyEl = root.querySelector('[data-faq-search="empty"]')
    const dataSource = root.querySelector('[data-faq-search="data-source"]')

    if (!input || !dropdown || !resultsEl || !emptyEl || !dataSource) return

    const items = Array.from(
      dataSource.querySelectorAll('[data-faq-search-field="question"]')
    )
      .map((questionEl) => {
        const item =
          questionEl.closest('.w-dyn-item') || questionEl.parentElement
        const slugEl = item?.querySelector('[data-faq-search-field="slug"]')
        const question = questionEl.textContent.trim()
        const slug = slugEl?.textContent.trim()
        if (!question || !slug) return null
        return { question, href: `/faqs/${slug}` }
      })
      .filter(Boolean)

    if (items.length === 0) {
      console.warn(
        "%c⚠️ [faq-search] No hidden Faqs found inside [data-faq-search='data-source'] — is the Collection List in place yet?",
        'color: #fbbf24; font-weight: bold'
      )
      return
    }

    const uid = `faq-search-results-${instanceCounter++}`
    resultsEl.id = uid
    input.setAttribute('role', 'combobox')
    input.setAttribute('aria-autocomplete', 'list')
    input.setAttribute('aria-expanded', 'false')
    input.setAttribute('aria-controls', uid)
    resultsEl.setAttribute('role', 'listbox')

    let activeMatches = []
    let highlightedIndex = -1

    function renderResults(matches) {
      resultsEl.innerHTML = ''
      matches.forEach((match, index) => {
        const link = document.createElement('a')
        link.href = match.href
        link.className = 'faq-search_result'
        link.textContent = match.question
        link.setAttribute('role', 'option')
        link.setAttribute('data-index', String(index))
        resultsEl.appendChild(link)
      })
    }

    function highlight(index) {
      highlightedIndex = index
      Array.from(resultsEl.children).forEach((link, i) => {
        link.classList.toggle('is-active', i === index)
        link.setAttribute('aria-selected', i === index ? 'true' : 'false')
      })
    }

    function openDropdown() {
      dropdown.style.display = 'block'
      input.setAttribute('aria-expanded', 'true')
    }

    function closeDropdown() {
      dropdown.style.display = 'none'
      input.setAttribute('aria-expanded', 'false')
      highlightedIndex = -1
    }

    function runSearch(rawQuery) {
      const query = rawQuery.trim().toLowerCase()

      if (!query) {
        activeMatches = []
        closeDropdown()
        return
      }

      activeMatches = items
        .filter((item) => item.question.toLowerCase().includes(query))
        .slice(0, MAX_RESULTS)
      highlightedIndex = -1

      const hasMatches = activeMatches.length > 0
      resultsEl.style.display = hasMatches ? 'flex' : 'none'
      emptyEl.style.display = hasMatches ? 'none' : 'block'

      if (hasMatches) renderResults(activeMatches)
      openDropdown()
    }

    function goTo(match) {
      if (match) window.location.href = match.href
    }

    input.addEventListener('input', (e) => runSearch(e.target.value))

    input.addEventListener('focus', () => {
      if (input.value.trim()) runSearch(input.value)
    })

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && activeMatches.length) {
        e.preventDefault()
        highlight((highlightedIndex + 1) % activeMatches.length)
      } else if (e.key === 'ArrowUp' && activeMatches.length) {
        e.preventDefault()
        highlight(
          (highlightedIndex - 1 + activeMatches.length) % activeMatches.length
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        goTo(activeMatches[highlightedIndex] ?? activeMatches[0])
      } else if (e.key === 'Escape') {
        closeDropdown()
        input.blur()
      }
    })

    // Webflow rebuilds a raw <button> as its own native Link/Button element
    // (an <a href="#">), so this click also needs its own preventDefault —
    // otherwise it jumps the page to the top via the "#" hash.
    submitBtn?.addEventListener('click', (e) => {
      e.preventDefault()
      if (activeMatches.length) goTo(activeMatches[0])
      else input.focus()
    })

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) closeDropdown()
    })
  })

  return {}
}
