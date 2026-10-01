import { describe, expect, it } from "vitest";
import { cardioToCsv, measurementsToCsv, parseCardioCsv, parseMeasurementsCsv } from "./tracking";

describe("cardio CSV", () => {
  it("round-trips and validates", () => {
    const csv = cardioToCsv([
      {
        id: "x",
        date: "2026-01-02",
        type: "Rowing Machine",
        durationMin: 20,
        distanceKm: 4,
        intensity: "moderate",
      },
    ]);
    const back = parseCardioCsv(csv, 1);
    expect(back.errors).toEqual([]);
    expect(back.entries[0]!.data).toMatchObject({
      date: "2026-01-02",
      type: "Rowing Machine",
      durationMin: 20,
      distanceKm: 4,
    });
  });

  it("accepts aliases and duration formats; reports bad rows", () => {
    const back = parseCardioCsv(
      [
        "date,activity,time,heart rate,intensity",
        "2026-01-02,Run,0:30:00,150,",
        "2026-01-03,Run,30,400,",
        "2026-01-04,Run,20,,extreme",
      ].join("\n"),
      1,
    );
    expect(back.entries).toHaveLength(1);
    expect(back.entries[0]!.data.durationMin).toBe(30);
    expect(back.errors.map((e) => e.line)).toEqual([3, 4]);
  });
});

describe("measurements CSV", () => {
  it("round-trips weight, body fat and tape", () => {
    const csv = measurementsToCsv([
      {
        id: "m",
        date: "2026-01-02",
        weightKg: 80.5,
        bodyFatPct: 15,
        tape: { waist: 85, chest: null },
      },
    ]);
    const back = parseMeasurementsCsv(csv, 1);
    expect(back.errors).toEqual([]);
    expect(back.entries[0]!.data).toMatchObject({
      date: "2026-01-02",
      weightKg: 80.5,
      bodyFatPct: 15,
      tape: { waist: 85 },
    });
  });

  it("rejects empty rows and out-of-range values", () => {
    const back = parseMeasurementsCsv(
      ["date,weight,body fat", "2026-01-02,,", "2026-01-03,80,150"].join("\n"),
      1,
    );
    expect(back.entries).toHaveLength(0);
    expect(back.errors.map((e) => e.line)).toEqual([2, 3]);
  });
});
