/*
Component: hero-video
Webflow attribute: data-component="hero-video"
*/

// How far outside the viewport the video may be before we start loading it.
const ROOT_MARGIN = '200px'

/**
 * Starts a background hero video from JS instead of the native `autoplay`
 * attribute, so its download never competes with the page's critical render.
 *
 * The markup keeps `poster` + `preload="none"` and drops `autoplay`: the
 * browser paints the poster immediately and fetches zero video bytes until
 * play() is called here, after `load` and only once the video is on screen.
 *
 * @param {HTMLElement[]} elements - All elements matching [data-component='hero-video']
 */
export default function (elements) {
  // Under reduced motion the poster is the whole experience — never fetch the video.
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  elements.forEach((element) => {
    const video =
      element.tagName === 'VIDEO' ? element : element.querySelector('video')

    if (!video) {
      console.warn('[hero-video] no <video> found', element)
      return
    }

    if (reducedMotion) return

    // iOS only honours programmatic play() when the muted *property* is set,
    // not just the attribute.
    video.muted = true

    let observer = null

    const play = () => {
      // play() rejects when the browser blocks playback. The poster stays
      // visible, which is an acceptable fallback, so fail quietly.
      video.play().catch(() => {})
    }

    const watch = () => {
      // No IntersectionObserver: just play, rather than never playing at all.
      if (!('IntersectionObserver' in window)) {
        play()
        return
      }

      observer = new window.IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) play()
            else if (!video.paused) video.pause()
          })
        },
        { rootMargin: ROOT_MARGIN }
      )

      observer.observe(video)
    }

    // Wait for the page to finish loading so the video queues behind
    // everything that actually blocks rendering.
    if (document.readyState === 'complete') watch()
    else window.addEventListener('load', watch, { once: true })
  })
}
