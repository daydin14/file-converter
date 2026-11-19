import { useCallback, useEffect, useRef, useState } from 'react'
import type { ToolKind } from '../lib/limits'
import { planAdditions } from '../lib/limits'

export type FileStatus = 'ready' | 'working' | 'done' | 'error'

export interface QueueOutput {
  blob: Blob
  filename: string
  previewUrl: string | null
}

export interface QueueItem {
  id: string
  file: File
  name: string
  size: number
  status: FileStatus
  message: string | null
  detail: string | null
  sourceUrl: string | null
  output: QueueOutput | null
  meta: unknown
}

function sourcePreview(file: File): string | null {
  if (file.type === 'image/bmp' || /\.bmp$/i.test(file.name)) return null
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|ico)$/i.test(file.name)) {
    return URL.createObjectURL(file)
  }
  return null
}

function revokeOutput(item: QueueItem) {
  if (item.sourceUrl) URL.revokeObjectURL(item.sourceUrl)
  if (item.output?.previewUrl) URL.revokeObjectURL(item.output.previewUrl)
}

export function useFileQueue(kind: ToolKind) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const itemsRef = useRef(items)

  const commit = useCallback((next: QueueItem[]) => {
    itemsRef.current = next
    setItems(next)
  }, [])

  const addFiles = useCallback(
    (list: FileList | File[], reject?: (file: File) => string | null) => {
      const incoming = [...list]
      const plan = planAdditions(itemsRef.current, incoming, kind, reject)
      const next = [...itemsRef.current]
      for (const file of plan.accepted) {
        next.push({
          id: crypto.randomUUID(),
          file,
          name: file.name.trim() || 'Untitled file',
          size: file.size,
          status: 'ready',
          message: null,
          detail: null,
          sourceUrl: sourcePreview(file),
          output: null,
          meta: null,
        })
      }
      commit(next)
      setNotice(plan.error)
    },
    [commit, kind],
  )

  const update = useCallback(
    (id: string, patch: Partial<Omit<QueueItem, 'id' | 'file' | 'name' | 'size'>>) => {
      const next = itemsRef.current.map((item) => {
        if (item.id !== id) return item
        if (
          patch.output !== undefined &&
          item.output?.previewUrl &&
          item.output.previewUrl !== patch.output?.previewUrl
        ) {
          URL.revokeObjectURL(item.output.previewUrl)
        }
        return { ...item, ...patch }
      })
      commit(next)
    },
    [commit],
  )

  const remove = useCallback(
    (id: string) => {
      const target = itemsRef.current.find((item) => item.id === id)
      if (target) revokeOutput(target)
      commit(itemsRef.current.filter((item) => item.id !== id))
    },
    [commit],
  )

  const move = useCallback(
    (id: string, direction: -1 | 1) => {
      const current = [...itemsRef.current]
      const index = current.findIndex((item) => item.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return
      const [item] = current.splice(index, 1)
      if (!item) return
      current.splice(nextIndex, 0, item)
      commit(current)
    },
    [commit],
  )

  const clear = useCallback(() => {
    for (const item of itemsRef.current) revokeOutput(item)
    commit([])
    setNotice(null)
  }, [commit])

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) revokeOutput(item)
    }
  }, [])

  return { items, notice, setNotice, addFiles, update, remove, move, clear }
}
