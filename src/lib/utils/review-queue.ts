// SRS review queue (PRD §7.8). Pure helpers over the Leitner state in srs.ts
// and the history shape in stores/progress.svelte.ts — no store imports,
// so this stays unit-testable. Views/stores map QueuedItems onto real
// question payloads (e.g. via the vocab question-type engine).

import { isDue, type SrsState } from "./srs.js";

/** Share of fresh session items replaced by due SRS reviews (PRD §7.8 ~30%). */
export const REVIEW_INJECTION_RATIO = 0.3;

/** Minimal quiz-item shape: QuizItem (stores/quiz) and HistorySession refs fit. */
export interface SessionItem {
	id: string;
	word_id?: string;
	[key: string]: unknown;
}

/** A session item tagged for review rendering (cross-level allowed). */
export type QueuedItem<T extends SessionItem = SessionItem> = T & { review: boolean };

/** Per-question outcome, mirroring a finished session's answers. */
export interface QuestionResult {
	id: string;
	correct: boolean;
}

/**
 * A past session for wrong-only replay. History rows (history.json) persist
 * only wrong_ids; live sessions also carry items + per-question results.
 */
export interface ReviewableSession<T extends SessionItem = SessionItem> {
	items: T[];
	results?: QuestionResult[];
	wrong_ids?: string[];
}

/** Word ids due for review on `today` (YYYY-MM-DD), oldest-due first. */
export function getDueWords(srs: Record<string, SrsState>, today: string): string[] {
	return Object.entries(srs)
		.filter(([, state]) => isDue(state, today))
		.sort((a, b) => a[1].next_review.localeCompare(b[1].next_review) || a[0].localeCompare(b[0]))
		.map(([wordId]) => wordId);
}

function matchesId<T extends SessionItem>(item: T, wordId: string): boolean {
	return item.word_id === wordId || item.id === wordId;
}

/**
 * Mix due SRS words into a fresh session at ~REVIEW_INJECTION_RATIO.
 * Due words may come from any level (cross-level for review only).
 * Review stubs carry `{ id, word_id, review: true }`; the caller builds
 * full question payloads from the word_id. Originals keep order and are
 * evenly interleaved with reviews; items already in session are skipped.
 */
export function injectReviews<T extends SessionItem>(
	sessionItems: T[],
	dueWords: string[],
	ratio: number = REVIEW_INJECTION_RATIO,
): QueuedItem<T | SessionItem>[] {
	const fresh: QueuedItem<T | SessionItem>[] = sessionItems.map((item) => ({ ...item, review: false }));
	const seen = new Set(sessionItems.flatMap((item) => [item.id, item.word_id].filter((v): v is string => v !== undefined)));
	const candidates = [...new Set(dueWords)].filter((wordId) => !seen.has(wordId));
	const target = Math.min(candidates.length, Math.round(sessionItems.length * ratio));
	if (fresh.length === 0 || target <= 0) return fresh;
	const reviews: QueuedItem<SessionItem>[] = candidates
		.slice(0, target)
		.map((wordId) => ({ id: wordId, word_id: wordId, review: true as const }));
	const total = fresh.length + reviews.length;
	const result: QueuedItem<T | SessionItem>[] = [];
	let ri = 0;
	for (let i = 0; i < fresh.length; i++) {
		result.push(fresh[i]);
		while (ri < reviews.length && result.length * reviews.length >= (ri + 1) * total) {
			result.push(reviews[ri]);
			ri++;
		}
	}
	while (ri < reviews.length) {
		result.push(reviews[ri]);
		ri++;
	}
	return result;
}

/**
 * Replay list of missed questions only (PRD §7.8 Review Wrong Answers).
 * Prefers per-question results; falls back to wrong_ids; synthesizes
 * `{ id, word_id }` stubs when history holds ids without full items.
 */
export function wrongOnly<T extends SessionItem>(session: ReviewableSession<T>): QueuedItem<T | SessionItem>[] {
	if (session.results !== undefined) {
		const missed = new Set(session.results.filter((r) => !r.correct).map((r) => r.id));
		return session.items.filter((item) => missed.has(item.id)).map((item) => ({ ...item, review: true as const }));
	}
	const wrongIds = session.wrong_ids ?? [];
	if (wrongIds.length === 0) return [];
	const matched = session.items.filter((item) =>
		wrongIds.some((wordId) => matchesId(item, wordId)),
	);
	if (matched.length > 0) return matched.map((item) => ({ ...item, review: true as const }));
	return wrongIds.map((wordId) => ({ id: wordId, word_id: wordId, review: true as const }));
}

/**
 * Build a standalone review session (Dashboard Start Review): due words
 * first (oldest-due order from getDueWords), then wrong-answer replays,
 * deduped and capped at `count`.
 */
export function buildReviewSession<T extends SessionItem>(
	dueWords: string[],
	wrongItems: T[],
	count: number,
): QueuedItem<T | SessionItem>[] {
	if (count <= 0) return [];
	const queue: QueuedItem<T | SessionItem>[] = [];
	const seen = new Set<string>();
	for (const wordId of new Set(dueWords)) {
		if (queue.length >= count) break;
		queue.push({ id: wordId, word_id: wordId, review: true as const });
		seen.add(wordId);
	}
	for (const item of wrongItems) {
		if (queue.length >= count) break;
		const keys = [item.id, item.word_id].filter((v): v is string => v !== undefined);
		if (keys.some((k) => seen.has(k))) continue;
		queue.push({ ...item, review: true as const });
		for (const k of keys) seen.add(k);
	}
	return queue;
}
