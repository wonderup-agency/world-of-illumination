# faq-search

## Purpose

Live, in-page search for the FAQ section: as the user types, a dropdown
shows matching questions from the full "Faqs" CMS collection (all 32,
regardless of category), and clicking (or pressing Enter on) a result
navigates straight to that question's own detail page
(`/faqs/[slug]`) — no page reload, no site-wide search results page.

Built as a single Webflow Component ("Module / FAQ Search") so the same
markup + hidden data source is placed once and reused, unchanged, on both
the "FAQ" page (replacing the native Webflow Search element that used to
sit there) and the "Faqs - Categories Template" page.

## Webflow Setup

Already placed as a Component instance on both pages — no new markup
needed for either. To reuse it on a third page, insert another instance
of the "Module / FAQ Search" component; it's fully self-contained.

Required roles (`data-faq-search`) inside the component, already built:

| Value | Purpose |
| --- | --- |
| `input` | the text input the user types into |
| `submit` | the round green icon button — same effect as Enter |
| `dropdown` | wrapper shown/hidden by JS as the user types |
| `results` | list of matching questions, rebuilt on every keystroke |
| `empty` | "No se encontraron resultados..." message, shown when nothing matches |
| `data-source` | hidden container holding the full Faqs Collection List (never shown to users) |

Inside `data-source`, each Collection Item needs two hidden text elements:

| Value | CMS field |
| --- | --- |
| `data-faq-search-field="question"` | Faqs → Name (the field the rest of the site already displays as the question) |
| `data-faq-search-field="slug"` | Faqs → Slug |

The Collection List itself (source: **Faqs**, no filter, limit 100, so
all 32 items render) has to be placed by hand in the Designer inside the
component's `[data-faq-search='data-source']` container — Collection
List data-source binding isn't something the Webflow MCP tooling can set
up by API, only element structure/attributes/styles are. Once it's
placed, the two hidden field elements inside its item template need the
`data-faq-search-field` attributes above.

## Behavior

- **Init**: For each `[data-component='faq-search']` instance, reads every
  `[data-faq-search-field='question']` inside `data-source`, pairs it with
  its item's `slug` field, and builds an in-memory list of
  `{ question, href: '/faqs/<slug>' }`. Warns in the console and does
  nothing further if that list comes up empty (the Collection List hasn't
  been added yet, or its field attributes are missing).
- **Typing**: On every `input` event, filters that in-memory list by a
  case-insensitive substring match against the question text, caps it at
  `MAX_RESULTS` (8), and re-renders the dropdown. Shows the `results` list
  when there's at least one match, or the `empty` message otherwise —
  never both, and never an unexplained empty dropdown.
- **Selecting a result**: Clicking a result, or pressing Enter (with a
  result keyboard-highlighted via Arrow Up/Down, or just the first one if
  none is highlighted), navigates the browser directly to that question's
  own `/faqs/[slug]` page. Clicking the round submit icon does the same
  as Enter. Escape closes the dropdown and blurs the input. Clicking
  anywhere outside the component closes the dropdown.
- **Copy is English**, matching the rest of the site's FAQ content (the
  placeholder, the submit button's `aria-label`, and the "no results"
  message all live as plain attributes/text on the component definition —
  edit them there if the wording ever needs to change, not in the JS).
- **No native site-wide redirect**: Deliberately never redirects to
  Webflow's native `/search` results page — that page indexes the whole
  site, not just FAQs, so a query with zero FAQ matches would otherwise
  risk surfacing an unrelated blog post or ticket page instead of a clear
  "no results" message.
- **Resize**: Not used.
- **Breakpoint**: Not used.

## Dependencies

- `src/styles/faq-search.css` — all real visual styling (colors, spacing,
  the dropdown card, hover/active state on results). The handful of
  Webflow-side classes (`faq-search_dropdown`, `faq-search_empty`,
  `faq-search_data`) only carry the bare `display: none` / `flex` needed
  so the component doesn't flash unstyled content before this stylesheet
  and the JS have loaded — same split every other component in this
  project uses.

## DOM Expectations

Elements matching `[data-component='faq-search']` must contain the six
`data-faq-search` roles listed above, and `data-source` must contain a
Collection List of the Faqs collection with each item exposing
`data-faq-search-field="question"` and `="slug"`.

## Notes

- **Why the visible question text binds to Faqs' "Name" field, not
  "Question"**: confirmed via the CMS that every item's `name` and
  `question` fields already hold identical text, and `name` is what the
  rest of the site (the category template's question list, the "Related
  Articles" list on the per-question page) actually displays. Reusing the
  same field keeps this component consistent with the rest of the FAQ
  section instead of introducing a second source of truth for the same
  text.
- **Why this links straight to `/faqs/[slug]`, not to the category page**:
  investigated the actual site structure before building — there is no
  accordion anywhere in the FAQ section (the category template page just
  lists question links), and every FAQ item already has its own detail
  page ("Faqs Template", `/faqs/[slug]`) with the full answer. Linking a
  search result there is more precise than the category page and requires
  no anchor/scroll trick.
- **Why the native Webflow Search element was removed from the FAQ page**:
  it only does a site-wide, page-reload text search with its own results
  page — it can't do a live, FAQ-only autocomplete dropdown. Keeping both
  it and this component would have meant two competing search inputs on
  the same page.
- **Why Finsweet Attributes wasn't used**: its List Filter attributes can
  filter a Collection List that's already rendered in the page, but they
  don't build a floating dropdown that navigates to a different page on
  click — that part still needs custom JS either way, so it wouldn't have
  been simpler than this component.
- **Mobile-specific touches** in `faq-search.css`: the dropdown's
  `max-height` is clamped with `min(22rem, 60vh)` so it can't overflow a
  short mobile viewport, and it has `overscroll-behavior: contain` so
  scrolling to the bottom of a long result list doesn't also scroll the
  page behind it. The input keeps its font-size at `1.125rem` (≥16px)
  specifically so iOS Safari doesn't auto-zoom the page in on focus, and
  carries `inputmode="search"` / `enterkeyhint="search"` so mobile
  keyboards show a "search" affordance instead of a generic one.
- **Why the API couldn't wire the CMS binding itself**: the two hidden
  field elements inside the Collection Item (`data-faq-search-field`)
  had to be bound to the Faqs collection by hand in the Designer — the
  Webflow MCP's `set_component_instance_prop_values` action errors with
  "Element is not inside a CMS context" specifically for an element
  nested inside a Collection List that itself lives inside a Component
  definition (confirmed: the same binding works fine outside that
  double-nesting). If a future edit needs to change which CMS field
  either one reads, that has to be redone by hand in the Designer too.
- **WHTML-inserted native elements can silently drop custom classes**:
  the round submit button was built via the WHTML builder as a raw
  `<button>`, but Webflow re-creates it as its own native Link/Button
  element and applies its own `.w-button` class — the `class` attribute
  from the raw HTML did not survive. The fix was registering
  `faq-search_icon-button` as a real Webflow style and applying it to the
  element afterward (same as any other element), then marking its
  properties `!important` in `faq-search.css` so they reliably beat
  `.w-button`'s own defaults — same class of bundled-CSS collision as
  documented in `slider-swiper.md`. Because it renders as an `<a>`, not a
  `<button>`, its click handler also needs its own `preventDefault()` —
  otherwise clicking it jumps the page via the `href="#"`.
