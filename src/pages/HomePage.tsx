import { FiArrowRight, FiFileText, FiImage, FiTable } from 'react-icons/fi'
import { Link } from 'react-router'
import type { IconType } from 'react-icons'
import { PrivacyNote } from '../components/PrivacyNote'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const tools: {
  to: string
  title: string
  text: string
  icon: IconType
  formats: string[]
}[] = [
  {
    to: '/images',
    title: 'Images',
    text: 'Change format, resize, and set compression. GIF is read as a still image.',
    icon: FiImage,
    formats: ['PNG', 'JPG', 'WebP', 'AVIF', 'BMP', 'ICO'],
  },
  {
    to: '/pdf',
    title: 'PDFs',
    text: 'Turn images into a PDF, merge files, extract pages, or save pages as pictures.',
    icon: FiFileText,
    formats: ['Images to PDF', 'Merge', 'Split', 'PNG / JPG'],
  },
  {
    to: '/data',
    title: 'Data',
    text: 'Move rows between spreadsheets and text formats, with a preview before you download.',
    icon: FiTable,
    formats: ['CSV', 'JSON', 'XML', 'YAML', 'XLSX'],
  },
]

export function HomePage() {
  useDocumentTitle("Dave's File Converter")

  return (
    <div className="flex flex-col gap-10">
      <section className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">On your device</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-balance sm:text-6xl">
            Convert files without uploading them.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-base-content/80">
            Images, PDFs, and spreadsheets. Pick a tool, drop your files, and download the result. No account and no server.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/images" className="btn btn-primary">
              Convert an image
              <FiArrowRight aria-hidden="true" />
            </Link>
            <Link to="/pdf" className="btn btn-outline">
              Make a PDF
            </Link>
          </div>
        </div>
        <PrivacyNote />
      </section>

      <section aria-label="Tools" className="grid gap-4 md:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.to}
              to={tool.to}
              className="card border border-base-300 bg-base-100 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="card-body gap-3">
                <span className="flex size-11 items-center justify-center rounded-box bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h2 className="card-title font-display text-2xl">{tool.title}</h2>
                <p className="text-sm leading-6 text-base-content/80">{tool.text}</p>
                <ul className="mt-1 flex flex-wrap gap-1.5" aria-label={`${tool.title} formats`}>
                  {tool.formats.map((format) => (
                    <li key={format} className="badge badge-outline">
                      {format}
                    </li>
                  ))}
                </ul>
              </div>
            </Link>
          )
        })}
      </section>

      <section className="grid gap-4 rounded-box border border-base-300 bg-base-100/70 p-5 sm:grid-cols-3">
        {[
          ['1', 'Drop files', 'Or use the file picker. Several files are fine.'],
          ['2', 'Choose a format', 'Set size, quality, pages, or the data format you need.'],
          ['3', 'Download', 'Save one file, or a ZIP when a batch produces more than one.'],
        ].map(([step, title, text]) => (
          <div key={step}>
            <p className="font-display text-3xl text-primary">{step}</p>
            <h2 className="mt-1 font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-base-content/75">{text}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
