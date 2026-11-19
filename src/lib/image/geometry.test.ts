import { describe, expect, it } from 'vitest'
import { clampQuality, fitDimensions } from './geometry'

describe('fitDimensions', () => {
  it('keeps the original size when no maximum is set', () => {
    expect(fitDimensions({ width: 800, height: 600 }, null, null, false)).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('shrinks to fit inside the box without stretching', () => {
    expect(fitDimensions({ width: 4000, height: 2000 }, 1000, 1000, false)).toEqual({
      width: 1000,
      height: 500,
    })
  })

  it('does not enlarge a smaller image unless asked', () => {
    expect(fitDimensions({ width: 300, height: 200 }, 1000, null, false)).toEqual({
      width: 300,
      height: 200,
    })
    expect(fitDimensions({ width: 300, height: 200 }, 600, null, true)).toEqual({
      width: 600,
      height: 400,
    })
  })

  it('treats zero as no limit', () => {
    expect(fitDimensions({ width: 40, height: 20 }, 0, null, true)).toEqual({ width: 40, height: 20 })
  })
})

describe('clampQuality', () => {
  it('keeps quality in the encoder range', () => {
    expect(clampQuality(0)).toBe(0.1)
    expect(clampQuality(2)).toBe(1)
    expect(clampQuality(Number.NaN)).toBe(0.85)
    expect(clampQuality(0.7)).toBe(0.7)
  })
})
