# Animations Catalog

Reusable, **content-independent** animation components already built in this
project — i.e. anything here can be dropped onto a *new* section just by
adding its `data-component` attribute (and any listed `data-*` options), with
no code changes. None of these read from a specific CMS collection or a
specific Webflow class name (unless noted) — that's what makes them reusable,
as opposed to a component built for one specific section's own markup (e.g.
`shows`, `tabs-map`, `theme-image-slider` — those stay in
[`components/`](./components/), not here).

Each row links to the component's own doc for full setup/tuning details.
When picking one for a new section, check the "Works on any content?" column
first — a "Yes" means just add the attribute; anything less has one specific
requirement called out.

## Scroll & hover animations

| Component | `data-component` | Effect | Works on any content? |
| --- | --- | --- | --- |
| [`image-parallax`](./components/image-parallax.md) | `image-parallax` | A single full-bleed image drifts vertically inside its own frame as the section scrolls. | Yes — any wrapper containing one `<img>`. |
| [`floating-parallax`](./components/floating-parallax.md) | `floating-parallax` | Scattered images drift horizontally at their own speed (`data-speed`) as their panel crosses the screen — a `guests`-style depth parallax, but on the horizontal axis and synced to a `horizontal-scroll` panel's own scroll progress instead of the page's vertical scroll. | Needs to be a `horizontal-scroll` panel containing `.floating-image-wrapper` with `[data-speed]` images. |
| [`guests`](./components/guests.md) | `guests` | Several scattered images each drift at their own speed (`data-speed`) as the section scrolls — a "depth" parallax. | Yes — any images tagged `[data-speed]`. |
| [`section-reveal`](./components/section-reveal.md) | `section-reveal` | Two variants, set via `data-section-reveal`: `curtain` (a section scrolls up and off, uncovering the one under it) or `expand` (a section rises and grows over the one before it, clipped in from a small inset card to full-bleed). Optional built-in parallax on the media inside. | Yes — any two adjacent `<section>`/`<header>`/`<footer>`/`<article>` siblings. |
| [`image-grow`](./components/image-grow.md) | `image-grow` | Pins a section while a centered image grows from a small "card" to full-screen, then releases. | Yes — via `data-image-grow="pin"` / `"target"` roles; size/timing tunable per instance with `data-image-grow-*` attributes. |
| [`horizontal-scroll`](./components/horizontal-scroll.md) (+ [`horizontal-scroll-mobile`](./components/horizontal-scroll-mobile.md) for tablet/mobile) | `horizontal-scroll` | Pins a section and scrolls its panels horizontally as the user scrolls vertically. Two modes: "train" (all panels slide together) or "curtain" (one panel stays pinned as a base while the rest slide over it). Mobile/tablet gets a sticky crossfade instead. | Yes — any 2+ panels tagged `data-horizontal-scroll-panel`. |
| [`footer`](./components/footer.md) | `footer` | An image sits like a curtain above content and lifts away on scroll, revealing what's underneath. Desktop only. | Needs `.footer_image-wrapper` / `.footer_component` — tied to those two class names today, not attribute-driven yet. |
| [`text-fill`](./components/text-fill.md) | `text-fill` | Splits text into words and fills each one from muted to white color as it scrolls through the viewport. | Yes — any plain text/heading element (not a Rich Text/CMS-rich-text element). |
| [`elastic-pulse-button`](./components/elastic-pulse-button.md) | `elastic-pulse-button` | A bouncy squash-and-stretch pulse on hover (desktop/mouse only). | Yes — any button(s) tagged `data-elastic-pulse-btn`. |
| [`marquee`](./components/marquee.md) | `marquee` | Infinite horizontal ticker — auto-duplicates content to fill the width and loop seamlessly, any speed/direction. | Yes — any `.marquee_item`s inside `.marquee_track` (fixed class names, but content itself is free). |
| [`tapes`](./components/tapes.md) | `tapes` | Two diagonal ticker rows crossing in an X, each auto-repeating a single heading to fill its width. | Yes — any single heading per `.tape-element` row. |

## Reusable sliders (Swiper-based, not pure animation but drop-in reusable)

| Component | `data-component` | Effect | Works on any content? |
| --- | --- | --- | --- |
| [`slider-swiper`](./components/slider-swiper.md) | `slider-swiper` | Plain carousel — several full slides at once, no peeking, prev/next arrows. | Yes — any `.swiper`/`.swiper-wrapper`/`.swiper-slide` structure; multiple instances can point at different CMS sources on the same page. |
| [`gallery-slider`](./components/gallery-slider.md) | `gallery-slider` | "Peek" carousel — centered slide with neighbors partially visible at the edges. Optional infinite loop via `data-gallery-slider-loop`. | Yes — same Swiper structure as above. |
| [`theme-carousel`](./components/theme-carousel.md) | `theme-carousel` | Fully automatic peek carousel — no arrows, no drag, advances on its own timer. | Yes — same Swiper structure; pads short CMS lists automatically for a clean loop. |
| [`arena-carousel`](./components/arena-carousel.md) | `arena-carousel` | Automatic infinite-loop carousel, several equal slides at once (1.3 → 4 per breakpoint), no arrows/drag. Builds the Swiper markup itself. | Yes — any wrapper; every direct child becomes a slide (static Designer items, no Swiper classes needed). |
| [`testimonials`](./components/testimonials.md) | `testimonials` | One slide at a time, looping, with clickable pagination dots. | Yes — same Swiper structure. |

## Notes

- Everything above is desktop-and-below unless the table says "Desktop
  only" — check the component's own doc for exact breakpoints.
- A component not on this list but that still sounds reusable (e.g.
  `nested-dropdown-fix`, `popup`) either fixes a specific native Webflow
  bug rather than animating anything, or is a full interactive UI pattern
  rather than a drop-in animation — see [`components/`](./components/) for
  those.
- When adding a new animation component that's genuinely reusable (not
  built for one section's specific markup), add it to this file in the
  same response — see `CLAUDE.md`'s Documentation Maintenance checklist.
