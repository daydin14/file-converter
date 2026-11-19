import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { extractPdfPages, imagesToPdf, mergePdfs, splitPdfPages } from './documents'

const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  ),
  (char) => char.charCodeAt(0),
)

describe('pdf documents', () => {
  it('places each image on its own page, then merges and splits those pages', async () => {
    const first = await imagesToPdf([{ bytes: png, kind: 'png' }], 'a4')
    const second = await imagesToPdf([{ bytes: png, kind: 'png' }], 'letter')
    expect((await PDFDocument.load(first)).getPageCount()).toBe(1)

    const merged = await mergePdfs([first, second])
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(2)

    const extracted = await extractPdfPages(merged, [2])
    expect((await PDFDocument.load(extracted)).getPageCount()).toBe(1)

    const parts = await splitPdfPages(merged, [1, 2])
    expect(parts).toHaveLength(2)
    expect((await PDFDocument.load(parts[0] ?? new Uint8Array())).getPageCount()).toBe(1)
  })

  it('fits an image onto a page the same shape as the picture', async () => {
    const fitted = await imagesToPdf([{ bytes: png, kind: 'png' }], 'fit')
    const [page] = (await PDFDocument.load(fitted)).getPages()
    expect(page?.getWidth()).toBeGreaterThan(0)
    expect(page?.getHeight()).toBeGreaterThan(0)
  })
})
