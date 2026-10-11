// Active quiz session state (PRD §7.3).
// Exit mid-quiz discards the session: nothing is persisted here.

import type { Level } from "$lib/types/schema";

export type QuizMode = "vocab" | "reading" | "writing";
export type QuizStatus = "idle" | "active" | "done";
export type TimerPerQ = 0 | 15 | 30 | 60;

export interface QuizItem {
	id: string;
	kind: string;
	word_id?: string;
	payload?: unknown;
}

export interface QuizConfig {
	mode: QuizMode;
	levels: Level[];
	count: number;
	timerPerQ: TimerPerQ;
	items: QuizItem[];
}

class QuizStore {
	mode = $state<QuizMode | null>(null);
	levels = $state<Level[]>([]);
	count = $state(10);
	timerPerQ = $state<TimerPerQ>(0);
	items = $state<QuizItem[]>([]);
	index = $state(0);
	answers = $state<Record<string, unknown>>({});
	status = $state<QuizStatus>("idle");
	startedAt = $state<number | null>(null);

	get total(): number {
		return this.items.length;
	}

	get current(): QuizItem | null {
		return this.items[this.index] ?? null;
	}

	get answeredCount(): number {
		return Object.keys(this.answers).length;
	}

	get isFirst(): boolean {
		return this.index <= 0;
	}

	get isLast(): boolean {
		return this.items.length > 0 && this.index >= this.items.length - 1;
	}

	start(config: QuizConfig): void {
		this.mode = config.mode;
		this.levels = [...config.levels];
		this.count = config.count;
		this.timerPerQ = config.timerPerQ;
		this.items = [...config.items];
		this.index = 0;
		this.answers = {};
		this.status = "active";
		this.startedAt = Date.now();
	}

	setAnswer(itemId: string, value: unknown): void {
		this.answers[itemId] = value;
	}

	answerCurrent(value: unknown): void {
		const item = this.current;
		if (!item) return;
		this.setAnswer(item.id, value);
	}

	next(): void {
		if (this.index < this.items.length - 1) this.index += 1;
	}

	prev(): void {
		if (this.index > 0) this.index -= 1;
	}

	goTo(i: number): void {
		if (i >= 0 && i < this.items.length) this.index = i;
	}

	finish(): void {
		if (this.status === "active") this.status = "done";
	}

	/** Exit mid-quiz: confirm in the view, then discard (not saved). */
	exitQuiz(): void {
		this.mode = null;
		this.levels = [];
		this.count = 10;
		this.timerPerQ = 0;
		this.items = [];
		this.index = 0;
		this.answers = {};
		this.status = "idle";
		this.startedAt = null;
	}
}

export const quiz = new QuizStore();
