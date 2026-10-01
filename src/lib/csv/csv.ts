import Papa from "papaparse";

export type CsvRecord = Record<string, string>;

export interface RowError {
  /** 1-based line number in the file (header is line 1). */
  line: number;
  message: string;
}

/** Lowercase, trim, collapse spaces/underscores/dashes: "Weight (kg)" → "weight (kg)", "set_type" → "set type". */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]+/g, " ");
}

/**
 * Parse CSV text into records keyed by canonical column names. `aliases` maps each canonical
 * name to the (normalized) header spellings accepted for it — so files exported by other apps
 * can be imported without editing. Unknown columns are ignored.
 */
export function parseCsv(
  text: string,
  aliases: Record<string, readonly string[]>,
): { records: CsvRecord[]; columns: string[]; parseErrors: RowError[] } {
  const lookup = new Map<string, string>();
  for (const [canonical, spellings] of Object.entries(aliases)) {
    lookup.set(normalizeHeader(canonical), canonical);
    for (const s of spellings) lookup.set(normalizeHeader(s), canonical);
  }
  const result = Papa.parse<CsvRecord>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => lookup.get(normalizeHeader(h)) ?? `?${h}`,
    transform: (v) => v.trim(),
  });
  const columns = (result.meta.fields ?? []).filter((f) => !f.startsWith("?"));
  return {
    records: result.data,
    columns,
    parseErrors: result.errors.map((e) => ({ line: (e.row ?? 0) + 2, message: e.message })),
  };
}

/** Records → CSV text (with a header row, CRLF line endings for spreadsheet apps). */
export function toCsv(
  rows: ReadonlyArray<Record<string, string | number | boolean | null | undefined>>,
  columns: readonly string[],
): string {
  return Papa.unparse(
    {
      fields: [...columns],
      data: rows.map((r) =>
        columns.map((c) => (r[c] === null || r[c] === undefined ? "" : String(r[c]))),
      ),
    },
    { newline: "\r\n" },
  );
}

/** Parse a number; "" → null; comma decimals accepted. NaN for garbage. */
export function num(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  return Number(value.replace(",", "."));
}

/** Accepts YYYY-MM-DD or YYYY/MM/DD, optionally followed by a time. */
export function parseDate(value: string | undefined): { date: string; time: string | null } | null {
  const m = value?.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { date, time: hh ? `${hh.padStart(2, "0")}:${mm}` : null };
}

/** Durations: "75" (minutes), "1h 5m", "1:05:00", "45m". Returns seconds or null. */
export function parseDurationSec(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(v)) return Math.round(Number(v) * 60);
  const hms = v.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (hms) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3] ?? 0);
  const parts = v.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?\s*(?:(\d+)\s*s)?/);
  if (parts && (parts[1] || parts[2] || parts[3])) {
    return Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
  }
  return null;
}

/** Small stable hash (FNV-1a) for deterministic import ids — re-importing a file is idempotent. */
export function hashId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}
