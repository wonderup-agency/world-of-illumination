/*
Shared date-window helpers used by components that turn themselves on/off by
date (popup, schedule). Browser-only, no dependencies.
*/

// Query param that overrides "now" for previewing a date window, e.g.
// ?preview-date=2026-11-27T00:01:00-07:00 or ?preview-date=2026-11-28
const previewParam = 'preview-date'

/**
 * Parses a date attribute value. Two formats:
 * - "YYYY-MM-DD": midnight in the visitor's own timezone (original popup
 *   behavior). Flagged `dateOnly` so an end date can include the whole day.
 * - Full ISO date-time with an explicit offset or Z, e.g.
 *   "2026-11-27T00:00:00-07:00": an exact instant, same for every visitor.
 * Returns null for anything missing or malformed, so a typo means "no limit"
 * on that side instead of hiding something forever.
 * @param {string|null} value
 * @returns {{ date: Date, dateOnly: boolean } | null}
 */
export function parseDateValue(value) {
  if (!value) return null
  const trimmed = value.trim()

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (dayMatch) {
    const [, year, month, day] = dayMatch
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return Number.isNaN(date.getTime()) ? null : { date, dateOnly: true }
  }

  // Require an explicit zone so the instant never depends on the visitor
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(
      trimmed
    )
  ) {
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false }
  }

  return null
}

/**
 * "Now", unless the page URL carries ?preview-date=<value> (same formats as
 * parseDateValue), which lets a date window be checked before it starts.
 * @returns {Date}
 */
export function getNow() {
  try {
    const value = new window.URLSearchParams(window.location.search).get(
      previewParam
    )
    const parsed = parseDateValue(value)
    if (parsed) return parsed.date
  } catch {
    // Ignore and fall back to the real clock
  }
  return new Date()
}

/**
 * Resolves start/end attribute values into exact instants.
 * The end is exclusive. A date-only end covers that whole day (ends at the
 * next local midnight), matching the popup's original behavior.
 * @returns {{ start: Date|null, end: Date|null }}
 */
export function resolveWindow(startValue, endValue) {
  const start = parseDateValue(startValue)
  const end = parseDateValue(endValue)

  let endDate = end ? end.date : null
  if (end && end.dateOnly) {
    endDate = new Date(
      end.date.getFullYear(),
      end.date.getMonth(),
      end.date.getDate() + 1
    )
  }

  return { start: start ? start.date : null, end: endDate }
}

/**
 * True when there is no window at all (both values empty) or `now` is inside
 * it: start <= now < end.
 */
export function isWithinWindow(startValue, endValue, now = getNow()) {
  const { start, end } = resolveWindow(startValue, endValue)
  if (!start && !end) return true
  if (start && now < start) return false
  if (end && now >= end) return false
  return true
}
