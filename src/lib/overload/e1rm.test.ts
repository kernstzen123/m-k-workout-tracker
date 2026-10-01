import { describe, expect, it } from "vitest";
import { e1rm } from "./e1rm";

describe("e1rm (Epley)", () => {
  it("returns the weight itself for a single", () => {
    expect(e1rm(100, 1)).toBe(100);
  });

  it("applies weight × (1 + reps/30)", () => {
    expect(e1rm(100, 5)).toBe(116.7);
    expect(e1rm(60, 10)).toBe(80);
  });

  it("is 0 for empty or bodyweight-only sets", () => {
    expect(e1rm(0, 10)).toBe(0);
    expect(e1rm(100, 0)).toBe(0);
  });
});
