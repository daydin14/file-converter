import { describe, expect, it } from 'vitest'
import { baseName, extensionOf, replaceExtension, uniqueName } from './filenames'

describe('filenames', () => {
  it('replaces the last extension and strips a path', () => {
    expect(replaceExtension('Photos/Vacation.PNG', 'webp')).toBe('Vacation.webp')
    expect(extensionOf('report.final.YAML')).toBe('yaml')
  })

  it('removes characters that are awkward in downloads', () => {
    expect(baseName('q3 report?.csv')).toBe('q3 report_.csv')
    expect(baseName('   ')).toBe('file')
  })

  it('numbers duplicate zip entries', () => {
    const used = new Set<string>()
    expect(uniqueName('photo.png', used)).toBe('photo.png')
    expect(uniqueName('photo.png', used)).toBe('photo (2).png')
    expect(uniqueName('photo.png', used)).toBe('photo (3).png')
  })
})
