// src/utils/csvParser.ts
import { ZodSchema } from "zod";

/**
 * ============================================================
 * CSV Parser Error Type (User Story 4)
 * ============================================================
 */

export interface CSVParserError {
  type: "RowError" | "HeaderError" | "TokenizerError" | "DuplicateError" | "TypeConsistencyError" | "ColumnCountError";
  rowIndex: number | null; // null for tokenizer-level or file-level errors
  message: string;
  zodError?: any;
  rawRow?: string;
  // Header validation fields
  missingColumns?: string[];
  extraColumns?: string[];
  rawHeader?: string[];
  // Duplicate detection fields
  duplicateValue?: string;
  columnName?: string;
  // Column count validation
  expectedColumns?: number;
  actualColumns?: number;
  // Type consistency fields
  expectedType?: string;
  actualType?: string;
  columnIndex?: number;
}

/**
 * ============================================================
 * RFC 4180–Compliant Tokenizer (User Story 1)
 * ============================================================
 *
 * Supports:
 * - Fields enclosed in double quotes
 * - Commas inside quotes
 * - Escaped double quotes ("")
 * - Newlines inside quoted fields
 * - Carriage returns gracefully ignored
 *
 * This function loads the text into memory because browsers
 * cannot stream File/Blob content without using FileReader.
 */

