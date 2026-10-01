import { describe, expect, it } from "vitest";
import { groupSupersets } from "./groups";

describe("groupSupersets", () => {
  it("groups consecutive items with the same letter", () => {
    const items = [{ n: 1 }, { n: 2, supersetGroup: "A" }, { n: 3, supersetGroup: "A" }, { n: 4 }];
    const groups = groupSupersets(items);
    expect(groups.map((g) => [g.supersetGroup, g.items.map((i) => i.index)])).toEqual([
      [null, [0]],
      ["A", [1, 2]],
      [null, [3]],
    ]);
  });

  it("does not merge separated items that reuse a letter", () => {
    const items = [{ supersetGroup: "A" }, {}, { supersetGroup: "A" }];
    expect(groupSupersets(items)).toHaveLength(3);
  });
});
