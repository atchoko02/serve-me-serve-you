import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { CSVParserError } from '../../utils/csvParser';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

interface CSVErrorLogProps {
  errors: CSVParserError[];
}

export function CSVErrorLog({ errors }: CSVErrorLogProps) {
  if (errors.length === 0) return null;

  const getErrorBadgeColor = (type: CSVParserError['type']) => {
    switch (type) {
      case 'TokenizerError':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HeaderError':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'RowError':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'DuplicateError':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ColumnCountError':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'TypeConsistencyError':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <p className="text-red-900">
          Error Log ({errors.length} {errors.length === 1 ? 'error' : 'errors'})
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {errors.map((error, index) => (
          <AccordionItem
            key={index}
            value={`error-${index}`}
            className="bg-white border border-red-200 rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:bg-red-50">
              <div className="flex items-center gap-3 flex-1 text-left">
                <span className={`px-2 py-1 rounded text-xs border ${getErrorBadgeColor(error.type)}`}>
                  {error.type}
                </span>
                <span className="text-sm text-gray-900">
                  {error.rowIndex !== null ? `Row ${error.rowIndex}` : 'File Error'}
                </span>
                <span className="text-sm text-gray-600 truncate flex-1">
                  {error.message}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 bg-gray-50 border-t border-red-200">
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Error Type:</p>
                  <p className="text-gray-900">{error.type}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Message:</p>
                  <p className="text-gray-900">{error.message}</p>
                </div>
                {error.rowIndex !== null && (
                  <div>
                    <p className="text-gray-600 mb-1">Row Index:</p>
                    <p className="text-gray-900">{error.rowIndex}</p>
                  </div>
                )}
                {error.missingColumns && error.missingColumns.length > 0 && (
                  <div>
                    <p className="text-gray-600 mb-1">Missing Columns:</p>
                    <p className="text-gray-900">{error.missingColumns.join(', ')}</p>
                  </div>
                )}
                {error.extraColumns && error.extraColumns.length > 0 && (
                  <div>
                    <p className="text-gray-600 mb-1">Extra Columns:</p>
                    <p className="text-gray-900">{error.extraColumns.join(', ')}</p>
                  </div>
                )}
                {error.rawHeader && (
                  <div>
                    <p className="text-gray-600 mb-1">Raw Header:</p>
                    <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto text-gray-900">
                      {JSON.stringify(error.rawHeader)}
                    </pre>
                  </div>
                )}
                {error.duplicateValue && (
                  <div>
                    <p className="text-gray-600 mb-1">Duplicate Value:</p>
                    <p className="text-gray-900">{error.duplicateValue}</p>
                  </div>
                )}
                {error.columnName && (
                  <div>
                    <p className="text-gray-600 mb-1">Column Name:</p>
                    <p className="text-gray-900">{error.columnName}</p>
                  </div>
                )}
                {error.expectedColumns !== undefined && (
                  <div>
                    <p className="text-gray-600 mb-1">Expected Columns:</p>
                    <p className="text-gray-900">{error.expectedColumns}</p>
                  </div>
                )}
                {error.actualColumns !== undefined && (
                  <div>
                    <p className="text-gray-600 mb-1">Actual Columns:</p>
                    <p className="text-gray-900">{error.actualColumns}</p>
                  </div>
                )}
                {error.expectedType && (
                  <div>
                    <p className="text-gray-600 mb-1">Expected Type:</p>
                    <p className="text-gray-900">{error.expectedType}</p>
                  </div>
                )}
                {error.actualType && (
                  <div>
                    <p className="text-gray-600 mb-1">Actual Type:</p>
                    <p className="text-gray-900">{error.actualType}</p>
                  </div>
                )}
                {error.columnIndex !== undefined && (
                  <div>
                    <p className="text-gray-600 mb-1">Column Index:</p>
                    <p className="text-gray-900">{error.columnIndex}</p>
                  </div>
                )}
                {error.rawRow && (
                  <div>
                    <p className="text-gray-600 mb-1">Raw Row Data:</p>
                    <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto text-gray-900">
                      {error.rawRow}
                    </pre>
                  </div>
                )}
                {error.zodError && (
                  <div>
                    <p className="text-gray-600 mb-1">Validation Details:</p>
                    <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto text-gray-900">
                      {JSON.stringify(error.zodError, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}