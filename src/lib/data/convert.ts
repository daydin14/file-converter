import { decodeText, encodeText, toArrayBuffer } from '../bytes'
import { ConversionError } from '../errors'
import { LIMITS } from '../limits'

export const dataFormats = ['csv', 'json', 'xml', 'yaml', 'xlsx'] as const
export type DataFormat = (typeof dataFormats)[number]

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export interface DataPreview {
  kind: 'table' | 'text'
  columns?: string[]
  rows?: string[][]
  text?: string
  note?: string
}

export interface DataResult {
  bytes: Uint8Array
  mime: string
  extension: string
  preview: DataPreview
}

const mimeByFormat: Record<DataFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  json: 'application/json;charset=utf-8',
  xml: 'application/xml;charset=utf-8',
  yaml: 'application/yaml;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const blockedKeys = new Set(['__proto__', 'constructor', 'prototype'])

export const dataAccept = '.csv,.json,.xml,.yaml,.yml,.xlsx,text/csv,application/json,application/xml,text/xml,text/yaml,application/yaml'

export function formatFromName(name: string): DataFormat | null {
  const extension = name.toLowerCase().split('.').pop() ?? ''
  if (extension === 'csv') return 'csv'
  if (extension === 'json') return 'json'
  if (extension === 'xml') return 'xml'
  if (extension === 'yaml' || extension === 'yml') return 'yaml'
  if (extension === 'xlsx') return 'xlsx'
  if (extension === 'xls') return null
  return null
}

export function isAcceptedDataName(name: string): boolean {
  return formatFromName(name) !== null
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRowArray(value: JsonValue): value is { [key: string]: JsonValue }[] {
  return Array.isArray(value) && value.every((item) => isRecord(item))
}

function asJsonValue(value: unknown, depth = 0): JsonValue {
  if (depth > 30) throw new ConversionError('This file is nested too deeply to convert.')
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((item) => asJsonValue(item, depth + 1))
  if (typeof value === 'object') {
    const record: { [key: string]: JsonValue } = {}
    for (const [key, child] of Object.entries(value)) {
      if (blockedKeys.has(key)) continue
      record[key] = asJsonValue(child, depth + 1)
    }
    return record
  }
  return String(value)
}

function displayCell(value: JsonValue | undefined): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function sheetCell(value: JsonValue | undefined): string | number | boolean | null {
  if (value == null || value === '') return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return JSON.stringify(value)
}

function columnOrder(rows: { [key: string]: JsonValue }[]): string[] {
  const columns: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue
      seen.add(key)
      columns.push(key)
    }
  }
  return columns
}

function tablePreview(rows: { [key: string]: JsonValue }[], note?: string): DataPreview {
  const columns = columnOrder(rows)
  const shownColumns = columns.slice(0, LIMITS.maxPreviewColumns)
  const shownRows = rows.slice(0, LIMITS.maxPreviewRows).map((row) => shownColumns.map((column) => displayCell(row[column])))
  const notes = [note, columns.length > shownColumns.length ? `Showing ${shownColumns.length} of ${columns.length} columns.` : '', rows.length > shownRows.length ? `Showing ${shownRows.length} of ${rows.length} rows.` : ''].filter(Boolean)
  return {
    kind: 'table',
    columns: shownColumns,
    rows: shownRows,
    note: notes.join(' ') || undefined,
  }
}

function textPreview(text: string, note?: string): DataPreview {
  if (text.length <= LIMITS.maxPreviewChars) return { kind: 'text', text, note }
  return {
    kind: 'text',
    text: `${text.slice(0, LIMITS.maxPreviewChars)}\n…`,
    note: note ? `${note} Preview truncated.` : 'Preview truncated.',
  }
}

function previewFor(value: JsonValue, text: string | null): DataPreview {
  if (isRowArray(value)) {
    return value.length === 0 ? textPreview(text ?? '[]', 'No data rows.') : tablePreview(value)
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).filter((entry): entry is [string, { [key: string]: JsonValue }[]] =>
      isRowArray(entry[1]),
    )
    if (entries.length > 0 && entries.length === Object.keys(value).length) {
      const [firstName, firstRows] = entries[0] ?? ['Sheet1', []]
      const others = entries.slice(1).map(([name]) => name)
      const note = others.length > 0 ? `Showing ${firstName}. Other sheets: ${others.join(', ')}.` : undefined
      return firstRows.length === 0 ? textPreview(text ?? '', note ?? 'No data rows.') : tablePreview(firstRows, note)
    }
  }
  return textPreview(text ?? JSON.stringify(value, null, 2))
}

