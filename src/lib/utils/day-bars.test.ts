import { describe, expect, it } from "vitest";
import { buildDayBars } from "./day-bars.js";

function entry(date: string, quizzes: number, correct = 0, total = 0) {
	return { date, quizzes, correct, total, time_spent_sec: 0 };
}

describe("buildDayBars", () => {
	it("returns 30 zero buckets for empty history", () => {
		const bars = buildDayBars([], "2026-10-14");
		expect(bars).toHaveLength(30);
		expect(bars[29].date).toBe("2026-10-14");
		expect(bars[0].date).toBe("2026-09-15");
		expect(bars.every((b) => b.quizzes === 0 && b.avg === null)).toBe(true);
	});

	it("aggregates counts per day with avg + label", () => {
		const bars = buildDayBars([entry("2026-10-14", 3, 7, 10)], "2026-10-14");
		const last = bars[29];
		expect(last).toEqual({ date: "2026-10-14", label: "10/14", quizzes: 3, avg: 70 });
		expect(bars[28].quizzes).toBe(0);
	});

	it("shifts the window by exactly one bucket on rollover, no dup/missing", () => {
		const history = [entry("2026-09-15", 1, 1, 1), entry("2026-10-14", 2, 2, 2)];
		const before = buildDayBars(history, "2026-10-14");
		const after = buildDayBars(history, "2026-10-15");
		expect(after).toHaveLength(30);
		expect(new Set(after.map((b) => b.date)).size).toBe(30);
		expect(after[29].date).toBe("2026-10-15");
		expect(after[0].date).toBe("2026-09-16");
		// Dropped the oldest bucket, kept the overlap shifted by one.
		expect(after.slice(0, 29).map((b) => b.date)).toEqual(before.slice(1).map((b) => b.date));
		expect(before[0].date).toBe("2026-09-15");
	});
});
