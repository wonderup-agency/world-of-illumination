# headings-stagger

## Purpose

Staggered entrance for a group of headings: each direct child of the wrapper
fades in and rises slightly, one after another, the first time the wrapper
scrolls into view. Built for `headings-wrapper` in `section_fill`
("Valentine's Day. / Easter. / Halloween. / New Year's Eve."), reusable on any
wrapper whose direct children should cascade in.

## Webflow Setup

Add to the wrapper whose **direct children** should appear one by one
(`.headings-wrapper`):

```
data-component="headings-stagger"
```

## Behavior

- **Init**: Hides every direct child (`autoAlpha: 0`, `y: 1.5rem`). An
  `IntersectionObserver` fires once when the wrapper's top passes 85% of the
  viewport height (`rootMargin: -15%` bottom). Same entry point as
  `text-fill`'s `START_VH`. Then each child fades/rises in (0.6s,
  `power2.out`), 0.15s apart. Runs once, never reverses. Same at every
  breakpoint.
- **Reduced motion**: Does nothing; headings stay visible as Webflow renders them.
- **Resize / Breakpoint**: Not used.

## Dependencies

- `gsap` (bundled, core only). No ScrollTrigger / CDN tag needed.

## DOM Expectations

`[data-component='headings-stagger']` with 1+ direct children.

## Notes

- **Deliberately independent of `text-fill`**: `text-fill` is scroll-scrubbed
  (color follows scroll position, no discrete start event), so it can't be
  "started after" something without modifying it. Because the headings sit
  above the text-fill paragraph, they enter the viewport first and finish
  (~1.05s total) before the paragraph reaches its own 85% start line in
  normal scrolling. A very fast scroll can overlap the two briefly. That's an
  accepted tradeoff to avoid touching `text-fill`/`guests`.
- Animates the Rich Text wrapper divs as whole elements (no SplitText), so the
  Rich Text runtime issue documented in `text-fill.md` doesn't apply.
- Children are hidden by JS, not CSS, so if the script fails the headings
  still show.
