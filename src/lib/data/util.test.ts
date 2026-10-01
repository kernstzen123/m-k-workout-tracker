import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./util";

describe("slugify", () => {
  it("creates stable ids from names", () => {
    expect(slugify("Incline Dumbbell Press")).toBe("incline-dumbbell-press");
    expect(slugify("Captain's Chair Knee Raise")).toBe("captain-s-chair-knee-raise");
    expect(slugify("  Plank (seconds) ")).toBe("plank-seconds");
    expect(slugify("Clean & Press")).toBe("clean-and-press");
    expect(slugify("Café Curl")).toBe("cafe-curl");
  });
});

describe("uniqueSlug", () => {
  it("appends a counter on collision", () => {
    const taken = new Set(["squat", "squat-2"]);
    expect(uniqueSlug("Squat", taken)).toBe("squat-3");
    expect(uniqueSlug("Front Squat", taken)).toBe("front-squat");
  });

  it("never returns an empty id", () => {
    expect(uniqueSlug("!!!", new Set())).toBe("exercise");
  });
});
