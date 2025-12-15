import { CheckCircle2 } from 'lucide-react';

interface CSVRowPreviewProps {
  headers?: string[];
  rows: any[];
  totalRows: number;
}

export function CSVRowPreview({ headers, rows, totalRows }: CSVRowPreviewProps) {
  const displayRows = rows.slice(0, 5); // Show first 5 rows

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <p className="text-green-900">Successfully Parsed Rows</p>
        </div>
        <span className="text-sm text-green-700">{totalRows} rows</span>
      </div>

      {displayRows.length > 0 && (
        <div className="bg-white border border-green-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm">
              {headers && (
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 text-xs w-12">#</th>
                    {headers.map((header, index) => (
                      <th key={index} className="px-3 py-2 text-left text-gray-900 min-w-[120px]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {displayRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500 text-xs">{rowIndex + 1}</td>
                    {Array.isArray(row) ? (
                      row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 text-gray-700">
                          {cell}
                        </td>
                      ))
                    ) : headers ? (
                      headers.map((header, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 text-gray-700">
                          {row[header] ?? row[cellIndex] ?? ''}
                        </td>
                      ))
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalRows > 5 && (
            <div className="px-3 py-2 bg-green-50 border-t border-green-200 text-xs text-green-700 text-center">
              Showing first 5 of {totalRows} rows
            </div>
          )}
        </div>
      )}
    </div>
  );
}
