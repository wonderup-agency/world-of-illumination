/*
Component: section-reveal
Webflow attribute: data-component="section-reveal"

Two scroll-driven reveal variants, per section, via data-section-reveal:

- curtain: the marked section IS the curtain. Natural document scroll carries it
  up out of the viewport while its next sibling is held still underneath, so
  that sibling reads as being uncovered.
- expand: the previous sibling is held still while the marked section rises over
  it on natural scroll, entering clipped in from the sides with a corner radius
  and growing to full-bleed in the same stretch.

Neither variant uses ScrollTrigger's pin. Both hold their still section by
counter-translating it against the scroll, which on a Lenis site is not a style
preference — see the note above buildExpand.

Neither variant animates the section that is *perceived* as still — that is what
makes them read differently. See the geometry notes on each build function.

GSAP + ScrollTrigger are expected to be loaded globally (window.gsap /
window.ScrollTrigger) via CDN in Webflow — they are NOT bundled here. That is
deliberate rather than incidental: global.js wires that global ScrollTrigger
instance to Lenis, and a bundled copy would not share it.
*/

import '../styles/section-reveal.css'

// ScrollTrigger's start/end markers. window.sectionRevealDebug() works with this
// off — see the note where it is assigned.
const DEBUG = false

const COMPONENT = "[data-component='section-reveal']"
const SECTION = '[data-section-reveal]'
const MEDIA = '[data-section-reveal-media]'

// Tags allowed to be the other half of a pair. A partner is translated
// wholesale, so this stays an allowlist of full-bleed page blocks rather than
// "whatever element sits next to it" — a Webflow navbar renders as a plain
// <div>, and picking that up would drag the site nav around.
// <header> and <footer> are in because a page's first block is often a header,
// and a footer being uncovered by a curtain is the effect's other classic use.
const PARTNER_TAGS = ['SECTION', 'HEADER', 'FOOTER', 'ARTICLE']

const DEFAULT_INSET = 5 // % clipped per side when an expand enters
const DEFAULT_RADIUS = 2 // rem of corner radius when an expand enters
const DEFAULT_DISTANCE = 1 // expand reveal length, in viewports

// Seconds the expand's clip-path playhead takes to catch up to the scroll
// position. 0 locks it to the scroll exactly; higher trails further behind and
// reads softer. The curtain has no equivalent knob — see buildCurtain.
const EXPAND_SCRUB = 1.5

// Fraction of an expand's pin reserved after the clip-path has finished, so a
// trailing playhead is normally done growing well before the pin releases.
//
// It cannot be a guarantee on its own, and no fixed value can be: the playhead's
// lag in scroll distance is roughly velocity × scrub, so a fast flick at scrub
// 1.5 falls further behind than the whole range is long. Widening the tail past
// this only steals scroll from the growth and starts reading as a dead patch at
// the end of the reveal. The hard guarantee is the onLeave in buildExpand — this
// just keeps it from having anything to do at ordinary scroll speeds.
const CLIP_TAIL = 0.15

// State classes. The CSS keys its layout requirements off these; the stacking
// ladder is written by GSAP so the context can revert it.
const CLASS = {
  curtain: 'section-reveal--curtain',
  held: 'section-reveal--held',
  rising: 'section-reveal--rising',
  base: 'section-reveal--base',
}

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='section-reveal']
 */
