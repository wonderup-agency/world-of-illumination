// --------------------------------------------------
// Component Registry
// --------------------------------------------------
// Each entry maps a data-component attribute to a lazy import.
// Components only load when their selector exists on the page.
//
// 2 ways to add a component:
//
// 1. Ask Claude  → "create a component called calculator"
// 2. Terminal    → npm run create-component -- calculator
//
// Both scaffold the file and add an entry here automatically.
// --------------------------------------------------

export default [
  {
    selector: "[data-component='location-map']",
    importFn: () => import('./components/location-map.js'),
  },
  {
    selector: "[data-component='text-fill']",
    importFn: () => import('./components/text-fill.js'),
  },
  {
    selector: "[data-component='marquee']",
    importFn: () => import('./components/marquee.js'),
  },
  {
    selector: "[data-component='shows']",
    importFn: () => import('./components/shows.js'),
  },
  {
    selector: "[data-component='guests']",
    importFn: () => import('./components/guests.js'),
  },
  {
    selector: "[data-component='locations']",
    importFn: () => import('./components/locations.js'),
  },
  {
    selector: "[data-component='testimonials']",
    importFn: () => import('./components/testimonials.js'),
  },
  {
    selector: "[data-component='tabs-map']",
    importFn: () => import('./components/tabs-map.js'),
  },
  {
    selector: "[data-component='horizontal-scroll']",
    importFn: () => import('./components/horizontal-scroll.js'),
  },
]
