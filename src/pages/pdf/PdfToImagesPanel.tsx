import { useRef, useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import { DropZone } from '../../components/DropZone'
import { Field } from '../../components/Field'
import { FileQueue } from '../../components/FileQueue'
import { Notice } from '../../components/Notice'
import { useFileQueue } from '../../hooks/useFileQueue'
import { toBlob } from '../../lib/bytes'
import { ConversionError, errorMessage } from '../../lib/errors'
import { replaceExtension } from '../../lib/filenames'
import { formatBytes, LIMITS } from '../../lib/limits'
import { getPdfPageCount } from '../../lib/pdf/documents'
import { parsePageSelection } from '../../lib/pdf/ranges'
import { renderPdfPages } from '../../lib/pdf/renderPages'
import { clampQuality } from '../../lib/image/geometry'
import { saveOutputs } from '../../lib/saveOutputs'
import { zipNamedFiles } from '../../lib/zip'
import { rejectPdf, usePdfDetails } from './usePdfDetails'

export function PdfToImagesPanel() {
  const queue = useFileQueue('pdf')
  const lock = useRef(false)
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [scale, setScale] = useState(1.5)
  const [quality, setQuality] = useState(0.85)
  const [range, setRange] = useState('')
  const busy = queue.items.some((item) => item.status === 'working')
  const finished = queue.items.filter((item) => item.output)
  usePdfDetails(queue.items, queue.update)

  async function convert() {
    if (lock.current || queue.items.length === 0) return
    lock.current = true
    const snapshot = queue.items.filter((item) => item.status !== 'working')
    try {
      for (const item of snapshot) {
        queue.update(item.id, { status: 'working', message: null, output: null })
        try {
          const bytes = new Uint8Array(await item.file.arrayBuffer())
          const count = await getPdfPageCount(bytes)
          const pages = range.trim()
            ? parsePageSelection(range, count)
            : count > LIMITS.maxPdfPages
              ? (() => {
                  throw new ConversionError(
                    `${item.name} has ${count} pages. Enter a range such as 1-${LIMITS.maxPdfPages}.`,
                  )
                })()
              : Array.from({ length: count }, (_, index) => index + 1)
          const rendered = await renderPdfPages(bytes, pages, {
            format,
            scale,
            quality: clampQuality(quality),
          })
          const extension = format === 'jpeg' ? 'jpg' : 'png'
          const stem = replaceExtension(item.name, extension).replace(new RegExp(`\\.${extension}$`, 'i'), '')
          if (rendered.length === 1 && rendered[0]) {
            const filename = `${stem}-page-${rendered[0].pageNumber}.${extension}`
            queue.update(item.id, {
              status: 'done',
              detail: `Page ${rendered[0].pageNumber}`,
              output: {
                blob: rendered[0].blob,
                filename,
                previewUrl: URL.createObjectURL(rendered[0].blob),
              },
            })
            continue
          }
          const zipped = await zipNamedFiles(
            await Promise.all(
              rendered.map(async (page) => ({
                name: `${stem}-page-${page.pageNumber}.${extension}`,
                data: new Uint8Array(await page.blob.arrayBuffer()),
              })),
            ),
          )
          queue.update(item.id, {
            status: 'done',
            detail: `${rendered.length} images in a ZIP`,
            output: { blob: toBlob(zipped, 'application/zip'), filename: `${stem}-pages.zip`, previewUrl: null },
          })
        } catch (error) {
          queue.update(item.id, {
            status: 'error',
            message: errorMessage(error, 'These pages could not be saved as images.'),
          })
        }
      }
    } finally {
      lock.current = false
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field id="page-image-format" label="Image format">
          <select
            id="page-image-format"
            className="select w-full"
            value={format}
            onChange={(event) => setFormat(event.target.value as 'png' | 'jpeg')}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPG</option>
          </select>
        </Field>
        <Field id="page-scale" label="Size" hint="2× is sharper and a larger file.">
          <select
            id="page-scale"
            className="select w-full"
            value={String(scale)}
            onChange={(event) => setScale(Number(event.target.value))}
          >
            <option value="1">1×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
        </Field>
        <Field id="page-quality" label={`JPG quality, ${Math.round(quality * 100)}%`} hint="PNG ignores this.">
          <input
            id="page-quality"
            className="range range-primary"
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={quality}
            disabled={format === 'png'}
            onChange={(event) => setQuality(Number(event.target.value))}
          />
        </Field>
        <Field id="render-range" label="Pages" hint="Leave blank for every page.">
          <input
            id="render-range"
            className="input w-full"
            value={range}
            placeholder="1-3, 5"
            onChange={(event) => setRange(event.target.value)}
          />
        </Field>
      </div>
      <DropZone
        accept=".pdf,application/pdf"
        title="Drop PDFs to turn into images"
        hint={`Up to ${LIMITS.pdf.maxFiles} files, ${formatBytes(LIMITS.pdf.maxFileBytes)} each, and ${LIMITS.maxPdfPages} pages at a time.`}
        onFiles={(files) => queue.addFiles(files, rejectPdf)}
      />
      <Notice message={queue.notice} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={busy || queue.items.length === 0} onClick={() => void convert()}>
          {busy ? 'Rendering…' : 'Save page images'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={finished.length === 0}
          onClick={() =>
            void saveOutputs(
              finished.flatMap((item) => (item.output ? [{ filename: item.output.filename, blob: item.output.blob }] : [])),
              'pdf-pages.zip',
            )
          }
        >
          <FiDownload aria-hidden="true" />
          {finished.length > 1 ? 'Download ZIP' : 'Download'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy || queue.items.length === 0} onClick={queue.clear}>
          Clear
        </button>
      </div>
      <FileQueue items={queue.items} onRemove={queue.remove} />
    </div>
  )
}
