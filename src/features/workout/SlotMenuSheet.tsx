"use client";

import { ArrowDown, ArrowUp, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { MiniNumber } from "@/components/ui/Stepper";
import type { SessionExercise } from "@/lib/schemas/session";

export function SlotMenuSheet({
  slot,
  name,
  index,
  total,
  hasSets,
  onClose,
  onMove,
  onSwap,
  onRemove,
  onSave,
}: {
  slot: SessionExercise | null;
  name: string;
  index: number;
  total: number;
  hasSets: boolean;
  onClose: () => void;
  onMove: (dir: -1 | 1) => void;
  onSwap: () => void;
  onRemove: () => void;
  onSave: (patch: Partial<SessionExercise>) => void;
}) {
  return (
    <Sheet open={slot !== null} onClose={onClose} title={name}>
      {slot ? (
        <Body
          key={slot.key}
          slot={slot}
          index={index}
          total={total}
          hasSets={hasSets}
          onMove={onMove}
          onSwap={onSwap}
          onRemove={onRemove}
          onSave={onSave}
        />
      ) : null}
    </Sheet>
  );
}

function Body({
  slot,
  index,
  total,
  hasSets,
  onMove,
  onSwap,
  onRemove,
  onSave,
}: {
  slot: SessionExercise;
  index: number;
  total: number;
  hasSets: boolean;
  onMove: (dir: -1 | 1) => void;
  onSwap: () => void;
  onRemove: () => void;
  onSave: (patch: Partial<SessionExercise>) => void;
}) {
  const [rest, setRest] = useState(slot.restSec !== undefined ? String(slot.restSec) : "");
  const isCardio = slot.durationMin !== undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          icon={<ArrowUp aria-hidden />}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          Move up
        </Button>
        <Button
          variant="secondary"
          icon={<ArrowDown aria-hidden />}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          Move down
        </Button>
      </div>

      <Button variant="secondary" icon={<Repeat aria-hidden />} disabled={hasSets} onClick={onSwap}>
        Swap exercise
      </Button>
      {hasSets ? (
        <p className="-mt-2 text-sm text-muted">
          Sets are already logged here — add a new exercise instead of swapping.
        </p>
      ) : null}

      {!isCardio ? (
        <div className="flex items-end gap-3">
          <MiniNumber label="Rest (seconds)" value={rest} onChange={setRest} className="w-32" />
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              const n = Number(rest);
              onSave({
                restSec:
                  rest.trim() === "" ? undefined : Math.max(0, Math.min(900, Math.round(n) || 0)),
              });
            }}
          >
            Save rest time
          </Button>
        </div>
      ) : null}

      <Button variant="danger" icon={<Trash2 aria-hidden />} onClick={onRemove}>
        Remove exercise
      </Button>
    </div>
  );
}
