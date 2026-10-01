"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/Page";
import { ConsistencyTab } from "./ConsistencyTab";
import { ExerciseTab } from "./ExerciseTab";
import { MuscleTab } from "./MuscleTab";

const TABS = [
  { id: "exercises", label: "Exercises" },
  { id: "muscles", label: "Muscles" },
  { id: "consistency", label: "Consistency" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function ProgressScreen() {
  const [tab, setTab] = useState<Tab>("exercises");
  return (
    <>
      <PageHeader eyebrow="Getting stronger" title="Progress">
        <div role="tablist" aria-label="Progress views" className="flex gap-2">
          {TABS.map((t) => (
            <Chip
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </PageHeader>
      <div role="tabpanel" id={`panel-${tab}`} aria-label={TABS.find((t) => t.id === tab)?.label}>
        {tab === "exercises" ? (
          <ExerciseTab />
        ) : tab === "muscles" ? (
          <MuscleTab />
        ) : (
          <ConsistencyTab />
        )}
      </div>
    </>
  );
}
