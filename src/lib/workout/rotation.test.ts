import { describe, expect, it } from "vitest";
import type { ProgramDay } from "@/lib/schemas/program";
import { nextDay } from "./rotation";

const day = (dayId: string): ProgramDay => ({ dayId, name: dayId, items: [] });
const days = [day("upper-a"), day("lower-a"), day("upper-b")];

describe("nextDay", () => {
  it("starts at the first day without history", () => {
    expect(nextDay(days, null)?.dayId).toBe("upper-a");
  });

  it("advances and wraps around", () => {
    expect(nextDay(days, "upper-a")?.dayId).toBe("lower-a");
    expect(nextDay(days, "upper-b")?.dayId).toBe("upper-a");
  });

  it("restarts when the last day no longer exists", () => {
    expect(nextDay(days, "deleted-day")?.dayId).toBe("upper-a");
  });

  it("returns null for an empty program", () => {
    expect(nextDay([], "x")).toBeNull();
  });
});
