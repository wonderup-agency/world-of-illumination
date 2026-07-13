# Template Backport Audit

Findings from building **World of Illumination** on the WonderUp Webflow starter template, reviewed for adoption back into the base template. This document is about the template's tooling and conventions — it intentionally excludes anything specific to World of Illumination's own components or content.

**Method:** compared the initial commit (`ee4d11a`, the point this repo was cloned from the template) against `HEAD` across every tooling/config/root-doc file, reviewed all 32 commits in this project's history for fix-type changes, and cross-referenced recurring lessons recorded during development. No live diff against the private template repo was performed (not accessible in this session) — treat these as strong candidates to verify against the template directly, not as a confirmed diff.

**Last updated:** 2026-07-13

**Interactive version:** https://claude.ai/code/artifact/f6d6be87-bca3-42c6-9fa2-f66913afff0d

---

## High priority — safe, cheap, backport now

### 1. Missing `.gitattributes` (cross-platform line endings)

- **Problem:** The template ships with no `.gitattributes`. On Windows (`core.autocrlf=true`), every `git pull`/checkout produces false "modified" files — content is byte-identical, only line-ending metadata differs. Confirmed recurring across multiple pulls on this project.
- **Fix applied here:** commit `3545646` — added `* text=auto eol=lf` plus explicit `binary` rules for image/font extensions.
- **Why backport:** Any template user on Windows collaborating with a Mac/Linux teammate (or vice versa) hits this immediately. Zero risk, one-time fix.

### 2. Incomplete browser globals in `eslint.config.js`

- **Problem:** The template's ESLint config only declared `document`, `window`, `console` as globals. Any component using `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`, `requestAnimationFrame`, `cancelAnimationFrame`, or `getComputedStyle` fails lint with `no-undef` — and nearly every animation/scroll component needs at least one of these.
- **Fix applied here:** added all seven globals (diff between `ee4d11a` and `HEAD` on `eslint.config.js`).
- **Why backport:** These are core browser APIs, not edge cases — this misfires on the first animated component built from the template.

### 3. Browser scroll restoration not disabled in `webflow-snippet.html`

- **Problem:** Browsers restore scroll position on reload/back-navigation by default. Any component that computes initial state from scroll position (GSAP ScrollTrigger progress, manual scroll listeners) can initialize mid-animation or in a visually broken state after a refresh.
- **Fix applied here:** added `if (history.scrollRestoration) history.scrollRestoration = 'manual'` to the site-wide snippet (first surfaced as a component-level fix in `972aa2a`, later promoted to the snippet itself).
- **Why backport:** Belongs in the site-wide snippet, not per-component — fixing it once in the template snippet protects every future scroll-driven component automatically.

## High value, needs a documentation home (not a code diff)

### 4. Production-vs-local init timing: Webflow Interactions/lazy-load run before our script in prod

