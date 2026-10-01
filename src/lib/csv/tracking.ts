import { CARDIO_INTENSITIES } from "@/lib/schemas/common";
import {
  cardioDocSchema,
  measurementDocSchema,
  type CardioDoc,
  type CardioEntry,
  type Measurement,
  type MeasurementDoc,
} from "@/lib/schemas/tracking";
import { hashId, num, parseCsv, parseDate, parseDurationSec, toCsv, type RowError } from "./csv";

// ---------- cardio ----------

export const CARDIO_COLUMNS = [
  "date",
  "type",
  "duration_min",
  "distance_km",
  "avg_hr",
  "intensity",
  "session_id",
] as const;
export const CARDIO_ALIASES: Record<string, readonly string[]> = {
  date: [],
  type: ["activity", "exercise", "exercise name"],
  duration_min: ["duration", "minutes", "time"],
  distance_km: ["distance", "distance (km)", "km"],
  avg_hr: ["heart rate", "avg heart rate", "average heart rate", "hr"],
  intensity: [],
  session_id: [],
};

export function cardioToCsv(entries: readonly CardioEntry[]): string {
  return toCsv(
    [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        type: e.type,
        duration_min: e.durationMin,
        distance_km: e.distanceKm ?? null,
        avg_hr: e.avgHr ?? null,
        intensity: e.intensity ?? null,
        session_id: e.sessionId ?? null,
      })),
    CARDIO_COLUMNS,
  );
}

export interface DocImport<T> {
  entries: Array<{ id: string; data: T }>;
  errors: RowError[];
  rowCount: number;
}

export function parseCardioCsv(text: string, now: number): DocImport<CardioDoc> {
  const { records, columns, parseErrors } = parseCsv(text, CARDIO_ALIASES);
  const errors: RowError[] = [...parseErrors];
  for (const c of ["date", "type", "duration_min"]) {
    if (!columns.includes(c)) errors.push({ line: 1, message: `Missing required column "${c}".` });
  }
  if (errors.some((e) => e.line === 1)) return { entries: [], errors, rowCount: records.length };

  const entries: DocImport<CardioDoc>["entries"] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    const date = parseDate(r.date);
    if (!date)
      return errors.push({ line, message: `Invalid date "${r.date ?? ""}" — use YYYY-MM-DD.` });
    const durationSec = parseDurationSec(r.duration_min);
    const intensity = (r.intensity ?? "").toLowerCase();
    const result = cardioDocSchema.safeParse({
      date: date.date,
      type: r.type,
      durationMin: durationSec === null ? NaN : Math.round((durationSec / 60) * 10) / 10,
      distanceKm: num(r.distance_km),
      avgHr: num(r.avg_hr),
      intensity: intensity
        ? (CARDIO_INTENSITIES as readonly string[]).includes(intensity)
          ? intensity
          : "bad"
        : null,
      sessionId: null,
      createdAt: now,
    });
    if (!result.success) {
      const field = String(result.error.issues[0]?.path[0] ?? "row");
      return errors.push({
        line,
        message: `Invalid ${field} (${result.error.issues[0]?.message ?? ""}).`,
      });
    }
    entries.push({
      id: `imp-${hashId(`${date.date}|${r.type}|${r.duration_min}|${i}`)}`,
      data: result.data,
    });
  });
  return { entries, errors, rowCount: records.length };
}

// ---------- measurements ----------

const TAPE = ["chest", "waist", "hips", "arms", "thighs", "calves", "neck"] as const;

export const MEASUREMENT_COLUMNS = [
  "date",
  "weight_kg",
  "body_fat_pct",
  ...TAPE.map((t) => `${t}_cm`),
] as const;
export const MEASUREMENT_ALIASES: Record<string, readonly string[]> = {
  date: [],
  weight_kg: ["weight", "bodyweight", "body weight", "weight (kg)"],
  body_fat_pct: ["body fat", "body fat %", "bodyfat", "bf", "fat %"],
  ...Object.fromEntries(TAPE.map((t) => [`${t}_cm`, [t, `${t} (cm)`]])),
};

export function measurementsToCsv(list: readonly Measurement[]): string {
  return toCsv(
    [...list]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({
        date: m.date,
        weight_kg: m.weightKg ?? null,
        body_fat_pct: m.bodyFatPct ?? null,
        ...Object.fromEntries(TAPE.map((t) => [`${t}_cm`, m.tape?.[t] ?? null])),
      })),
    MEASUREMENT_COLUMNS,
  );
}

export function parseMeasurementsCsv(text: string, now: number): DocImport<MeasurementDoc> {
  const { records, columns, parseErrors } = parseCsv(text, MEASUREMENT_ALIASES);
  const errors: RowError[] = [...parseErrors];
  if (!columns.includes("date"))
    errors.push({ line: 1, message: 'Missing required column "date".' });
  if (errors.some((e) => e.line === 1)) return { entries: [], errors, rowCount: records.length };

  const entries: DocImport<MeasurementDoc>["entries"] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    const date = parseDate(r.date);
    if (!date)
      return errors.push({ line, message: `Invalid date "${r.date ?? ""}" — use YYYY-MM-DD.` });
    const tape = Object.fromEntries(TAPE.map((t) => [t, num(r[`${t}_cm`])]));
    const hasTape = Object.values(tape).some((v) => v !== null);
    const weightKg = num(r.weight_kg);
    const bodyFatPct = num(r.body_fat_pct);
    if (weightKg === null && bodyFatPct === null && !hasTape) {
      return errors.push({ line, message: "Row has no measurements." });
    }
    const result = measurementDocSchema.safeParse({
      date: date.date,
      weightKg,
      bodyFatPct,
      tape: hasTape ? tape : null,
      createdAt: now,
    });
    if (!result.success) {
      const field = String(result.error.issues[0]?.path.join(".") ?? "row");
      return errors.push({
        line,
        message: `Invalid ${field} (${result.error.issues[0]?.message ?? ""}).`,
      });
    }
    entries.push({
      id: `imp-${hashId(`${date.date}|${r.weight_kg}|${r.body_fat_pct}|${i}`)}`,
      data: result.data,
    });
  });
  return { entries, errors, rowCount: records.length };
}
