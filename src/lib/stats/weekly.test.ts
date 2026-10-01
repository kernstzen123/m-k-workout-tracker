import { describe, expect, it } from "vitest";
import { weekTotals } from "./weekly";

describe("weekTotals", () => {
  it("sums per-session entries", () => {
    expect(
      weekTotals({
        bySession: {
          a: { muscles: { chest: { sets: 2, volume: 1000 } } },
          b: { muscles: { chest: { sets: 1, volume: 500 }, back: { sets: 3, volume: 900 } } },
        },
      }),
    ).toEqual({
      sessions: 2,
      muscles: { chest: { sets: 3, volume: 1500 }, back: { sets: 3, volume: 900 } },
    });
  });

  it("is idempotent: re-writing the same session key doesn't change the totals", () => {
    const once = { bySession: { a: { muscles: { chest: { sets: 2, volume: 1000 } } } } };
    // A retried write sets the same key again — the stored doc is identical.
    const twice = {
      bySession: { ...once.bySession, a: { muscles: { chest: { sets: 2, volume: 1000 } } } },
    };
    expect(weekTotals(twice)).toEqual(weekTotals(once));
  });

  it("adds legacy increment totals and handles missing docs", () => {
    expect(
      weekTotals({ sessions: 1, muscles: { quads: { sets: 4, volume: 2000 } }, bySession: {} }),
    ).toEqual({
      sessions: 1,
      muscles: { quads: { sets: 4, volume: 2000 } },
    });
    expect(weekTotals(undefined)).toEqual({ sessions: 0, muscles: {} });
  });
});
