import type { DataPreview } from '../lib/data/convert'

export function DataPreviewView({ preview }: { preview: DataPreview }) {
  if (preview.kind === 'table' && preview.columns && preview.rows) {
    return (
      <div className="flex flex-col gap-2">
        {preview.note ? <p className="text-sm text-base-content/70">{preview.note}</p> : null}
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table-sm table-zebra table">
            <caption className="sr-only">Converted data preview</caption>
            <thead>
              <tr>
                {preview.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join('|')}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {preview.note ? <p className="text-sm text-base-content/70">{preview.note}</p> : null}
      <pre className="max-h-80 overflow-auto rounded-box border border-base-300 bg-base-200 p-4 text-sm leading-6 whitespace-pre-wrap">
        {preview.text}
      </pre>
    </div>
  )
}
