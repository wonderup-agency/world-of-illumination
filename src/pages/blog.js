/*
Page bundle: blog
Add to Webflow → Page Settings → Custom Code → Before </head>:

<link rel="preload" as="script" href="https://cdn.jsdelivr.net/gh/wonderup-agency/world-of-illumination@main/dist/blog.js" crossorigin>
<script>
  (function () {
    var base = window.__devBase || (localStorage.dev ? 'http://127.0.0.1:8080' : 'https://cdn.jsdelivr.net/gh/wonderup-agency/world-of-illumination@main/dist')
    var s = document.createElement('script')
    s.src = base + '/blog.js'
    s.type = 'module'
    s.defer = true
    document.head.appendChild(s)
  })()
</script>
*/

console.log('%c📄 [blog] Page loaded', 'color: #a78bfa; font-weight: bold')

/**
 * Defaults the "All States" filter pill to checked on load, so it renders
 * with its active style from the start. Its native radio circle is hidden
 * via CSS for the pill look, so Webflow's Designer can't set its default
 * checked state by clicking it reliably — this does it in code instead.
 * Skipped if a location filter is already checked (e.g. Finsweet restored
 * one from the URL query string), so it never overrides a real filter.
 * Uses the same Finsweet queue API global.js already uses for List Load,
 * here just waiting for the List (Filter included) instance to be ready.
 *
 * Sets `.checked` and the active class directly instead of calling
 * `.click()` — a real click makes Finsweet treat it as an actual filter
 * interaction, which also fires its `fs-list-element="scroll-anchor"`
 * behavior (auto-scrolling to the results). This pill has no real filtering
 * effect either way (empty value = no filter), so only the visual state
 * needs to be set, with no filter-changed side effects.
 */
window.FinsweetAttributes ||= []
window.FinsweetAttributes.push([
  'list',
  () => {
    try {
      const form = document.querySelector('[fs-list-element="filters"]')
      if (!form) return

      const radios = form.querySelectorAll('input[name="blog-category"]')
      const allStates = form.querySelector(
        'input[fs-list-field="category"][fs-list-value=""]'
      )
      if (!allStates) return

      const alreadyChecked = Array.from(radios).some((radio) => radio.checked)
      if (alreadyChecked) return

      allStates.checked = true

      const label = allStates.closest('label')
      const activeClass = label?.getAttribute('fs-list-activeclass')
      label?.classList.add(activeClass || 'is-list-active')
    } catch (error) {
      console.error('[blog] Could not default the "All States" filter', error)
    }
  },
])
