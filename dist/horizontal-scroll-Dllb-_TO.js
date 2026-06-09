/*
Component: horizontal-scroll
Webflow attribute: data-component="horizontal-scroll"

Pins the section and reveals its panels as the user scrolls vertically
(Osmo-style). Two modes, chosen automatically by the markup:

- Train mode (default): all panels translate left together.
- Curtain mode (when a leading panel has data-horizontal-scroll-pin): the
  pinned panel stays in place as a static base, the next panel slides in from
  the right over it like a curtain, then the remaining panels scroll
  horizontally as a normal train. Put data-horizontal-scroll-pin on the first
  panel to keep the first one pinned.

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

      const cleanups = [];

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

        const moving = panels.filter((p) => !p.hasAttribute(PIN_ATTR));
        const pinned = panels.filter((p) => p.hasAttribute(PIN_ATTR));

        if (pinned.length && moving.length) {
          cleanups.push(buildCurtain(section, pinned, moving));
        } else {
          buildTrain(section, panels);
        }
      });

      // matchMedia auto-reverts every tween / ScrollTrigger created above.
      // The DOM/class changes from curtain mode need manual teardown.
      return () => cleanups.forEach((fn) => fn())
    }
  );

  // Curtain: pinned panels become static bases; the rest move inside a single
  // track. The track slides in from the right (curtain over the base), then
  // continues translating left through the remaining panels (train).
  // Returns a teardown that unwraps the track and removes added classes.
  function buildCurtain(section, pinned, moving) {
    section.classList.add('is-curtain');
    pinned.forEach((p) => p.classList.add('is-base'));

    const track = document.createElement('div');
    track.className = 'horizontal__track';
    section.appendChild(track);
    moving.forEach((p) => track.appendChild(p));

    const vw = () => window.innerWidth;
    const trainSteps = moving.length - 1;

    gsap.set(track, { x: vw });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + vw() * moving.length,
        scrub: true,
        pin: true,
        invalidateOnRefresh: true,
      },
    });
    tl.to(track, { x: 0, duration: 1 }); // curtain
    if (trainSteps > 0) {
      tl.to(track, { x: () => -vw() * trainSteps, duration: trainSteps }); // train
    }

    return () => {
      while (track.firstChild) section.insertBefore(track.firstChild, track);
      track.remove();
      section.classList.remove('is-curtain');
      pinned.forEach((p) => p.classList.remove('is-base'));
    }
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
//# sourceMappingURL=horizontal-scroll-Dllb-_TO.js.map