async function parseCsv(text: string): Promise<JsonValue> {
  const { parse } = await import('papaparse')
  const parsed = parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: 'greedy' })
  const fatal = parsed.errors.filter((error) => error.type !== 'Delimiter')
  if (fatal.length > 0) {
    const message = fatal[0]?.message
    throw new ConversionError(message ? `This CSV could not be parsed (${message}).` : 'This CSV could not be parsed.')
  }
  if (parsed.data.length === 0) throw new ConversionError('This CSV has headers only, or no rows. Add a data row and try again.')
  return parsed.data.map((row) => {
    const record: { [key: string]: JsonValue } = {}
    let index = 0
    for (const [key, cell] of Object.entries(row)) {
      const name = key.trim() || `column_${index + 1}`
      if (!blockedKeys.has(name)) record[name] = asJsonValue(cell)
      index += 1
    }
    return record
  })
}

function parseJson(text: string): JsonValue {
  try {
    return asJsonValue(JSON.parse(text) as unknown)
  } catch (error) {
    if (error instanceof ConversionError) throw error
    throw new ConversionError('This JSON file has a syntax error. Check commas and quotes, then try again.')
  }
}

async function parseYaml(text: string): Promise<JsonValue> {
  const { JSON_SCHEMA, load } = await import('js-yaml')
  try {
    const loaded = load(text, { schema: JSON_SCHEMA })
    if (loaded == null) throw new ConversionError('This YAML file has no data.')
    return asJsonValue(loaded)
  } catch (error) {
    if (error instanceof ConversionError) throw error
    throw new ConversionError('This YAML file could not be parsed. Check the indentation and try again.')
  }
}

function uniqueLabel(label: string, used: Set<string>): string {
  const base = label.trim() || 'column'
  let name = base
  let extra = 2
  while (used.has(name)) {
    name = `${base} ${extra}`
    extra += 1
  }
  used.add(name)
  return name
}

function xmlName(key: string, used: Set<string>): string {
  const cleaned = key.replace(/[^A-Za-z0-9_.-]/g, '_').replace(/^([^A-Za-z_])/, '_$1') || 'item'
  let name = cleaned
  let extra = 2
  while (used.has(name)) {
    name = `${cleaned}_${extra}`
    extra += 1
  }
  used.add(name)
  return name
}

function forXml(value: JsonValue): unknown {
  if (Array.isArray(value)) return value.map((item) => forXml(item))
  if (!isRecord(value)) return value ?? ''
  const used = new Set<string>()
  const record: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    record[xmlName(key, used)] = forXml(child)
  }
  return record
}

async function parseXml(text: string): Promise<JsonValue> {
  const { XMLParser } = await import('fast-xml-parser')
  const parser = new XMLParser({
    ignoreAttributes: true,
    ignoreDeclaration: true,
    parseTagValue: false,
    trimValues: true,
    processEntities: false,
    maxNestedTags: 40,
    isArray: (tagName) => tagName === 'item',
  })
  let parsed: unknown
  try {
    parsed = parser.parse(text)
  } catch {
    throw new ConversionError('This XML file could not be parsed. Check that every tag is closed.')
  }
  const value = asJsonValue(parsed)
  if (isRecord(value) && Object.keys(value).length === 1 && value.root !== undefined) {
    const root = value.root
    if (isRecord(root) && Object.keys(root).length === 1 && Array.isArray(root.item)) return root.item
    return root ?? null
  }
  return value
}

function normalizeSheetCell(value: unknown): JsonValue {
  if (value instanceof Date) return value.toISOString()
  return asJsonValue(value)
}

function rowsFromMatrix(data: unknown[][]): { [key: string]: JsonValue }[] {
  if (data.length < 2) return []
  const used = new Set<string>()
  const headers = (data[0] ?? []).map((cell, index) => {
    const label = cell == null || cell === '' ? `column_${index + 1}` : String(normalizeSheetCell(cell))
    return uniqueLabel(label, used)
  })
  const rows: { [key: string]: JsonValue }[] = []
  for (const row of data.slice(1)) {
    if (row.every((cell) => cell == null || cell === '')) continue
    const record: { [key: string]: JsonValue } = {}
    headers.forEach((header, index) => {
      record[header] = normalizeSheetCell(row[index])
    })
    rows.push(record)
  }
  return rows
}

async function parseXlsx(bytes: Uint8Array): Promise<JsonValue> {
  const { default: readXlsxFile } = await import('read-excel-file/universal')
  let sheets: { sheet: string; data: unknown[][] }[]
  try {
    sheets = (await readXlsxFile(bytes)) as { sheet: string; data: unknown[][] }[]
  } catch {
    throw new ConversionError('This spreadsheet could not be read. Use an .xlsx file from Excel, Sheets, or Numbers.')
  }
  const tables = sheets
    .map((sheet) => ({ name: sheet.sheet || 'Sheet', rows: rowsFromMatrix(sheet.data) }))
    .filter((sheet) => sheet.rows.length > 0)
  if (tables.length === 0) {
    throw new ConversionError('This spreadsheet has no data rows. The first row should be column names, with records below it.')
  }
  if (tables.length === 1) return tables[0]?.rows ?? []
  const workbook: { [key: string]: JsonValue } = {}
  for (const table of tables) workbook[table.name] = table.rows
  return workbook
}

