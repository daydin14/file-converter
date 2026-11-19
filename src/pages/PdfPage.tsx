import { useState } from 'react'
import { ImagesToPdfPanel } from './pdf/ImagesToPdfPanel'
import { MergePdfPanel } from './pdf/MergePdfPanel'
import { PdfToImagesPanel } from './pdf/PdfToImagesPanel'
import { SplitPdfPanel } from './pdf/SplitPdfPanel'
import { ToolHeader } from '../components/ToolHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const modes = [
  { id: 'images', label: 'Images to PDF' },
  { id: 'merge', label: 'Merge' },
  { id: 'split', label: 'Split' },
  { id: 'render', label: 'Pages to images' },
] as const

type PdfMode = (typeof modes)[number]['id']

export function PdfPage() {
  useDocumentTitle('PDF · File Converter')
  const [mode, setMode] = useState<PdfMode>('images')

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader
        eyebrow="PDF"
        title="Build, merge, split, and export pages."
        description="Everything stays in the tab. Password-protected PDFs are skipped. Pages are copied as they are; forms and attachments are not a focus of this tool."
      />
      <div role="tablist" aria-label="PDF tools" className="tabs tabs-box w-full flex-wrap">
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`pdf-tab-${item.id}`}
            className={`tab ${mode === item.id ? 'tab-active' : ''}`}
            aria-selected={mode === item.id}
            aria-controls={`pdf-panel-${item.id}`}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        id={`pdf-panel-${mode}`}
        aria-labelledby={`pdf-tab-${mode}`}
        className="rounded-box border border-base-300 bg-base-100/70 p-4"
      >
        {mode === 'images' ? <ImagesToPdfPanel /> : null}
        {mode === 'merge' ? <MergePdfPanel /> : null}
        {mode === 'split' ? <SplitPdfPanel /> : null}
        {mode === 'render' ? <PdfToImagesPanel /> : null}
      </section>
    </div>
  )
}
