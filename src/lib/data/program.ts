import { doc, onSnapshot, runTransaction, setDoc, type Unsubscribe } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { errorCode } from "@/lib/monitoring";
import { DEFAULT_PROGRAM_DAYS, DEFAULT_PROGRAM_NAME } from "@/lib/program/template";
import {
  PROGRAM_ID,
  programDocSchema,
  type Program,
  type ProgramDay,
  type ProgramDoc,
} from "@/lib/schemas/program";
import { fireAndForget, parseDoc } from "./util";

const programRef = () => doc(getDb(), "program", PROGRAM_ID);

export function subscribeProgram(
  onData: (program: Program | null, meta: { fromCache: boolean }) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    programRef(),
    { includeMetadataChanges: true },
    (snap) => {
      const program = snap.exists()
        ? parseDoc(programDocSchema, snap.id, snap.data(), "subscribeProgram")
        : null;
      onData(program, { fromCache: snap.metadata.fromCache });
    },
    onError,
  );
}

/** Create the default program once. A transaction makes the "both users at once" race safe. */
export async function seedProgram(uid: string): Promise<void> {
  const data: ProgramDoc = programDocSchema.parse({
    name: DEFAULT_PROGRAM_NAME,
    days: DEFAULT_PROGRAM_DAYS,
    version: 1,
    updatedBy: uid,
    updatedAt: Date.now(),
  });
  await runTransaction(getDb(), async (tx) => {
    const current = await tx.get(programRef());
    if (!current.exists()) tx.set(programRef(), data);
  });
}

export class ProgramConflictError extends Error {
  constructor(readonly current: Program) {
    super("The program was changed by someone else since you started editing.");
    this.name = "ProgramConflictError";
  }
}

export interface SaveProgramInput {
  name: string;
  days: ProgramDay[];
  /** Version the edit started from. */
  baseVersion: number;
  uid: string;
  /** Overwrite even if the stored version moved on (user confirmed last-write-wins). */
  force?: boolean;
}

/**
 * Save with optimistic concurrency. Online: a transaction re-reads the version and throws
 * `ProgramConflictError` if it moved (unless `force`). Offline: the write is queued as
 * `baseVersion + 1`; if someone else saved meanwhile, the rules reject it on sync and the user
 * is told (the local change is rolled back by Firestore).
 */
export async function saveProgram(input: SaveProgramInput): Promise<"saved" | "queued"> {
  const build = (version: number): ProgramDoc =>
    programDocSchema.parse({
      name: input.name,
      days: input.days,
      version,
      updatedBy: input.uid,
      updatedAt: Date.now(),
    });

  const queue = () => {
    fireAndForget(
      setDoc(programRef(), build(input.baseVersion + 1)),
      "saveProgram(queued)",
      "Your program change was rejected — it was edited by your partner first. Re-open the editor.",
    );
    return "queued" as const;
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) return queue();

  try {
    await runTransaction(getDb(), async (tx) => {
      const snap = await tx.get(programRef());
      const current = snap.exists()
        ? parseDoc(programDocSchema, snap.id, snap.data(), "saveProgram")
        : null;
      const currentVersion = current?.version ?? 0;
      if (current && currentVersion !== input.baseVersion && !input.force) {
        throw new ProgramConflictError(current);
      }
      tx.set(programRef(), build(currentVersion + 1));
    });
    return "saved";
  } catch (error) {
    if (error instanceof ProgramConflictError) throw error;
    // Flaky connection: transactions need the server. Fall back to a queued write.
    if (errorCode(error) === "unavailable") return queue();
    throw error;
  }
}
