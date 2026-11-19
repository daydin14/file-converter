import { describe, expect, it } from 'vitest'
import { decodeIco, encodeIco } from './ico'

const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

describe('ico', () => {
  it('wraps a PNG and reads the largest image back', () => {
    const ico = encodeIco(pngBytes, 16, 16)
    const decoded = decodeIco(ico)
    expect(decoded.kind).toBe('png')
    if (decoded.kind === 'png') expect(Array.from(decoded.bytes)).toEqual(Array.from(pngBytes))
  })

  it('stores 256px dimensions as zero, which is the ICO convention', () => {
    const ico = encodeIco(pngBytes, 256, 256)
    expect(ico[6]).toBe(0)
    expect(ico[7]).toBe(0)
    const decoded = decodeIco(ico)
    expect(decoded.kind).toBe('png')
  })

  it('reads a one-pixel BMP stored inside an ICO', () => {
    const dib = new Uint8Array(40 + 4 + 4)
    const view = new DataView(dib.buffer)
    view.setUint32(0, 40, true)
    view.setInt32(4, 1, true)
    view.setInt32(8, 2, true)
    view.setUint16(12, 1, true)
    view.setUint16(14, 32, true)
    dib[40] = 255
    dib[41] = 0
    dib[42] = 0
    dib[43] = 255

    const ico = new Uint8Array(22 + dib.length)
    const icoView = new DataView(ico.buffer)
    icoView.setUint16(2, 1, true)
    icoView.setUint16(4, 1, true)
    ico[6] = 1
    ico[7] = 1
    icoView.setUint32(14, dib.length, true)
    icoView.setUint32(18, 22, true)
    ico.set(dib, 22)

    const decoded = decodeIco(ico)
    expect(decoded.kind).toBe('bmp')
    if (decoded.kind === 'bmp') {
      expect(decoded.bitmap.width).toBe(1)
      expect(Array.from(decoded.bitmap.rgba)).toEqual([0, 0, 255, 255])
    }
  })
})
