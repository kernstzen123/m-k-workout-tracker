"use client";

import { Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { useExercisesStore } from "@/features/exercises/store";
import { PR_LABELS, describePr } from "@/lib/overload/prs";
import { buildFinish, type FinishInput } from "@/lib/workout/session";
import { useWorkoutStore } from "./store";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { Session, WorkoutSet } from "@/lib/schemas/session";
import type { CardioEntry } from "@/lib/schemas/tracking";
import { formatClock } from "@/lib/timer";
import { totalVolume } from "@/lib/workout/summary";

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

export function FinishSheet({
  open,
  session,
  sets,
  cardio,
  exerciseInfo,
  onClose,
  onFinish,
  onDiscard,
}: {
  open: boolean;
  session: Session;
  sets: WorkoutSet[];
  cardio: CardioEntry[];
  exerciseInfo: FinishInput["exerciseInfo"];
  onClose: () => void;
  onFinish: (notes: string) => void;
  onDiscard: () => void;
}) {
  const [notes, setNotes] = useState(session.notes);
  // Snapshot "now" when the sheet opens so the numbers don't jitter while typing notes.
  const [openedAt] = useState(() => Date.now());
  const durationSec = Math.max(0, Math.round((openedAt - session.startedAt) / 1000));
  const working = sets.filter((s) => s.type !== "warmup");
  const exerciseCount = new Set(sets.map((s) => s.exerciseId)).size;
  const restTimes = sets.map((s) => s.restSec).filter((r): r is number => typeof r === "number");
  const avgRest = restTimes.length ? restTimes.reduce((a, b) => a + b, 0) / restTimes.length : null;
  const cardioMin = cardio.reduce((sum, c) => sum + c.durationMin, 0);
  const empty = sets.length === 0 && cardio.length === 0;
  const lastSets = useWorkoutStore((s) => s.lastSets);
  const prs = useWorkoutStore((s) => s.prs);
  const byId = useExercisesStore((s) => s.byId);
  const prHits = useMemo(() => {
    const { id, ...doc } = session;
    return buildFinish({
      sessionId: id,
      session: doc,
      sets,
      previousLastSets: lastSets,
      previousPrs: prs,
      exerciseInfo,
      notes: "",
      now: openedAt,
    }).prHits;
  }, [session, sets, lastSets, prs, exerciseInfo, openedAt]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Finish workout"
      footer={
        empty ? (
          <Button variant="danger" block onClick={onDiscard}>
            Discard empty workout
          </Button>
        ) : (
          <Button size="lg" block onClick={() => onFinish(notes)}>
            Save workout
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <p className="eyebrow">{session.dayName ?? "Workout"}</p>
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Duration" value={formatDuration(durationSec)} />
          <Stat label="Volume" value={`${totalVolume(sets).toLocaleString()} kg`} />
          <Stat label="Working sets" value={String(working.length)} />
          <Stat label="Exercises" value={String(exerciseCount)} />
          {avgRest !== null ? <Stat label="Avg rest" value={formatClock(avgRest)} /> : null}
          {cardioMin > 0 ? <Stat label="Cardio" value={`${cardioMin} min`} /> : null}
        </dl>

        {prHits.length > 0 ? (
          <section
            aria-labelledby="prs-heading"
            className="rounded-2xl border border-warning/50 bg-warning/10 p-3"
          >
            <h3 id="prs-heading" className="eyebrow mb-2 flex items-center gap-2 text-warning">
              <Trophy aria-hidden className="size-4" /> {prHits.length} personal record
              {prHits.length === 1 ? "" : "s"}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {prHits.map(({ exerciseId, hit }, i) => (
                <li key={`${exerciseId}-${hit.kind}-${i}`} className="text-sm">
                  <span className="font-semibold">{byId.get(exerciseId)?.name ?? exerciseId}</span>
                  {" · "}
                  {PR_LABELS[hit.kind]}: <span className="tabular">{describePr(hit)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {empty ? (
          <p className="text-muted">Nothing was logged in this workout.</p>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-muted">Session note</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="How did it feel?"
              className="rounded-xl border border-border-strong bg-surface-2 p-3 text-base transition-colors placeholder:text-muted focus-visible:border-accent"
            />
          </label>
        )}
      </div>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <dt className="eyebrow">{label}</dt>
      <dd className="tabular font-display text-2xl font-semibold">{value}</dd>
    </div>
  );
}
