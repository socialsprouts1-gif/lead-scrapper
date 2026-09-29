/**
 * A small CSV writer for the admin's export buttons.
 *
 * Values are always quoted and inner quotes doubled, which is the whole of the
 * escaping rule. A leading =, +, - or @ is prefixed with a single quote so that
 * a spreadsheet treats the cell as text rather than a formula.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (value: string | number | null | undefined) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [headers.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))].join("\r\n");
}

/** A CSV response the browser saves rather than shows. */
export function csvResponse(filename: string, body: string) {
  // The BOM makes Excel open UTF-8 rupee signs and names correctly.
  return new Response(`﻿${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
