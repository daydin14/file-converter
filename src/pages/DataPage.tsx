import { useRef, useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import { DataPreviewView } from '../components/DataPreviewView'
import { DropZone } from '../components/DropZone'
import { Field } from '../components/Field'
import { FileQueue } from '../components/FileQueue'
import { Notice } from '../components/Notice'
import { ToolHeader } from '../components/ToolHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFileQueue, type QueueItem } from '../hooks/useFileQueue'
import { dataBlob, convertData, dataAccept, dataFormats, formatFromName, isAcceptedDataName, type DataFormat, type DataPreview } from '../lib/data/convert'
import { errorMessage } from '../lib/errors'
import { replaceExtension } from '../lib/filenames'
import { LIMITS, formatBytes } from '../lib/limits'
import { saveOutputs } from '../lib/saveOutputs'

const labels: Record<DataFormat, string> = {
  csv: 'CSV',
  json: 'JSON',
  xml: 'XML',
  yaml: 'YAML',
  xlsx: 'XLSX',
}

function rejectData(file: File): string | null {
  if (/\.xls$/i.test(file.name) && !file.name.toLowerCase().endsWith('.xlsx')) {
    return `${file.name} is the older Excel format. Save it as .xlsx and try again.`
  }
  if (!isAcceptedDataName(file.name)) {
    return `${file.name || 'That file'} needs a .csv, .json, .xml, .yaml, .yml, or .xlsx name.`
  }
  return null
}

function previewOf(item: QueueItem | undefined): DataPreview | null {
  const meta = item?.meta
  if (!meta || typeof meta !== 'object' || !('kind' in meta)) return null
  return meta as DataPreview
}

export function DataPage() {
  useDocumentTitle('Data · File Converter')
  const queue = useFileQueue('data')
  const lock = useRef(false)
  const [source, setSource] = useState<'auto' | DataFormat>('auto')
  const [target, setTarget] = useState<DataFormat>('json')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const busy = queue.items.some((item) => item.status === 'working')
  const finished = queue.items.filter((item) => item.output)
  const selected = queue.items.find((item) => item.id === selectedId) ?? finished.at(-1)
  const preview = previewOf(selected)

  async function convert() {
    if (lock.current || queue.items.length === 0) return
    lock.current = true
    const snapshot = queue.items.filter((item) => item.status !== 'working')
    try {
      for (const item of snapshot) {
        queue.update(item.id, { status: 'working', message: null, output: null, meta: null })
        try {
          const from = source === 'auto' ? formatFromName(item.name) : source
          if (!from) {
            throw new Error('Choose a source format. The file name does not say what this is.')
          }
          const result = await convertData(new Uint8Array(await item.file.arrayBuffer()), from, target)
          const filename = replaceExtension(item.name, result.extension)
          queue.update(item.id, {
            status: 'done',
            message: null,
            meta: result.preview,
            output: { blob: dataBlob(result.bytes, result.mime), filename, previewUrl: null },
          })
          setSelectedId(item.id)
        } catch (error) {
          queue.update(item.id, {
            status: 'error',
            message: errorMessage(error, 'This file could not be converted.'),
          })
        }
      }
    } finally {
      lock.current = false
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader
        eyebrow="Data"
        title="Move rows between formats."
        description="CSV, JSON, XML, YAML, and XLSX. The first row of a spreadsheet or CSV is treated as the header. Preview the result before you download it."
      />
      <div className="grid gap-4 rounded-box border border-base-300 bg-base-100/80 p-4 sm:grid-cols-2">
        <Field id="data-source" label="Source format" hint="Auto uses the file extension.">
          <select
            id="data-source"
            className="select w-full"
            value={source}
            onChange={(event) => setSource(event.target.value as 'auto' | DataFormat)}
          >
            <option value="auto">Auto</option>
            {dataFormats.map((format) => (
              <option key={format} value={format}>
                {labels[format]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="data-target" label="Convert to">
          <select
            id="data-target"
            className="select w-full"
            value={target}
            onChange={(event) => setTarget(event.target.value as DataFormat)}
          >
            {dataFormats.map((format) => (
              <option key={format} value={format}>
                {labels[format]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <DropZone
        accept={dataAccept}
        title="Drop data files here, or browse"
        hint={`Up to ${LIMITS.data.maxFiles} files, ${formatBytes(LIMITS.data.maxFileBytes)} each.`}
        onFiles={(files) => queue.addFiles(files, rejectData)}
      />
      <Notice message={queue.notice} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => void convert()} disabled={busy || queue.items.length === 0}>
          {busy ? 'Converting…' : 'Convert'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={finished.length === 0}
          onClick={() =>
            void saveOutputs(
              finished.flatMap((item) => (item.output ? [{ filename: item.output.filename, blob: item.output.blob }] : [])),
              'data.zip',
            )
          }
        >
          <FiDownload aria-hidden="true" />
          {finished.length > 1 ? 'Download ZIP' : 'Download'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={queue.clear} disabled={queue.items.length === 0 || busy}>
          Clear
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
        <FileQueue items={queue.items} onRemove={queue.remove} onSelect={setSelectedId} selectedId={selected?.id ?? null} />
        <section aria-label="Preview" className="rounded-box border border-base-300 bg-base-100 p-4">
          <h2 className="font-display text-2xl">Preview</h2>
          <p className="mt-1 mb-4 text-sm text-base-content/70">
            {selected?.output ? selected.output.filename : 'Convert a file to see the first rows or the text here.'}
          </p>
          {preview ? <DataPreviewView preview={preview} /> : <p className="text-sm text-base-content/70">Nothing to preview yet.</p>}
        </section>
      </div>
    </div>
  )
}