async function parseInput(bytes: Uint8Array, format: DataFormat): Promise<JsonValue> {
  if (format === 'xlsx') return parseXlsx(bytes)
  const text = decodeText(bytes).trim()
  if (!text) throw new ConversionError('This file is empty.')
  if (format === 'csv') return parseCsv(text)
  if (format === 'json') return parseJson(text)
  if (format === 'yaml') return parseYaml(text)
  return parseXml(text)
}

function rowsOf(value: JsonValue): { [key: string]: JsonValue }[] {
  if (isRowArray(value)) return value
  if (isRecord(value)) return [value]
  if (Array.isArray(value)) return value.map((cell) => ({ value: cell }))
  return [{ value }]
}

async function writeCsv(value: JsonValue): Promise<string> {
  const rows = rowsOf(value)
  if (rows.length === 0) throw new ConversionError('There are no rows to write as CSV.')
  const { unparse } = await import('papaparse')
  const fields = columnOrder(rows)
  const data = rows.map((row) => {
    const record: Record<string, string | number | boolean | null> = {}
    for (const field of fields) record[field] = sheetCell(row[field])
    return record
  })
  return unparse({ fields, data })
}

function writeJson(value: JsonValue): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function writeYaml(value: JsonValue): Promise<string> {
  const { JSON_SCHEMA, dump } = await import('js-yaml')
  return dump(value, { schema: JSON_SCHEMA, noRefs: true, lineWidth: 100 })
}

async function writeXml(value: JsonValue): Promise<string> {
  const { XMLBuilder } = await import('fast-xml-parser')
  const payload = Array.isArray(value) ? { root: { item: forXml(value) } } : { root: forXml(value) }
  const builder = new XMLBuilder({
    ignoreAttributes: true,
    format: true,
    indentBy: '  ',
    suppressEmptyNode: false,
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(payload)}\n`
}

function safeSheetName(name: string, index: number, used: Set<string>): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || `Sheet${index + 1}`
  let sheet = cleaned
  let extra = 2
  while (used.has(sheet)) {
    const suffix = ` ${extra}`
    sheet = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`
    extra += 1
  }
  used.add(sheet)
  return sheet
}

function matrixFor(rows: { [key: string]: JsonValue }[]): (string | number | boolean | null)[][] {
  const columns = columnOrder(rows)
  return [columns, ...rows.map((row) => columns.map((column) => sheetCell(row[column])))]
}

async function writeXlsx(value: JsonValue): Promise<Uint8Array> {
  const { default: writeXlsxFile } = await import('write-excel-file/universal')
  let sheets: { name: string; rows: { [key: string]: JsonValue }[] }[]
  if (isRecord(value)) {
    const entries = Object.entries(value)
    if (
      entries.length > 0 &&
      entries.every((entry): entry is [string, { [key: string]: JsonValue }[]] => isRowArray(entry[1]))
    ) {
      const used = new Set<string>()
      sheets = entries.map(([name, child], index) => ({
        name: safeSheetName(name, index, used),
        rows: child,
      }))
    } else {
      sheets = [{ name: 'Sheet1', rows: rowsOf(value) }]
    }
  } else {
    sheets = [{ name: 'Sheet1', rows: rowsOf(value) }]
  }
  sheets = sheets.filter((sheet) => sheet.rows.length > 0)
  if (sheets.length === 0) throw new ConversionError('There are no rows to write to a spreadsheet.')

  const matrices = sheets.map((sheet) => ({ sheet: sheet.name, data: matrixFor(sheet.rows) }))
  const result =
    matrices.length === 1
      ? await writeXlsxFile(matrices[0]?.data ?? [[]]).toBlob()
      : await writeXlsxFile(matrices).toBlob()
  return new Uint8Array(await result.arrayBuffer())
}

export async function convertData(bytes: Uint8Array, from: DataFormat, to: DataFormat): Promise<DataResult> {
  const value = await parseInput(bytes, from)
  if (to === 'xlsx') {
    const output = await writeXlsx(value)
    return {
      bytes: output,
      mime: mimeByFormat.xlsx,
      extension: 'xlsx',
      preview: previewFor(value, null),
    }
  }

  const text =
    to === 'csv' ? await writeCsv(value) : to === 'json' ? writeJson(value) : to === 'yaml' ? await writeYaml(value) : await writeXml(value)
  return {
    bytes: encodeText(text),
    mime: mimeByFormat[to],
    extension: to === 'yaml' ? 'yaml' : to,
    preview: previewFor(value, text),
  }
}

export function dataBlob(bytes: Uint8Array, mime: string): Blob {
  return new Blob([toArrayBuffer(bytes)], { type: mime })
}
