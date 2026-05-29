// Lightweight CSV export utility.
// Triggers a browser download with proper escaping and a UTF-8 BOM.

export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
};

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const dataLines = rows.map((r) =>
    columns.map((c) => escapeCell(c.accessor(r))).join(",")
  );
  return [headerLine, ...dataLines].join("\r\n");
}

export function exportCsv<T>(
  filenameBase: string,
  rows: T[],
  columns: CsvColumn<T>[]
): void {
  const csv = buildCsv(rows, columns);
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
