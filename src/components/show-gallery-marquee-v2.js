/*
Component: show-gallery-marquee-v2
Webflow attribute: data-component="show-gallery-marquee-v2"

WIP fork of show-gallery-marquee.js for a "two rows, opposite direction,
every breakpoint" redesign of the CMS show-images gallery -- tested under
its own data-component name so the mobile-only original keeps working
untouched wherever it's still used (same pattern as tabs-map-v2 /
theme-carousel).

Turns each `.location_slider` row inside the wrapper into its own infinite
horizontal marquee, built from that row's own CMS `.show_gallery-list`, at
every breakpoint (not just mobile). Row order sets direction: the first row
scrolls one way, the second scrolls the opposite way (same idea as tapes.js's
two opposite ribbons). Same clone-fill-until-covered + duplicate-for-seamless
-loop technique as marquee.js/tapes.js/show-gallery-marquee.js, needed
because the number of CMS photos varies per show. Each row keeps its own real
Webflow Collection List as a no-JS fallback (hidden via CSS once its
generated track is built) -- same isolation principle as
show-gallery-marquee.js.
*/

import '../styles/show-gallery-marquee-v2.css'

// How many seconds one card takes to fully scroll past, used when
// data-gallery-marquee-speed is absent. A flat px/second speed (the
// original approach) made mobile's smaller cards zip by noticeably faster
// than desktop's -- deriving px/second from the *rendered* card width at
// fill time instead keeps the pace the same at every breakpoint.
const SECONDS_PER_ITEM = 15
const SPEED_ATTR = 'data-gallery-marquee-speed'
const ROW_SELECTOR = '.location_slider'
const ACTIVE_CLASS = 'is-gallery-marquee'
const TRACK_CLASS = 'show-gallery-marquee-v2_track'
const ITEM_CLASS = 'show-gallery-marquee-v2_item'

// Fisher-Yates -- each row gets its own independent shuffle (see the
// `baseItems` comment below), not just the CMS order mirrored.
function shuffle(items) {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='show-gallery-marquee-v2']
 */
