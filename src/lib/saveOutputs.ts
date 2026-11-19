import { toBlob } from './bytes'
import { downloadBlob } from './download'
import { zipNamedFiles } from './zip'

export async function saveOutputs(files: { filename: string; blob: Blob }[], zipName: string): Promise<void> {
  const ready = files.filter((file) => file.blob.size > 0)
  if (ready.length === 0) return
  const only = ready[0]
  if (ready.length === 1 && only) {
    downloadBlob(only.blob, only.filename)
    return
  }
  const zipped = await zipNamedFiles(
    await Promise.all(
      ready.map(async (file) => ({
        name: file.filename,
        data: new Uint8Array(await file.blob.arrayBuffer()),
      })),
    ),
  )
  downloadBlob(toBlob(zipped, 'application/zip'), zipName)
}
