import { describe, expect, it } from "vitest";
import { parseGaps, splitSentences } from "./reading.js";

describe("splitSentences", () => {
  it("splits a passage into sentences deterministically", () => {
    const body = "The climate is changing. Scientists agree on this. Action is needed.";
    expect(splitSentences(body)).toEqual([
      "The climate is changing.",
      "Scientists agree on this.",
      "Action is needed.",
    ]);
  });

  it("ignores [[GAP:n]] markers when counting sentences", () => {
    const body = "The climate is changing. [[GAP:1]] Scientists agree on this. Action is needed.";
    expect(splitSentences(body)).toEqual([
      "The climate is changing.",
      "Scientists agree on this.",
      "Action is needed.",
    ]);
  });

  it("keeps question and exclamation marks and trailing quotes", () => {
    const body = 'Why does this happen? "Because it can!" The result is clear.';
    expect(splitSentences(body)).toEqual([
      "Why does this happen?",
      '"Because it can!"',
      "The result is clear.",
    ]);
  });

  it("returns an empty list for an empty body", () => {
    expect(splitSentences("   ")).toEqual([]);
  });
});

describe("parseGaps", () => {
  it("maps [[GAP:n]] to an ordered gap index", () => {
    const body = "Intro [[GAP:1]] middle [[GAP:2]] end.";
    expect(parseGaps(body)).toEqual([
      { type: "text", value: "Intro " },
      { type: "gap", index: 1 },
      { type: "text", value: " middle " },
      { type: "gap", index: 2 },
      { type: "text", value: " end." },
    ]);
  });

  it("returns a single text part when there are no gaps", () => {
    expect(parseGaps("No gaps here.")).toEqual([{ type: "text", value: "No gaps here." }]);
  });

  it("does not leave shared regex state between calls", () => {
    const body = "One [[GAP:1]] two.";
    expect(parseGaps(body)).toHaveLength(3);
    expect(parseGaps(body)).toHaveLength(3);
  });
});

describe("splitSentences over three passages", () => {
  it("splits three distinct passages into their expected sentences", () => {
    const passages = [
      "Remote work grew quickly. Many companies adopted it. Workers value flexibility.",
      "Urban farming is spreading. Cities use rooftops. Food travels less.",
      "Sleep affects memory. Adults need seven hours. Consistency matters most.",
    ];
    const split = passages.map((p) => splitSentences(p));
    expect(split.map((s) => s.length)).toEqual([3, 3, 3]);
    expect(split[0][2]).toBe("Workers value flexibility.");
    expect(split[1][1]).toBe("Cities use rooftops.");
    expect(split[2][0]).toBe("Sleep affects memory.");
  });
});
