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
import { extractPdfPages, getPdfPageCount, splitPdfPages } from '../../lib/pdf/documents'
import { parsePageSelection } from '../../lib/pdf/ranges'
import { saveOutputs } from '../../lib/saveOutputs'
import { rejectPdf, usePdfDetails } from './usePdfDetails'

function stemOf(name: string): string {
  return replaceExtension(name, 'pdf').replace(/\.pdf$/i, '')
}

export function SplitPdfPanel() {
  const queue = useFileQueue('pdf')
  const lock = useRef(false)
  const [mode, setMode] = useState<'pages' | 'range'>('pages')
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
          const pages =
            mode === 'range'
              ? parsePageSelection(range, count)
              : count > LIMITS.maxPdfPages
                ? (() => {
                    throw new ConversionError(
                      `${item.name} has ${count} pages. Enter a range of up to ${LIMITS.maxPdfPages}, such as 1-${LIMITS.maxPdfPages}.`,
                    )
                  })()
                : Array.from({ length: count }, (_, index) => index + 1)
          const stem = stemOf(item.name)
          if (pages.length === 1) {
            const output = await extractPdfPages(bytes, pages)
            const filename = `${stem}-page-${pages[0]}.pdf`
            queue.update(item.id, {
              status: 'done',
              detail: `${count} ${count === 1 ? 'page' : 'pages'}`,
              output: { blob: toBlob(output, 'application/pdf'), filename, previewUrl: null },
            })
            continue
          }
          if (mode === 'range') {
            const output = await extractPdfPages(bytes, pages)
            queue.update(item.id, {
              status: 'done',
              detail: `${pages.length} pages extracted`,
              output: { blob: toBlob(output, 'application/pdf'), filename: `${stem}-pages.pdf`, previewUrl: null },
            })
            continue
          }
          const parts = await splitPdfPages(bytes, pages)
          const zipped = await (
            await import('../../lib/zip')
          ).zipNamedFiles(
            parts.map((part, index) => ({
              name: `${stem}-page-${pages[index]}.pdf`,
              data: part,
            })),
          )
          queue.update(item.id, {
            status: 'done',
            detail: `${parts.length} PDFs in a ZIP`,
            output: { blob: toBlob(zipped, 'application/zip'), filename: `${stem}-pages.zip`, previewUrl: null },
          })
        } catch (error) {
          queue.update(item.id, {
            status: 'error',
            message: errorMessage(error, 'This PDF could not be split.'),
          })
        }
      }
    } finally {
      lock.current = false
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">What to download</legend>
        <label className="flex items-center gap-3 text-sm">
          <input
            className="radio radio-primary"
            type="radio"
            name="split-mode"
            checked={mode === 'pages'}
            onChange={() => setMode('pages')}
          />
          One PDF per page
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            className="radio radio-primary"
            type="radio"
            name="split-mode"
            checked={mode === 'range'}
            onChange={() => setMode('range')}
          />
          Chosen pages in one PDF
        </label>
      </fieldset>
      {mode === 'range' ? (
        <Field id="page-range" label="Pages" hint="Example: 1-3, 5, 8-">
          <input
            id="page-range"
            className="input w-full max-w-md"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            placeholder="1-3, 5"
          />
        </Field>
      ) : (
        <p className="text-sm text-base-content/70">
          PDFs with more than {LIMITS.maxPdfPages} pages need a range, so the browser does not try to build hundreds of files.
        </p>
      )}
      <DropZone
        accept=".pdf,application/pdf"
        title="Drop PDFs to split"
        hint={`Up to ${LIMITS.pdf.maxFiles} files, ${formatBytes(LIMITS.pdf.maxFileBytes)} each.`}
        onFiles={(files) => queue.addFiles(files, rejectPdf)}
      />
      <Notice message={queue.notice} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={busy || queue.items.length === 0} onClick={() => void convert()}>
          {busy ? 'Splitting…' : 'Split'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={finished.length === 0}
          onClick={() =>
            void saveOutputs(
              finished.flatMap((item) => (item.output ? [{ filename: item.output.filename, blob: item.output.blob }] : [])),
              'split-pdfs.zip',
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
