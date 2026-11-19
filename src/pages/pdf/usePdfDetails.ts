import { useEffect, useRef } from 'react'
import type { QueueItem } from '../../hooks/useFileQueue'
import { errorMessage } from '../../lib/errors'
import { getPdfPageCount } from '../../lib/pdf/documents'

export function usePdfDetails(
  items: QueueItem[],
  update: (id: string, patch: Partial<Omit<QueueItem, 'id' | 'file' | 'name' | 'size'>>) => void,
) {
  const started = useRef(new Set<string>())
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    for (const item of items) {
      if (started.current.has(item.id) || item.status === 'error') continue
      started.current.add(item.id)
      const id = item.id
      void item.file.arrayBuffer().then(async (buffer) => {
        const count = await getPdfPageCount(new Uint8Array(buffer))
        if (!alive.current) return
        update(id, { detail: `${count} ${count === 1 ? 'page' : 'pages'}` })
      }).catch((error: unknown) => {
        if (!alive.current) return
        update(id, {
          status: 'error',
          message: errorMessage(error, 'This PDF could not be opened.'),
        })
      })
    }
  }, [items, update])
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function rejectPdf(file: File): string | null {
  return isPdfFile(file) ? null : `${file.name || 'That file'} is not a PDF.`
}
