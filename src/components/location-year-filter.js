/*
Component: location-year-filter
Webflow attribute: data-component="location-year-filter"
*/

/**
 * Reads the venue name (last text row inside `.location_tagline-wrapper`)
 * from a single year-card item.
 * @param {Element | null} item
 * @returns {string}
 */
function getVenueText(item) {
  if (!item) return ''
  const rows = item.querySelectorAll('.location_tagline-wrapper > div')
  const venueRow = rows[rows.length - 1]
  return venueRow ? venueRow.textContent.trim().toLowerCase() : ''
}

/**
 * @param {HTMLElement[]} elements - All elements matching [data-component='location-year-filter']
 */
export default function (elements) {
  elements.forEach((wrapper) => {
    try {
      const lists = wrapper.querySelectorAll(':scope > .w-dyn-list')
      if (lists.length < 2) return

      const [referenceList, ...otherLists] = lists
      const referenceVenue = getVenueText(
        referenceList.querySelector('.w-dyn-item')
      )

      if (!referenceVenue) {
        console.warn(
          '[location-year-filter] Could not read the 2026 card venue text — skipping filter'
        )
        return
      }

      let visibleCount = 1 // the 2026 card itself always stays visible

      otherLists.forEach((list) => {
        list.querySelectorAll('.w-dyn-item').forEach((item) => {
          const isMatch = getVenueText(item) === referenceVenue
          item.style.display = isMatch ? '' : 'none'
          if (isMatch) visibleCount++
        })
      })

      const section = wrapper.closest('section')
      if (section) {
        section.style.display = visibleCount > 1 ? '' : 'none'
      }
    } catch (error) {
      console.error('[location-year-filter] Failed to filter year cards', error)
    }
  })
}
