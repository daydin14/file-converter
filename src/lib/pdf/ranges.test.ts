import { describe, expect, it } from 'vitest'
import { ConversionError } from '../errors'
import { parsePageSelection } from './ranges'

describe('parsePageSelection', () => {
  it('parses singles, ranges, and open ends without duplicates', () => {
    expect(parsePageSelection('1-3, 5, 2', 6)).toEqual([1, 2, 3, 5])
    expect(parsePageSelection('4-', 6)).toEqual([4, 5, 6])
    expect(parsePageSelection('2', 6)).toEqual([2])
  })

  it('explains empty, malformed, and out-of-range input', () => {
    expect(() => parsePageSelection('   ', 3)).toThrow(ConversionError)
    expect(() => parsePageSelection('a-b', 3)).toThrow(/not a page or range/)
    expect(() => parsePageSelection('2-1', 3)).toThrow(/outside this PDF/)
    expect(() => parsePageSelection('9', 3)).toThrow(/3 pages/)
  })
})
