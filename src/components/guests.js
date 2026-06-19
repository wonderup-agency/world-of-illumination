import { gsap } from 'gsap'

export default function (elements) {
  const mm = gsap.matchMedia()

  elements.forEach((section) => {
    mm.add('(min-width: 992px)', () => {
      const images = section.querySelectorAll('[data-speed]')

      const items = Array.from(images).map((img) => ({
        set: gsap.quickSetter(img, 'y', 'px'),
        travel: (parseFloat(img.dataset.speed) || 0.2) * 400,
      }))

      function tick() {
        const bottom = section.getBoundingClientRect().bottom
        const total = window.innerHeight + section.offsetHeight
        const progress = Math.max(0, Math.min(1, 1 - bottom / total))
        items.forEach(({ set, travel }) => set(-progress * travel))
      }

      tick()
      window.addEventListener('scroll', tick, { passive: true })

      return () => {
        window.removeEventListener('scroll', tick)
        items.forEach(({ set }) => set(0))
      }
    })
  })
}
