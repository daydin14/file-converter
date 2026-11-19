import { ConversionError } from '../errors'
import { LIMITS } from '../limits'

export interface DecodedBitmap {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

export function encodeBmp(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  if (width < 1 || height < 1 || rgba.length < width * height * 4) {
    throw new ConversionError('Could not build a BMP from this image.')
  }
  const rowStride = Math.ceil((width * 3) / 4) * 4
  const pixelSize = rowStride * height
  const fileSize = 54 + pixelSize
  const out = new Uint8Array(fileSize)
  const view = new DataView(out.buffer)
  out[0] = 0x42
  out[1] = 0x4d
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelSize, true)
  view.setUint32(38, 2835, true)
  view.setUint32(42, 2835, true)

  for (let y = 0; y < height; y += 1) {
    const sourceY = height - 1 - y
    const row = 54 + y * rowStride
    for (let x = 0; x < width; x += 1) {
      const source = (sourceY * width + x) * 4
      const target = row + x * 3
      const alpha = (rgba[source + 3] ?? 255) / 255
      const red = rgba[source] ?? 0
      const green = rgba[source + 1] ?? 0
      const blue = rgba[source + 2] ?? 0
      out[target] = Math.round(blue * alpha + 255 * (1 - alpha))
      out[target + 1] = Math.round(green * alpha + 255 * (1 - alpha))
      out[target + 2] = Math.round(red * alpha + 255 * (1 - alpha))
    }
  }
  return out
}

export function decodeBmp(bytes: Uint8Array): DecodedBitmap {
  if (bytes.length < 54 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) {
    throw new ConversionError('This BMP file is not a format this tool can read. Export it as PNG and try again.')
  }
  const view = viewOf(bytes)
  const pixelOffset = view.getUint32(10, true)
  const headerSize = view.getUint32(14, true)
  if (headerSize < 40) {
    throw new ConversionError('This BMP uses an old header. Save it as a 24-bit BMP, or use PNG.')
  }
  const width = view.getInt32(18, true)
  const heightRaw = view.getInt32(22, true)
  const planes = view.getUint16(26, true)
  const bitCount = view.getUint16(28, true)
  const compression = view.getUint32(30, true)
  if (width < 1 || planes !== 1) {
    throw new ConversionError('This BMP file looks damaged.')
  }
  const topDown = heightRaw < 0
  const height = Math.abs(heightRaw)
  if (width > LIMITS.maxCanvasEdge || height > LIMITS.maxCanvasEdge) {
    throw new ConversionError(
      `This BMP is larger than ${LIMITS.maxCanvasEdge} pixels on a side. Resize it before converting.`,
    )
  }

  const rgba = new Uint8ClampedArray(width * height * 4)
  if (compression === 0 && (bitCount === 24 || bitCount === 32)) {
    const bytesPerPixel = bitCount / 8
    const rowStride = Math.ceil((width * bytesPerPixel) / 4) * 4
    let maxAlpha = 0
    for (let y = 0; y < height; y += 1) {
      const sourceY = topDown ? y : height - 1 - y
      const rowStart = pixelOffset + sourceY * rowStride
      for (let x = 0; x < width; x += 1) {
        const index = rowStart + x * bytesPerPixel
        const target = (y * width + x) * 4
        rgba[target] = bytes[index + 2] ?? 0
        rgba[target + 1] = bytes[index + 1] ?? 0
        rgba[target + 2] = bytes[index] ?? 0
        const alpha = bitCount === 32 ? (bytes[index + 3] ?? 255) : 255
        rgba[target + 3] = alpha
        if (alpha > maxAlpha) maxAlpha = alpha
      }
    }
    if (bitCount === 32 && maxAlpha === 0) {
      for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
    }
    return { width, height, rgba }
  }

  if (compression === 0 && bitCount === 8) {
    const colors = view.getUint32(46, true)
    const paletteSize = (colors === 0 ? 256 : colors) * 4
    const paletteOffset = 14 + headerSize
    if (paletteOffset + paletteSize > bytes.length) {
      throw new ConversionError('This 8-bit BMP is missing its color palette.')
    }
    const rowStride = Math.ceil(width / 4) * 4
    for (let y = 0; y < height; y += 1) {
      const sourceY = topDown ? y : height - 1 - y
      const rowStart = pixelOffset + sourceY * rowStride
      for (let x = 0; x < width; x += 1) {
        const color = bytes[rowStart + x] ?? 0
        const palette = paletteOffset + color * 4
        const target = (y * width + x) * 4
        rgba[target] = bytes[palette + 2] ?? 0
        rgba[target + 1] = bytes[palette + 1] ?? 0
        rgba[target + 2] = bytes[palette] ?? 0
        rgba[target + 3] = 255
      }
    }
    return { width, height, rgba }
  }

  throw new ConversionError('Only uncompressed 8-bit, 24-bit, and 32-bit BMP files can be read. Export as PNG and try again.')
}