export default function (elements) {
  const fillers = []

  elements.forEach((wrapper) => {
    const wrapperSpeedOverride =
      parseFloat(wrapper.getAttribute(SPEED_ATTR)) || null

    Array.from(wrapper.querySelectorAll(ROW_SELECTOR)).forEach((row, index) => {
      const list = row.querySelector('.show_gallery-list')
      if (!list) return

      const liveItems = Array.from(list.querySelectorAll('.show_gallery-item'))
      if (!liveItems.length) return

      // Small, bounded set -- forced eager so nothing pops in mid-scroll
      // once the track is animating (same reasoning as
      // show-gallery-marquee.js / locations.js).
      list.querySelectorAll('.show_multi-image').forEach((img) => {
        img.loading = 'eager'
      })

      // px/second override, if set explicitly in Webflow -- otherwise
      // fill() derives it from the rendered card width (see
      // SECONDS_PER_ITEM above).
      const speedOverride =
        parseFloat(row.getAttribute(SPEED_ATTR)) || wrapperSpeedOverride

      // Each row shuffles independently -- mirroring alone (see
      // `.is-reverse` below) only re-showed the same CMS order backwards,
      // which read as too similar between rows. A real per-row shuffle
      // means the two rows are actually showing different photos at any
      // given moment, not just the same sequence flipped.
      const baseItems = shuffle(liveItems).map((item) => {
        const clone = item.cloneNode(true)
        clone.classList.add(ITEM_CLASS)
        return clone
      })

      const track = document.createElement('div')
      track.className = TRACK_CLASS
      list.insertAdjacentElement('afterend', track)
      row.classList.add(ACTIVE_CLASS)
      // Odd rows (2nd, 4th...) scroll the opposite direction from the
      // first, so any two adjacent rows always cross each other -- on top
      // of (not instead of) the independent per-row shuffle above. Done by
      // horizontally mirroring the whole row (`.is-reverse`,
      // `transform: scaleX(-1)` in show-gallery-marquee-v2.css) with a
      // counter-mirror on each item so the photos themselves render
      // right-side-up -- not by reversing the animation itself
      // (`animation-direction: reverse`, or a separate keyframe going the
      // other way, both tried first). Both of those start the row's very
      // first frame already mid-loop (the "end" keyframe state); mirroring
      // reuses the exact same forward keyframe every row already uses,
      // which starts correctly, so there's nothing left to get wrong.
      if (index % 2 === 1) {
        row.classList.add('is-reverse')
      }

      let lastItemWidth = null

      const fill = () => {
        // Rebuild only when a photo's own rendered width actually changed
        // -- that only happens at a real breakpoint crossing (991px/479px,
        // see show-gallery-marquee-v2.css), not on every trivial resize
        // (e.g. a scrollbar toggling window width by a few px once the page
        // grows tall enough). Measuring the row itself (row.offsetWidth)
        // was tried first and dropped: as a flex item it's prone to being
        // misread (see the .location_slider CSS notes), and rebuilding the
        // track on every small resize was recomputing animation-duration
        // mid-cycle -- changing a running animation's duration re-maps its
        // *already-elapsed* time onto the new duration, which visibly
        // jumps/skips the loop instead of continuing smoothly.
        const existingItem = track.children[0]
        const currentItemWidth = existingItem
          ? Math.round(existingItem.getBoundingClientRect().width)
          : null
        if (currentItemWidth !== null && currentItemWidth === lastItemWidth) {
          return
        }

        track.innerHTML = ''
        baseItems.forEach((item) => track.appendChild(item.cloneNode(true)))

        // Filled to a generous fixed target rather than "just enough to
        // cover this row" -- sized off the viewport (not the row) so it's
        // never subject to the same row-measurement issues, and floored at
        // 3200px so a normal-width screen always gets a healthy multi-lap
        // margin. Running short read as the row reaching the end, sitting
        // empty for a moment, then restarting.
        const fillTarget = Math.max(3200, window.innerWidth * 1.5)
        while (track.scrollWidth < fillTarget) {
          baseItems.forEach((item) => track.appendChild(item.cloneNode(true)))
        }

        // Duplicate the filled set once more so the -50% loop lines up
        // seamlessly regardless of photo count.
        Array.from(track.children).forEach((item) => {
          const clone = item.cloneNode(true)
          clone.setAttribute('aria-hidden', 'true')
          track.appendChild(clone)
        })

        const firstItem = track.children[0]
        lastItemWidth = Math.round(firstItem.getBoundingClientRect().width)

        // Keep scroll speed constant regardless of how much content got
        // filled in. Without an explicit override, px/second is derived
        // from the card's own rendered stride (width + its trailing gap)
        // so the pace -- seconds per card -- stays the same at every
        // breakpoint instead of a flat px/second (which made mobile's
        // smaller cards zip by faster).
        const itemStride =
          lastItemWidth +
          parseFloat(getComputedStyle(firstItem).marginRight || 0)
        const speed = speedOverride || itemStride / SECONDS_PER_ITEM
        const setWidth = track.scrollWidth / 2
        track.style.animationDuration = `${setWidth / speed}s`
      }

      // The very first measurement is deferred two animation frames so the
      // page's CSS has definitely been applied before reading any width --
      // reading too early can catch things at their raw, unstyled natural
      // size, wildly inflating scrollWidth. A full `load` event (waiting on
      // every one of this component's ~20 eager-loaded, full-resolution CMS
      // photos to finish downloading) was tried first, but left the row
      // empty for several seconds while that download completed -- two rAFs
      // is enough to guarantee styles/layout have settled without that wait.
      requestAnimationFrame(() => requestAnimationFrame(fill))
      fillers.push(fill)
    })
  })

  if (!fillers.length) return

  return {
    // Runs on window resize (debounced 150ms).
    resize() {
      fillers.forEach((fill) => fill())
    },
  }
}
