# horizontal-scroll

## Purpose

Pins a section and scrolls its panels horizontally while the user scrolls vertically (Osmo-style). Works with any number of panels (2+) — nothing is hardcoded to a count, so it's meant to be reused on any section that needs this effect. Two modes, chosen automatically by the markup:

- **Train mode** (default): every panel translates left together, at a fixed 1:1 pace with scroll.
- **Curtain mode** (when a panel carries `data-horizontal-scroll-pin`): that panel stays pinned in place as a static base while the rest slide in from the right over it like a curtain, then continue scrolling left as a normal train.

## Webflow Setup

Add to the wrapper that directly contains the panels:

```
data-component="horizontal-scroll"
```

Each direct child panel:

```
data-horizontal-scroll-panel
```

Optional attributes on the wrapper:

- `data-horizontal-scroll-disable="mobile" | "mobileLandscape" | "tablet"` — disables the effect at that breakpoint and below (panels render in normal document flow instead).
- `data-horizontal-scroll-distance="1.5"` — scroll-distance multiplier. Above 1, more vertical scroll is needed to cover the same horizontal travel (slower, more scroll "invested" per panel); below 1, less. Default `1`.
- `data-horizontal-scroll-scrub="0.3"` — lag (in seconds) between scroll input and panel movement, for a softer, less mechanical feel. Default: no lag (`scrub: true`, 1:1 with scroll — GSAP best practice for scrubbed pins; kept as the default since a laggy pin can feel disconnected from the wheel/trackpad).
- `data-horizontal-scroll-pin` — put on one **panel** (not the wrapper) to switch that instance to curtain mode, with that panel as the static base. Omit everywhere for the classic "train" scroll.

**Required Webflow layout (train mode)**: the wrapper needs `display: flex` with (default) `flex-wrap: nowrap`, and every panel needs `width: 100vw; height: <your call>; flex-shrink: 0; flex-grow: 0; flex-basis: 100vw` — set these on a shared combo class applied to every panel (e.g. `horizontal_panel`), never on the panels' own base classes if those are reused elsewhere on the site (see Notes). Curtain mode doesn't need this — `horizontal-scroll.css` handles its layout automatically once `data-horizontal-scroll-pin` is set.

GSAP + ScrollTrigger must be loaded globally (CDN) on the page — they are not bundled. See `TECH_STACK.md`/project memory for the exact `<script>` tags; add `defer` to them so they don't block page rendering.

## Behavior

- **Init**: Registers ScrollTrigger, sets up `gsap.matchMedia()` (desktop/tablet/mobile/reduced-motion conditions). For each wrapper: skips it under `prefers-reduced-motion: reduce` or on a breakpoint named in `data-horizontal-scroll-disable`; skips it entirely if fewer than 2 panels are found. Reads `data-horizontal-scroll-distance`/`-scrub` once per instance. Splits panels into "pinned" (has `data-horizontal-scroll-pin`) and "moving" — if there's at least one of each, builds curtain mode; otherwise builds train mode (`ease: "none"`, pin + scrub on the wrapper).
- **Resize**: Handled automatically — ScrollTrigger auto-refreshes (`invalidateOnRefresh: true`) and `gsap.matchMedia()` reverts/recreates per breakpoint. No manual hook.
- **Breakpoint**: Handled by `gsap.matchMedia()` (not the main.js breakpoint hook).
- **Reduced motion**: Under `prefers-reduced-motion: reduce`, no pin and no horizontal scroll are created — panels stay in natural document flow.

## Dependencies

- `window.gsap` and `window.ScrollTrigger` (global, via CDN — not bundled).
- `./horizontal-scroll.css` — `overflow: hidden` on the wrapper; curtain-mode-only rules (`.is-curtain`, `.is-base`, `.horizontal__track`) that JS toggles automatically. Train mode's flex/width layout is **not** in this file — it's set in Webflow (see Webflow Setup) since panel size/aspect can differ per instance.

## DOM Expectations

- Wrapper: `[data-component='horizontal-scroll']`.
- 2+ direct child panels matching `[data-horizontal-scroll-panel]` (fewer → the wrapper is skipped entirely, no pin/scroll-jack).
- Curtain mode: at least one of those panels also carries `data-horizontal-scroll-pin`.

## Notes

- **Train-mode panel sizing must go on a shared combo class, not the panels' own base classes** — if the panels reuse classes from elsewhere on the site (e.g. a generic content-block class), setting `width`/`flex-*` directly on that base class breaks every other page using it. Add a dedicated combo class (e.g. `horizontal_panel`) to every panel instead and size that.
- **`flex-shrink: 0` is easy to forget and the effect fails silently without it**: with the wrapper as `display: flex` and no `flex-shrink: 0` on the panels, the browser squeezes all panels to fit the available width instead of each staying `100vw` — symptom: all panels visible at once, squished side by side, no scroll animation. Always pair `width: 100vw` with `flex-shrink: 0; flex-grow: 0; flex-basis: 100vw`.
- In Webflow's Designer, a combo class applied on top of several different base classes (e.g. the same `horizontal_panel` combo over `section_text` and `section_image-block`) is edited as one class in the UI, but is stored as one style record **per base-class pairing** — a style change made through the Designer canvas propagates to all of them together (normal Webflow behavior), but scripted/API edits need to target each pairing individually.
- `data-horizontal-scroll-distance` and `-scrub` are read once per wrapper instance — different sections on the same page can use different values.

## Testing

Standalone playground at `playground/index.html` — open directly in a browser (GSAP via CDN, ScrollTrigger markers on via `DEBUG`). Reference markup at `structure/horizontal-scroll.html` (doesn't yet reflect the tuning attributes above — the wrapper/panel structure is still accurate).
