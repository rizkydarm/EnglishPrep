// SRS box state per word_id (PRD §7.8), persisted to srs.json.
// Wraps the pure Leitner helpers in src/lib/utils/srs.ts.

import {
	initialSrsState,
	isDue,
	isMastered,
	reviewWord,
	type SrsState,
} from "$lib/utils/srs";
import { clearState, loadState, saveState } from "./persist";

export type { SrsState };

/** Local YYYY-MM-DD (avoids UTC day-boundary surprises on device). */
export function todayStr(now: Date = new Date()): string {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

class SrsStore {
	entries = $state<Record<string, SrsState>>({});
	loaded = $state(false);

	get size(): number {
		return Object.keys(this.entries).length;
	}

	get masteredCount(): number {
		return Object.values(this.entries).filter(isMastered).length;
	}

	get learningCount(): number {
		return this.size - this.masteredCount;
	}

	async load(): Promise<void> {
		this.entries = await loadState<Record<string, SrsState>>("srs.json", {});
		this.loaded = true;
	}

	private async persist(): Promise<void> {
		await saveState("srs.json", this.entries);
	}

	stateFor(wordId: string): SrsState | null {
		return this.entries[wordId] ?? null;
	}

	/** Record a quiz answer: correct advances one box, wrong resets to box 1. */
	async recordResult(wordId: string, correct: boolean, today: string = todayStr()): Promise<SrsState> {
		const current = this.entries[wordId] ?? initialSrsState(today);
		const next = reviewWord(current, correct, today);
		this.entries = { ...this.entries, [wordId]: next };
		await this.persist();
		return next;
	}

	/** Word ids due for review on the given day (default: today). */
	dueToday(today: string = todayStr()): string[] {
		return Object.entries(this.entries)
			.filter(([, state]) => isDue(state, today))
			.map(([wordId]) => wordId);
	}

	dueCount(today: string = todayStr()): number {
		return this.dueToday(today).length;
	}

	isMastered(wordId: string): boolean {
		const state = this.entries[wordId];
		return state !== undefined && isMastered(state);
	}

	async reset(): Promise<void> {
		this.entries = {};
		await clearState("srs.json");
	}
}

export const srs = new SrsStore();
