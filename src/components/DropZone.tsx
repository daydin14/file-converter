import { useState } from 'react'
import { FiUploadCloud } from 'react-icons/fi'

export function DropZone({
  accept,
  multiple = true,
  title,
  hint,
  onFiles,
}: {
  accept: string
  multiple?: boolean
  title: string
  hint: string
  onFiles: (files: FileList) => void
}) {
  const [active, setActive] = useState(false)
  const inputId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'files'

  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-box border-2 border-dashed px-4 py-8 text-center transition-colors ${
        active ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100/70 hover:border-primary/50'
      } has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary`}
      onDragEnter={(event) => {
        event.preventDefault()
        setActive(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setActive(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setActive(false)
        if (event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files)
      }}
    >
      <input
        id={inputId}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) onFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <FiUploadCloud aria-hidden="true" className="size-8 text-primary" />
      <span className="font-semibold">{active ? 'Drop to add' : title}</span>
      <span className="max-w-md text-sm text-base-content/70">{hint}</span>
    </label>
  )
}
