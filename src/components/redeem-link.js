/*
Component: redeem-link
Webflow attribute: data-component="redeem-link"
*/

// Must match SHOW_PARAM in redeem-modal.js.
const SHOW_PARAM = 'show'
const REDEMPTION_PATH = '/redemption'

/*
Webflow can't build a link from a CMS field plus a fixed path, so the mobile
nav's REDEEM VOUCHER buttons are set to a plain "/redemption" link and this
adds each show's slug as ?show=<slug>. redeem-modal.js reads that param on
/redemption and opens the matching show's calendar directly.
*/

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='redeem-link']
 */
export default function (elements) {
  elements.forEach((wrapper) => {
    wrapper.querySelectorAll('[data-redeem-show]').forEach((scope) => {
      const slug = scope.getAttribute('data-redeem-show')?.trim()
      if (!slug) return

      scope.querySelectorAll('a[href]').forEach((link) => {
        const url = new window.URL(
          link.getAttribute('href'),
          window.location.origin
        )
        if (url.pathname.replace(/\/$/, '') !== REDEMPTION_PATH) return
        url.searchParams.set(SHOW_PARAM, slug)
        link.setAttribute('href', `${url.pathname}${url.search}`)
      })
    })
  })
}
