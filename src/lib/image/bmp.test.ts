import { describe, expect, it } from 'vitest'
import { decodeBmp, encodeBmp } from './bmp'

describe('bmp', () => {
  it('round-trips a 24-bit image and flattens transparency onto white', () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 128,
    ])
    const decoded = decodeBmp(encodeBmp(rgba, 2, 2))
    expect(decoded.width).toBe(2)
    expect(decoded.height).toBe(2)
    expect(Array.from(decoded.rgba.slice(0, 4))).toEqual([255, 0, 0, 255])
    expect(Array.from(decoded.rgba.slice(4, 8))).toEqual([0, 255, 0, 255])
    expect(Array.from(decoded.rgba.slice(8, 12))).toEqual([0, 0, 255, 255])
    expect(Array.from(decoded.rgba.slice(12, 16))).toEqual([127, 127, 127, 255])
  })

  it('treats a 32-bit BMP with an unused alpha channel as opaque', () => {
    const width = 1
    const height = 1
    const pixelSize = 4
    const file = new Uint8Array(54 + pixelSize)
    const view = new DataView(file.buffer)
    file[0] = 0x42
    file[1] = 0x4d
    view.setUint32(2, file.length, true)
    view.setUint32(10, 54, true)
    view.setUint32(14, 40, true)
    view.setInt32(18, width, true)
    view.setInt32(22, height, true)
    view.setUint16(26, 1, true)
    view.setUint16(28, 32, true)
    file[54] = 20
    file[55] = 40
    file[56] = 60
    file[57] = 0
    const decoded = decodeBmp(file)
    expect(Array.from(decoded.rgba)).toEqual([60, 40, 20, 255])
  })
})