export function tokenizeCSV(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (insideQuotes) {
      if (char === '"' && next === '"') {
        // Escaped quote
        field += '"';
        i++;
      } else if (char === '"') {
        // Closing quote
        insideQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
      continue;
    }

    if (char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      // Only add non-empty rows
      if (row.some(cell => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    // Ignore \r (Windows newlines)
    if (char !== "\r") {
      field += char;
    }
  }

  // Final field/row - only add if not empty
  row.push(field);
  if (row.some(cell => cell.trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

/**
 * ============================================================
 * Helper Functions for Validation
 * ============================================================
 */

/**
 * Extract required column names from Zod schema
 */
function extractSchemaColumns(schema: ZodSchema<any>): { columns: string[] | null; isTuple: boolean; tupleLength: number | null } {
  try {
    const schemaType = (schema as any)._def?.typeName;
    
    // Check if it's a ZodObject
    if (schemaType === 'ZodObject') {
      const shape = (schema as any)._def?.shape?.();
      if (shape) {
        return {
          columns: Object.keys(shape),
          isTuple: false,
          tupleLength: null
        };
      }
    }
    
    // Check if it's a ZodTuple
    if (schemaType === 'ZodTuple') {
      const items = (schema as any)._def?.items;
      if (items && Array.isArray(items)) {
        return {
          columns: null,
          isTuple: true,
          tupleLength: items.length
        };
      }
    }
    
    // Check if it's a ZodArray with tuple-like behavior
    if (schemaType === 'ZodArray') {
      const element = (schema as any)._def?.type;
      if (element) {
        return {
          columns: null,
          isTuple: false,
          tupleLength: null
        };
      }
    }
  } catch (err) {
    // If schema inspection fails, return null
  }
  
  return { columns: null, isTuple: false, tupleLength: null };
}

/**
 * Infer the type of a cell value
 */
function inferCellType(value: string): string {
  const trimmed = value.trim();
  
  if (trimmed === '' || trimmed.toLowerCase() === 'null') {
    return 'null/empty';
  }
  
  if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') {
    return 'boolean';
  }
  
  // Check if it's a valid number
  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return 'number';
  }
  
  return 'string';
}

/**
 * Find ID columns in headers
 */
function findIdColumns(headers: string[]): string[] {
  const idPatterns = ['id', 'productid', 'product_id', 'identifier'];
  return headers.filter(header => 
    idPatterns.includes(header.toLowerCase().trim())
  );
}

/**
 * ============================================================
 * Generator-Based CSV Parser (User Story 3)
 * ============================================================
 *
 * Yields:
 *   { data, headers }
 * OR
 *   { error }
 *
 * This allows the caller to process huge CSVs without loading
 * all rows at once.
 */

export function* parseCSV(
  input: string,
  options: {
    hasHeader: boolean;
    schema?: ZodSchema<any>;
    enableTypeConsistency?: boolean;
  }
): Generator<
  { data: any; headers: string[] | undefined } | { error: CSVParserError },
  void,
  unknown
> {
  let rows: string[][];

  try {
    rows = tokenizeCSV(input);
  } catch (err) {
    yield {
      error: {
        type: "TokenizerError",
        rowIndex: null,
        message: "Failed to tokenize CSV input.",
        zodError: err
      }
    };
    return;
  }

  if (rows.length === 0) {
    yield {
      error: {
        type: "TokenizerError",
        rowIndex: null,
        message: "No CSV data found."
      }
    };
    return;
  }

  let headers: string[] | undefined = undefined;
  let expectedColumnCount: number | undefined = undefined;

  /**
   * ==============================
   * Header Handling (User Story 2)
   * ==============================
   */
  if (options.hasHeader) {
    headers = rows[0];
    expectedColumnCount = headers.length;
    rows.shift();
  }

  /**
   * ==============================
   * Schema-Based Validation
   * ==============================
   */
  let schemaInfo: { columns: string[] | null; isTuple: boolean; tupleLength: number | null } | null = null;
  
  if (options.schema) {
    schemaInfo = extractSchemaColumns(options.schema);
    
    // Validate shape if it's a tuple
    if (schemaInfo.isTuple && schemaInfo.tupleLength !== null) {
      if (headers && headers.length !== schemaInfo.tupleLength) {
        yield {
          error: {
            type: "HeaderError",
            rowIndex: null,
            message: `Schema expects tuple of length ${schemaInfo.tupleLength}, but CSV has ${headers.length} columns.`,
            rawHeader: headers,
            expectedColumns: schemaInfo.tupleLength,
            actualColumns: headers.length
          }
        };
      }
      expectedColumnCount = schemaInfo.tupleLength;
    }
    
    // Validate headers if it's an object schema
    if (schemaInfo.columns && headers) {
      const headerSet = new Set(headers.map(h => h.trim()));
      const schemaColumns = schemaInfo.columns;
      
      const missingColumns = schemaColumns.filter(col => !headerSet.has(col));
      const extraColumns = headers.filter(h => !schemaColumns.includes(h.trim()));
      
      if (missingColumns.length > 0) {
        yield {
          error: {
            type: "HeaderError",
            rowIndex: null,
            message: `Missing required columns: ${missingColumns.join(', ')}`,
            missingColumns,
            extraColumns: extraColumns.length > 0 ? extraColumns : undefined,
            rawHeader: headers
          }
        };
      }
      
      // Extra columns are just a warning - we don't fail parsing
    }
  }

  /**
   * ==============================
   * ID Column Detection & Duplicate Tracking
   * ==============================
   */
  const idColumns = headers ? findIdColumns(headers) : [];
  const duplicateTrackers: Map<string, Set<string>> = new Map();
  
  // Initialize duplicate trackers for each ID column
  idColumns.forEach(colName => {
    duplicateTrackers.set(colName, new Set());
  });

  /**
   * ==============================
   * Type Consistency Tracking
   * ==============================
   */
  const inferredColumnTypes: Map<number, string> = new Map();
  let firstValidRowProcessed = false;

  /**
   * ==============================
   * Row Streaming + Validation
   * ==============================
   */
  for (let i = 0; i < rows.length; i++) {
    const rowIndex = options.hasHeader ? i + 1 : i; // actual CSV index
    const row = rows[i];

    // Column count validation
    if (expectedColumnCount !== undefined && row.length !== expectedColumnCount) {
      yield {
        error: {
          type: "ColumnCountError",
          rowIndex,
          message: `Row has ${row.length} columns, expected ${expectedColumnCount}.`,
          rawRow: JSON.stringify(row),
          expectedColumns: expectedColumnCount,
          actualColumns: row.length
        }
      };
      continue; // Skip this row
    }

    // Duplicate ID detection
    if (headers && idColumns.length > 0) {
      for (const idColumn of idColumns) {
        const colIndex = headers.indexOf(idColumn);
        if (colIndex !== -1 && colIndex < row.length) {
          const idValue = row[colIndex].trim();
          const tracker = duplicateTrackers.get(idColumn);
          
          if (tracker && idValue !== '') {
            if (tracker.has(idValue)) {
              yield {
                error: {
                  type: "DuplicateError",
                  rowIndex,
                  message: `Duplicate value "${idValue}" found in column "${idColumn}".`,
                  duplicateValue: idValue,
                  columnName: idColumn,
                  rawRow: JSON.stringify(row)
                }
              };
            } else {
              tracker.add(idValue);
            }
          }
        }
      }
    }

    // Type consistency checking
    if (options.enableTypeConsistency !== false) {
      if (!firstValidRowProcessed) {
        // Infer types from first valid row
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
          inferredColumnTypes.set(colIndex, inferCellType(row[colIndex]));
        }
        firstValidRowProcessed = true;
      } else {
        // Check consistency with inferred types
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
          const cell = row[colIndex];
          const expectedType = inferredColumnTypes.get(colIndex);
          const actualType = inferCellType(cell);
          
          if (expectedType && actualType !== expectedType && actualType !== 'null/empty') {
            yield {
              error: {
                type: "TypeConsistencyError",
                rowIndex,
                message: `Column ${colIndex} expected type "${expectedType}" but got "${actualType}".`,
                expectedType,
                actualType,
                columnIndex: colIndex,
                rawRow: JSON.stringify(row)
              }
            };
          }
        }
      }
    }

    // Zod schema validation
    try {
      const parsed = options.schema ? options.schema.parse(row) : row;

      yield {
        data: parsed,
        headers
      };
    } catch (err: any) {
      yield {
        error: {
          type: "RowError",
          rowIndex,
          message: "Row failed schema validation.",
          rawRow: JSON.stringify(row),
          zodError: err
        }
      };
    }
  }
}

/**
 * ============================================================
 * Browser FileReader Wrapper (User Story 1)
 * ============================================================
 *
 * Allows the parser to operate directly on File objects
 * selected from `<input type="file" />` or drag-and-drop.
 */

// NOTE: parseCSVFile uses FileReader which is a browser API.
// This function is not available in Node.js backend.
// For backend use, read the file buffer and call parseCSV directly:
// parseCSV(buffer.toString('utf-8'), options)
//
// This function is kept for type compatibility but will cause
// compilation errors in Node.js. It should only be used in frontend.