export default function (elements) {
  const { gsap, ScrollTrigger } = window

  if (!gsap || !ScrollTrigger) {
    console.warn(
      '[section-reveal] GSAP or ScrollTrigger not found on window — skipping.'
    )
    return
  }

  gsap.registerPlugin(ScrollTrigger)

  const mm = gsap.matchMedia()
  const built = []

  mm.add(
    '(min-width: 992px) and (prefers-reduced-motion: no-preference)',
    () => {
      const cleanups = []

      elements.forEach((wrapper) => {
        // Every pair is resolved before any of them is built, so the sibling
        // lookups all run against the untouched document.
        const pairs = resolvePairs(wrapper)
        if (!pairs.length) return

        applyStackingLadder(pairs)

        pairs.forEach((pair) => {
          const build = pair.variant === 'curtain' ? buildCurtain : buildExpand
          cleanups.push(build(pair))
          built.push(pair)
        })

        cleanups.push(watchHeights(pairs))
      })

      // matchMedia reverts every tween, gsap.set and ScrollTrigger made in
      // here. The classes, quickSetter writes and refresh listeners are ours.
      return () => {
        cleanups.forEach((fn) => fn())
        built.length = 0
      }
    }
  )

  // Call window.sectionRevealDebug() from the console at the exact moment
  // something looks wrong — it dumps the live geometry of every pair.
  //
  // Deliberately not behind DEBUG: needing a rebuild and a reload to inspect a
  // bug means inspecting it after it is gone. It costs one global and its output
  // is console.*, which the prod build strips anyway.
  window.sectionRevealDebug = () => report(built)

  // Images and fonts settle the final page height after DOMContentLoaded, which
  // moves every start/end position on the page. global.js already refreshes on
  // load, but this component can finish its dynamic import after that has
  // fired, so it cannot rely on it. It is also the first moment heights are
  // worth checking.
  const settled = () => {
    ScrollTrigger.refresh()
    built.forEach(checkGeometry)
    if (DEBUG) report(built)
  }

  if (document.readyState === 'complete') {
    settled()
  } else {
    window.addEventListener('load', settled, { once: true })
  }
}

// Heights on a Webflow page keep settling long after load: lazy images decode,
// fonts swap, sliders initialise, and Interactions reveal sections that start at
// zero height — `section_guests` on the home page is exactly that case, and
// guests.js has its own rAF wait for the same reason. Every start and end in
// this component is derived from those heights, so measuring once leaves the
// whole reveal in the wrong place. The tell is that it lands correctly the
// moment something else forces a refresh: opening DevTools, for instance, which
// resizes the viewport.
//
// Safe from feeding itself: transform and clip-path, the only things animated
// here, never change offsetHeight.
function watchHeights(pairs) {
  const { ScrollTrigger } = window

  if (typeof ResizeObserver === 'undefined') return () => {}

  let queued = null
  const observer = new ResizeObserver(() => {
    clearTimeout(queued)
    // Coalesced: a slider or a font swap can fire this several times in a row,
    // and a refresh re-measures every trigger on the page.
    queued = setTimeout(() => ScrollTrigger.refresh(), 150)
  })

  pairs.forEach(({ section, partner }) => {
    observer.observe(section)
    observer.observe(partner)
  })

  return () => {
    clearTimeout(queued)
    observer.disconnect()
  }
}

// ── Diagnostics ──────────────────────────────────────────────────────────────

// Every invariant here is enforced by section-reveal.css, so a failure means the
// stylesheet never made it onto the page or a Webflow rule is winning over it —
// not something to fix per section. Checked once, after load, when heights are
// final. Both symptoms it catches are the ones that read as "the pin is acting
// weird": a base that does not cover the screen lets the section above it slide
// past in a strip up top, and a riser that does not cover it exposes the base
// snapping back at the hand-off.
function checkGeometry({ section, partner, variant }) {
  const viewport = window.innerHeight
  const short = []

  if (partner.offsetHeight < viewport) {
    short.push(
      `the ${
        variant === 'curtain' ? 'uncovered' : 'held'
      } section is ${partner.offsetHeight}px`
    )
  }
  if (section.offsetHeight < viewport) {
    short.push(`the ${variant} section is ${section.offsetHeight}px`)
  }

  if (!short.length) return

  console.warn(
    `[section-reveal] ${short.join(
      ' and '
    )}, under the ${viewport}px viewport — the reveal cannot stay gap-free. section-reveal.css sets a min-height of 100vh on both, so check that dist/styles.css is loading on this page and that no Webflow rule overrides it.`,
    section
  )
}

