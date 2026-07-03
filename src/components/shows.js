import gsap from 'gsap'
import '../styles/shows.css'

export default function (elements) {
  const layoutFns = []

  elements.forEach((el) => {
    const featureImg = el.querySelector('.show_featured-img')
    const orbit = el.querySelector('.show_orbit')
    const items = [...el.querySelectorAll('.show_item:not(.hide)')]

    if (!items.length || !featureImg || !orbit) return

    const shows = items.map((item, i) => ({
      el: item,
      feature: item.querySelector('.show_item-featured'),
      slot: i,
    }))

    const N = shows.length
    const STEP_DURATION = 0.8
    const SHOW_DURATION = 4
    const ACTIVE_SCALE = 2 // slot 0 logo is 2× the orbit logo size — adjust to match design
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const FEATURED_OFFSET = 6 * rem // 6rem gap between featured logo and orbit arc top
    const VISIBLE_ANGLE = (155 / 180) * Math.PI
    const FADE_ANGLE = (20 / 180) * Math.PI

    let advanceTimer = null
    let featureImgBack = null // back layer for true crossfade
    let cx = 0,
      cy = 0,
      rx = 0,
      ry = 0

    function computeLayout() {
      const orbitRect = orbit.getBoundingClientRect()
      const imgRect = featureImg.getBoundingClientRect()
      const circleTop = imgRect.top - orbitRect.top
      const visibleBottom = orbitRect.height
      cx = imgRect.left - orbitRect.left + imgRect.width / 2
      cy = (circleTop + visibleBottom) / 2
      ry = (visibleBottom - circleTop) / 2
      rx = imgRect.width * 0.8
    }

    function slotOpacity(slot) {
      const angle = ((2 * Math.PI) / N) * slot
      const distFromTop = Math.min(angle, 2 * Math.PI - angle)
      if (distFromTop >= VISIBLE_ANGLE) return 0
      if (distFromTop >= VISIBLE_ANGLE - FADE_ANGLE) {
        return (VISIBLE_ANGLE - distFromTop) / FADE_ANGLE
      }
      return 1
    }

    function slotScale(slot) {
      return slot === 0 ? ACTIVE_SCALE : 1
    }

    function slotFilter(slot) {
      return slot === 0 ? 'brightness(1)' : 'brightness(0.55)'
    }

    function slotXY(slot) {
      const angle = ((2 * Math.PI) / N) * slot
      return {
        x: cx + rx * Math.sin(angle),
        y: cy - ry * Math.cos(angle) - (slot === 0 ? FEATURED_OFFSET : 0),
      }
    }

    function positionAll() {
      shows.forEach((show) => {
        const { x, y } = slotXY(show.slot)
        gsap.set(show.el, {
          xPercent: -50,
          yPercent: -50,
          x,
          y,
          opacity: slotOpacity(show.slot),
          scale: slotScale(show.slot),
          filter: slotFilter(show.slot),
        })
      })
    }

    // Browser prioritizes srcset over src — must update both to actually change the image
    function swapImg(target, source) {
      if (!source) return
      const src = source.getAttribute('src') || ''
      if (!src) return
      target.src = src
      const srcset = source.getAttribute('srcset')
      if (srcset) target.setAttribute('srcset', srcset)
      else target.removeAttribute('srcset')
      const sizes = source.getAttribute('sizes')
      if (sizes) target.setAttribute('sizes', sizes)
      else target.removeAttribute('sizes')
    }

    // True crossfade on desktop (back layer), simple fade on mobile
    function updateCircle(show, delay = 0) {
      if (featureImgBack) {
        gsap.killTweensOf([featureImg, featureImgBack])
        swapImg(featureImgBack, show.feature)
        gsap.set(featureImgBack, { autoAlpha: 0 })
        gsap.to(featureImgBack, {
          autoAlpha: 1,
          duration: 0.5,
          delay,
          ease: 'power2.inOut',
        })
        gsap.to(featureImg, {
          autoAlpha: 0,
          duration: 0.5,
          delay,
          ease: 'power2.inOut',
          onComplete: () => {
            swapImg(featureImg, show.feature)
            gsap.set(featureImg, { autoAlpha: 1 })
            gsap.set(featureImgBack, { autoAlpha: 0 })
          },
        })
      } else {
        gsap.killTweensOf(featureImg)
        gsap.to(featureImg, {
          autoAlpha: 0,
          duration: 0.4,
          delay,
          ease: 'power2.in',
          onComplete: () => {
            swapImg(featureImg, show.feature)
            gsap.to(featureImg, {
              autoAlpha: 1,
              duration: 0.4,
              ease: 'power2.out',
            })
          },
        })
      }
    }

    function advance() {
      const prevSlots = shows.map((s) => s.slot)

      shows.forEach((show) => {
        show.slot = (show.slot - 1 + N) % N
      })

      const newActive = shows.find((s) => s.slot === 0)
      updateCircle(newActive, STEP_DURATION * 0.5)

      shows.forEach((show, i) => {
        const prevSlot = prevSlots[i]
        const { x, y } = slotXY(show.slot)
        const newOpacity = slotOpacity(show.slot)
        const oldOpacity = slotOpacity(prevSlot)

        gsap.killTweensOf(show.el)

        if (oldOpacity === 0 && newOpacity > 0.1) {
          // Coming from hidden: teleport to position, then fade in
          gsap.set(show.el, {
            x,
            y,
            scale: slotScale(show.slot),
            filter: slotFilter(show.slot),
          })
          gsap.to(show.el, {
            opacity: newOpacity,
            duration: STEP_DURATION * 0.6,
            delay: STEP_DURATION * 0.4,
            ease: 'power2.out',
          })
        } else if (newOpacity < 0.1) {
          // Going to hidden: slide straight down and fade out
          const { x: prevX } = slotXY(prevSlot)
          gsap.to(show.el, {
            x: prevX,
            y: cy + ry * 2,
            opacity: 0,
            scale: 1,
            filter: slotFilter(show.slot),
            duration: STEP_DURATION,
            ease: 'power2.inOut',
          })
        } else {
          // Normal slide — naturally handles becoming featured (scale up, brighten) and leaving featured (scale down, dim)
          gsap.to(show.el, {
            x,
            y,
            opacity: newOpacity,
            scale: slotScale(show.slot),
            filter: slotFilter(show.slot),
            duration: STEP_DURATION,
            ease: 'power2.inOut',
          })
        }
      })

      advanceTimer = gsap.delayedCall(SHOW_DURATION + STEP_DURATION, advance)
    }

    layoutFns.push(() => {
      computeLayout()
      positionAll()
      if (featureImgBack) {
        featureImgBack.style.top = featureImg.offsetTop + 'px'
        featureImgBack.style.left = featureImg.offsetLeft + 'px'
        featureImgBack.style.width = featureImg.offsetWidth + 'px'
        featureImgBack.style.height = featureImg.offsetHeight + 'px'
      }
    })

    // Mobile: single logo above circle, cycles with simple fade
    gsap.matchMedia().add('(max-width: 61.9375em)', () => {
      const orbitRect = orbit.getBoundingClientRect()
      const imgRect = featureImg.getBoundingClientRect()
      const mobileX = imgRect.left - orbitRect.left + imgRect.width / 2
      const mobileY = imgRect.top - orbitRect.top - 4 * rem

      shows.forEach((show, i) => {
        gsap.set(show.el, {
          xPercent: -50,
          yPercent: -50,
          x: mobileX,
          y: mobileY,
          opacity: i === 0 ? 1 : 0,
          scale: 1.75,
          filter: 'brightness(1)',
        })
      })

      gsap.set(featureImg, { autoAlpha: 0 })
      swapImg(featureImg, shows[0].feature)
      gsap.to(featureImg, { autoAlpha: 1, duration: 0.4 })

      let mobileIndex = 0
      let mobileTimer = null

      function mobileCycle() {
        const prev = mobileIndex
        mobileIndex = (mobileIndex + 1) % N

        gsap.to(shows[prev].el, {
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power2.in',
        })
        gsap.to(shows[mobileIndex].el, {
          autoAlpha: 1,
          duration: 0.4,
          delay: 0.4,
          ease: 'power2.out',
        })
        updateCircle(shows[mobileIndex])

        mobileTimer = gsap.delayedCall(SHOW_DURATION + 0.8, mobileCycle)
      }

      mobileTimer = gsap.delayedCall(SHOW_DURATION, mobileCycle)

      return () => {
        if (mobileTimer) mobileTimer.kill()
        shows.forEach((show) => gsap.set(show.el, { clearProps: 'all' }))
        gsap.set(featureImg, { clearProps: 'all' })
      }
    })

    gsap.matchMedia().add('(min-width: 62em)', () => {
      computeLayout()
      positionAll()

      // Create back layer: clone featureImg, position it exactly over the original using pixel dimensions
      featureImg.parentElement.style.position = 'relative'
      const computed = window.getComputedStyle(featureImg)
      featureImgBack = featureImg.cloneNode(false)
      featureImgBack.removeAttribute('style')
      featureImgBack.removeAttribute('srcset')
      featureImgBack.removeAttribute('sizes')
      featureImgBack.style.position = 'absolute'
      featureImgBack.style.top = featureImg.offsetTop + 'px'
      featureImgBack.style.left = featureImg.offsetLeft + 'px'
      featureImgBack.style.width = featureImg.offsetWidth + 'px'
      featureImgBack.style.height = featureImg.offsetHeight + 'px'
      featureImgBack.style.objectFit = computed.objectFit
      featureImgBack.style.objectPosition = computed.objectPosition
      featureImgBack.style.borderRadius = computed.borderRadius
      featureImg.parentElement.insertBefore(featureImgBack, featureImg)
      gsap.set(featureImgBack, { autoAlpha: 0 })

      const active = shows.find((s) => s.slot === 0)
      gsap.set(featureImg, { autoAlpha: 0 })
      swapImg(featureImg, active?.feature)
      gsap.to(featureImg, { autoAlpha: 1, duration: 0.4 })

      advanceTimer = gsap.delayedCall(SHOW_DURATION, advance)

      return () => {
        if (advanceTimer) advanceTimer.kill()
        advanceTimer = null
        if (featureImgBack) {
          featureImgBack.remove()
          featureImgBack = null
        }
        featureImg.parentElement.style.position = ''
        shows.forEach((show, i) => {
          show.slot = i
        })
        shows.forEach((show) => gsap.set(show.el, { clearProps: 'all' }))
        gsap.set(featureImg, { clearProps: 'all' })
      }
    })
  })

  return {
    resize() {
      if (window.innerWidth >= 992) layoutFns.forEach((fn) => fn())
    },
  }
}
