import React, { useState } from 'react';
import { Plus, Download, Send, Trash2, Edit2, GripVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface TableCell {
  id: string;
  value: string;
}

interface TableRow {
  id: string;
  cells: TableCell[];
}

interface CSVBuilderProps {
  onProcessData: (data: any) => void;
}

export function CSVBuilder({ onProcessData }: CSVBuilderProps) {
  const [columns, setColumns] = useState<string[]>(['Column 1', 'Column 2', 'Column 3']);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [editingColumn, setEditingColumn] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  const addRow = () => {
    const newRow: TableRow = {
      id: Date.now().toString(),
      cells: columns.map((_, index) => ({
        id: `${Date.now()}-${index}`,
        value: '',
      })),
    };
    setRows([...rows, newRow]);
  };

  const addColumn = () => {
    const newColumnName = `Column ${columns.length + 1}`;
    setColumns([...columns, newColumnName]);
    setRows(
      rows.map((row) => ({
        ...row,
        cells: [
          ...row.cells,
          { id: `${row.id}-${columns.length}`, value: '' },
        ],
      }))
    );
  };

  const deleteRow = (rowId: string) => {
    setRows(rows.filter((row) => row.id !== rowId));
  };

  const deleteColumn = (columnIndex: number) => {
    setColumns(columns.filter((_, index) => index !== columnIndex));
    setRows(
      rows.map((row) => ({
        ...row,
        cells: row.cells.filter((_, index) => index !== columnIndex),
      }))
    );
  };

  const updateCell = (rowId: string, cellIndex: number, value: string) => {
    setRows(
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              cells: row.cells.map((cell, index) =>
                index === cellIndex ? { ...cell, value } : cell
              ),
            }
          : row
      )
    );
  };

  const startEditingColumn = (index: number) => {
    setEditingColumn(index);
    setEditingColumnName(columns[index]);
  };

  const finishEditingColumn = () => {
    if (editingColumn !== null && editingColumnName.trim()) {
      const newColumns = [...columns];
      newColumns[editingColumn] = editingColumnName.trim();
      setColumns(newColumns);
    }
    setEditingColumn(null);
    setEditingColumnName('');
  };

  const saveAsCSV = () => {
    const csvContent = [
      columns.join(','), // headers
      ...rows.map((row) =>
        row.cells
          .map((cell) => {
            const value = cell.value || '';
            if (
              value.includes(',') ||
              value.includes('"') ||
              value.includes('\n')
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `product-data-${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  const useThisData = () => {
    toast.success('Sending data for processing...');
    const processedData = {
      headers: columns,
      data: rows.map((row) => row.cells.map((cell) => cell.value)),
      rows: rows.length,
      columns: columns.length,
    };
    onProcessData(processedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Create CSV Manually
        </CardTitle>
        <CardDescription>
          Build your product data table from scratch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              {/* Use asChild so the Button *is* the trigger element */}
              <TooltipTrigger asChild>
                <Button
                  onClick={addRow}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add a new product row</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={addColumn}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Column
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add a new attribute column</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="w-10 px-2 py-3"></th>
                  {columns.map((column, index) => (
                    <th key={index} className="px-4 py-3 text-left min-w-[150px]">
                      <div className="flex items-center gap-2">
                        {editingColumn === index ? (
                          <Input
                            value={editingColumnName}
                            onChange={(e) => setEditingColumnName(e.target.value)}
                            onBlur={finishEditingColumn}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') finishEditingColumn();
                              if (e.key === 'Escape') {
                                setEditingColumn(null);
                                setEditingColumnName('');
                              }
                            }}
                            autoFocus
                            className="h-8"
                          />
                        ) : (
                          <>
                            <span className="text-gray-900">{column}</span>
                            <button
                              onClick={() => startEditingColumn(index)}
                              className="text-gray-400 hover:text-gray-600"
                              type="button"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteColumn(index)}
                              className="text-gray-400 hover:text-red-600"
                              type="button"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-4 py-12 text-center"
                    >
                      <p className="text-gray-500">
                        Add product attributes such as price, rating, flavor,
                        category, etc.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-2 py-2">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="text-gray-400 hover:text-red-600"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                      {row.cells.map((cell, cellIndex) => (
                        <td key={cell.id} className="px-4 py-2">
                          <Input
                            value={cell.value}
                            onChange={(e) =>
                              updateCell(row.id, cellIndex, e.target.value)
                            }
                            placeholder={`Enter ${columns[cellIndex]}`}
                            className="h-9"
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={saveAsCSV} variant="outline" disabled={rows.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Save as CSV
          </Button>
          <Button onClick={useThisData} disabled={rows.length === 0}>
            <Send className="w-4 h-4 mr-2" />
            Use This Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
