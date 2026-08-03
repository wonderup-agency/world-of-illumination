# footer

## Purpose

Sticky "curtain reveal" effect for the site footer: an image sits above the
footer like a curtain and lifts away as you scroll, uncovering the footer
underneath (which stays pinned in place while this happens, so it reads as
being revealed rather than just scrolling past). Ends with the whole footer
visible and flush with the bottom of the page.

**Desktop only (≥992px).** Below that, the footer is left as a plain static
section with no effect at all — the sticky/clip-path technique this relies on
doesn't hold up on tablet/mobile screen sizes and looked broken there.

## Webflow Setup

Add to the footer section wrapper:

```
data-component="footer"
```

Required structure inside:

- `.footer_image-wrapper` — wraps the curtain image
  - `.footer_image` — the `<img>` itself
- `.footer_component` — the actual footer content (nav, links, etc.)

## Behavior

- **Init**: Skipped entirely under `prefers-reduced-motion: reduce`. Otherwise
  gated behind `gsap.matchMedia('(min-width: 992px)')`:
  - **On desktop**: appends a spacer element (`footer_reveal-spacer`) after the
    section, adds `.is-reveal` (which is what footer.css's rules key off of),
    then measures the footer's height/curtain travel/corner radius and starts
    driving three things every scroll frame — the footer's clip line (so it's
    revealed from the top down rather than just uncovered), the curtain's
    corner radius (square → rounded as it lifts), and the image's own parallax
    drift. Height/measurements are re-read on the `load` event once fonts and
    images settle.
  - **Below desktop / on leaving desktop**: `gsap.matchMedia`'s cleanup
    function removes the scroll/load listeners, removes `.is-reveal`, removes
    the spacer, and clears every custom property / inline transform the effect
    wrote — leaving the footer as a normal static section with no JS
    involvement.
- **Resize**: Re-measures and re-renders, but only while the desktop match is
  active (no-op below 992px).
- **Breakpoint**: Not used — `gsap.matchMedia()` handles crossing 992px itself
  (activates/tears down automatically in both directions).

## Dependencies

- `gsap` — core (`gsap.matchMedia()`, used only to scope the effect to
  desktop and get automatic enter/leave cleanup — no tweens are created, all
  animation is driven by plain scroll-position math).
- `src/styles/footer.css` — all of the sticky/clip-path/curtain geometry.
  Every rule is scoped under `.footer_section.is-reveal`, so with that class
  absent (mobile/tablet, or JS disabled) the footer renders as a normal static
  section automatically — no separate mobile CSS override needed.

## DOM Expectations

Elements matching `[data-component='footer']` must contain `.footer_image-wrapper`
and `.footer_component`; `.footer_image-wrapper .footer_image` is optional (no
parallax drift without it, but the reveal/clip still works).

## Notes

- No ScrollTrigger/pin — deliberately avoided so it can't conflict with Lenis
  smooth scroll. Progress is computed from `getBoundingClientRect()` on the
  native `scroll` event (same technique as `guests.js`/`text-fill.js`).
- `--footer-image`, `--footer-radius` (footer.css) are the tunable knobs for
  curtain height and corner radius.
- The 992px threshold matches the project's Desktop/base breakpoint — change
  the query string in `footer.js` if the cutoff should move.
