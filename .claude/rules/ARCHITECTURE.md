# Architecture

## Overview

The project has two distinct parts:

1. **Browser code** (`src/`) — components and pages that run on the Webflow site
2. **Tooling** (`scripts/`, config files) — build pipeline, scaffolding scripts

These never mix. Browser code is bundled by Rollup into `dist/`. Tooling runs in Node.js only.

## Browser Runtime Flow

```
Webflow page loads
  → <script src="main.js" type="module" defer>
    → main.js waits for DOMContentLoaded (or runs immediately if DOM is ready)
    → main.js imports components.js (the registry)
    → main.js dynamically imports global.js
      → global.js default function runs (site-wide setup)
    → main.js iterates the registry:
      → For each component, checks if selector exists on the page
      → If yes: dynamically imports the component module
      → Calls the default function with matching elements
      → Stores returned lifecycle hooks (resize, breakpoint)
    → Window resize event (debounced 150ms) fires hooks on all active components
    → Breakpoint changes fire breakpoint hooks with current and previous values
```

Key design decisions:

- **Code splitting**: Components only load if their DOM selector is present. A page with no `data-component` attributes loads zero component code.
- **Isolation**: Each component is independent. A failing component doesn't break others (try/catch per component).
- **No framework**: Vanilla JS. Components receive raw DOM elements and work with them directly.

## Component System

### Registry (`src/components.js`)

An array of `{ selector, importFn }` objects. The selector uses `data-component` attribute matching. The `importFn` is a dynamic import function for code splitting.

### Loading (`src/main.js`)

1. Queries DOM for each selector
2. Skips components with no matching elements
3. Dynamically imports the module
4. Calls the default export with the element array
5. Collects lifecycle hooks from the return value

### Global (`src/components/global.js`)

Loaded before any components. Runs on every page regardless of data attributes. Use for analytics, global event listeners, shared setup.

Currently handles:

- **Lenis smooth scroll** — instantiated as `window.lenis`, driven by GSAP's ticker (or a plain rAF loop if GSAP isn't present on the page). Skipped under `prefers-reduced-motion`.
- **Anchor link offset** — a `click` listener on `document`, registered in the **capture** phase, intercepts any `a[href^="#"]` (e.g. subnav `#section` links), measures the live height of whatever's currently `position: fixed`/`sticky`, actually on-screen, matching `.nav_component, .subnav_component` (the site's main nav and the location-template subnav), and scrolls so the target lands clear of them — via `lenis.scrollTo(target, { offset: -height })` when Lenis is active, or a plain `window.scrollTo` fallback under reduced motion. Height is measured fresh on every click (not cached), so it self-adjusts to breakpoint changes or future nav height edits in Webflow with no code changes. Add a new selector to `FIXED_NAV_SELECTOR` at the top of the file if another fixed/sticky bar needs to be accounted for.
  - **Visibility-aware**: a bar only counts toward the offset if it's actually occupying space on screen right now (`getBoundingClientRect().bottom > 0`, not `visibility: hidden`/`opacity: 0`) — not just because its CSS `position` is fixed/sticky. This matters because the main nav hides itself on scroll (e.g. `translateY` off-screen) while staying `position: fixed` the whole time; without this check, its height still gets added even while it's hidden, leaving an unwanted gap above the scrolled-to section.
  - **`SECTION_SPACER` constant**: section wrappers in this project (e.g. `section_tickets`) start with a fixed-height `Spacer / Section` element before their real content, so landing exactly at a section's `id` leaves that spacer visible as a gap. `SECTION_SPACER` (flat px estimate, tune as needed) is subtracted from the nav offset so the scroll lands a bit further down, closer to the section's actual content, on every anchor link.
  - **Capture phase + `stopPropagation()`**: links set up in Webflow as native same-page "Section" links carry Webflow's own scroll-to-section behavior, which runs independently of (and isn't cancelled by) our `preventDefault()` — the visible symptom was the page landing in the wrong (un-offset) spot first, then correcting a beat later. Listening on capture and calling `stopPropagation()` stops the click before it ever reaches Webflow's own bubble-phase handling, so ours is the only handler that runs. Side effect to watch for: this also blocks any *other* bubble-phase behavior tied to the same click (e.g. Webflow's mobile nav-overlay auto-close) — not currently an issue since these links aren't marked `.w-nav-link`, but worth checking if that ever changes.
  - **Immediate vs. animated**: the scroll is instant (`immediate: true` / `behavior: 'auto'`) until `document.readyState === 'complete'`, then animated. This sidesteps a separate Lenis quirk — `lenis.resize()` (called from the `load` handler below, once images/fonts settle final page height) resets `targetScroll` to whatever the current position is, silently cutting off any `scrollTo` animation still in flight. Clicking a subnav link before the page has fully loaded is the only case this affects.

### Lifecycle

- **Init**: The default function body (runs once on load, after DOMContentLoaded)
- **Resize**: Optional hook called on `window.resize` (debounced 150ms)
- **Breakpoint**: Optional hook called when the window crosses a Webflow breakpoint. Receives `(currentBreakpoint, previousBreakpoint)` as arguments. Values: `1920` (2XL), `1440` (XL), `1280` (Large), `992` (Desktop/base), `768` (Tablet), `480` (Mobile Landscape), `0` (Mobile Portrait).

## Page Bundles (`src/pages/`)

Standalone entry points that Rollup discovers automatically. Each `.js` file becomes a separate bundle in `dist/`. Completely independent from the component system — loaded via separate `<script>` tags on specific Webflow pages.

Page bundles can import from `src/components/` if they need shared logic, but they don't participate in the `data-component` loading system.

## Configuration (`src/config.js`)

A shared config object importable by any component or page. Holds project-level values (API endpoints, feature flags, etc.). Default-exported.

## Build Pipeline

### Dev (`npm run dev`)

```
concurrently:
  → Rollup watch (rollup.config.dev.js)
    → del (clean dist/ once on first build)
    → checkGlobalJs plugin (warns if global.js missing)
    → resolve + commonjs (handle npm packages)
    → postcss (extract CSS to dist/styles.css)
  → http-server (serves dist/ on :8080)
```

### Prod (`npm run build`)

```
prebuild: eslint src/ && prettier . --write
  → rollup (rollup.config.prod.js)
    → del (clean dist/)
    → checkGlobalJs plugin
    → resolve + commonjs
    → postcss (extract + minimize CSS)
    → terser (minify JS, strip console.*, strip comments)
```

## Deployment Flow

```
Local dev → build → commit dist/ → push to GitHub → jsDelivr serves from @main
```

The Webflow site loads assets directly from jsDelivr CDN at `@main`. During local development, the snippet in `webflow-snippet.html` points to `localhost:8080` with `@main` CDN as the production fallback. jsDelivr aggressively caches `@main` — changes propagate within minutes; use the jsDelivr purge API for immediate updates.

