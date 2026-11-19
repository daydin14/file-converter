import { ConversionError } from '../errors'
import { LIMITS } from '../limits'

export interface RenderedPage {
  pageNumber: number
  blob: Blob
}

async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ConversionError('This browser could not save a page image. Try PNG.'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })
}

export async function renderPdfPages(
  bytes: Uint8Array,
  pages: number[],
  options: { format: 'png' | 'jpeg'; scale: number; quality: number },
): Promise<RenderedPage[]> {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(bytes.byteLength)
  data.set(bytes)
  const loadingTask = pdfjs.getDocument({ data, enableXfa: false })
  const document = await loadingTask.promise
  const rendered: RenderedPage[] = []

  try {
    for (const pageNumber of pages) {
      const page = await document.getPage(pageNumber)
      const base = page.getViewport({ scale: 1 })
      const limit = Math.min(
        options.scale,
        LIMITS.maxCanvasEdge / base.width,
        LIMITS.maxCanvasEdge / base.height,
      )
      const viewport = page.getViewport({ scale: Math.max(0.2, limit) })
      const canvas = documentCreateCanvas(viewport.width, viewport.height)
      const context = canvas.getContext('2d')
      if (!context) throw new ConversionError('This browser could not draw the PDF page.')
      if (options.format === 'jpeg') {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      await page.render({ canvas, viewport }).promise
      const blob = await canvasToBlob(
        canvas,
        options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
        options.quality,
      )
      rendered.push({ pageNumber, blob })
      page.cleanup()
    }
  } finally {
    await loadingTask.destroy()
  }

  return rendered
}

function documentCreateCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(width))
  canvas.height = Math.max(1, Math.ceil(height))
  return canvas
}
