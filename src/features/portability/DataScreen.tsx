"use client";

import { AlertTriangle, Download, FileUp, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card, CardTitle, PageHeader } from "@/components/ui/Page";
import { useAuthStore } from "@/features/auth/store";
import { useExercisesStore } from "@/features/exercises/store";
import { useOnline } from "@/features/pwa/useOnline";
import type { RowError } from "@/lib/csv/csv";
import { planWorkoutImport } from "@/lib/csv/plan";
import {
  cardioToCsv,
  measurementsToCsv,
  parseCardioCsv,
  parseMeasurementsCsv,
} from "@/lib/csv/tracking";
import { parseWorkoutsCsv, workoutsToCsv, type ImportedSession } from "@/lib/csv/workouts";
import {
  commitDocImport,
  commitWorkoutImport,
  existingIds,
  fetchAllCardio,
  fetchAllMeasurements,
  fetchAllWorkouts,
  getExistingAggregates,
} from "@/lib/data/portability";
import { errorMessage, reportError } from "@/lib/monitoring";
import type { CardioDoc, MeasurementDoc } from "@/lib/schemas/tracking";
import { toast } from "@/lib/toast";
import { TEMPLATES, downloadText, exportName } from "./download";

type Kind = "workouts" | "cardio" | "body";
const KINDS: Array<{ id: Kind; label: string }> = [
  { id: "workouts", label: "Workouts" },
  { id: "cardio", label: "Cardio" },
  { id: "body", label: "Body" },
];

type Preview =
  | {
      kind: "workouts";
      file: string;
      rowCount: number;
      errors: RowError[];
      fresh: ImportedSession[];
      duplicates: number;
      setCount: number;
    }
  | {
      kind: "cardio" | "body";
      file: string;
      rowCount: number;
      errors: RowError[];
      fresh: Array<{ id: string; data: CardioDoc | MeasurementDoc }>;
      duplicates: number;
    };

export function DataScreen() {
  return (
    <>
      <PageHeader eyebrow="Your data" title="Import & export" />
      <div className="flex flex-col gap-4">
        <ExportCard />
        <ImportCard />
      </div>
    </>
  );
}

