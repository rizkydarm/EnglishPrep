// Session assembly for Epic 4 views (PRD §7.1–7.3, §7.7–§7.8).
// Pure content loading + question building + result summarising.
// Question rendering stays in the quiz components; stores stay in stores/.

import { loadPassage, loadQuestions, loadVocab, type ContentFile } from "$lib/content-loader/loader.js";
import { splitSentences } from "$lib/content-loader/reading.js";
import type { QuizMode } from "$lib/stores/quiz.svelte.js";
import {
	WritingPromptsFileSchema,
	type Level,
	type ReadingPassage,
	type ReadingQuestionItem,
	type ReadingQuestions,
	type VocabEntry,
	type WritingPrompt,
} from "$lib/types/schema.js";
import {
	createMcqQuestion,
	generateVocabQuiz,
	type VocabQuestion,
	type VocabQuestionType,
} from "$lib/utils/vocab-factory.js";
import { injectReviews, REVIEW_INJECTION_RATIO, wrongOnly } from "$lib/utils/review-queue.js";

export const LEVELS: Level[] = ["b1-core", "b1-plus", "b2-core", "b2-mastery"];

export const LEVEL_LABEL: Record<Level, string> = {
	"b1-core": "B1 Core",
	"b1-plus": "B1+",
	"b2-core": "B2 Core",
	"b2-mastery": "B2 Mastery",
};

export const VOCAB_TYPES: VocabQuestionType[] = ["mcq", "true_false", "matching", "cloze", "best_word"];

export const VOCAB_TYPE_LABEL: Record<VocabQuestionType, string> = {
	mcq: "Multiple choice",
	true_false: "True / False",
	matching: "Matching",
	cloze: "Complete the sentence",
	best_word: "Best word",
};

export type ItemKind =
	| "mcq"
	| "true_false"
	| "matching"
	| "cloze"
	| "best_word"
	| "reading_completion"
	| "reading_tap"
	| "reading_choose"
	| "reading_title"
	| "writing_order"
	| "writing_grammar"
	| "writing_image";

export interface ReadingPayload {
	passage: ReadingPassage;
	sentences: string[];
	item: ReadingQuestionItem;
}

export interface QuizItem {
	id: string;
	kind: ItemKind;
	word_id?: string;
	/** All vocab word ids involved (matching pairs). Used for SRS updates. */
	pairWordIds?: string[];
	typeLabel: string;
	level: string;
	payload: VocabQuestion | ReadingPayload | WritingPrompt;
}

export interface SessionSetup {
	mode: QuizMode;
	count: number;
	levels: Level[];
	timerPerQ: 0 | 15 | 30 | 60;
	clozeMode: "type" | "word_bank";
	pairCount: 4 | 6;
	types: VocabQuestionType[];
	srsEnabled: boolean;
}

export interface ContentBundle {
	vocab: VocabEntry[];
	passages: ReadingPassage[];
	questions: ReadingQuestions[];
	prompts: WritingPrompt[];
	skipped: { file: string; reason: string }[];
}

export interface ItemOutcome {
	/** Auto-score credit 0..1. Ignored when excluded. */
	earned: number;
	userText: string;
	correctText: string;
	excluded?: boolean;
	selfScore?: number;
	selfMax?: number;
	/** Raw answer value (option index / tapped indices), for re-rendering. */
	raw?: unknown;
}

export interface ResultEntry extends ItemOutcome {
	itemId: string;
	kind: ItemKind;
	typeLabel: string;
	level: string;
	word_id?: string;
	definition_id?: string;
}

export interface SessionSummary {
	mode: QuizMode;
	levels: Level[];
	durationSec: number;
	autoEarned: number;
	autoTotal: number;
	scorePct: number;
	correctCount: number;
	wrongCount: number;
	excludedCount: number;
	autoTotalCount: number;
	entries: ResultEntry[];
	wrongIds: string[];
	selfAssessed: { promptId: string; label: string; userText: string; selfScore: number; selfMax: number }[];
	srsUpdates: { wordId: string; correct: boolean }[];
}

// ---- content loading (bundled raw seed; Reload Content re-runs the same pure parse) ----