- **Problem:** Local dev and production initialize in a *different order*. Locally, our script runs before Webflow's own runtime. In production, Webflow Interactions (which can apply `display:none`/`opacity:0`/transform as an initial state) and native lazy-loading run **before** our CDN script executes. Any component that measures the DOM at init time (`getBoundingClientRect()`, `offsetHeight`) works locally and silently breaks in production. This exact bug shape drove **six** iterative production fixes on a single component (`guests.js` — commits `643adba`, `ee4174e`, `2af5b3e`, `972aa2a`, `2c19f07`, `cba7a1b`) before converging on a robust pattern, and is separately recorded as having broken production "multiple times."
- **Converged solution:** guard every init-time DOM measurement with `if (el.offsetHeight === 0) { requestAnimationFrame(retry); return }`; treat lazy-loaded images as needing explicit load-listeners (or `loading="eager"`); disable scroll restoration (#3); and for simple scroll-progress effects, skip ScrollTrigger entirely in favor of a plain `scroll` listener + `getBoundingClientRect()` math + `gsap.quickSetter` (reused successfully in `text-fill.js` with zero rework).
- **Why backport:**
  - Document the real init-order model in `ARCHITECTURE.md`'s "Browser Runtime Flow" section — it currently describes only the happy path, not that Webflow Interactions/lazy-loading can run first and hide or shift things before our script executes.
  - Add a concrete pre-deploy checklist to the `/deploy` or `/audit` skill: DOM-measurement guards present? Images eager-loaded or load-guarded? Custom `data-*` attributes actually **published** in Webflow (not just saved in the Designer)? Dependencies installed before testing?
  - This is hard-won knowledge that cost real production debugging time — it isn't a file to copy (the template has no parallax component), but it should be written down where the next scroll-driven component starts, instead of being rediscovered commit-by-commit.

## Convention gaps — cheap to document, real recurring risk

### 5. Scope third-party global classes under the component wrapper

- **Problem:** Swiper's default classes (`.swiper-pagination`, `.swiper-pagination-bullet`, etc.) are global. Unscoped styles on them leak across every Swiper instance on the page. Fixed once for `testimonials` (commit `011ccb4`); this site now has a second, independent Swiper instance (`locations`) — the same conflict is one careless CSS edit away from recurring.
- **Fix applied here:** scoped selectors to `[data-component='testimonials'] .swiper-pagination*`.
- **Why backport:** Worth a standing rule in `CONVENTIONS.md`: styling a third-party library's own classes must be scoped under that component's `data-component` selector, never written globally.

### 6. Caution before renaming a shared component's functional CSS classes

- **Problem (near-miss caught during this project, not a single commit):** A shared component's functional classes (e.g. `.marquee_track`, `.marquee_item`) are a contract across every Webflow instance that uses that component sitewide — including instances built directly in the Designer that this repo has no record of (no `structure/` reference, no page bundle). A rename proposed on repo-grep evidence alone would have broken a live page; it was caught only because the user happened to know another section still used the old classes.
- **Why backport:** Worth a short callout in `CONVENTIONS.md` next to the component-registration section: shared functional class names are cross-instance contracts, not local identifiers — confirm live Webflow usage explicitly before renaming, never infer safety from repo grep alone.

## Working well already — worth formalizing, not urgent

### 7. `gsap.matchMedia()` as the standard breakpoint/cleanup pattern

Every GSAP-driven component in this project (`guests`, `shows`, `elastic-pulse-button`, `horizontal-scroll`) independently converged on `gsap.matchMedia()` for breakpoint scoping instead of the `main.js` `breakpoint()` hook — it gets automatic revert/cleanup for free. Already the de facto standard; `ARCHITECTURE.md`/`CONVENTIONS.md` could say so explicitly instead of leaving it to be rediscovered per component.

### 8. Consistent `prefers-reduced-motion` + touch-device guards

Hover/motion-heavy components (`elastic-pulse-button`, `horizontal-scroll`, `marquee`) all independently gate on `prefers-reduced-motion` and, where relevant, `(hover: hover) and (pointer: fine)`. Same recommendation as #7 — formalize as a stated requirement for new animated components rather than convention-by-precedent.

### 9. `structure/<name>.html` + `playground/<name>.html` convention

Neither directory existed in the initial template — both emerged organically on this project: `structure/` holds clean reference Webflow markup per component, `playground/` holds standalone CDN-based test harnesses (no build step) for components with external dependencies (Mapbox, GSAP via CDN). Genuinely useful for developing/testing without live Webflow access. Worth scaffolding as an empty, documented convention in the template rather than something each project reinvents.

## Investigated, not recommended

- **`fix(build): bundle gsap/swiper` (`6b56ffc`)** — root cause was a missing local `npm install`, not a template defect (the Rollup config is byte-identical to the initial commit). Nothing to backport.
- **Prettier-only reformatting** in `scripts/create-component.js`, `scripts/create-page.js`, `scripts/setup.js` — cosmetic line-wrapping from `prettier --write`, no behavior change.
- **CDN reference pinned via browser extension** — this project pins the production Webflow snippet to a specific commit hash, updated manually after every push, by deliberate choice (already tried and rejected switching to `@main`/cache-busting). Project-specific operational choice, not a template concern.
- **Component business logic** (`shows.js` orbital math, `tabs-map.js` filtering, `locations.js` slider, `marquee.js` fill/loop algorithm) — genuinely specific to World of Illumination's own features, excluded by design even though some contain reusable techniques. Worth mining directly if a future project needs the same UI pattern, but not a template-level change.