function ExportCard() {
  const uid = useAuthStore((s) => s.user?.uid);
  const byId = useExercisesStore((s) => s.byId);
  const online = useOnline();
  const [busy, setBusy] = useState<string | null>(null);
  // Exercise names come from the library — export once it has loaded.
  const libraryReady = useExercisesStore((s) => s.status === "ready" && s.exercises.length > 0);

  async function run(kinds: Kind[]) {
    if (!uid || !libraryReady) return;
    try {
      for (const kind of kinds) {
        if (kind === "workouts") {
          setBusy("Reading workouts…");
          const { sessions, setsBySession } = await fetchAllWorkouts(uid, setBusy);
          downloadText(
            exportName("workouts"),
            workoutsToCsv(sessions, setsBySession, (id) => byId.get(id)?.name ?? id),
          );
        } else if (kind === "cardio") {
          setBusy("Reading cardio…");
          downloadText(exportName("cardio"), cardioToCsv(await fetchAllCardio(uid)));
        } else {
          setBusy("Reading measurements…");
          downloadText(exportName("body"), measurementsToCsv(await fetchAllMeasurements(uid)));
        }
      }
      toast.success(kinds.length > 1 ? "Exported 3 files." : "Export ready.");
    } catch (error) {
      reportError(error, { where: "export" });
      toast.error(`Export failed: ${errorMessage(error)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="mb-0">Export (CSV)</CardTitle>
      <p className="text-sm text-muted">
        Everything you&apos;ve logged: every workout set, cardio entry and measurement. Opens in any
        spreadsheet app.
        {!online ? " You're offline — the export will include what's on this device." : ""}
      </p>
      <Button
        size="lg"
        icon={<Download aria-hidden />}
        disabled={busy !== null || !libraryReady}
        onClick={() => void run(["workouts", "cardio", "body"])}
      >
        {busy ?? (libraryReady ? "Export everything" : "Loading exercise library…")}
      </Button>
      <div className="grid grid-cols-3 gap-2">
        {KINDS.map((k) => (
          <Button
            key={k.id}
            aria-label={`Export ${k.label.toLowerCase()}`}
            variant="secondary"
            disabled={busy !== null || !libraryReady}
            onClick={() => void run([k.id])}
          >
            {k.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}

function ImportCard() {
  const uid = useAuthStore((s) => s.user?.uid);
  const exercises = useExercisesStore((s) => s.exercises);
  // Exercise names are matched against the library — wait until it has loaded.
  const libraryReady = useExercisesStore((s) => s.status === "ready" && s.exercises.length > 0);
  const online = useOnline();
  const [kind, setKind] = useState<Kind>("workouts");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const blocked = !online || checking || !libraryReady;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uid) return;
    if (!libraryReady)
      return toast.error("The exercise library is still loading — try again in a moment.");
    if (file.size > 5_000_000)
      return toast.error("That file is over 5 MB — split it into smaller files.");
    setChecking(true);
    setPreview(null);
    try {
      const text = await file.text();
      const now = Date.now();
      if (kind === "workouts") {
        const parsed = parseWorkoutsCsv(
          text,
          exercises.map((x) => ({ id: x.id, name: x.name })),
        );
        const existing = await existingIds(
          uid,
          "sessions",
          parsed.sessions.map((s) => s.id),
        );
        const fresh = parsed.sessions.filter((s) => !existing.has(s.id));
        setPreview({
          kind,
          file: file.name,
          rowCount: parsed.rowCount,
          errors: parsed.errors,
          fresh,
          duplicates: parsed.sessions.length - fresh.length,
          setCount: fresh.reduce((n, s) => n + s.sets.length, 0),
        });
      } else {
        const parsed =
          kind === "cardio" ? parseCardioCsv(text, now) : parseMeasurementsCsv(text, now);
        const sub = kind === "cardio" ? "cardio" : "measurements";
        const existing = await existingIds(
          uid,
          sub,
          parsed.entries.map((x) => x.id),
        );
        const fresh = parsed.entries.filter((x) => !existing.has(x.id));
        setPreview({
          kind,
          file: file.name,
          rowCount: parsed.rowCount,
          errors: parsed.errors,
          fresh,
          duplicates: parsed.entries.length - fresh.length,
        });
      }
    } catch (error) {
      reportError(error, { where: "import/preview" });
      toast.error(`Couldn't read that file: ${errorMessage(error)}`);
    } finally {
      setChecking(false);
    }
  }

  async function runImport() {
    if (!uid || !preview || preview.fresh.length === 0) return;
    const report = (done: number, total: number) => setProgress(`Writing… ${done}/${total}`);
    setProgress("Preparing…");
    try {
      if (preview.kind === "workouts") {
        const sessions = preview.fresh;
        const exerciseIds = [...new Set(sessions.flatMap((s) => s.sets.map((x) => x.exerciseId)))];
        const existing = await getExistingAggregates(uid, exerciseIds);
        const byId = new Map(exercises.map((x) => [x.id, x]));
        const plan = planWorkoutImport(
          sessions,
          existing.lastSets,
          existing.prs,
          (id) => {
            const e = byId.get(id);
            return e ? { muscle: e.muscle, secondary: e.secondary } : undefined;
          },
          Date.now(),
        );
        await commitWorkoutImport(uid, plan, report);
        toast.success(`Imported ${sessions.length} workout${sessions.length === 1 ? "" : "s"}.`);
      } else {
        await commitDocImport(
          uid,
          preview.kind === "cardio" ? "cardio" : "measurements",
          preview.fresh,
          report,
        );
        toast.success(
          `Imported ${preview.fresh.length} entr${preview.fresh.length === 1 ? "y" : "ies"}.`,
        );
      }
      setPreview(null);
    } catch (error) {
      reportError(error, { where: "import/commit" });
      toast.error(
        `Import failed part-way: ${errorMessage(error)}. Re-run it — finished parts are skipped.`,
      );
    } finally {
      setProgress(null);
    }
  }

  const unit = preview?.kind === "workouts" ? "workout" : "entr";
  const plural = (n: number) =>
    unit === "entr" ? (n === 1 ? "entry" : "entries") : n === 1 ? "workout" : "workouts";

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="mb-0">Import old logs (CSV)</CardTitle>
      <div className="flex gap-2" role="group" aria-label="What to import">
        {KINDS.map((k) => (
          <Chip
            key={k.id}
            selected={kind === k.id}
            onClick={() => {
              setKind(k.id);
              setPreview(null);
            }}
          >
            {k.label}
          </Chip>
        ))}
      </div>
      <p className="text-sm text-muted">
        Columns are matched by name (exports from apps like Strong work). Weights must be in kg;
        exercises must exist in the library. Nothing is written until you confirm the preview.{" "}
        <button
          type="button"
          className="font-semibold text-accent underline underline-offset-4"
          onClick={() => downloadText(`mk-workout-${kind}-template.csv`, TEMPLATES[kind])}
        >
          Download a template
        </button>
      </p>

      <label
        className={
          "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong px-4 font-semibold transition-colors hover:bg-surface-2 " +
          (blocked ? "pointer-events-none opacity-50" : "")
        }
      >
        <FileUp aria-hidden className="size-5 text-accent" />
        {checking
          ? "Checking file…"
          : !online
            ? "Connect to import"
            : !libraryReady
              ? "Loading exercise library…"
              : "Choose a CSV file"}
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={blocked}
          onChange={(e) => void onFile(e)}
        />
      </label>

      {preview ? (
        <section
          aria-label="Import preview"
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3"
        >
          <p className="eyebrow">Preview · {preview.file}</p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <PreviewStat label="Rows" value={preview.rowCount} />
            <PreviewStat label={`New ${plural(2)}`} value={preview.fresh.length} />
            <PreviewStat label="Skipped rows" value={preview.errors.length} />
          </dl>
          {preview.kind === "workouts" && preview.fresh.length > 0 ? (
            <p className="text-sm">
              {preview.setCount} sets from {preview.fresh[0]!.date} to {preview.fresh.at(-1)!.date}.
            </p>
          ) : null}
          {preview.duplicates > 0 ? (
            <p className="text-sm text-muted">
              {preview.duplicates} {plural(preview.duplicates)} already imported — they&apos;ll be
              skipped.
            </p>
          ) : null}
          {preview.errors.length > 0 ? (
            <details open={preview.fresh.length === 0}>
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-warning">
                <AlertTriangle aria-hidden className="size-4" /> {preview.errors.length} row
                {preview.errors.length === 1 ? "" : "s"} can&apos;t be imported
              </summary>
              <ul className="mt-1 max-h-48 overflow-auto text-sm">
                {preview.errors.slice(0, 50).map((e, i) => (
                  <li key={i} className="border-t border-border py-1">
                    {e.line > 0 ? (
                      <span className="tabular font-semibold">Line {e.line}: </span>
                    ) : null}
                    {e.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <Button
            size="lg"
            icon={<Upload aria-hidden />}
            disabled={preview.fresh.length === 0 || progress !== null || !online}
            onClick={() => void runImport()}
          >
            {progress ??
              (preview.fresh.length === 0
                ? "Nothing new to import"
                : `Import ${preview.fresh.length} ${plural(preview.fresh.length)}`)}
          </Button>
        </section>
      ) : null}
    </Card>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface p-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular font-display text-2xl font-semibold">{value}</dd>
    </div>
  );
}
