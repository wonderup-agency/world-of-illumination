# horizontal-scroll

## Purpose

Pins a section and scrolls its panels horizontally while the user scrolls vertically (Osmo-style). Works with any number of panels (2+) — nothing is hardcoded to a count, and any new panel added later works automatically, no per-panel Designer setup required (see Notes). Two modes, chosen automatically by the markup:

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

**Required Webflow layout (train mode)**: the wrapper needs `display: flex` (default `flex-wrap: nowrap` is fine as-is). That's the only structural CSS still set in Webflow — panel width, flex-shrink/grow/basis, and the ultra-wide-viewport cap all ship in `horizontal-scroll.css` itself, scoped by the `data-horizontal-scroll-panel` attribute, so they apply automatically to any panel regardless of its own Webflow class (see Notes for why this changed). The only thing still worth setting per instance in the Designer is **height** — a design choice, not a mechanical requirement of the effect. Curtain mode doesn't need any of this — `horizontal-scroll.css` handles its layout automatically once `data-horizontal-scroll-pin` is set.

GSAP + ScrollTrigger must be loaded globally (CDN) on the page — they are not bundled. See `TECH_STACK.md`/project memory for the exact `<script>` tags; add `defer` to them so they don't block page rendering.

## Behavior

- **Init**: Registers ScrollTrigger, sets up `gsap.matchMedia()` (desktop/tablet/mobile/reduced-motion conditions). For each wrapper: skips it under `prefers-reduced-motion: reduce` or on a breakpoint named in `data-horizontal-scroll-disable`; skips it entirely if fewer than 2 panels are found. Reads `data-horizontal-scroll-distance`/`-scrub` once per instance. Splits panels into "pinned" (has `data-horizontal-scroll-pin`) and "moving" — if there's at least one of each, builds curtain mode; otherwise builds train mode (`ease: "none"`, pin + scrub on the wrapper).
- **Resize**: Handled automatically — ScrollTrigger auto-refreshes (`invalidateOnRefresh: true`) and `gsap.matchMedia()` reverts/recreates per breakpoint. No manual hook.
- **Breakpoint**: Handled by `gsap.matchMedia()` (not the main.js breakpoint hook).
- **Reduced motion**: Under `prefers-reduced-motion: reduce`, no pin and no horizontal scroll are created — panels stay in natural document flow.

## Dependencies

- `window.gsap` and `window.ScrollTrigger` (global, via CDN — not bundled).
- `./horizontal-scroll.css` — `overflow: hidden` on the wrapper; train-mode panel sizing (`width: min(100vw, 160rem); flex: 0 0 100vw`), scoped by `[data-horizontal-scroll-panel]` so it applies to any panel automatically; curtain-mode-only rules (`.is-curtain`, `.is-base`, `.horizontal__track`) that JS toggles automatically.

## DOM Expectations

- Wrapper: `[data-component='horizontal-scroll']`.
- 2+ direct child panels matching `[data-horizontal-scroll-panel]` (fewer → the wrapper is skipped entirely, no pin/scroll-jack).
- Curtain mode: at least one of those panels also carries `data-horizontal-scroll-pin`.

## Notes

- **Panel sizing lives in `horizontal-scroll.css`, not in a Webflow combo class — this changed on 2026-08-25, for a real reason.** An earlier version set `width`/`flex-shrink`/`flex-grow`/`flex-basis` on a shared Webflow combo class (e.g. `horizontal_panel`) applied to every panel. That worked for the panels that existed at the time, but **did not generalize to a new panel added later on a different base class**: Webflow stores one style record per (base class, combo class) *pairing*, not one shared record for the combo name — a combo applied to a base class it's never been paired with before starts completely empty and inherits nothing from the other pairings, even though the Designer UI presents it as "one class." A brand-new panel would silently lose `flex-shrink: 0` and re-trigger the exact squish bug described below. Scoping the rule by the `data-horizontal-scroll-panel` **attribute** in the component's own CSS file sidesteps this entirely — it has nothing to do with which Webflow class a panel wears.
- **`flex-shrink: 0` is easy to forget and the effect fails silently without it**: with the wrapper as `display: flex` and no `flex-shrink: 0` on the panels, the browser squeezes all panels to fit the available width instead of each staying `100vw` — symptom: all panels visible at once, squished side by side, no scroll animation. This is now baked into the component CSS (`flex: 0 0 100vw`) so it can't be forgotten per instance.
- **Panel width is capped at `160rem` (2560px), not plain `100vw`** — on an ultra-wide monitor or heavy browser zoom-out, `window.innerWidth` can grow large enough that ScrollTrigger's pin measurements drift out of sync with it (browser zoom doesn't reliably fire a `resize` event the way actually resizing the window does), which showed up as a gap/misalignment on very wide viewports. `MAX_VIEWPORT` in `horizontal-scroll.js` (`2560`, in px — `window.innerWidth` can't be expressed in rem) must always match this `160rem` cap in effective pixels, or the CSS panel size and the JS scroll-distance math desync again. Both live in code now (CSS file + JS constant), not split between code and Designer, specifically so they can't drift apart the way the old combo-class version could.
- **A panel's own `section_*` base class needs `overflow: visible`** (not `hidden`) if any content inside it is meant to bleed past the panel's edges (e.g. a floating/parallax image meant to overlap the neighboring panel) — an `overflow: hidden` set directly on that base class (common Webflow default for a "clip my own content" wrapper) silently clips the bleed at the panel boundary regardless of the bleeding element's own z-index or position. The outer `[data-component='horizontal-scroll']` wrapper's own `overflow: hidden` (from this file's CSS) still correctly bounds everything to the visible viewport strip, so this is safe to loosen at the individual panel level. This one **does** still need to be set per base class in Webflow (it's about that panel's own content bleeding, a real design choice, not a mechanical requirement of the scroll effect).
- `data-horizontal-scroll-distance` and `-scrub` are read once per wrapper instance — different sections on the same page can use different values.
- The wrapper's own `display: flex` (train mode) is still set once per Webflow class (e.g. `.section_horizontal`), same "one class = one style record" model — but since there's normally only one wrapper class per horizontal-scroll instance (not one per panel type), this doesn't have the same multi-panel generalization problem the old per-panel combo did.

## Testing

Standalone playground at `playground/index.html` — open directly in a browser (GSAP via CDN, ScrollTrigger markers on via `DEBUG`). Reference markup at `structure/horizontal-scroll.html` (doesn't yet reflect the tuning attributes above — the wrapper/panel structure is still accurate).
