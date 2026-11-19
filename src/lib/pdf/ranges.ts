import { ConversionError } from '../errors'
import { LIMITS } from '../limits'

export function parsePageSelection(input: string, pageCount: number): number[] {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new ConversionError('Enter the pages you want, such as 1-3, 5.')
  }
  if (pageCount < 1) throw new ConversionError('This PDF has no pages.')

  const pages: number[] = []
  const seen = new Set<number>()
  for (const part of trimmed.split(',')) {
    const piece = part.trim()
    if (!piece) continue
    const range = /^(\d+)\s*-\s*(\d+)?$/.exec(piece)
    const single = /^(\d+)$/.exec(piece)
    let start: number
    let end: number
    if (range?.[1]) {
      start = Number(range[1])
      end = range[2] === undefined ? pageCount : Number(range[2])
    } else if (single?.[1]) {
      start = Number(single[1])
      end = start
    } else {
      throw new ConversionError(`"${piece}" is not a page or range. Use numbers like 1-3, 5.`)
    }
    if (start < 1 || end < start || start > pageCount || end > pageCount) {
      const label = pageCount === 1 ? 'page' : 'pages'
      throw new ConversionError(`"${piece}" is outside this PDF. It has ${pageCount} ${label}.`)
    }
    for (let page = start; page <= end; page += 1) {
      if (!seen.has(page)) {
        seen.add(page)
        pages.push(page)
      }
    }
  }

  if (pages.length === 0) throw new ConversionError('Enter at least one page.')
  if (pages.length > LIMITS.maxPdfPages) {
    throw new ConversionError(`Select up to ${LIMITS.maxPdfPages} pages at a time.`)
  }
  return pages
}
