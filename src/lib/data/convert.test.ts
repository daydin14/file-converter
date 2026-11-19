import { describe, expect, it } from 'vitest'
import { decodeText, encodeText } from '../bytes'
import { convertData } from './convert'

const peopleCsv = encodeText('name,city\nAda,London\nGrace,New York\n')

describe('convertData', () => {
  it('converts CSV to JSON, YAML, XML, and back without dropping fields', async () => {
    const json = await convertData(peopleCsv, 'csv', 'json')
    expect(JSON.parse(decodeText(json.bytes))).toEqual([
      { name: 'Ada', city: 'London' },
      { name: 'Grace', city: 'New York' },
    ])
    expect(json.preview.kind).toBe('table')
    expect(json.preview.columns).toEqual(['name', 'city'])

    const yaml = await convertData(json.bytes, 'json', 'yaml')
    expect(decodeText(yaml.bytes)).toContain('Grace')
    const yamlBack = await convertData(yaml.bytes, 'yaml', 'json')
    expect(JSON.parse(decodeText(yamlBack.bytes))).toEqual([
      { name: 'Ada', city: 'London' },
      { name: 'Grace', city: 'New York' },
    ])

    const xml = await convertData(json.bytes, 'json', 'xml')
    expect(decodeText(xml.bytes)).toContain('<name>Ada</name>')
    const xmlBack = await convertData(xml.bytes, 'xml', 'json')
    expect(JSON.parse(decodeText(xmlBack.bytes))).toEqual([
      { name: 'Ada', city: 'London' },
      { name: 'Grace', city: 'New York' },
    ])
  })

  it('round-trips rows through an xlsx workbook', async () => {
    const workbook = await convertData(peopleCsv, 'csv', 'xlsx')
    expect(Array.from(workbook.bytes.slice(0, 2))).toEqual([0x50, 0x4b])
    const back = await convertData(workbook.bytes, 'xlsx', 'csv')
    expect(decodeText(back.bytes)).toContain('Ada')
    expect(decodeText(back.bytes)).toContain('New York')
  })

  it('keeps numbers when converting JSON to YAML', async () => {
    const source = encodeText('{"sku":"A-1","qty":2,"ok":true}\n')
    const yaml = await convertData(source, 'json', 'yaml')
    const back = await convertData(yaml.bytes, 'yaml', 'json')
    expect(JSON.parse(decodeText(back.bytes))).toEqual({ sku: 'A-1', qty: 2, ok: true })
  })

  it('explains a broken JSON file', async () => {
    await expect(convertData(encodeText('{'), 'json', 'csv')).rejects.toThrow(/syntax error/)
  })
})
