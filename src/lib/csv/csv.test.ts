import { describe, expect, it } from "vitest";
import { hashId, num, parseCsv, parseDate, parseDurationSec, toCsv } from "./csv";

describe("parseCsv", () => {
  it("maps header aliases to canonical columns and trims values", () => {
    const { records, columns } = parseCsv(
      "Workout Date, Exercise Name ,Weight (kg)\n2026-01-02, Squat , 100\n",
      {
        date: ["workout date"],
        exercise: ["exercise name"],
        weight_kg: ["weight (kg)"],
      },
    );
    expect(columns).toEqual(["date", "exercise", "weight_kg"]);
    expect(records).toEqual([{ date: "2026-01-02", exercise: "Squat", weight_kg: "100" }]);
  });

  it("handles a BOM, quoted commas and blank lines", () => {
    const { records } = parseCsv('\uFEFFdate,note\n2026-01-02,"heavy, slow"\n\n', {
      date: [],
      note: [],
    });
    expect(records).toEqual([{ date: "2026-01-02", note: "heavy, slow" }]);
  });
});

describe("toCsv", () => {
  it("writes a header and escapes values", () => {
    expect(toCsv([{ a: 1, b: 'say "hi", ok' }, { a: null }], ["a", "b"])).toBe(
      'a,b\r\n1,"say ""hi"", ok"\r\n,',
    );
  });
});

describe("field parsers", () => {
  it("parses numbers with comma decimals", () => {
    expect(num("82,5")).toBe(82.5);
    expect(num("")).toBeNull();
    expect(num("abc")).toBeNaN();
  });

  it("parses ISO-ish dates with optional time", () => {
    expect(parseDate("2026-3-7")).toEqual({ date: "2026-03-07", time: null });
    expect(parseDate("2026/03/07 18:30:00")).toEqual({ date: "2026-03-07", time: "18:30" });
    expect(parseDate("07/03/2026")).toBeNull();
    expect(parseDate("2026-13-01")).toBeNull();
  });

  it("parses durations in several formats", () => {
    expect(parseDurationSec("75")).toBe(4500);
    expect(parseDurationSec("1h 5m")).toBe(3900);
    expect(parseDurationSec("1:05:00")).toBe(3900);
    expect(parseDurationSec("45m")).toBe(2700);
    expect(parseDurationSec("")).toBeNull();
  });

  it("hashes deterministically", () => {
    expect(hashId("a|b")).toBe(hashId("a|b"));
    expect(hashId("a|b")).not.toBe(hashId("a|c"));
  });
});
