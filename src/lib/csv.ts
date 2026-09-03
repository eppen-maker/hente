/** Minimal, spec-correct CSV writer (RFC 4180 quoting, UTF-8 BOM for Excel). */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[";\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(headers: string[], rows: (unknown[])[], delimiter = ";"): string {
  const lines = [headers.map(csvEscape).join(delimiter)];
  for (const row of rows) lines.push(row.map(csvEscape).join(delimiter));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvResponseHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}

/**
 * Small CSV reader for admin imports. Handles quoted fields, `;` or `,`
 * delimiters and a header row. Good enough for spreadsheets exported from
 * Excel or Google Sheets, which is what clubs actually send us.
 */
export function parseCsv(input: string): Record<string, string>[] {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
  if (!text) return [];

  const firstLine = text.split("\n")[0];
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  rows.push(row);

  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());

  return body
    .filter((line) => line.some((cell) => cell.trim() !== ""))
    .map((line) => Object.fromEntries(keys.map((key, index) => [key, (line[index] ?? "").trim()])));
}

/** Reads the first present key from a parsed CSV row (supports NO/EN headers). */
export function pick(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}
