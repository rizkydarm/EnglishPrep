import { describe, expect, it } from "vitest";
import {
  gradeBestTitle,
  gradeChooseIdea,
  gradeHighlight,
  gradeSentenceCompletion,
  highlightOverlap,
} from "./reading-grade.js";

describe("gradeSentenceCompletion", () => {
  it("passes only on the exact option index", () => {
    expect(gradeSentenceCompletion(2, 2)).toBe(true);
    expect(gradeSentenceCompletion(0, 2)).toBe(false);
    expect(gradeSentenceCompletion(-1, 2)).toBe(false);
  });
});

describe("gradeChooseIdea", () => {
  it("passes only on the exact option index", () => {
    expect(gradeChooseIdea(1, 1)).toBe(true);
    expect(gradeChooseIdea(3, 1)).toBe(false);
  });
});

describe("gradeBestTitle", () => {
  it("passes only on the exact option index", () => {
    expect(gradeBestTitle(0, 0)).toBe(true);
    expect(gradeBestTitle(1, 0)).toBe(false);
  });
});

describe("gradeHighlight", () => {
  it("passes on exact set match regardless of tap order", () => {
    expect(gradeHighlight([1, 3], [3, 1])).toBe(true);
    expect(gradeHighlight([2], [2])).toBe(true);
  });

  it("ignores duplicate taps", () => {
    expect(gradeHighlight([1, 1, 3], [1, 3])).toBe(true);
  });

  it("fails on missing or extra sentences", () => {
    expect(gradeHighlight([1], [1, 3])).toBe(false);
    expect(gradeHighlight([1, 2, 3], [1, 3])).toBe(false);
    expect(gradeHighlight([], [0])).toBe(false);
  });

  it("fails on empty key with no taps only when key is empty", () => {
    expect(gradeHighlight([], [])).toBe(true);
  });
});

describe("highlightOverlap", () => {
  it("returns hit ratio over the key set", () => {
    expect(highlightOverlap([1, 3], [1, 3])).toBe(1);
    expect(highlightOverlap([1], [1, 3])).toBe(0.5);
    expect(highlightOverlap([0], [1, 3])).toBe(0);
    expect(highlightOverlap([], [])).toBe(0);
  });
});
