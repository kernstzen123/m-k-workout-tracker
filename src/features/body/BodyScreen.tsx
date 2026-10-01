"use client";

import { Plus, Ruler, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { TrendChart } from "@/components/charts/TrendChart";
import { useChartColors } from "@/components/charts/useChartColors";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TextField } from "@/components/ui/Field";
import { EmptyState, PageHeader, Spinner, Stat } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { useAuthStore } from "@/features/auth/store";
import { formatDay } from "@/features/history/format";
import { addMeasurement, deleteMeasurement, subscribeMeasurements } from "@/lib/data/measurements";
import { toDayString } from "@/lib/dates";
import { reportError } from "@/lib/monitoring";
import { measurementDocSchema, type Measurement } from "@/lib/schemas/tracking";
import { movingAverage } from "@/lib/stats/trends";
import { toast } from "@/lib/toast";

const TAPE = ["chest", "waist", "hips", "arms", "thighs", "calves", "neck"] as const;
type TapeKey = (typeof TAPE)[number];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function BodyScreen() {
  const uid = useAuthStore((s) => s.user?.uid);
  const c = useChartColors();
  const [list, setList] = useState<Measurement[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Measurement | null>(null);
  const [tape, setTape] = useState<TapeKey>("waist");

  useEffect(() => {
    if (!uid) return;
    return subscribeMeasurements(uid, setList, (error) => {
      reportError(error, { where: "subscribeMeasurements" });
      setList([]);
    });
  }, [uid]);

  const weight = useMemo(
    () =>
      movingAverage(
        (list ?? [])
          .filter((m) => m.weightKg != null)
          .map((m) => ({ date: m.date, value: m.weightKg! })),
      ).map((p) => ({ ...p, label: formatDay(p.date, "d MMM") })),
    [list],
  );
  const bodyFat = useMemo(
    () =>
      (list ?? [])
        .filter((m) => m.bodyFatPct != null)
        .map((m) => ({ date: m.date, value: m.bodyFatPct!, label: formatDay(m.date, "d MMM") }))
        .reverse(),
    [list],
  );
  const tapeSeries = useMemo(
    () =>
      (list ?? [])
        .filter((m) => m.tape?.[tape] != null)
        .map((m) => ({ date: m.date, value: m.tape![tape]!, label: formatDay(m.date, "d MMM") }))
        .reverse(),
    [list, tape],
  );
  const latest = weight.at(-1);

  return (
    <>
      <PageHeader
        eyebrow="Measurements"
        title="Body"
        action={
          <IconButton label="Add measurement" variant="primary" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
          </IconButton>
        }
      />
      {list === null ? (
        <Spinner label="Loading measurements" />
      ) : list.length === 0 ? (
        <EmptyState icon={<Ruler aria-hidden />} title="No measurements yet">
          Add your bodyweight with the + button. Daily weigh-ins give the smoothest trend.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Latest" value={latest ? `${latest.value} kg` : "—"} />
            <Stat label="7-day avg" value={latest ? `${latest.avg} kg` : "—"} />
          </div>

          <ChartFrame
            title="Bodyweight"
            subtitle="Daily weigh-ins and the 7-day moving average"
            legend={[
              { label: "7-day average", color: c.series1, mark: "line" },
              { label: "Weigh-in", color: c.series2, mark: "dot" },
            ]}
            table={{
              caption: "Bodyweight",
              rows: weight,
              columns: [
                { label: "Date", value: (r) => formatDay(r.date) },
                { label: "Weight", value: (r) => `${r.value} kg`, numeric: true },
                { label: "7-day avg", value: (r) => `${r.avg} kg`, numeric: true },
              ],
            }}
          >
            {weight.length < 2 ? (
              <p className="py-8 text-center text-sm text-muted">
                Add another weigh-in to see the trend.
              </p>
            ) : (
              <TrendChart
                data={weight}
                series={[
                  {
                    key: "avg",
                    label: "7-day average",
                    color: "chart-1",
                    kind: "line",
                    format: (v) => `${v} kg`,
                  },
                  {
                    key: "value",
                    label: "Weigh-in",
                    color: "chart-2",
                    kind: "dots",
                    format: (v) => `${v} kg`,
                  },
                ]}
              />
            )}
          </ChartFrame>

          {bodyFat.length >= 2 ? (
            <ChartFrame
              title="Body fat"
              table={{
                caption: "Body fat",
                rows: bodyFat,
                columns: [
                  { label: "Date", value: (r) => formatDay(r.date) },
                  { label: "Body fat", value: (r) => `${r.value}%`, numeric: true },
                ],
              }}
            >
              <TrendChart
                data={bodyFat}
                series={[
                  {
                    key: "value",
                    label: "Body fat",
                    color: "chart-1",
                    kind: "line",
                    format: (v) => `${v}%`,
                  },
                ]}
              />
            </ChartFrame>
          ) : null}

          <ChartFrame
            title={`Tape · ${cap(tape)}`}
            subtitle={
              <div
                className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1"
                role="group"
                aria-label="Tape measure"
              >
                {TAPE.map((t) => (
                  <Chip key={t} selected={tape === t} onClick={() => setTape(t)}>
                    {cap(t)}
                  </Chip>
                ))}
              </div>
            }
            table={{
              caption: `${cap(tape)} measurements`,
              rows: tapeSeries,
              columns: [
                { label: "Date", value: (r) => formatDay(r.date) },
                { label: cap(tape), value: (r) => `${r.value} cm`, numeric: true },
              ],
            }}
          >
            {tapeSeries.length < 2 ? (
              <p className="py-8 text-center text-sm text-muted">
                Log {tape} twice to see a trend.
              </p>
            ) : (
              <TrendChart
                data={tapeSeries}
                series={[
                  {
                    key: "value",
                    label: cap(tape),
                    color: "chart-1",
                    kind: "line",
                    format: (v) => `${v} cm`,
                  },
                ]}
              />
            )}
          </ChartFrame>

          <section aria-labelledby="body-log">
            <h2 id="body-log" className="eyebrow mb-2">
              Entries
            </h2>
            <ul className="flex flex-col gap-2">
              {list.slice(0, 30).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface py-2 pr-1 pl-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{formatDay(m.date)}</p>
                    <p className="tabular truncate text-sm text-muted">
                      {[
                        m.weightKg != null ? `${m.weightKg} kg` : null,
                        m.bodyFatPct != null ? `${m.bodyFatPct}% fat` : null,
                        ...TAPE.filter((t) => m.tape?.[t] != null).map(
                          (t) => `${t} ${m.tape![t]} cm`,
                        ),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <IconButton
                    label={`Delete measurement from ${formatDay(m.date)}`}
                    onClick={() => setRemoving(m)}
                  >
                    <Trash2 aria-hidden className="size-5 text-danger" />
                  </IconButton>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add measurement">
        {adding ? <MeasurementForm onDone={() => setAdding(false)} /> : null}
      </Sheet>
      <ConfirmDialog
        open={removing !== null}
        title="Delete measurement?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (uid && removing) deleteMeasurement(uid, removing.id);
          setRemoving(null);
        }}
      >
        Delete the entry from {removing ? formatDay(removing.date) : ""}?
      </ConfirmDialog>
    </>
  );
}

function MeasurementForm({ onDone }: { onDone: () => void }) {
  const uid = useAuthStore((s) => s.user?.uid);
  const [date, setDate] = useState(toDayString());
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [tape, setTape] = useState<Record<TapeKey, string>>(
    Object.fromEntries(TAPE.map((t) => [t, ""])) as Record<TapeKey, string>,
  );
  const [error, setError] = useState<string>();
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;
    const tapeValues = Object.fromEntries(TAPE.map((t) => [t, num(tape[t])]));
    const hasTape = Object.values(tapeValues).some((v) => v !== null);
    const result = measurementDocSchema.safeParse({
      date,
      weightKg: num(weight),
      bodyFatPct: num(fat),
      tape: hasTape ? tapeValues : null,
      createdAt: Date.now(),
    });
    if (!result.success) return setError("Check the values — numbers only (kg, %, cm).");
    if (result.data.weightKg == null && result.data.bodyFatPct == null && !hasTape) {
      return setError("Enter at least one measurement.");
    }
    addMeasurement(uid, result.data);
    toast.success("Measurement saved.");
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Date"
          type="date"
          value={date}
          max={toDayString()}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextField
          label="Bodyweight (kg)"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <TextField
          label="Body fat (%)"
          inputMode="decimal"
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          hint="Optional"
        />
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer content-center font-semibold text-accent">
          Tape measurements (cm)
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {TAPE.map((t) => (
            <TextField
              key={t}
              label={cap(t)}
              inputMode="decimal"
              value={tape[t]}
              onChange={(e) => setTape({ ...tape, [t]: e.target.value })}
            />
          ))}
        </div>
      </details>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {/* EXTENSION POINT: progress photos — add a photo picker here once a storage backend exists. */}
      <Button type="submit" size="lg" block>
        Save
      </Button>
    </form>
  );
}
