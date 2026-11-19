import { useRef, useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import { DropZone } from '../../components/DropZone'
import { FileQueue } from '../../components/FileQueue'
import { Notice } from '../../components/Notice'
import { useFileQueue } from '../../hooks/useFileQueue'
import { toBlob } from '../../lib/bytes'
import { downloadBlob } from '../../lib/download'
import { errorMessage } from '../../lib/errors'
import { formatBytes, LIMITS } from '../../lib/limits'
import { mergePdfs } from '../../lib/pdf/documents'
import { rejectPdf, usePdfDetails } from './usePdfDetails'

export function MergePdfPanel() {
  const queue = useFileQueue('pdf')
  const lock = useRef(false)
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null)
  const busy = queue.items.some((item) => item.status === 'working')
  usePdfDetails(queue.items, queue.update)

  async function merge() {
    if (lock.current || queue.items.length < 2) return
    lock.current = true
    setResult(null)
    const snapshot = queue.items.filter((item) => item.status !== 'error')
    try {
      for (const item of snapshot) queue.update(item.id, { status: 'working', message: null })
      const buffers = await Promise.all(snapshot.map(async (item) => new Uint8Array(await item.file.arrayBuffer())))
      const bytes = await mergePdfs(buffers)
      for (const item of snapshot) queue.update(item.id, { status: 'done', message: 'Included in the merged PDF.' })
      setResult({ blob: toBlob(bytes, 'application/pdf'), filename: 'merged.pdf' })
      queue.setNotice(null)
    } catch (error) {
      for (const item of snapshot) queue.update(item.id, { status: 'ready', message: null })
      queue.setNotice(errorMessage(error, 'These PDFs could not be merged.'))
    } finally {
      lock.current = false
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <DropZone
        accept=".pdf,application/pdf"
        title="Drop PDFs to merge"
        hint={`Add at least two. Up to ${LIMITS.pdf.maxFiles} files, ${formatBytes(LIMITS.pdf.maxFileBytes)} each. Order is top to bottom.`}
        onFiles={(files) => queue.addFiles(files, rejectPdf)}
      />
      <Notice message={queue.notice} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={busy || queue.items.length < 2} onClick={() => void merge()}>
          {busy ? 'Merging…' : 'Merge PDFs'}
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
