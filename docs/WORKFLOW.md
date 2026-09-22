# Workflow — From idea to live Webflow section

How we build a new interactive section: **prototype in a playground → get it approved → turn it into a component → wire it into Webflow with the MCP → deploy.** Follow the same five phases every time.

---

## Phase 0 — Grab the real structure first

Before building the playground, know the markup the effect will live on. If the structure and class names **weren't provided**, pull them from Webflow via the MCP: `list_sites` → `list_pages` → `query_elements` to find the section/component and read its real Client-First classes, nesting and existing `data-*`. Build the playground against that same markup shape so the port is a drop-in. Only invent placeholder markup when there is genuinely no existing structure yet.

---

## Phase 1 — Playground (prototype in isolation)

Build a standalone, single-file prototype so we can iterate on the *feel* without touching the real site or the build.

- File: `playground/<feature>.html`, opened directly in a browser (or `npx serve playground`).
- Load libraries via **CDN** (GSAP, ScrollTrigger, Lenis, Swiper…). Nothing is bundled at this stage.
- Replicate the Client-First markup shape and the `data-*` attribute contract the real component will use — with **dummy content** (placeholder images, sample copy).
- Add a small **dev controls panel** (range sliders) for every value worth tuning (travel, speed, scrub, smoothness, etc.) so tuning happens live, without editing code.
- Gate the effect the same way the real site will (e.g. desktop-only via `matchMedia`, `prefers-reduced-motion` off).

Goal: a prototype that behaves exactly like the target, tunable in the browser.

## Phase 2 — Approve & tune

Review the playground, push the sliders around, and lock in the values (speeds, distances, timings, which breakpoints, etc.). Iterate here — it's cheap. Nothing goes near the real site until the motion is approved.

## Phase 3 — Component (port to the codebase)

Once approved, turn the prototype into a real component.

- Scaffold with `/create-component <name>` (creates `src/components/<name>.js`, registers it in `src/components.js`, creates the doc).
- The wrapper element carries `data-component="<name>"`; the component receives all matching elements and scopes every query to its wrapper.
- **Libraries:**
  - **GSAP Core + ScrollTrigger + Flip + SplitText are provided globally by Webflow** (Site Settings → GSAP). Use `window.gsap` / `window.ScrollTrigger` — do **not** bundle GSAP, so scroll-driven components share the same instance Lenis drives.
  - Libraries Webflow does **not** provide (e.g. **Lenis**) are bundled: `npm install` them and import in the relevant file. Smooth scroll is a site-wide concern → it lives in `src/components/global.js`, not inside a section component.
- Gate with `gsap.matchMedia()` for breakpoints + `prefers-reduced-motion`, and return cleanup so leaving the breakpoint reverts everything.
- Move the tuned values in as named constants (the ex-slider values).

## Phase 4 — Webflow structure (via the MCP)

Wire the component to the real page using the Webflow MCP. Prefer touching **as little as possible**.

- Call `webflow_guide_tool` once, then `list_sites` → `list_pages` → `query_elements` to find the section (`[data-component="…"]`) and inspect its real markup, classes and styles.
- **Reuse the existing Client-First markup.** Usually the only change is adding the `data-*` attributes the component reads (e.g. `data-speed`) with `set_attributes`. Update styles only when genuinely required.
- **No custom-code embeds** unless strictly unavoidable. Loading a library is done through the bundle (Phase 3) or, if it must be global and can't be bundled, via the site's head custom code — not an embed element on the canvas.
- Follow Client-First: class-only styling in the Designer, `data-*` only for JS hooks.

## Phase 5 — Build & deploy

- `npm run build` (only when deploying) → commits `dist/` → push. Use `/deploy`.
- The Webflow head snippet loads `main.js` from jsDelivr **pinned to a commit** (`@<sha>`). New code only goes live once that reference is bumped to the new commit (or `@main`) — `/deploy` handles this — and the CDN cache is purged.
- Update the docs in the **same** change: `components/<name>.md`, plus `ARCHITECTURE.md` / `TECH_STACK.md` / `FILE_STRUCTURE.md` if the change touched globals, dependencies, or file layout.

### Local testing before deploy

The site can load the **local** dev bundle instead of the CDN: set `localStorage.dev = '1'` (or Shift+D on a `webflow.io` domain) and run `npm run dev` locally. A “DEV” badge shows when it's active. This serves `main.js` / `styles.css` from `http://127.0.0.1:8080`, so you preview real component code on the real Webflow page before deploying.

---

## Quick checklist

- [ ] Playground built, dummy content, dev sliders, correct `data-*` contract
- [ ] Motion approved; values locked
- [ ] `/create-component`; `window.gsap` for Webflow-provided libs, bundle the rest
- [ ] `matchMedia` gating + reduced-motion + cleanup
- [ ] MCP: attributes added on existing Client-First markup, no embeds
- [ ] Build, deploy, bump CDN ref, purge; docs updated
