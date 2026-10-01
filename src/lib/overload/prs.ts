import type { PrDoc } from "@/lib/schemas/stats";
import type { SetSnapshot } from "@/lib/schemas/session";
import { e1rm } from "./e1rm";

export type PrKind = "weight" | "reps" | "e1rm" | "volume";

export interface PrHit {
  kind: PrKind;
  /** New best value (kg, reps or kg·reps). */
  value: number;
  previous: number;
  /** For rep PRs: the weight they were done at. */
  atWeightKg?: number;
}

export interface PrResult {
  next: PrDoc;
  hits: PrHit[];
  /** Indexes (into the input sets) of sets that set a weight, rep or e1RM PR. */
  prSetIndexes: number[];
}

/** Keep the rep-record table bounded (heaviest weights win). */
export const MAX_REP_RECORDS = 40;

const key = (kg: number) => String(Math.round(kg * 100) / 100);

/**
 * Detect personal records for one exercise in one session (warm-ups excluded):
 * heaviest weight, most reps at a given weight, best estimated 1RM, and best session volume.
 * The first session ever only establishes a baseline — no PRs are celebrated.
 */
export function detectPrs(
  previous: PrDoc | null,
  sets: readonly SetSnapshot[],
  date: string,
  now: number,
): PrResult {
  const work = sets
    .map((s, index) => ({ ...s, index }))
    .filter((s) => s.type !== "warmup" && s.reps > 0);

  const prev: PrDoc = previous ?? {
    bestWeight: 0,
    bestReps: 0,
    bestE1RM: 0,
    bestVolume: 0,
    repsAtWeight: {},
    dates: {},
    updatedAt: now,
  };
  const celebrate = previous !== null;
  const next: PrDoc = {
    ...prev,
    repsAtWeight: { ...prev.repsAtWeight },
    dates: { ...prev.dates },
    updatedAt: now,
  };
  const hits: PrHit[] = [];
  const prSets = new Set<number>();
  if (work.length === 0) return { next: prev, hits, prSetIndexes: [] };

  // Heaviest weight (ties → more reps).
  const heaviest = work.reduce((a, b) =>
    b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a,
  );
  if (heaviest.weightKg > prev.bestWeight) {
    if (celebrate && prev.bestWeight > 0)
      hits.push({ kind: "weight", value: heaviest.weightKg, previous: prev.bestWeight });
    if (celebrate && prev.bestWeight > 0) prSets.add(heaviest.index);
    next.bestWeight = heaviest.weightKg;
    next.bestReps = heaviest.reps;
    next.dates.weight = date;
  } else if (heaviest.weightKg === prev.bestWeight && heaviest.reps > prev.bestReps) {
    next.bestReps = heaviest.reps;
  }

  // Most reps at a given weight (only counts if that weight was done before).
  const bestRepsHere = new Map<string, (typeof work)[number]>();
  for (const s of work) {
    const k = key(s.weightKg);
    const cur = bestRepsHere.get(k);
    if (!cur || s.reps > cur.reps) bestRepsHere.set(k, s);
  }
  for (const [k, s] of bestRepsHere) {
    const before = prev.repsAtWeight[k];
    if (before !== undefined && s.reps > before && celebrate) {
      hits.push({ kind: "reps", value: s.reps, previous: before, atWeightKg: s.weightKg });
      prSets.add(s.index);
      next.dates.reps = date;
    }
    if (before === undefined || s.reps > before) next.repsAtWeight[k] = s.reps;
  }
  const keys = Object.keys(next.repsAtWeight)
    .map(Number)
    .sort((a, b) => b - a);
  for (const k of keys.slice(MAX_REP_RECORDS)) delete next.repsAtWeight[key(k)];

  // Estimated 1RM.
  const bestSet = work.reduce((a, b) =>
    e1rm(b.weightKg, b.reps) > e1rm(a.weightKg, a.reps) ? b : a,
  );
  const bestE = e1rm(bestSet.weightKg, bestSet.reps);
  if (bestE > prev.bestE1RM) {
    if (celebrate && prev.bestE1RM > 0) {
      hits.push({ kind: "e1rm", value: bestE, previous: prev.bestE1RM });
      prSets.add(bestSet.index);
    }
    next.bestE1RM = bestE;
    next.dates.e1rm = date;
  }

  // Session volume.
  const volume = Math.round(work.reduce((sum, s) => sum + s.weightKg * s.reps, 0) * 10) / 10;
  if (volume > prev.bestVolume) {
    if (celebrate && prev.bestVolume > 0)
      hits.push({ kind: "volume", value: volume, previous: prev.bestVolume });
    next.bestVolume = volume;
    next.dates.volume = date;
  }

  return { next, hits, prSetIndexes: [...prSets].sort((a, b) => a - b) };
}

export const PR_LABELS: Record<PrKind, string> = {
  weight: "Heaviest weight",
  reps: "Most reps",
  e1rm: "Best est. 1RM",
  volume: "Best volume",
};

export function describePr(hit: PrHit): string {
  switch (hit.kind) {
    case "weight":
      return `${hit.value} kg (was ${hit.previous} kg)`;
    case "reps":
      return `${hit.value} reps at ${hit.atWeightKg} kg (was ${hit.previous})`;
    case "e1rm":
      return `${hit.value} kg e1RM (was ${hit.previous} kg)`;
    case "volume":
      return `${hit.value.toLocaleString()} kg (was ${hit.previous.toLocaleString()} kg)`;
  }
}