const vocabModules = import.meta.glob("/src-tauri/resources/content/vocab/*.{csv,json}", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const passageModules = import.meta.glob("/src-tauri/resources/content/reading/passages/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const questionModules = import.meta.glob("/src-tauri/resources/content/reading/questions/*.json", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const writingModules = import.meta.glob("/src-tauri/resources/content/writing/prompts.json", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

function toFiles(modules: Record<string, string>): ContentFile[] {
	return Object.entries(modules)
		.map(([path, content]) => ({ file: path.replace(/^.*\/content\//, ""), content }))
		.sort((a, b) => a.file.localeCompare(b.file));
}

export function loadContentBundle(): ContentBundle {
	const vocab = loadVocab(toFiles(vocabModules));
	const passages = loadPassage(toFiles(passageModules));
	const questions = loadQuestions(toFiles(questionModules));
	const prompts: WritingPrompt[] = [];
	const skipped = [
		...vocab.skipped.map((s) => ({ ...s })),
		...passages.skipped.map((s) => ({ ...s })),
		...questions.skipped.map((s) => ({ ...s })),
	];
	for (const [path, content] of Object.entries(writingModules)) {
		const file = path.replace(/^.*\/content\//, "");
		try {
			const parsed = WritingPromptsFileSchema.safeParse(JSON.parse(content));
			if (!parsed.success) {
				skipped.push({ file, reason: "invalid writing prompts" });
				continue;
			}
			prompts.push(...parsed.data.items);
		} catch (e) {
			skipped.push({ file, reason: e instanceof Error ? e.message : "parse error" });
		}
	}
	return { vocab: vocab.ok, passages: passages.ok, questions: questions.ok, prompts, skipped };
}

/** Total reading question count across passages (for Home cards). */
export function countReadingQuestions(bundle: ContentBundle): number {
	return bundle.questions.reduce((n, q) => n + q.items.length, 0);
}

// ---- session building (never mixed modes; shuffled; no repeats) ----

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function vocabKindOf(q: VocabQuestion): { kind: ItemKind; label: string } {
	return { kind: q.type, label: VOCAB_TYPE_LABEL[q.type] };
}

function toVocabItem(q: VocabQuestion): QuizItem {
	const { kind, label } = vocabKindOf(q);
	return {
		id: q.id,
		kind,
		word_id: q.type === "matching" ? undefined : q.word_id,
		pairWordIds: q.type === "matching" ? q.pairs.map((p) => p.word_id) : undefined,
		typeLabel: label,
		level: q.level,
		payload: q,
	};
}

function buildVocabSession(bundle: ContentBundle, setup: SessionSetup, dueWords: string[]): QuizItem[] {
	const pool = bundle.vocab.filter((v) => setup.levels.includes(v.level));
	const byId = new Map(bundle.vocab.map((v) => [v.id, v]));
	const types = setup.types.length > 0 ? setup.types : [...VOCAB_TYPES];
	const count = Math.max(1, Math.min(setup.count, 60));

	let questions: VocabQuestion[] = [];
	if (setup.srsEnabled) {
		const seen = new Set<string>();
		const dueEntries = [...new Set(dueWords)]
			.map((id) => byId.get(id))
			.filter((v): v is VocabEntry => v !== undefined && !seen.has(v.id) && (seen.add(v.id), true));
		const nReview = Math.min(dueEntries.length, Math.round(count * REVIEW_INJECTION_RATIO));
		const fresh = generateVocabQuiz(pool.length > 0 ? pool : bundle.vocab, {
			count: Math.max(0, count - nReview),
			types,
			clozeMode: setup.clozeMode,
			matchingPairCount: setup.pairCount,
		});
		if (nReview === 0) {
			questions = fresh;
		} else {
			const used = new Set<string>();
			for (const q of fresh) {
				if (q.type === "matching") for (const p of q.pairs) used.add(p.word_id);
				else used.add(q.word_id);
			}
			const picks = dueEntries.filter((e) => !used.has(e.id)).slice(0, nReview);
			const freshById = new Map(fresh.map((q) => [q.id, q]));
			const merged = injectReviews(
				fresh.map((q) => ({ id: q.id })),
				picks.map((e) => e.id),
				1,
			);
			const entryById = new Map(picks.map((e) => [e.id, e]));
			questions = merged.flatMap((m) => {
				if (!m.review) {
					const orig = freshById.get(m.id);
					return orig ? [orig] : [];
				}
				const wid = "word_id" in m ? (m as { word_id?: unknown }).word_id : undefined;
				const entry = entryById.get(typeof wid === "string" ? wid : m.id);
				return entry ? [createMcqQuestion(entry, bundle.vocab)] : [];
			});
		}
	} else {
		questions = generateVocabQuiz(pool.length > 0 ? pool : bundle.vocab, {
			count,
			types,
			clozeMode: setup.clozeMode,
			matchingPairCount: setup.pairCount,
		});
	}
	return questions.slice(0, count).map(toVocabItem);
}

function buildReadingSession(bundle: ContentBundle, setup: SessionSetup): QuizItem[] {
	const qByPassage = new Map(bundle.questions.map((q) => [q.passage_id, q]));
	const acc: QuizItem[] = [];
	for (const p of bundle.passages) {
		if (!setup.levels.includes(p.level)) continue;
		const q = qByPassage.get(p.id);
		if (!q) continue;
		const sentences = splitSentences(p.body);
		for (const item of q.items) {
			let kind: ItemKind;
			let label: string;
			if (item.type === "sentence_completion") {
				kind = "reading_completion";
				label = "Sentence completion";
			} else if (item.type === "best_title") {
				kind = "reading_title";
				label = "Best title";
			} else if (item.variant === "tap_sentence") {
				kind = "reading_tap";
				label = "Highlight idea";
			} else {
				kind = "reading_choose";
				label = "Choose idea";
			}
			acc.push({
				id: item.id,
				kind,
				typeLabel: label,
				level: p.level,
				payload: { passage: p, sentences, item } satisfies ReadingPayload,
			});
		}
	}
	return shuffle(acc).slice(0, Math.max(1, setup.count));
}

function buildWritingSession(bundle: ContentBundle, setup: SessionSetup): QuizItem[] {
	const filtered = bundle.prompts.filter((p) => setup.levels.includes(p.level));
	const kinds: Record<WritingPrompt["type"], { kind: ItemKind; label: string }> = {
		sentence_order: { kind: "writing_order", label: "Sentence order" },
		grammar_fix: { kind: "writing_grammar", label: "Grammar fix" },
		image_description: { kind: "writing_image", label: "Image description" },
	};
	return shuffle(filtered)
		.slice(0, Math.max(1, setup.count))
		.map((p) => ({
			id: p.id,
			kind: kinds[p.type].kind,
			typeLabel: kinds[p.type].label,
			level: p.level,
			payload: p,
		}));
}

export function buildSession(bundle: ContentBundle, setup: SessionSetup, dueWords: string[] = []): QuizItem[] {
	if (setup.mode === "vocab") return buildVocabSession(bundle, setup, dueWords);
	if (setup.mode === "reading") return buildReadingSession(bundle, setup);
	return buildWritingSession(bundle, setup);
}

/** Replay only the missed items of a past session (PRD §7.8). Re-shuffled. */
export function buildWrongSession(items: QuizItem[], wrongIds: string[]): QuizItem[] {
	const byId = new Map(items.map((i) => [i.id, i]));
	const picked = wrongOnly({
		items: items.map((i) => ({ id: i.id, word_id: i.word_id })),
		wrong_ids: wrongIds,
	});
	const byRef = new Map<string, QuizItem>();
	for (const q of picked) {
		const full = byId.get(q.id) ?? (q.word_id !== undefined ? byId.get(q.word_id) : undefined);
		if (full && !byRef.has(full.id)) byRef.set(full.id, full);
	}
	return shuffle(
		[...byRef.values()].map((item) => ({
			id: item.id,
			kind: item.kind,
			word_id: item.word_id,
			pairWordIds: item.pairWordIds ? [...item.pairWordIds] : undefined,
			typeLabel: item.typeLabel,
			level: item.level,
			payload: item.payload,
		} satisfies QuizItem)),
	);
}

// ---- review text + summary ----

/** Correct-answer text for the Results review list. */
export function correctTextFor(item: QuizItem): string {
	const p = item.payload;
	if (item.kind === "mcq" || item.kind === "best_word") {
		const q = p as Extract<VocabQuestion, { type: "mcq" | "best_word" }>;
		return q.options[q.answerIndex] ?? "";
	}
	if (item.kind === "true_false") {
		const q = p as Extract<VocabQuestion, { type: "true_false" }>;
		return q.isTrue ? "True" : "False";
	}
	if (item.kind === "matching") {
		const q = p as Extract<VocabQuestion, { type: "matching" }>;
		return q.pairs.map((pair) => `${pair.word} — ${pair.definition}`).join("; ");
	}
	if (item.kind === "cloze") {
		return (p as Extract<VocabQuestion, { type: "cloze" }>).targetWord;
	}
	if (
		item.kind === "reading_completion" ||
		item.kind === "reading_title" ||
		item.kind === "reading_choose"
	) {
		const r = p as ReadingPayload;
		const q = r.item;
		if (q.type === "sentence_completion" || q.type === "best_title") return q.options[q.answer] ?? "";
		if (q.type === "highlight_idea" && q.variant === "choose_idea") return q.options[q.answer] ?? "";
		return "";
	}
	if (item.kind === "reading_tap") {
		const r = p as ReadingPayload;
		const q = r.item;
		if (q.type === "highlight_idea" && q.variant === "tap_sentence") {
			return q.answer_sentences.map((i) => `Sentence ${i + 1}`).join(", ");
		}
		return "";
	}
	if (item.kind === "writing_order") return (p as WritingPrompt & { type: "sentence_order" }).correct;
	if (item.kind === "writing_grammar") {
		return (p as WritingPrompt & { type: "grammar_fix" }).accepted[0] ?? "";
	}
	return "";
}

export function summarizeSession(
	items: QuizItem[],
	outcomes: Record<string, ItemOutcome>,
	durationSec: number,
	mode: QuizMode,
	levels: Level[],
	definitionByWordId: Record<string, string> = {},
): SessionSummary {
	const entries: ResultEntry[] = items.map((item) => {
		const o = outcomes[item.id] ?? { earned: 0, userText: "No answer", correctText: correctTextFor(item) };
		return {
			...o,
			itemId: item.id,
			kind: item.kind,
			typeLabel: item.typeLabel,
			level: item.level,
			word_id: item.word_id,
			definition_id: item.word_id ? definitionByWordId[item.word_id] : undefined,
		};
	});
	const auto = entries.filter((e) => !e.excluded);
	const autoEarned = auto.reduce((n, e) => n + Math.min(1, Math.max(0, e.earned)), 0);
	const autoTotal = auto.length;
	const scorePct = autoTotal > 0 ? Math.round((autoEarned / autoTotal) * 100) : 0;
	const correctCount = auto.filter((e) => e.earned >= 0.999).length;
	const wrongCount = auto.length - correctCount;
	const selfAssessed = entries
		.filter((e) => e.excluded)
		.map((e) => ({
			promptId: e.itemId,
			label: e.typeLabel,
			userText: e.userText,
			selfScore: e.selfScore ?? 0,
			selfMax: e.selfMax ?? 5,
		}));
	const srsUpdates: SessionSummary["srsUpdates"] = [];
	for (const item of items) {
		const o = outcomes[item.id];
		if (!o || o.excluded) continue;
		if (item.kind === "matching") {
			// Only exact pair sets update SRS: full marks advance, zero resets,
			// partial is ambiguous per-pair so it only counts toward the score.
			if (o.earned >= 0.999) for (const id of item.pairWordIds ?? []) srsUpdates.push({ wordId: id, correct: true });
			else if (o.earned <= 0) for (const id of item.pairWordIds ?? []) srsUpdates.push({ wordId: id, correct: false });
		} else if (item.word_id) {
			srsUpdates.push({ wordId: item.word_id, correct: o.earned >= 0.999 });
		}
	}
	return {
		mode,
		levels,
		durationSec,
		autoEarned,
		autoTotal,
		scorePct,
		correctCount,
		wrongCount,
		excludedCount: entries.length - auto.length,
		autoTotalCount: autoTotal,
		entries,
		wrongIds: auto.filter((e) => e.earned < 0.999).map((e) => e.itemId),
		selfAssessed,
		srsUpdates,
	};
}
