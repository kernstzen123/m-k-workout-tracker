import { create } from "zustand";
import { seedProgram, subscribeProgram } from "@/lib/data/program";
import { errorCode, reportError } from "@/lib/monitoring";
import type { Program } from "@/lib/schemas/program";
import { toast } from "@/lib/toast";

interface ProgramState {
  status: "idle" | "loading" | "ready" | "error";
  program: Program | null;
  start: (uid: string) => () => void;
}

export const useProgramStore = create<ProgramState>((set) => ({
  status: "idle",
  program: null,
  start: (uid) => {
    set({ status: "loading" });
    let seeding = false;
    return subscribeProgram(
      (program, { fromCache }) => {
        // A missing doc straight from the cache isn't an answer yet.
        set({ program, status: program || !fromCache ? "ready" : "loading" });
        if (!program && !fromCache && !seeding) {
          seeding = true;
          seedProgram(uid).catch((error: unknown) => {
            seeding = false;
            // Losing the create race to the partner is fine — their program arrives via the listener.
            if (errorCode(error) === "permission-denied") return;
            reportError(error, { where: "seedProgram" });
            toast.error("Couldn't create the default program. Check your connection.");
          });
        }
      },
      (error) => {
        reportError(error, { where: "subscribeProgram" });
        set({ status: "error" });
        toast.error("Couldn't load the program.");
      },
    );
  },
}));
