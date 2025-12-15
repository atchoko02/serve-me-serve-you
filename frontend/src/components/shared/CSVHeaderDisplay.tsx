import { Table } from 'lucide-react';

interface CSVHeaderDisplayProps {
  headers: string[];
}

export function CSVHeaderDisplay({ headers }: CSVHeaderDisplayProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Table className="w-4 h-4 text-blue-600" />
        <p className="text-blue-900">Detected Headers ({headers.length})</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {headers.map((header, index) => (
          <div
            key={index}
            className="px-3 py-1 bg-white border border-blue-200 rounded-md text-sm text-gray-900"
          >
            {header || `Column ${index + 1}`}
          </div>
        ))}
      </div>
    </div>
  );
}
