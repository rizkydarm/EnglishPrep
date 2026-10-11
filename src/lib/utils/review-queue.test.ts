import { describe, expect, it } from "vitest";
import {
	buildReviewSession,
	getDueWords,
	injectReviews,
	wrongOnly,
	type ReviewableSession,
	type SessionItem,
} from "./review-queue.js";
import type { SrsState } from "./srs.js";

const TODAY = "2026-10-11";

function state(next_review: string, box = 1): SrsState {
	return { box, next_review, wrong_count: 0 };
}

function items(n: number, prefix = "q"): SessionItem[] {
	return Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}`, word_id: `w${i + 1}` }));
}

describe("getDueWords", () => {
	it("returns only word_ids whose next_review is today or earlier", () => {
		const srs: Record<string, SrsState> = {
			dueToday: state("2026-10-11"),
			overdue: state("2026-10-05"),
			future: state("2026-10-12"),
			masteredFuture: state("2026-11-10", 5),
		};
		expect(getDueWords(srs, TODAY).sort()).toEqual(["dueToday", "overdue"]);
	});

	it("orders oldest-due first", () => {
		const srs: Record<string, SrsState> = {
			b: state("2026-10-11"),
			a: state("2026-10-01"),
		};
		expect(getDueWords(srs, TODAY)).toEqual(["a", "b"]);
	});

	it("returns [] when nothing is due", () => {
		expect(getDueWords({ w1: state("2026-10-12") }, TODAY)).toEqual([]);
		expect(getDueWords({}, TODAY)).toEqual([]);
	});
});

describe("injectReviews", () => {
	it("injects ~30% review items flagged review:true, originals flagged false", () => {
		const fresh = items(10);
		const due = Array.from({ length: 10 }, (_, i) => `due${i + 1}`);
		const mixed = injectReviews(fresh, due);
		const reviews = mixed.filter((m) => m.review);
		expect(reviews).toHaveLength(3);
		expect(mixed).toHaveLength(13);
		const ratio = reviews.length / mixed.length;
		expect(ratio).toBeGreaterThanOrEqual(0.2);
		expect(ratio).toBeLessThanOrEqual(0.4);
		expect(mixed.filter((m) => !m.review)).toHaveLength(10);
	});

	it("stays within the ~30% bound for larger sessions", () => {
		const mixed = injectReviews(items(20), Array.from({ length: 20 }, (_, i) => `due${i + 1}`));
		const ratio = mixed.filter((m) => m.review).length / mixed.length;
		expect(ratio).toBeGreaterThanOrEqual(0.2);
		expect(ratio).toBeLessThanOrEqual(0.4);
	});

	it("returns items unchanged (review:false) when due list is empty", () => {
		const fresh = items(5);
		const mixed = injectReviews(fresh, []);
		expect(mixed).toHaveLength(5);
		expect(mixed.every((m) => m.review === false)).toBe(true);
	});

	it("skips due words already present in the session", () => {
		const fresh = items(10);
		const due = ["w1", "w2", "dueA", "dueB", "dueC", "dueD"];
		const mixed = injectReviews(fresh, due);
		const reviews = mixed.filter((m) => m.review);
		const reviewWordIds = reviews.map((r) => r.word_id);
		expect(reviewWordIds).not.toContain("w1");
		expect(reviewWordIds).not.toContain("w2");
		expect(new Set(mixed.map((m) => m.word_id)).size).toBe(mixed.length);
	});

	it("caps injection at the available due words", () => {
		const mixed = injectReviews(items(20), ["only1", "only2"]);
		expect(mixed.filter((m) => m.review)).toHaveLength(2);
	});
});

describe("wrongOnly", () => {
	const session: ReviewableSession = {
		items: [
			{ id: "q1", word_id: "w1" },
			{ id: "q2", word_id: "w2" },
			{ id: "q3", word_id: "w3" },
		],
		results: [
			{ id: "q1", correct: true },
			{ id: "q2", correct: false },
			{ id: "q3", correct: false },
		],
	};

	it("replays only missed questions, flagged review:true", () => {
		const replay = wrongOnly(session);
		expect(replay.map((r) => r.id).sort()).toEqual(["q2", "q3"]);
		expect(replay.every((r) => r.review === true)).toBe(true);
	});

	it("falls back to wrong_ids when per-question results are absent", () => {
		const replay = wrongOnly({ items: session.items, wrong_ids: ["w1", "w3"] });
		expect(replay.map((r) => r.word_id).sort()).toEqual(["w1", "w3"]);
	});

	it("synthesizes stub items from wrong_ids when history has no full items", () => {
		const replay = wrongOnly({ items: [], wrong_ids: ["w9", "w10"] });
		expect(replay).toHaveLength(2);
		expect(replay.every((r) => r.review === true)).toBe(true);
	});

	it("returns [] when nothing was missed", () => {
		expect(wrongOnly({ items: items(3), results: [] })).toEqual([]);
		expect(wrongOnly({ items: items(3) })).toEqual([]);
	});
});

describe("buildReviewSession", () => {
	it("orders due words first, then wrong items, capped at count", () => {
		const queue = buildReviewSession(["d1", "d2"], [{ id: "q1" }, { id: "q2" }], 3);
		expect(queue).toHaveLength(3);
		expect(queue.map((q) => q.id)).toEqual(["d1", "d2", "q1"]);
		expect(queue.every((q) => q.review === true)).toBe(true);
	});

	it("dedupes wrong items already covered by due words", () => {
		const queue = buildReviewSession(["w1"], [{ id: "q1", word_id: "w1" }], 5);
		expect(queue).toHaveLength(1);
	});

	it("returns [] for empty inputs or non-positive count", () => {
		expect(buildReviewSession([], [], 5)).toEqual([]);
		expect(buildReviewSession(["d1"], [], 0)).toEqual([]);
	});
});