function report(pairs) {
  if (!pairs.length) {
    console.warn('[section-reveal] no pairs built — nothing to report.')
    return
  }

  const viewport = window.innerHeight
  const firstClass = (el) =>
    el.className.split(' ')[0] || el.tagName.toLowerCase()

  const rows = pairs.map((pair) => {
    const { section, partner, variant, debug } = pair
    const own = getComputedStyle(section)
    const base = getComputedStyle(partner)
    const live = debug ? debug() : {}

    return {
      variant,
      moves: firstClass(section),
      still: firstClass(partner),
      // Under the viewport on either of these is the whole bug class above.
      'still h': partner.offsetHeight,
      'moves h': section.offsetHeight,
      // 'auto' or '0px' means this component's CSS is not on the page.
      'still min-h': base.minHeight,
      'moves min-h': own.minHeight,
      // Range in px, and how far through it the scroll currently is.
      range: Math.round(live.range || 0),
      progress: (live.progress || 0).toFixed(3),
      // Trails `progress` by EXPAND_SCRUB. If this is still under 1 when the
      // range ends, the growth is unfinished at the hand-off.
      clip_progress:
        live.clipProgress === undefined ? '—' : live.clipProgress.toFixed(3),
      active: !!live.active,
      // The hold, live. Reads as none outside the range, by design.
      'still transform': base.transform,
      clip: own.clipPath,
      z: `${base.zIndex} / ${own.zIndex}`,
    }
  })

  console.groupCollapsed(
    `[section-reveal] ${pairs.length} pair(s) · viewport ${viewport}px`
  )
  console.table(rows)
  // The console collapses long objects with an ellipsis and the truncated fields
  // are usually the interesting ones, so the same rows go out as one flat
  // string that can be copied whole.
  console.log(JSON.stringify(rows))
  console.groupEnd()
}

// ── Pair resolution ──────────────────────────────────────────────────────────

function resolvePairs(wrapper) {
  const sections = Array.from(wrapper.querySelectorAll(SECTION)).filter(
    // A nested instance owns its own sections.
    (section) => section.closest(COMPONENT) === wrapper
  )

  const pairs = []

  sections.forEach((section) => {
    const variant = section.getAttribute('data-section-reveal')

    if (variant !== 'curtain' && variant !== 'expand') {
      console.warn(
        `[section-reveal] Unknown variant "${variant}" — skipping.`,
        section
      )
      return
    }

    const partner =
      variant === 'curtain'
        ? siblingSection(section, 'next')
        : siblingSection(section, 'previous')

    if (!partner) {
      // What it found instead is the whole diagnosis, so it goes in the message.
      const found =
        variant === 'curtain'
          ? section.nextElementSibling
          : section.previousElementSibling

      console.warn(
        `[section-reveal] ${variant} has no adjacent block to ${
          variant === 'curtain' ? 'uncover' : 'rise over'
        } — skipping. Found ${
          found
            ? `<${found.tagName.toLowerCase()} class="${found.className}">`
            : 'nothing'
        } instead. The partner must be a direct sibling inside the same [data-component="section-reveal"] wrapper, tagged ${PARTNER_TAGS.map(
          (tag) => `<${tag.toLowerCase()}>`
        ).join(' / ')}, and not fixed or sticky.`,
        section
      )
      return
    }

    if (
      variant === 'curtain' &&
      section.hasAttribute('data-section-reveal-distance')
    ) {
      // A curtain leaves on natural document scroll at 1:1, and the section
      // underneath has to land back in flow exactly as the curtain clears. That
      // fixes the reveal length at the curtain's own height — any other value
      // leaves the held section permanently offset. Change the section's height
      // to change the length.
      console.warn(
        '[section-reveal] data-section-reveal-distance is ignored on a curtain (its length is its own height) — remove it.',
        section
      )
    }

    ensureOpaque(section)
    ensureOpaque(partner)

    pairs.push({ section, partner, variant })
  })

  return pairs
}

function siblingSection(section, direction) {
  let sibling =
    direction === 'next'
      ? section.nextElementSibling
      : section.previousElementSibling

  while (sibling) {
    if (isPartnerCandidate(sibling)) return sibling

    // The two halves have to be adjacent in flow: anything with a box of its own
    // in between would end up sandwiched inside the reveal. So the first
    // rendered thing either qualifies or the pair does not exist. Only
    // zero-height nodes — scripts, Webflow embeds, hidden helpers — are stepped
    // over.
    if (sibling.offsetHeight > 0) return null

    sibling =
      direction === 'next'
        ? sibling.nextElementSibling
        : sibling.previousElementSibling
  }

  return null
}

function isPartnerCandidate(element) {
  if (!element || !PARTNER_TAGS.includes(element.tagName)) return false

  // A fixed or sticky bar is never the thing being revealed — most often a
  // navbar whose tag was set to <header>. Pinning or translating it would carry
  // the site nav off with the reveal. global.js applies the same test when it
  // measures nav height for anchor offsets.
  const position = getComputedStyle(element).position
  return position !== 'fixed' && position !== 'sticky'
}

