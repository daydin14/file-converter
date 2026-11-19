import { useEffect, useRef, useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import { DropZone } from '../components/DropZone'
import { Field } from '../components/Field'
import { FileQueue } from '../components/FileQueue'
import { Notice } from '../components/Notice'
import { ToolHeader } from '../components/ToolHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFileQueue } from '../hooks/useFileQueue'
import { errorMessage } from '../lib/errors'
import { replaceExtension } from '../lib/filenames'
import {
  browserSupportsAvifEncode,
  convertImageFile,
  extensionForImage,
  imageAccept,
  isAcceptedImageName,
  type OutputImageFormat,
} from '../lib/image/convert'
import { LIMITS, formatBytes } from '../lib/limits'
import { saveOutputs } from '../lib/saveOutputs'

const outputFormats: { value: OutputImageFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'bmp', label: 'BMP' },
  { value: 'ico', label: 'ICO' },
]

const lossless = new Set<OutputImageFormat>(['png', 'bmp', 'ico'])

function optionalSize(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null
}

function rejectImage(file: File): string | null {
  if (/\.(heic|heif)$/i.test(file.name)) {
    return `${file.name} is a HEIC photo. Export a JPG or PNG and try again.`
  }
  if (/\.svg$/i.test(file.name) || file.type === 'image/svg+xml') {
    return `${file.name} is an SVG. Export a PNG from your editor and try again.`
  }
  if (!isAcceptedImageName(file.name, file.type)) {
    return `${file.name || 'That file'} is not a supported image.`
  }
  return null
}

export function ImagePage() {
  useDocumentTitle('Images · File Converter')
  const queue = useFileQueue('image')
  const lock = useRef(false)
  const [formats, setFormats] = useState(outputFormats)
  const [format, setFormat] = useState<OutputImageFormat>('webp')
  const [quality, setQuality] = useState(0.85)
  const [maxWidth, setMaxWidth] = useState('')
  const [maxHeight, setMaxHeight] = useState('')
  const [allowUpscale, setAllowUpscale] = useState(false)
  const busy = queue.items.some((item) => item.status === 'working')
  const finished = queue.items.filter((item) => item.output)

  useEffect(() => {
    void browserSupportsAvifEncode().then((supported) => {
      if (supported) return
      setFormats((current) => current.filter((item) => item.value !== 'avif'))
      setFormat((current) => (current === 'avif' ? 'webp' : current))
    })
  }, [])

  async function convert() {
    if (lock.current || queue.items.length === 0) return
    lock.current = true
    const snapshot = queue.items.filter((item) => item.status !== 'working')
    try {
      for (const item of snapshot) {
        queue.update(item.id, { status: 'working', message: null, output: null })
        try {
          const blob = await convertImageFile(item.file, {
            format,
            quality,
            maxWidth: optionalSize(maxWidth),
            maxHeight: optionalSize(maxHeight),
            allowUpscale,
          })
          const filename = replaceExtension(item.name, extensionForImage(format))
          const previewUrl = blob.type.startsWith('image/') && blob.type !== 'image/bmp' ? URL.createObjectURL(blob) : null
          queue.update(item.id, {
            status: 'done',
            message: null,
            output: { blob, filename, previewUrl },
          })
        } catch (error) {
          queue.update(item.id, {
            status: 'error',
            message: errorMessage(error, 'This image could not be converted.'),
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
        eyebrow="Images"
        title="Resize and convert pictures."
        description="PNG, JPG, WebP, and AVIF stay in the browser. BMP and ICO are handled here too. GIF files are imported as a single still frame."
      />
      <div className="grid gap-4 rounded-box border border-base-300 bg-base-100/80 p-4 md:grid-cols-2 xl:grid-cols-4">
        <Field id="image-format" label="Output format">
          <select
            id="image-format"
            className="select w-full"
            value={format}
            onChange={(event) => setFormat(event.target.value as OutputImageFormat)}
          >
            {formats.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="image-quality"
          label={`Quality, ${Math.round(quality * 100)}%`}
          hint={lossless.has(format) ? 'This format ignores the quality slider.' : 'Lower values make a smaller file.'}
        >
          <input
            id="image-quality"
            className="range range-primary"
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={quality}
            disabled={lossless.has(format)}
            onChange={(event) => setQuality(Number(event.target.value))}
          />
        </Field>
        <Field id="max-width" label="Max width" hint="Leave blank to keep the original width.">
          <input
            id="max-width"
            className="input w-full"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="Pixels"
            value={maxWidth}
            onChange={(event) => setMaxWidth(event.target.value)}
          />
        </Field>
        <Field id="max-height" label="Max height" hint="Leave blank to keep the original height.">
          <input
            id="max-height"
            className="input w-full"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="Pixels"
            value={maxHeight}
            onChange={(event) => setMaxHeight(event.target.value)}
          />
        </Field>
        <label className="flex items-center gap-3 text-sm md:col-span-2">
          <input
            className="checkbox checkbox-primary"
            type="checkbox"
            checked={allowUpscale}
            onChange={(event) => setAllowUpscale(event.target.checked)}
          />
          Enlarge smaller images up to the max width and height
        </label>
      </div>
      <DropZone
        accept={imageAccept}
        title="Drop images here, or browse"
        hint={`Up to ${LIMITS.image.maxFiles} files, ${formatBytes(LIMITS.image.maxFileBytes)} each. PNG, JPG, WebP, GIF, AVIF, BMP, and ICO.`}
        onFiles={(files) => queue.addFiles(files, rejectImage)}
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
              'images.zip',
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
      <FileQueue items={queue.items} onRemove={queue.remove} />
    </div>
  )
}
