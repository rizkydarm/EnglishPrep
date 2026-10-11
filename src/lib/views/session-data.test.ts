import { describe, expect, it } from "vitest";
import type { Level, ReadingPassage, ReadingQuestions, VocabEntry, WritingPrompt } from "$lib/types/schema.js";
import {
	buildSession,
	buildWrongSession,
	correctTextFor,
	summarizeSession,
	type ContentBundle,
	type QuizItem,
	type SessionSetup,
} from "./session-data.js";

function vocab(id: string, level: Level, word: string): VocabEntry {
	return {
		id,
		word,
		pos: "verb",
		level,
		topic: "work",
		definition_en: `to ${word} things`,
		definition_id: `arti ${word}`,
		example_en: `We ${word} every day.`,
		example_id: `Kami ${word} setiap hari.`,
		synonyms: [],
		antonyms: [],
		distractors: [],
		collocations: [],
		source: "test",
	};
}

const passage: ReadingPassage = {
	id: "test-passage",
	title: "Test Passage",
	level: "b2-core",
	topic: "work",
	body: "First sentence here. Second sentence has [[GAP:1]] inside it. Third sentence closes.",
};

const questions: ReadingQuestions = {
	passage_id: "test-passage",
	items: [
		{
			id: "test-passage-q1",
			type: "sentence_completion",
			gap: 1,
			options: ["opt a", "opt b", "opt c", "opt d"],
			answer: 2,
		},
		{
			id: "test-passage-q2",
			type: "best_title",
			options: ["t1", "t2", "t3", "t4"],
			answer: 0,
		},
	],
};

const prompt: WritingPrompt = {
	id: "wr-test-1",
	type: "sentence_order",
	level: "b2-core",
	words: ["she", "works", "hard"],
	correct: "She works hard.",
	alternatives: [],
};

function bundle(): ContentBundle {
	return {
		vocab: [
			vocab("w-001", "b2-core", "manage"),
			vocab("w-002", "b2-core", "handle"),
			vocab("w-003", "b2-core", "create"),
			vocab("w-004", "b2-core", "build"),
			vocab("w-005", "b2-core", "launch"),
			vocab("w-006", "b2-core", "review"),
			vocab("w-007", "b1-core", "start"),
			vocab("w-008", "b1-core", "begin"),
		],
		passages: [passage],
		questions: [questions],
		prompts: [prompt],
		skipped: [],
	};
}

function setup(partial: Partial<SessionSetup> = {}): SessionSetup {
	return {
		mode: "vocab",
		count: 4,
		levels: ["b2-core"],
		timerPerQ: 0,
		clozeMode: "word_bank",
		pairCount: 4,
		types: ["mcq"],
		srsEnabled: false,
		...partial,
	};
}

describe("buildSession vocab", () => {
	it("builds the requested count with no repeated words", () => {
		const items = buildSession(bundle(), setup({ count: 4 }));
		expect(items).toHaveLength(4);
		const words = items.map((i) => i.word_id);
		expect(new Set(words).size).toBe(4);
		expect(items.every((i) => i.kind === "mcq")).toBe(true);
	});

	it("injects due SRS words up to ~30% without exceeding count", () => {
		const items = buildSession(bundle(), setup({ count: 5, srsEnabled: true }), ["w-007", "w-008"]);
		expect(items).toHaveLength(5);
		const words = items.flatMap((i) => (i.word_id ? [i.word_id] : []));
		expect(words).toContain("w-007");
	});

	it("keeps modes separate", () => {
		expect(buildSession(bundle(), setup({ mode: "reading", count: 10 })).every((i) => i.kind.startsWith("reading"))).toBe(true);
		expect(buildSession(bundle(), setup({ mode: "writing", count: 10 })).every((i) => i.kind.startsWith("writing"))).toBe(true);
	});
});

describe("summarizeSession", () => {
	it("scores partial matching credit and excludes self-assessed items", () => {
		const items: QuizItem[] = [
			{ id: "q1", kind: "mcq", word_id: "w-001", typeLabel: "Multiple choice", level: "b2-core", payload: {} as never },
			{ id: "q2", kind: "matching", pairWordIds: ["w-002", "w-003"], typeLabel: "Matching", level: "b2-core", payload: {} as never },
			{ id: "q3", kind: "writing_image", typeLabel: "Image description", level: "b2-core", payload: {} as never },
		];
		const summary = summarizeSession(
			items,
			{
				q1: { earned: 1, userText: "a", correctText: "a" },
				q2: { earned: 0.5, userText: "1/2", correctText: "pairs" },
				q3: { earned: 0, userText: "desc", correctText: "self", excluded: true, selfScore: 4, selfMax: 5 },
			},
			90,
			"vocab",
			["b2-core"],
			{ "w-001": "arti manage" },
		);
		expect(summary.scorePct).toBe(75);
		expect(summary.correctCount).toBe(1);
		expect(summary.wrongCount).toBe(1);
		expect(summary.excludedCount).toBe(1);
		expect(summary.wrongIds).toEqual(["q2"]);
		expect(summary.selfAssessed).toHaveLength(1);
		expect(summary.entries[0].definition_id).toBe("arti manage");
		// Partial matching updates no SRS boxes; full-mark single word advances.
		expect(summary.srsUpdates).toEqual([{ wordId: "w-001", correct: true }]);
	});
});

describe("buildWrongSession", () => {
	it("replays only missed items", () => {
		const b = bundle();
		const items = buildSession(b, setup({ count: 4 }));
		const wrong = [items[0].id, items[2].id];
		const replay = buildWrongSession(items, wrong);
		expect(replay.map((i) => i.id).sort()).toEqual([...wrong].sort());
	});

	it("returns empty when nothing was missed", () => {
		const items = buildSession(bundle(), setup({ count: 2 }));
		expect(buildWrongSession(items, [])).toEqual([]);
	});
});

describe("correctTextFor", () => {
	it("resolves reading and writing answers", () => {
		const reading = buildSession(bundle(), setup({ mode: "reading", count: 2 }));
		const completion = reading.find((i) => i.kind === "reading_completion");
		if (completion) expect(correctTextFor(completion)).toBe("opt c");
		const writing = buildSession(bundle(), setup({ mode: "writing", count: 1 }));
		expect(correctTextFor(writing[0])).toBe("She works hard.");
	});
});
