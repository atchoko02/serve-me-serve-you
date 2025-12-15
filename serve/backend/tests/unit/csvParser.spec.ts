import { test, expect } from "@playwright/test";
import { z } from "zod";
import {
  tokenizeCSV,
  parseCSV,
  CSVParserError,
} from "../../src/utils/csvParser";

// ---------------------------------------------------------
// USER STORY 1 — CSV Spec Compliance
// ---------------------------------------------------------
test.describe("CSV Tokenizer – RFC 4180 compliance", () => {
  test("handles quoted fields, commas, escaped quotes, and newlines", () => {
    const csv = `"Name","Notes","Age"
"John Doe","Likes cats, dogs, and ""turtles""",32
"Jane","Line one
Line two",56`;

    const rows = tokenizeCSV(csv);

    expect(rows.length).toBe(3);

    expect(rows[0]).toEqual(["Name", "Notes", "Age"]);
    expect(rows[1]).toEqual([
      "John Doe",
      'Likes cats, dogs, and "turtles"',
      "32",
    ]);
    expect(rows[2]).toEqual([
      "Jane",
      "Line one\nLine two",
      "56",
    ]);
  });
});

// ---------------------------------------------------------
// USER STORY 2 — Header Handling
// ---------------------------------------------------------
test.describe("Header behavior", () => {
  const csv = `A,B,C
1,2,3
4,5,6`;

  test("extracts header and does not treat it as a data row", () => {
    const gen = parseCSV(csv, { hasHeader: true }) as Generator<any, void, unknown>;

    const first = gen.next().value as any;
    expect("data" in first).toBe(true);
    expect(first.headers).toEqual(["A", "B", "C"]);
    expect(first.data).toEqual(["1", "2", "3"]);

    const second = gen.next().value as any;
    expect("data" in second).toBe(true);
    expect(second.headers).toEqual(["A", "B", "C"]);
    expect(second.data).toEqual(["4", "5", "6"]);
  });

  test("returns undefined as header when hasHeader = false", () => {
    const gen = parseCSV(csv, { hasHeader: false }) as Generator<any, void, unknown>;

    const first = gen.next().value as any;
    expect("data" in first).toBe(true);
    expect(first.headers).toBeUndefined();
    expect(first.data).toEqual(["A", "B", "C"]);
  });
});

// ---------------------------------------------------------
// USER STORY 3 — Generator Streaming
// ---------------------------------------------------------
test.describe("Streaming parser via generator", () => {
  test("yields rows one at a time instead of returning all at once", () => {
    const csv = `A,B
1,2
3,4`;
    const gen = parseCSV(csv, { hasHeader: true }) as Generator<any, void, unknown>;

    const outputs: any[] = [];
    for (const result of gen as any) {
      outputs.push(result);
    }

    const dataRows = outputs.filter((r) => "data" in r);

    expect(dataRows.length).toBe(2);
    expect(dataRows[0].data).toEqual(["1", "2"]);
    expect(dataRows[1].data).toEqual(["3", "4"]);
  });
});

// ---------------------------------------------------------
// USER STORY 4 — Structured Error Objects
// ---------------------------------------------------------
test.describe("Structured error objects", () => {
  test("returns structured errors when validation or consistency fails", () => {
    const csv = `A,B
foo,123
bar,NOT_A_NUMBER`;

    const schema = z.tuple([
      z.string(),
      z.preprocess(
        (val) => (typeof val === "string" ? Number(val) : val),
        z.number()
      ),
    ]);

    const gen = parseCSV(csv, { hasHeader: true, schema }) as Generator<any, void, unknown>;

    const results: any[] = [];
    for (const r of gen as any) {
      results.push(r);
    }

    const dataRows = results.filter((r: any) => "data" in r);
    const errors = results
      .filter((r: any) => "error" in r)
      .map((r: any) => r.error as CSVParserError);

    expect(dataRows.length).toBeGreaterThanOrEqual(1);
    expect(dataRows[0].data).toEqual(["foo", 123]);

    const rowError = errors.find(
      (e) => e.type === "RowError" && e.rowIndex === 2
    );
    expect(rowError).toBeTruthy();
    expect(rowError?.rawRow).toContain("NOT_A_NUMBER");

    const typeError = errors.find(
      (e) => e.type === "TypeConsistencyError" && e.rowIndex === 2
    );
    expect(typeError).toBeTruthy();
  });
});

// ---------------------------------------------------------
// USER STORY 5 — Zod Integration (brand + refine + multiple schemas)
// ---------------------------------------------------------
test.describe("Zod schema integration", () => {
  const baseSchema = z.tuple([z.string(), z.string()]);
  const brandedSchema = baseSchema.brand("TestBrand");

  const refinedSchema1 = baseSchema.refine(
    ([a, b]) => a.length > 0 && b.length > 0,
    "Both fields must be non-empty"
  );

  const refinedSchema2 = baseSchema.refine(
    ([a, b]) => a !== b,
    "Fields cannot be equal"
  );

  const validCSV = `A,B
x,y`;

  const invalidRowCSV = `A,B
value,value`;

  test("accepts base schema", () => {
    const gen = parseCSV(validCSV, {
      hasHeader: true,
      schema: baseSchema,
    }) as Generator<any, void, unknown>;

    const first = gen.next().value as any;
    expect("data" in first).toBe(true);
    expect(first.data).toEqual(["x", "y"]);
  });

  test("accepts branded schema", () => {
    const gen = parseCSV(validCSV, {
      hasHeader: true,
      schema: brandedSchema,
    }) as Generator<any, void, unknown>;

    const first = gen.next().value as any;
    expect("data" in first).toBe(true);
    expect(first.data).toEqual(["x", "y"]);
  });

  test("uses refined schema #1 (valid case)", () => {
    const gen = parseCSV(validCSV, {
      hasHeader: true,
      schema: refinedSchema1,
    }) as Generator<any, void, unknown>;

    const first = gen.next().value as any;
    expect("data" in first).toBe(true);
    expect(first.data).toEqual(["x", "y"]);
  });

  test("uses refined schema #2 (invalid case)", () => {
    const gen = parseCSV(invalidRowCSV, {
      hasHeader: true,
      schema: refinedSchema2,
    }) as Generator<any, void, unknown>;

    const first = gen.next().value as any;
    expect("error" in first).toBe(true);

    const err = first.error as CSVParserError;
    expect(err.type).toBe("RowError");
    expect(err.zodError).toBeTruthy();
  });
});
