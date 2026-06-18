import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function (elements) {
  const mm = gsap.matchMedia()

  elements.forEach((section) => {
    mm.add('(min-width: 992px)', () => {
      const images = section.querySelectorAll('[data-speed]')

      images.forEach((img) => {
        const speed = parseFloat(img.dataset.speed) || 0.2
        const yTravel = speed * 400

        gsap.fromTo(
          img,
          { y: yTravel },
          {
            y: -yTravel,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        )
      })
    })
  })
}
