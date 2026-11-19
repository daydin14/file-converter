export const LIMITS = {
  image: { maxFileBytes: 25 * 1024 * 1024, maxFiles: 20 },
  pdf: { maxFileBytes: 40 * 1024 * 1024, maxFiles: 12 },
  data: { maxFileBytes: 8 * 1024 * 1024, maxFiles: 10 },
  maxTotalBytes: 80 * 1024 * 1024,
  maxCanvasEdge: 8192,
  maxPdfPages: 80,
  maxPreviewRows: 25,
  maxPreviewColumns: 8,
  maxPreviewChars: 4000,
} as const

export type ToolKind = keyof Pick<typeof LIMITS, 'image' | 'pdf' | 'data'>

export interface FileLike {
  name: string
  size: number
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 10 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unit]}`
}

export function fileTooLargeMessage(name: string, size: number, max: number): string {
  return `${name} is ${formatBytes(size)}. Each file needs to stay under ${formatBytes(max)} so the browser tab stays responsive.`
}

export function tooManyFilesMessage(max: number): string {
  return `You can add up to ${max} files at a time. Remove one, or run another batch.`
}

export function totalTooLargeMessage(): string {
  return `That batch is over ${formatBytes(LIMITS.maxTotalBytes)} combined. Remove a file and try again.`
}

export function planAdditions<T extends FileLike>(
  current: { size: number }[],
  incoming: T[],
  kind: ToolKind,
  reject?: (file: T) => string | null,
): { accepted: T[]; error: string | null } {
  const cap = LIMITS[kind]
  const accepted: T[] = []
  const errors: string[] = []
  let count = current.length
  let total = current.reduce((sum, file) => sum + file.size, 0)

  for (const file of incoming) {
    const name = file.name.trim() || 'Untitled file'
    if (file.size <= 0) {
      errors.push(`${name} is empty.`)
      continue
    }
    const rejected = reject?.(file) ?? null
    if (rejected) {
      errors.push(rejected)
      continue
    }
    if (file.size > cap.maxFileBytes) {
      errors.push(fileTooLargeMessage(name, file.size, cap.maxFileBytes))
      continue
    }
    if (count >= cap.maxFiles) {
      errors.push(tooManyFilesMessage(cap.maxFiles))
      break
    }
    if (total + file.size > LIMITS.maxTotalBytes) {
      errors.push(totalTooLargeMessage())
      break
    }
    accepted.push(file)
    count += 1
    total += file.size
  }

  if (errors.length === 0) return { accepted, error: null }
  if (errors.length === 1) return { accepted, error: errors[0] ?? null }
  const extra = errors.length - 1
  return {
    accepted,
    error: `${errors[0]} ${extra} more ${extra === 1 ? 'file was' : 'files were'} skipped.`,
  }
}