// Every reveal overlaps two sections, so the one in front must paint over the
// one behind. A curtain needs to be above the section *after* it, which is the
// opposite of the DOM's natural paint order, so the ladder can't be a fixed pair
// of z-index values — chains like curtain → curtain → plain would contradict
// themselves. Instead each pair contributes one "must be above" constraint and
// the values are relaxed until they all hold. Written with gsap.set so the
// matchMedia context reverts them.
function applyStackingLadder(pairs) {
  const { gsap } = window
  const levels = new Map()
  const level = (el) => levels.get(el) || 0

  pairs.forEach(({ section, partner }) => {
    levels.set(section, 0)
    levels.set(partner, 0)
  })

  for (let pass = 0; pass < pairs.length + 1; pass++) {
    let changed = false

    pairs.forEach(({ section, partner }) => {
      // In both variants the marked section is the one in front.
      if (level(section) <= level(partner)) {
        levels.set(section, level(partner) + 1)
        changed = true
      }
    })

    if (!changed) break
  }

  levels.forEach((value, element) => {
    gsap.set(element, { zIndex: value + 1 })
  })
}

// ── Variant: curtain ─────────────────────────────────────────────────────────
//
// Geometry: at the start the curtain (height H) covers the viewport and the
// section underneath sits H below the top of the screen. Natural scroll already
// carries the curtain up and off over exactly H, so the curtain itself needs no
// animation at all — what needs animating is the section underneath, which is
// translated up by H and released back to 0 over the same H. That keeps its
// on-screen position at the top of the viewport for the whole reveal
// (perceived: dead still) and lands it exactly in its natural flow position as
// the curtain clears, so there is nothing to unwind afterwards.
//
// No pin, therefore no pinSpacing: the reveal consumes the curtain's own scroll
// length, the document height never changes, and there is no pin hand-off frame
// where a gap could flash.
function buildCurtain(pair) {
  const { section, partner } = pair
  const { gsap, ScrollTrigger } = window
  const travel = () => section.offsetHeight

  section.classList.add(CLASS.curtain)
  partner.classList.add(CLASS.held)

  gsap.set(partner, { willChange: 'transform' })

  const media = parallaxMedia(section)
  const setHeld = gsap.quickSetter(partner, 'y', 'px')
  const setMedia = media ? gsap.quickSetter(media.element, 'y', 'px') : null

  let trigger = null

  // Driven by hand off the trigger's progress rather than by a scrubbed tween,
  // for one reason: outside the reveal the held section has to be left
  // completely untransformed.
  //
  // A scrubbed tween cannot do that. It parks at progress 0 — the full -H
  // offset — for the entire page above the reveal, and that resting transform is
  // poison. It lands in every getBoundingClientRect() taken of this section, and
  // a section that is measured while displaced and then pinned by a later pair
  // (an expand using it as its base, which is exactly what a curtain → expand
  // chain does) gets pinned a section height off screen. Zeroing it during
  // refreshes is not enough either: each ScrollTrigger measures its pin once
  // when it is *created*, before any refresh has run.
  //
  // Held at 0 above the reveal, this section sits in flow below a curtain that
  // covers the screen, so it is out of sight there. Which is why the jump to -H
  // on the activating frame costs nothing: hidden below the fold before it,
  // hidden behind the curtain after it.
  //
  // The parallax is the opposite case — the curtain carrying it is on screen the
  // whole way in — so the media tracks the clamped progress continuously and
  // never gets reset.
  // `self` when ScrollTrigger calls it, the stored instance when the global
  // refresh event does (that one passes no arguments).
  const render = (self) => {
    const st = self || trigger
    const progress = st ? st.progress : 0
    setHeld(st && st.isActive ? -travel() * (1 - progress) : 0)
    if (setMedia) setMedia(-media.travel() * (1 - progress))
  }

  // No scrub, by construction: progress read straight off the scroll position is
  // as 1:1 as it gets. The whole illusion is that this section is nailed to the
  // top of the viewport, and any catch-up smoothing would let it drift with
  // scroll velocity — a section that visibly wobbles instead of sitting still is
  // the one thing this variant cannot afford.
  trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${travel()}`,
    onUpdate: render,
    onToggle: render,
    markers: DEBUG,
  })

  // A resize mid-reveal still has to measure clean, so the transform is dropped
  // for the duration of a refresh. Restored on the global `refresh` event rather
  // than this trigger's own callback, because that one fires while later pairs
  // have yet to measure their pins.
  const zeroHeld = () => setHeld(0)
  ScrollTrigger.addEventListener('refreshInit', zeroHeld)
  ScrollTrigger.addEventListener('refresh', render)

  render()

  pair.debug = () => ({
    range: travel(),
    progress: trigger ? trigger.progress : 0,
    active: trigger ? trigger.isActive : false,
  })

  return () => {
    ScrollTrigger.removeEventListener('refreshInit', zeroHeld)
    ScrollTrigger.removeEventListener('refresh', render)
    section.classList.remove(CLASS.curtain)
    partner.classList.remove(CLASS.held)
    // quickSetter writes bypass the tween system, so the matchMedia context has
    // no record of them to revert — they are cleared here.
    gsap.set(partner, { clearProps: 'transform,willChange' })
    if (media) media.reset()
  }
}

// ── Variant: expand ──────────────────────────────────────────────────────────
//
// Geometry: the reveal starts as the section's top crosses the bottom of the
// viewport, so natural scroll already lifts it from the bottom edge to the top
// over exactly one viewport — the rise needs no animation. What has to be held
// is the section underneath, frozen right where the reader left it (its bottom
// on the bottom edge, so the screen stays covered) while this one climbs over
// it. Beyond that hold, the only thing tweened is the clip-path, so the entry
// width and the corner radius resolve over the same stretch of scroll.
//
// The base is held by counter-translating it against the scroll — a hand-rolled
// pin — rather than by ScrollTrigger's pin, and that is deliberate on a Lenis
// site. ScrollTrigger's pin switches the element to position: fixed and writes
// an explicit height on it; the sub-pixel disagreement with its spacer moves the
// document height, Lenis's ResizeObserver fires, and lenis.resize() resets
// targetScroll to the current position — which truncates whatever scroll is in
// flight. Felt as the scroll stalling for a beat exactly on the frame it pins,
// then carrying on. Confirmed on the live page: the pin-free curtain never did
// it, this variant did, and killing Lenis made it stop. A transform touches no
// layout, so there is nothing for Lenis to react to.
//
// It is the same geometry either way, including the ending: the held section
// snaps back to its flow position when the hold releases, one viewport up from
// where it was frozen. Unavoidable — holding something still while the page
// scrolls under it always ends in a snap. It is invisible only while this
// section is covering the screen *and* has finished growing, which is what the
// CSS half-rem overshoot and CLIP_TAIL exist to guarantee. Get either wrong and
// the base is seen jumping, through the flanks or a sliver at the top.
function buildExpand(pair) {
  const { section, partner } = pair
  const { gsap, ScrollTrigger } = window

  section.classList.add(CLASS.rising)
  partner.classList.add(CLASS.base)

  const inset = numberAttr(section, 'data-section-reveal-inset', DEFAULT_INSET)
  const radius = numberAttr(
    section,
    'data-section-reveal-radius',
    DEFAULT_RADIUS
  )
  const distance = numberAttr(
    section,
    'data-section-reveal-distance',
    DEFAULT_DISTANCE
  )

  const media = parallaxMedia(section)

  // How long the base is held. Both ends are clamped rather than trusted,
  // because either one going wrong shows the base snapping:
  //
  // - under a viewport, and the hold releases while the base is still on screen,
  //   so it snaps back into flow in full view;
  // - over this section's own height, and this section has climbed past the top
  //   by then, uncovering the strip below it.
  //
  // The lower bound wins any tie. Capping at the section's own height first
  // would end the reveal before this section reached the top whenever it is
  // shorter than the viewport — it stalls part-way up and the base snaps in
  // full view. A viewport is the floor, and the CSS min-height is what normally
  // keeps the two bounds from disagreeing at all.
  const holdLength = () => {
    const viewport = window.innerHeight
    return Math.max(
      Math.min(Math.max(distance * viewport, viewport), section.offsetHeight),
      viewport
    )
  }

  if (distance !== DEFAULT_DISTANCE) {
    const requested = distance * window.innerHeight
    if (Math.abs(requested - holdLength()) > 1) {
      console.warn(
        `[section-reveal] data-section-reveal-distance="${distance}" was clamped to ${(
          holdLength() / window.innerHeight
        ).toFixed(
          2
        )} viewports — it cannot be under 1, or over this section's own height (make the section taller to allow a longer reveal).`,
        section
      )
    }
  }

  // Counter-translation that holds the base still: exactly the scroll distance
  // travelled since the reveal started, so its on-screen box does not move.
  // Zero outside the range, in both directions — above it there is nothing to
  // hold yet, and below it the base belongs back in flow. Driven off the
  // trigger's own progress, never the scrubbed playhead: EXPAND_SCRUB may lag
  // the growth, but the hold has to be exact or the base drifts.
  const setBase = gsap.quickSetter(partner, 'y', 'px')
  let trigger = null

  // `self` when ScrollTrigger calls it, the stored instance when the global
  // refresh event does (that one passes no arguments) — and neither on the very
  // first callback, which can fire while the timeline is still being created.
  const renderHold = (self) => {
    const st = self || trigger
    setBase(st && st.isActive ? holdLength() * st.progress : 0)
  }

  // Unlike the curtain, nothing here has to sit still against the viewport by
  // way of the *animation* — the hold does that job on its own trigger progress
  // — so the clip-path playhead is free to trail the scroll. See EXPAND_SCRUB.
  //
  // That trailing is exactly why the clip does not get the whole range: a
  // lagging playhead would still be finishing the growth as the hold lets go,
  // and a section that is still inset at that moment shows the base snapping
  // through its own flanks. So the clip is mapped to the first part of the range
  // and the rest is dead scroll for the playhead to catch up in — full-bleed is
  // reached before the hand-off, never after it.
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top bottom',
      end: () => `+=${holdLength()}`,
      scrub: EXPAND_SCRUB || true,
      invalidateOnRefresh: true,
      markers: DEBUG,
      onUpdate: renderHold,
      onToggle: renderHold,
      // The hard guarantee behind CLIP_TAIL. The base becomes visible again the
      // instant the hold releases, and the only thing that can show it is this
      // section's own clip flanks — so the growth must be finished by then,
      // whatever the scrub is doing. Completing the scrub's own catch-up tween
      // is what lands it, rather than setting the timeline directly: that tween
      // drives the playhead and would drag it straight back on the next tick.
      //
      // Only felt on a fast flick, where the last sliver of growth resolves at
      // once — at a normal reading pace the tail has already finished it and
      // there is nothing left to snap.
      onLeave: (self) => {
        const scrubTween = self.getTween && self.getTween()
        if (scrubTween) scrubTween.progress(1)
        else tl.progress(1)
      },
    },
  })

  trigger = tl.scrollTrigger

  // The base is transformed every frame of the reveal, so it gets its own layer
  // up front instead of being promoted mid-scroll.
  gsap.set(partner, { willChange: 'transform' })

  // Growth is clip-path, never width + border-radius: no layout work per frame,
  // the radius rides along in the same property, and the content inside never
  // reflows while the section grows.
  //
  // clip-path is a paint-level property though, so a full-viewport section
  // repaints on every frame of the reveal. will-change hints the browser to keep
  // it on its own layer and prepare for exactly that.
  gsap.set(section, { willChange: 'clip-path' })
  tl.fromTo(
    section,
    { clipPath: `inset(0% ${inset}% 0% ${inset}% round ${radius}rem)` },
    { clipPath: 'inset(0% 0% 0% 0% round 0rem)', duration: 1 },
    0
  )

  // The catch-up tail. ScrollTrigger maps the scroll range onto the whole
  // timeline, so padding the timeline past the clip is what reserves that last
  // slice of scroll as dead time. The parallax spans everything, since the
  // section keeps travelling for all of it.
  if (media) {
    tl.fromTo(
      media.element,
      { y: () => -media.travel() },
      { y: 0, duration: 1 + CLIP_TAIL },
      0
    )
  }
  tl.to({}, { duration: CLIP_TAIL })

  // Same reason as the curtain: a refresh mid-reveal has to measure the base
  // where it actually lives, not where the hold has it parked.
  const zeroBase = () => setBase(0)
  ScrollTrigger.addEventListener('refreshInit', zeroBase)
  ScrollTrigger.addEventListener('refresh', renderHold)

  renderHold()

  pair.debug = () => ({
    range: holdLength(),
    progress: trigger ? trigger.progress : 0,
    active: trigger ? trigger.isActive : false,
    // The growth's own playhead, which trails `progress` by EXPAND_SCRUB.
    clipProgress: tl.progress(),
  })

  return () => {
    ScrollTrigger.removeEventListener('refreshInit', zeroBase)
    ScrollTrigger.removeEventListener('refresh', renderHold)
    section.classList.remove(CLASS.rising)
    partner.classList.remove(CLASS.base)
    gsap.set(section, { clearProps: 'clipPath,willChange' })
    // quickSetter writes bypass the tween system, so the context has no record
    // of them to revert.
    gsap.set(partner, { clearProps: 'transform,willChange' })
    if (media) media.reset()
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Parallax is opt-in. The media is made taller than its box by the given
// fraction and starts bottom-aligned, so drifting to top-aligned over the reveal
// moves it down relative to the section — i.e. it travels up slower than the
// section carrying it. Height is written once, never per frame; only the
// transform animates.
function parallaxMedia(section) {
  if (!section.hasAttribute('data-section-reveal-parallax')) return null

  const amount = numberAttr(section, 'data-section-reveal-parallax', 0)
  if (amount <= 0) return null

  const element = section.querySelector(MEDIA)
  if (!element) {
    console.warn(
      '[section-reveal] parallax is set but no [data-section-reveal-media] was found — skipping parallax.',
      section
    )
    return null
  }

  const { gsap } = window

  // The overflow the media is about to gain has to be clipped by its wrapper,
  // and that is a Webflow-side setting this component cannot make for it.
  const wrapper = element.parentElement
  if (wrapper && getComputedStyle(wrapper).overflow === 'visible') {
    console.warn(
      '[section-reveal] the parallax media wrapper needs overflow: hidden, or the media will spill out of its box.',
      wrapper
    )
  }

  gsap.set(element, {
    height: `${(1 + amount) * 100}%`,
    willChange: 'transform',
  })

  return {
    element,
    // How far the media overflows its box, which is exactly its parallax travel.
    // Derived from the element's own height so this never has to reach for the
    // container and tie itself to the markup's nesting.
    travel: () => element.offsetHeight * (amount / (1 + amount)),
    reset: () =>
      gsap.set(element, { clearProps: 'height,transform,willChange' }),
  }
}

function numberAttr(element, attribute, fallback) {
  if (!element.hasAttribute(attribute)) return fallback
  const value = parseFloat(element.getAttribute(attribute))
  return Number.isFinite(value) ? value : fallback
}

// Both variants overlap two sections, and a see-through one lets whatever is
// behind it show through mid-reveal — the two sections' content superimposed, or
// the page background where the reveal should be solid.
//
// Sections here are normally transparent over a page-level background, which is
// the standard Webflow pattern and is fine right up until they overlap. So
// rather than warn and leave it, the colour that was already showing behind the
// section is copied onto the section itself: guaranteed opaque, and identical to
// look at, since it is the same colour that was being seen through it.
//
// A gsap.set, so the matchMedia context takes it back off below 992px or under
// reduced motion.
function ensureOpaque(section) {
  const { gsap } = window
  const own = getComputedStyle(section)

  if (own.backgroundImage !== 'none' || !isTransparent(own.backgroundColor)) {
    return
  }

  let ancestor = section.parentElement

  while (ancestor) {
    const style = getComputedStyle(ancestor)

    // An image or gradient behind it cannot be copied faithfully, and guessing a
    // flat colour would be worse than saying so.
    if (style.backgroundImage !== 'none') {
      console.warn(
        '[section-reveal] this section is transparent over a background image — give it its own background in Webflow, or the reveal will show through it.',
        section
      )
      return
    }

    if (!isTransparent(style.backgroundColor)) {
      gsap.set(section, { backgroundColor: style.backgroundColor })
      return
    }

    ancestor = ancestor.parentElement
  }

  console.warn(
    '[section-reveal] this section is transparent and nothing behind it paints a background — give it one in Webflow, or the reveal will show through it.',
    section
  )
}

function isTransparent(color) {
  return color === 'transparent' || /^rgba\(.*,\s*0\)$/.test(color)
}
