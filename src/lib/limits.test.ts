import { describe, expect, it } from 'vitest'
import { LIMITS, fileTooLargeMessage, formatBytes, planAdditions, tooManyFilesMessage } from './limits'

describe('formatBytes', () => {
  it('formats bytes, kilobytes, and megabytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB')
  })
})

describe('planAdditions', () => {
  it('accepts files inside the image limits', () => {
    const result = planAdditions([], [{ name: 'photo.png', size: 1024 }], 'image')
    expect(result.accepted).toEqual([{ name: 'photo.png', size: 1024 }])
    expect(result.error).toBeNull()
  })

  it('explains when a file is too large', () => {
    const size = LIMITS.image.maxFileBytes + 1
    const result = planAdditions([], [{ name: 'huge.png', size }], 'image')
    expect(result.accepted).toHaveLength(0)
    expect(result.error).toBe(fileTooLargeMessage('huge.png', size, LIMITS.image.maxFileBytes))
    expect(result.error).toContain('25 MB')
  })

  it('stops when the batch is full', () => {
    const current = Array.from({ length: LIMITS.data.maxFiles }, () => ({ size: 10 }))
    const result = planAdditions(current, [{ name: 'extra.csv', size: 10 }], 'data')
    expect(result.error).toBe(tooManyFilesMessage(LIMITS.data.maxFiles))
  })

  it('rejects empty files and keeps a useful file in the same drop', () => {
    const result = planAdditions(
      [],
      [
        { name: 'empty.csv', size: 0 },
        { name: 'notes.json', size: 40 },
      ],
      'data',
    )
    expect(result.accepted.map((file) => file.name)).toEqual(['notes.json'])
    expect(result.error).toContain('empty.csv is empty')
  })

  it('uses a caller-supplied type error', () => {
    const result = planAdditions([], [{ name: 'notes.txt', size: 20 }], 'data', (file) =>
      file.name.endsWith('.txt') ? `${file.name} is not a supported data file.` : null,
    )
    expect(result.accepted).toHaveLength(0)
    expect(result.error).toBe('notes.txt is not a supported data file.')
  })
})
