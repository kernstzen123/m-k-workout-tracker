import { describe, expect, it } from "vitest";
import { isoWeekId, toDayString } from "./dates";

describe("dates", () => {
  it("formats local day strings", () => {
    expect(toDayString(new Date(2026, 9, 1, 23, 59))).toBe("2026-10-01");
  });

  it("computes ISO week ids, including year boundaries", () => {
    expect(isoWeekId(new Date(2026, 9, 1))).toBe("2026-W40");
    // 1 Jan 2027 is a Friday → belongs to ISO week 53 of 2026.
    expect(isoWeekId(new Date(2027, 0, 1))).toBe("2026-W53");
  });
});
