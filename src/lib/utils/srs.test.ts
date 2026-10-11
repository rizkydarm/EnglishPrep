import { describe, expect, it } from "vitest";
import {
  SRS_INTERVALS_DAYS,
  SRS_MAX_BOX,
  dueDateForBox,
  initialSrsState,
  isDue,
  isMastered,
  reviewWord,
  type SrsState,
} from "./srs.js";

const TODAY = "2026-10-11";

describe("SRS intervals", () => {
  it("uses the PRD Leitner intervals 1-3-7-14-30", () => {
    expect(SRS_INTERVALS_DAYS).toEqual([1, 3, 7, 14, 30]);
    expect(SRS_MAX_BOX).toBe(5);
  });

  it("maps each box to its due date", () => {
    expect(dueDateForBox(1, TODAY)).toBe("2026-10-12");
    expect(dueDateForBox(2, TODAY)).toBe("2026-10-14");
    expect(dueDateForBox(3, TODAY)).toBe("2026-10-18");
    expect(dueDateForBox(4, TODAY)).toBe("2026-10-25");
    expect(dueDateForBox(5, TODAY)).toBe("2026-11-10");
  });
});

describe("initialSrsState", () => {
  it("starts a new word in box 1, due tomorrow", () => {
    expect(initialSrsState(TODAY)).toEqual({
      box: 1,
      next_review: "2026-10-12",
      wrong_count: 0,
    });
  });
});

describe("reviewWord", () => {
  it("advances one box and reschedules on a correct answer", () => {
    const next = reviewWord({ box: 1, next_review: TODAY, wrong_count: 0 }, true, TODAY);
    expect(next).toEqual({ box: 2, next_review: "2026-10-14", wrong_count: 0 });
  });

  it("reaches box 5 and mastery from box 4", () => {
    const next = reviewWord({ box: 4, next_review: TODAY, wrong_count: 0 }, true, TODAY);
    expect(next.box).toBe(5);
    expect(next.next_review).toBe("2026-11-10");
    expect(isMastered(next)).toBe(true);
  });

  it("caps at box 5 when already mastered", () => {
    const next = reviewWord({ box: 5, next_review: TODAY, wrong_count: 0 }, true, TODAY);
    expect(next.box).toBe(5);
    expect(next.next_review).toBe("2026-11-10");
  });

  it("resets to box 1 and counts the miss on a wrong answer", () => {
    const next = reviewWord({ box: 3, next_review: TODAY, wrong_count: 1 }, false, TODAY);
    expect(next).toEqual({ box: 1, next_review: "2026-10-12", wrong_count: 2 });
    expect(isMastered(next)).toBe(false);
  });
});

describe("isDue", () => {
  const state = (next_review: string): SrsState => ({ box: 1, next_review, wrong_count: 0 });

  it("is due when next_review is today or earlier", () => {
    expect(isDue(state("2026-10-11"), TODAY)).toBe(true);
    expect(isDue(state("2026-10-05"), TODAY)).toBe(true);
  });

  it("is not due when next_review is in the future", () => {
    expect(isDue(state("2026-10-12"), TODAY)).toBe(false);
  });
});
