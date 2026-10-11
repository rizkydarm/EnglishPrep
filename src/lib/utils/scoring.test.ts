import { describe, expect, it } from "vitest";
import { matchingPartial, percent } from "./scoring.js";

describe("matchingPartial", () => {
  it("gives partial credit as correct pairs over total pairs", () => {
    expect(matchingPartial(3, 4)).toBe(0.75);
    expect(matchingPartial(6, 6)).toBe(1);
    expect(matchingPartial(1, 6)).toBeCloseTo(1 / 6);
  });

  it("returns 0 when there are no pairs", () => {
    expect(matchingPartial(0, 0)).toBe(0);
  });
});

describe("percent", () => {
  it("returns earned over total as a percentage", () => {
    expect(percent(7, 10)).toBe(70);
    expect(percent(10, 10)).toBe(100);
  });

  it("returns 0 when the total is zero", () => {
    expect(percent(0, 0)).toBe(0);
  });
});
