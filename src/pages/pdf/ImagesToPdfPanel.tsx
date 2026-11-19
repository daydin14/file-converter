import { useRef, useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import { DropZone } from '../../components/DropZone'
import { Field } from '../../components/Field'
import { FileQueue } from '../../components/FileQueue'
import { Notice } from '../../components/Notice'
import { useFileQueue } from '../../hooks/useFileQueue'
import { toBlob } from '../../lib/bytes'
import { downloadBlob } from '../../lib/download'
import { errorMessage } from '../../lib/errors'
import { convertImageFile, imageAccept, isAcceptedImageName } from '../../lib/image/convert'
import { formatBytes, LIMITS } from '../../lib/limits'
import { imagesToPdf, type PdfPageSize } from '../../lib/pdf/documents'

function rejectImage(file: File): string | null {
  return isAcceptedImageName(file.name, file.type) ? null : `${file.name || 'That file'} is not a supported image.`
}

export function ImagesToPdfPanel() {
  const queue = useFileQueue('image')
  const lock = useRef(false)
  const [pageSize, setPageSize] = useState<PdfPageSize>('a4')
  const [encoding, setEncoding] = useState<'png' | 'jpg'>('png')
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null)
  const busy = queue.items.some((item) => item.status === 'working')

  async function convert() {
    if (lock.current || queue.items.length === 0) return
    lock.current = true
    setResult(null)
    const snapshot = queue.items.filter((item) => item.status !== 'working')
    const prepared: { bytes: Uint8Array; kind: 'png' | 'jpg' }[] = []
    try {
      for (const item of snapshot) {
        queue.update(item.id, { status: 'working', message: null, output: null })
        try {
          const blob = await convertImageFile(item.file, {
            format: encoding === 'jpg' ? 'jpeg' : 'png',
            quality: 0.85,
            maxWidth: null,
            maxHeight: null,
            allowUpscale: false,
          })
          prepared.push({ bytes: new Uint8Array(await blob.arrayBuffer()), kind: encoding })
          queue.update(item.id, { status: 'done', message: 'Added to the PDF.' })
        } catch (error) {
          queue.update(item.id, {
            status: 'error',
            message: errorMessage(error, 'This image could not be added.'),
          })
        }
      }
      if (prepared.length === 0) {
        queue.setNotice('None of the images could be added to a PDF.')
        return
      }
      const bytes = await imagesToPdf(prepared, pageSize)
      setResult({ blob: toBlob(bytes, 'application/pdf'), filename: 'images.pdf' })
      if (prepared.length < snapshot.length) {
        queue.setNotice('Some images were skipped. The PDF contains the ones that could be read.')
      } else {
        queue.setNotice(null)
      }
    } catch (error) {
      queue.setNotice(errorMessage(error, 'The PDF could not be created.'))
    } finally {
      lock.current = false
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pdf-page-size" label="Page size">
          <select
            id="pdf-page-size"
            className="select w-full"
            value={pageSize}
            onChange={(event) => setPageSize(event.target.value as PdfPageSize)}
          >
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
            <option value="fit">Fit the image</option>
          </select>
        </Field>
        <Field id="pdf-encoding" label="Picture encoding" hint="JPG is smaller. PNG keeps sharp graphics and transparency.">
          <select
            id="pdf-encoding"
            className="select w-full"
            value={encoding}
            onChange={(event) => setEncoding(event.target.value as 'png' | 'jpg')}
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
        </Field>
      </div>
      <DropZone
        accept={imageAccept}
        title="Drop images to place on pages"
        hint={`Up to ${LIMITS.image.maxFiles} images, ${formatBytes(LIMITS.image.maxFileBytes)} each. Use the arrows to set page order.`}
        onFiles={(files) => queue.addFiles(files, rejectImage)}
      />
      <Notice message={queue.notice} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={busy || queue.items.length === 0} onClick={() => void convert()}>
          {busy ? 'Building PDF…' : 'Create PDF'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={!result}
          onClick={() => result && downloadBlob(result.blob, result.filename)}
        >
          <FiDownload aria-hidden="true" />
          Download PDF
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy || queue.items.length === 0} onClick={queue.clear}>
          Clear
        </button>
      </div>
      {result ? <p className="text-sm text-success">Ready: {result.filename}</p> : null}
      <FileQueue items={queue.items} onRemove={queue.remove} onMove={queue.move} />
    </div>
  )
}
