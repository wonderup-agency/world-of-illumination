/*
Component: horizontal-scroll
Webflow attribute: data-component="horizontal-scroll"

Pins the section and reveals its panels as the user scrolls vertically
(Osmo-style). Two modes, chosen automatically by the markup:

- Train mode (default): all panels translate left together.
- Curtain mode (when any panel has data-horizontal-scroll-pin): the pinned
  panel(s) stay in place as a static base while the remaining panels slide in
  from the right, stacking over them like a curtain. Set data-horizontal-scroll-pin
  on the first panel to keep it pinned.

GSAP + ScrollTrigger are expected to be loaded globally (window.gsap /
window.ScrollTrigger) via CDN in Webflow — they are NOT bundled here.
*/


const PANEL_SELECTOR = '[data-horizontal-scroll-panel]';
const PIN_ATTR = 'data-horizontal-scroll-pin';

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='horizontal-scroll']
 */
function horizontalScroll (elements) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (!gsap || !ScrollTrigger) {
    console.warn(
      '[horizontal-scroll] GSAP or ScrollTrigger not found on window — skipping.'
    );
    return
  }

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add(
    {
      isMobile: '(max-width:479px)',
      isMobileLandscape: '(max-width:767px)',
      isTablet: '(max-width:991px)',
      isDesktop: '(min-width:992px)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const { isMobile, isMobileLandscape, isTablet, reduceMotion } =
        context.conditions;

      // Reduced motion: leave panels in natural flow, no pin, no scroll-jack.
      if (reduceMotion) return

      elements.forEach((section) => {
        // Per-breakpoint opt-out via data-horizontal-scroll-disable.
        const disable = section.getAttribute('data-horizontal-scroll-disable');
        if (
          (disable === 'mobile' && isMobile) ||
          (disable === 'mobileLandscape' && isMobileLandscape) ||
          (disable === 'tablet' && isTablet)
        ) {
          return
        }

        const panels = gsap.utils.toArray(PANEL_SELECTOR, section);
        if (panels.length < 2) return

        // Curtain mode if any panel opts in; otherwise the classic train.
        const overlays = panels.filter((p) => !p.hasAttribute(PIN_ATTR));
        const isCurtain = overlays.length < panels.length;

        if (isCurtain) {
          buildCurtain(section, overlays);
        } else {
          buildTrain(section, panels);
        }
      });

      // matchMedia auto-reverts every tween / ScrollTrigger created above
      // when this combination of conditions stops matching.
      return () => {
        elements.forEach((section) => section.classList.remove('is-curtain'));
      }
    }
  );

  // Curtain: pinned panels stay put (DOM-order stacking), each overlay panel
  // slides in from the right over the previous one. One viewport of scroll per overlay.
  function buildCurtain(section, overlays) {
    section.classList.add('is-curtain');
    gsap.set(overlays, { xPercent: 100 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + window.innerHeight * overlays.length,
        scrub: true,
        pin: true,
        invalidateOnRefresh: true,
      },
    });

    overlays.forEach((panel) => tl.to(panel, { xPercent: 0 }));
  }

  // Train: pin the section, translate all panels along X. ease:"none" keeps
  // scroll position and panel position in sync.
  function buildTrain(section, panels) {
    gsap.to(panels, {
      x: () => -(section.scrollWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + (section.scrollWidth - window.innerWidth),
        scrub: true,
        pin: true,
        invalidateOnRefresh: true,
      },
    });
  }
}

export { horizontalScroll as default };
//# sourceMappingURL=horizontal-scroll-lj5KiaYN.js.map
