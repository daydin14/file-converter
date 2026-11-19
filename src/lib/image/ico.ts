import { ConversionError } from '../errors'
import { decodeBmp, type DecodedBitmap } from './bmp'

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

export function encodeIco(pngBytes: Uint8Array, width: number, height: number): Uint8Array {
  if (pngBytes.length < 8) {
    throw new ConversionError('Could not build an ICO from this image.')
  }
  const out = new Uint8Array(22 + pngBytes.length)
  const view = new DataView(out.buffer)
  view.setUint16(2, 1, true)
  view.setUint16(4, 1, true)
  out[6] = width >= 256 ? 0 : width
  out[7] = height >= 256 ? 0 : height
  view.setUint16(10, 1, true)
  view.setUint16(12, 32, true)
  view.setUint32(14, pngBytes.length, true)
  view.setUint32(18, 22, true)
  out.set(pngBytes, 22)
  return out
}

function dibToBmp(dib: Uint8Array): Uint8Array {
  const dibView = viewOf(dib)
  const headerSize = dibView.getUint32(0, true)
  const bitCount = dibView.getUint16(14, true)
  let paletteBytes = 0
  if (bitCount > 0 && bitCount <= 8) {
    const colors = dibView.getUint32(32, true)
    paletteBytes = (colors === 0 ? 2 ** bitCount : colors) * 4
  }
  const out = new Uint8Array(14 + dib.length)
  const view = new DataView(out.buffer)
  out[0] = 0x42
  out[1] = 0x4d
  view.setUint32(2, out.length, true)
  view.setUint32(10, 14 + headerSize + paletteBytes, true)
  out.set(dib, 14)
  return out
}

export function decodeIco(bytes: Uint8Array): { kind: 'png'; bytes: Uint8Array } | { kind: 'bmp'; bitmap: DecodedBitmap } {
  if (bytes.length < 22) {
    throw new ConversionError('This ICO file is too small to read.')
  }
  const view = viewOf(bytes)
  const reserved = view.getUint16(0, true)
  const type = view.getUint16(2, true)
  const count = view.getUint16(4, true)
  if (reserved !== 0 || (type !== 1 && type !== 2) || count < 1) {
    throw new ConversionError('This icon file is not a valid ICO.')
  }

  let best = 0
  let bestArea = -1
  const available = Math.min(count, Math.floor((bytes.length - 6) / 16))
  for (let index = 0; index < available; index += 1) {
    const entry = 6 + index * 16
    const width = bytes[entry] || 256
    const height = bytes[entry + 1] || 256
    const area = width * height
    if (area > bestArea) {
      best = index
      bestArea = area
    }
  }

  const entry = 6 + best * 16
  const entryHeight = bytes[entry + 1] || 256
  const size = view.getUint32(entry + 8, true)
  const offset = view.getUint32(entry + 12, true)
  if (size < 8 || offset + size > bytes.length) {
    throw new ConversionError('This ICO file looks damaged.')
  }
  const image = bytes.subarray(offset, offset + size)
  const isPng = image[0] === 0x89 && image[1] === 0x50 && image[2] === 0x4e && image[3] === 0x47
  if (isPng) return { kind: 'png', bytes: image }

  const dib = image.slice()
  const dibView = viewOf(dib)
  const dibHeight = dibView.getInt32(8, true)
  if (dibHeight === entryHeight * 2) dibView.setInt32(8, entryHeight, true)
  return { kind: 'bmp', bitmap: decodeBmp(dibToBmp(dib)) }
}
