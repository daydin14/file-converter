import { ConversionError } from './errors'
import { baseName, uniqueName } from './filenames'

export async function zipNamedFiles(files: { name: string; data: Uint8Array }[]): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new ConversionError('Nothing to zip yet.')
  }
  const { zipSync } = await import('fflate')
  const used = new Set<string>()
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    entries[uniqueName(baseName(file.name), used)] = file.data
  }
  return zipSync(entries, { level: 6 })
}
