import { describe, expect, it } from "vitest";
import { shouldRemoveWorker } from "./staleWorkers";

describe("shouldRemoveWorker", () => {
  it("removes every worker in development", () => {
    expect(shouldRemoveWorker("http://localhost:3000/serwist/sw.js", true)).toBe(true);
    expect(shouldRemoveWorker(undefined, true)).toBe(true);
  });

  it("keeps our worker and removes foreign ones in production", () => {
    expect(shouldRemoveWorker("https://app.example/serwist/sw.js", false)).toBe(false);
    expect(shouldRemoveWorker("https://app.example/sw.js", false)).toBe(true);
  });

  it("keeps a registration whose worker hasn't been fetched yet (first install)", () => {
    expect(shouldRemoveWorker(undefined, false)).toBe(false);
  });
});
