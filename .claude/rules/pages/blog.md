# blog

## Purpose

Defaults the "All States" Finsweet List Filter pill to checked on page load,
so it shows its active/highlighted style from the start instead of no pill
looking selected until the user clicks one.

## Webflow Setup

Page Settings → Custom Code → Before `</head>`:

```html
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
```

## Behavior

- **On load**: Waits for Finsweet's List (Filter included) instance to be
  ready via the `window.FinsweetAttributes` queue — same API `global.js`
  already uses for List Load's `afterRender` hook, just waiting on a
  different readiness point. Once ready, looks inside the
  `[fs-list-element="filters"]` form for the `blog-category` radio group. If
  none of them is already checked (i.e. Finsweet didn't restore an active
  filter from the URL query string), it sets `.checked = true` directly on
  the "All States" radio — identified by
  `input[fs-list-field="category"][fs-list-value=""]` — and adds its
  `fs-list-activeclass` (read off the parent label, falling back to
  `is-list-active`) to that same label by hand.
- Deliberately does **not** call `.click()` on the radio: that would make
  Finsweet treat it as a real filter interaction, which also triggers its
  `fs-list-element="scroll-anchor"` behavior (auto-scrolling to the results)
  — an unwanted jump on a page that just loaded. Since this radio's value is
  empty (no actual filter effect either way), only the visual
  checked/active state needs to be set — there's no real filter change to
  apply.
- If a filter is already active on load (from the URL), this does nothing —
  it never overrides a real filter selection.

## Dependencies

None — plain DOM only, reusing the `window.FinsweetAttributes` queue that
Finsweet's own List Filter/List Load scripts already provide (loaded via
Webflow, not bundled).

## Notes

- Webflow's Designer can't set a default-checked state reliably on this
  radio because its native circle is hidden via CSS (`hide` combo class) for
  the pill look — clicking it in the canvas requires temporarily un-hiding
  it first, and is easy to lose again on republish. Doing it in code avoids
  that fragility entirely.
- `input[fs-list-field="category"][fs-list-value=""]` must stay the way to
  identify the "All States" radio — if the field identifier or its empty
  value ever changes, update the selector here to match.
