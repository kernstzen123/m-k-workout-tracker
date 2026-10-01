"use client";

import { HeartPulse, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { WeeklyBars } from "@/components/charts/WeeklyBars";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { EmptyState, PageHeader, Spinner, Stat } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { useAuthStore } from "@/features/auth/store";
import { useExercisesStore } from "@/features/exercises/store";
import { formatDay } from "@/features/history/format";
import { addCardio, deleteCardio, subscribeRecentCardio } from "@/lib/data/cardio";
import { toDayString } from "@/lib/dates";
import { reportError } from "@/lib/monitoring";
import { CARDIO_INTENSITIES } from "@/lib/schemas/common";
import { cardioDocSchema, type CardioEntry } from "@/lib/schemas/tracking";
import { weeklyCardioTotals } from "@/lib/stats/trends";
import { toast } from "@/lib/toast";

const WEEKS = 8;

export function CardioScreen() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [entries, setEntries] = useState<CardioEntry[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<CardioEntry | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return subscribeRecentCardio(uid, 200, setEntries, (error) => {
      reportError(error, { where: "subscribeRecentCardio" });
      setEntries([]);
    });
  }, [uid]);

  const weeks = useMemo(() => weeklyCardioTotals(entries ?? [], WEEKS), [entries]);
  const thisWeek = weeks.at(-1);

  return (
    <>
      <PageHeader
        eyebrow="Conditioning"
        title="Cardio"
        action={
          <IconButton label="Log cardio" variant="primary" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
          </IconButton>
        }
      />
      {entries === null ? (
        <Spinner label="Loading cardio" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="This week" value={`${thisWeek?.minutes ?? 0} min`} />
            <Stat label="Distance" value={`${thisWeek?.distanceKm ?? 0} km`} />
          </div>
          <ChartFrame
            title="Minutes per week"
            subtitle={`Last ${WEEKS} weeks`}
            table={{
              caption: "Cardio minutes per week",
              rows: weeks,
              columns: [
                { label: "Week of", value: (r) => r.label },
                { label: "Minutes", value: (r) => r.minutes, numeric: true },
                { label: "km", value: (r) => r.distanceKm, numeric: true },
              ],
            }}
          >
            <WeeklyBars
              data={weeks}
              dataKey="minutes"
              seriesLabel="Minutes"
              format={(v) => `${v} min`}
            />
          </ChartFrame>

          {entries.length === 0 ? (
            <EmptyState icon={<HeartPulse aria-hidden />} title="No cardio yet">
              Log a session with the + button, or tick the finisher in a workout.
            </EmptyState>
          ) : (
            <section aria-labelledby="cardio-log">
              <h2 id="cardio-log" className="eyebrow mb-2">
                Log
              </h2>
              <ul className="flex flex-col gap-2">
                {(showAll ? entries : entries.slice(0, 20)).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface py-2 pr-1 pl-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{e.type}</p>
                      <p className="tabular text-sm text-muted">
                        {formatDay(e.date)} · {e.durationMin} min
                        {e.distanceKm ? ` · ${e.distanceKm} km` : ""}
                        {e.avgHr ? ` · ${e.avgHr} bpm` : ""}
                        {e.intensity ? ` · ${e.intensity}` : ""}
                        {e.sessionId ? " · with workout" : ""}
                      </p>
                    </div>
                    <IconButton
                      label={`Delete ${e.type} on ${formatDay(e.date)}`}
                      onClick={() => setRemoving(e)}
                    >
                      <Trash2 aria-hidden className="size-5 text-danger" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              {!showAll && entries.length > 20 ? (
                <Button variant="ghost" block onClick={() => setShowAll(true)}>
                  Show all {entries.length}
                </Button>
              ) : null}
            </section>
          )}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Log cardio">
        {adding ? <CardioForm onDone={() => setAdding(false)} /> : null}
      </Sheet>

      <ConfirmDialog
        open={removing !== null}
        title="Delete entry?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (uid && removing) deleteCardio(uid, removing.id);
          setRemoving(null);
        }}
      >
        Delete {removing?.type} ({removing?.durationMin} min) on{" "}
        {removing ? formatDay(removing.date) : ""}?
      </ConfirmDialog>
    </>
  );
}

function CardioForm({ onDone }: { onDone: () => void }) {
  const uid = useAuthStore((s) => s.user?.uid);
  const exercises = useExercisesStore((s) => s.exercises);
  const cardioTypes = useMemo(
    () => exercises.filter((e) => e.type === "cardio" && !e.archived).map((e) => e.name),
    [exercises],
  );
  const [v, setV] = useState({
    date: toDayString(),
    type: cardioTypes[0] ?? "Outdoor Walk",
    durationMin: "",
    distanceKm: "",
    avgHr: "",
    intensity: "low" as (typeof CARDIO_INTENSITIES)[number],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;
    const result = cardioDocSchema.safeParse({
      date: v.date,
      type: v.type,
      durationMin: num(v.durationMin) ?? NaN,
      distanceKm: num(v.distanceKm),
      avgHr: num(v.avgHr),
      intensity: v.intensity,
      sessionId: null,
      createdAt: Date.now(),
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] ??= "Check this value";
      setErrors(next);
      return;
    }
    addCardio(uid, result.data);
    toast.success("Cardio logged.");
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Date"
          type="date"
          value={v.date}
          max={toDayString()}
          onChange={(e) => setV({ ...v, date: e.target.value })}
          error={errors.date}
        />
        <SelectField
          label="Type"
          value={v.type}
          onChange={(e) => setV({ ...v, type: e.target.value })}
          options={cardioTypes.map((t) => ({ value: t, label: t }))}
        />
        <TextField
          label="Minutes"
          inputMode="decimal"
          value={v.durationMin}
          onChange={(e) => setV({ ...v, durationMin: e.target.value })}
          error={errors.durationMin}
        />
        <TextField
          label="Distance (km)"
          inputMode="decimal"
          value={v.distanceKm}
          onChange={(e) => setV({ ...v, distanceKm: e.target.value })}
          error={errors.distanceKm}
          hint="Optional"
        />
        <TextField
          label="Avg heart rate"
          inputMode="numeric"
          value={v.avgHr}
          onChange={(e) => setV({ ...v, avgHr: e.target.value })}
          error={errors.avgHr}
          hint="Optional, bpm"
        />
      </div>
      <fieldset>
        <legend className="eyebrow mb-2">Intensity</legend>
        <div className="flex gap-2">
          {CARDIO_INTENSITIES.map((i) => (
            <Chip key={i} selected={v.intensity === i} onClick={() => setV({ ...v, intensity: i })}>
              {i[0]!.toUpperCase() + i.slice(1)}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="lg" block>
        Save
      </Button>
    </form>
  );
}
