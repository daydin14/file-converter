import { FiArrowDown, FiArrowUp, FiTrash2 } from 'react-icons/fi'
import { formatBytes } from '../lib/limits'
import type { QueueItem } from '../hooks/useFileQueue'

const statusLabel = {
  ready: 'Ready',
  working: 'Working',
  done: 'Done',
  error: 'Needs a look',
} as const

const statusClass = {
  ready: 'badge-ghost',
  working: 'badge-info',
  done: 'badge-success',
  error: 'badge-warning',
} as const

function Preview({ item }: { item: QueueItem }) {
  const url = item.output?.previewUrl ?? item.sourceUrl
  if (!url) return null
  return <img src={url} alt="" className="size-14 rounded-box border border-base-300 object-cover" />
}

export function FileQueue({
  items,
  onRemove,
  onMove,
  onSelect,
  selectedId,
}: {
  items: QueueItem[]
  onRemove: (id: string) => void
  onMove?: (id: string, direction: -1 | 1) => void
  onSelect?: (id: string) => void
  selectedId?: string | null
}) {
  const done = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length
  const working = items.filter((item) => item.status === 'working').length

  if (items.length === 0) {
    return <p className="text-sm text-base-content/70">No files yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="text-sm text-base-content/70">
        {done} finished, {failed} need attention, {working} working. {items.length} in this batch.
      </p>
      <ul className="flex flex-col gap-2" aria-label="Files">
        {items.map((item, index) => {
          const selected = selectedId === item.id
          return (
            <li
              key={item.id}
              className={`flex flex-col gap-3 rounded-box border bg-base-100 p-3 sm:flex-row sm:items-center ${
                selected ? 'border-primary' : 'border-base-300'
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Preview item={item} />
                <div className="min-w-0">
                  {onSelect ? (
                    <button
                      type="button"
                      className="link link-hover block max-w-full truncate text-left font-medium"
                      onClick={() => onSelect(item.id)}
                      aria-pressed={selected}
                    >
                      {item.name}
                    </button>
                  ) : (
                    <p className="truncate font-medium">{item.name}</p>
                  )}
                  <p className="text-xs text-base-content/70">
                    {formatBytes(item.size)}
                    {item.detail ? ` · ${item.detail}` : ''}
                    {item.output ? ` · ${item.output.filename}` : ''}
                  </p>
                  {item.message ? <p className="mt-1 text-sm text-base-content/80">{item.message}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className={`badge ${statusClass[item.status]}`}>{statusLabel[item.status]}</span>
                {onMove ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square"
                      aria-label={`Move ${item.name} up`}
                      onClick={() => onMove(item.id, -1)}
                      disabled={index === 0}
                    >
                      <FiArrowUp aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square"
                      aria-label={`Move ${item.name} down`}
                      onClick={() => onMove(item.id, 1)}
                      disabled={index === items.length - 1}
                    >
                      <FiArrowDown aria-hidden="true" />
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square text-error"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => onRemove(item.id)}
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
