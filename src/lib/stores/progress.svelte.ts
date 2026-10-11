// Progress + history + profile (PRD §8).
// progress.json: daily activity + mastered ids.
// history.json: quiz sessions with per-question wrong refs.
// profile.json: created_at, content_version, total_words_mastered.

import type { Level } from "$lib/types/schema";
import type { QuizMode } from "./quiz.svelte";
import { clearState, loadState, saveState } from "./persist";

export interface DailyEntry {
	date: string; // YYYY-MM-DD
	quizzes: number;
	correct: number;
	total: number;
	time_spent_sec: number;
}

export interface HistorySession {
	id: string;
	date: string; // ISO timestamp
	mode: QuizMode;
	levels: Level[];
	correct: number;
	total: number;
	score_pct: number;
	duration_sec: number;
	wrong_ids: string[];
}

export interface ProfileState {
	created_at: string;
	content_version: number;
	total_words_mastered: number;
}

export interface RecordSessionInput {
	mode: QuizMode;
	levels: Level[];
	correct: number;
	total: number;
	duration_sec: number;
	wrong_ids: string[];
	date?: string;
}

function dayOf(dateIso: string): string {
	return dateIso.slice(0, 10);
}

let fallbackCounter = 0;

function newSessionId(): string {
	try {
		if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
			return crypto.randomUUID();
		}
	} catch {
		// Fall through to the counter fallback below.
	}
	return `${Date.now()}-${fallbackCounter++}`;
}

class ProgressStore {
	daily = $state<DailyEntry[]>([]);
	sessions = $state<HistorySession[]>([]);
	masteredIds = $state<string[]>([]);
	profile = $state<ProfileState>({ created_at: new Date().toISOString(), content_version: 1, total_words_mastered: 0 });
	loaded = $state(false);

	async load(): Promise<void> {
		const progress = await loadState<{ daily: DailyEntry[]; masteredIds: string[] }>(
			"progress.json",
			{ daily: [], masteredIds: [] },
		);
		const history = await loadState<HistorySession[]>("history.json", []);
		const profile = await loadState<ProfileState | null>("profile.json", null);
		this.daily = progress.daily;
		this.masteredIds = progress.masteredIds;
		this.sessions = history;
		if (profile) {
			this.profile = {
				...profile,
				total_words_mastered:
					typeof profile.total_words_mastered === "number"
						? profile.total_words_mastered
						: this.masteredIds.length,
			};
		} else {
			this.profile = { created_at: new Date().toISOString(), content_version: 1, total_words_mastered: this.masteredIds.length };
			await saveState("profile.json", this.profile);
		}
		this.loaded = true;
	}

	private async persist(): Promise<void> {
		await saveState("progress.json", { daily: this.daily, masteredIds: this.masteredIds });
		await saveState("history.json", this.sessions);
	}

	/** Append a finished session: history row + daily bucket rollup. */
	async recordSession(input: RecordSessionInput): Promise<HistorySession> {
		const date = input.date ?? new Date().toISOString();
		const session: HistorySession = {
			id: newSessionId(),
			date,
			mode: input.mode,
			levels: [...input.levels],
			correct: input.correct,
			total: input.total,
			score_pct: input.total > 0 ? Math.round((input.correct / input.total) * 100) : 0,
			duration_sec: input.duration_sec,
			wrong_ids: [...input.wrong_ids],
		};
		this.sessions = [...this.sessions, session];

		const day = dayOf(date);
		const existing = this.daily.find((d) => d.date === day);
		if (existing) {
			existing.quizzes += 1;
			existing.correct += input.correct;
			existing.total += input.total;
			existing.time_spent_sec += input.duration_sec;
		} else {
			this.daily = [
				...this.daily,
				{
					date: day,
					quizzes: 1,
					correct: input.correct,
					total: input.total,
					time_spent_sec: input.duration_sec,
				},
			];
		}
		await this.persist();
		return session;
	}

	/** Wrong-answer question/item refs for replaying a past session. */
	wrongRefs(sessionId: string): string[] {
		return this.sessions.find((s) => s.id === sessionId)?.wrong_ids ?? [];
	}

	sessionById(sessionId: string): HistorySession | null {
		return this.sessions.find((s) => s.id === sessionId) ?? null;
	}

	async setMasteredIds(ids: string[]): Promise<void> {
		this.masteredIds = [...ids];
		this.profile = { ...this.profile, total_words_mastered: this.masteredIds.length };
		await this.persist();
		await saveState("profile.json", this.profile);
	}

	/** Double-confirm in the view before calling: wipes local progress + history. */
	async resetAll(): Promise<void> {
		this.daily = [];
		this.sessions = [];
		this.masteredIds = [];
		await clearState("progress.json");
		await clearState("history.json");
	}
}

export const progress = new ProgressStore();
