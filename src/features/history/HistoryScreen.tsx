"use client";

import { ChevronRight, History, Search, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, PageHeader, Spinner } from "@/components/ui/Page";
import { useAuthStore } from "@/features/auth/store";
import { ExercisePicker } from "@/features/exercises/ExercisePicker";
import { useExercisesStore } from "@/features/exercises/store";
import { useProgramStore } from "@/features/program/store";
import { listDoneSessions } from "@/lib/data/history";
import { EMPTY } from "@/lib/cn";
import { reportError } from "@/lib/monitoring";
import type { Session } from "@/lib/schemas/session";
import { filterSessions } from "@/lib/stats/history";
import { toast } from "@/lib/toast";
import { formatDay, formatDuration, formatKg } from "./format";

export function HistoryScreen() {
  const uid = useAuthStore((s) => s.user?.uid);
  const days = useProgramStore((s) => s.program?.days ?? EMPTY);
  const byId = useExercisesStore((s) => s.byId);
  const [dayId, setDayId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pages, setPages] = useState<{ sessions: Session[]; cursor: number | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // First page (re-fetched when the day filter changes; the old list stays until it arrives).
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    listDoneSessions(uid, { dayId })
      .then((page) => alive && setPages(page))
      .catch((error: unknown) => {
        reportError(error, { where: "listDoneSessions" });
        toast.error("Couldn't load your history.");
        if (alive) setPages({ sessions: [], cursor: null });
      });
    return () => {
      alive = false;
    };
  }, [uid, dayId]);

  function loadMore(after: number) {
    if (!uid) return;
    setLoadingMore(true);
    listDoneSessions(uid, { after, dayId })
      .then((page) =>
        setPages((prev) => ({
          sessions: [...(prev?.sessions ?? []), ...page.sessions],
          cursor: page.cursor,
        })),
      )
      .catch((error: unknown) => {
        reportError(error, { where: "listDoneSessions(more)" });
        toast.error("Couldn't load more workouts.");
      })
      .finally(() => setLoadingMore(false));
  }

  const visible = useMemo(
    () =>
      filterSessions(
        pages?.sessions ?? [],
        { query: deferredQuery, dayId: null, exerciseId },
        (id) => byId.get(id)?.name,
      ),
    [pages, deferredQuery, exerciseId, byId],
  );

  return (
    <>
      <PageHeader eyebrow="Your workouts" title="History">
        <label className="relative block">
          <span className="sr-only">Search history</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, days, exercises"
            className="min-h-12 w-full rounded-xl border border-border-strong bg-surface-2 pr-3 pl-10 text-base transition-colors placeholder:text-muted focus-visible:border-accent"
          />
        </label>
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          role="group"
          aria-label="Filter by day"
        >
          <Chip selected={dayId === null} onClick={() => setDayId(null)}>
            All days
          </Chip>
          {days.map((d) => (
            <Chip key={d.dayId} selected={dayId === d.dayId} onClick={() => setDayId(d.dayId)}>
              {d.name}
            </Chip>
          ))}
        </div>
        {exerciseId ? (
          <Chip selected onClick={() => setExerciseId(null)} aria-label="Clear exercise filter">
            {byId.get(exerciseId)?.name ?? exerciseId}
            <X aria-hidden className="size-4" />
          </Chip>
        ) : (
          <Button variant="ghost" className="self-start" onClick={() => setPickerOpen(true)}>
            Filter by exercise
          </Button>
        )}
      </PageHeader>

      {pages === null ? (
        <Spinner label="Loading history" />
      ) : visible.length === 0 ? (
        <EmptyState icon={<History aria-hidden />} title="No workouts yet">
          {pages.sessions.length === 0
            ? "Finished workouts show up here."
            : "Nothing matches these filters in the loaded workouts."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((s) => (
            <li key={s.id}>
              <Link
                href={`/history/session?id=${encodeURIComponent(s.id)}`}
                className="flex min-h-18 items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-2 active:bg-surface-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="eyebrow block">{formatDay(s.date)}</span>
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-xl font-semibold tracking-wide uppercase">
                      {s.dayName ?? "Workout"}
                    </span>
                    {s.prCount ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-xs font-semibold text-warning">
                        <Trophy aria-hidden className="size-3" /> {s.prCount} PR
                        {s.prCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular block text-sm text-muted">
                    {formatDuration(s.durationSec)} · {formatKg(s.totalVolume)}
                    {s.setCount !== undefined ? ` · ${s.setCount} sets` : ""}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages?.cursor ? (
        <Button
          variant="secondary"
          block
          className="mt-3"
          disabled={loadingMore}
          onClick={() => pages.cursor && loadMore(pages.cursor)}
        >
          {loadingMore ? "Loading…" : "Load older workouts"}
        </Button>
      ) : null}

      <ExercisePicker
        open={pickerOpen}
        title="Filter by exercise"
        onClose={() => setPickerOpen(false)}
        onPick={(e) => {
          setExerciseId(e.id);
          setPickerOpen(false);
        }}
      />
    </>
  );
}
