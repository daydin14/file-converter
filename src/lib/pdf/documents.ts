import { ConversionError } from '../errors'
import { LIMITS } from '../limits'

async function pdfLib() {
  return import('pdf-lib')
}

export async function loadPdf(bytes: Uint8Array) {
  const { PDFDocument } = await pdfLib()
  try {
    return await PDFDocument.load(bytes)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/encrypt|password/i.test(message)) {
      throw new ConversionError('This PDF is password-protected. Remove the password and try again.')
    }
    throw new ConversionError('This PDF could not be opened. It may be damaged.')
  }
}

export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const document = await loadPdf(bytes)
  const count = document.getPageCount()
  if (count < 1) throw new ConversionError('This PDF has no pages.')
  return count
}

export type PdfPageSize = 'a4' | 'letter' | 'fit'
export type PdfImageKind = 'png' | 'jpg'

const paper = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const

export async function imagesToPdf(
  images: { bytes: Uint8Array; kind: PdfImageKind }[],
  pageSize: PdfPageSize,
): Promise<Uint8Array> {
  if (images.length === 0) throw new ConversionError('Add at least one image.')
  const { PDFDocument } = await pdfLib()
  const document = await PDFDocument.create()

  for (const image of images) {
    let embedded
    try {
      embedded = image.kind === 'png' ? await document.embedPng(image.bytes) : await document.embedJpg(image.bytes)
    } catch {
      throw new ConversionError('One image could not be placed on a PDF page. Try a different file.')
    }

    if (pageSize === 'fit') {
      const scale = Math.min(842 / embedded.width, 842 / embedded.height, 1)
      const width = Math.max(1, embedded.width * scale)
      const height = Math.max(1, embedded.height * scale)
      const page = document.addPage([width, height])
      page.drawImage(embedded, { x: 0, y: 0, width, height })
      continue
    }

    const size = paper[pageSize]
    const margin = 36
    const scale = Math.min((size.width - margin * 2) / embedded.width, (size.height - margin * 2) / embedded.height)
    const width = embedded.width * scale
    const height = embedded.height * scale
    const page = document.addPage([size.width, size.height])
    page.drawImage(embedded, {
      x: (size.width - width) / 2,
      y: (size.height - height) / 2,
      width,
      height,
    })
  }

  return document.save()
}

export async function mergePdfs(buffers: Uint8Array[]): Promise<Uint8Array> {
  if (buffers.length < 2) throw new ConversionError('Add at least two PDFs to merge.')
  const { PDFDocument } = await pdfLib()
  const output = await PDFDocument.create()
  let total = 0

  for (const buffer of buffers) {
    const source = await loadPdf(buffer)
    const indices = source.getPageIndices()
    total += indices.length
    if (total > LIMITS.maxPdfPages) {
      throw new ConversionError(
        `Those PDFs have more than ${LIMITS.maxPdfPages} pages combined. Merge a smaller batch.`,
      )
    }
    const copied = await output.copyPages(source, indices)
    for (const page of copied) output.addPage(page)
  }

  return output.save()
}

export async function extractPdfPages(buffer: Uint8Array, pages: number[]): Promise<Uint8Array> {
  const { PDFDocument } = await pdfLib()
  const source = await loadPdf(buffer)
  const output = await PDFDocument.create()
  const copied = await output.copyPages(
    source,
    pages.map((page) => page - 1),
  )
  for (const page of copied) output.addPage(page)
  return output.save()
}

export async function splitPdfPages(buffer: Uint8Array, pages: number[]): Promise<Uint8Array[]> {
  const { PDFDocument } = await pdfLib()
  const source = await loadPdf(buffer)
  const outputs: Uint8Array[] = []
  for (const pageNumber of pages) {
    const output = await PDFDocument.create()
    const [page] = await output.copyPages(source, [pageNumber - 1])
    if (!page) throw new ConversionError(`Page ${pageNumber} could not be copied.`)
    output.addPage(page)
    outputs.push(await output.save())
  }
  return outputs
}
