export interface DayBarInput {
	date: string; // YYYY-MM-DD
	quizzes: number;
	correct: number;
	total: number;
}

export interface DayBar {
	date: string;
	label: string;
	quizzes: number;
	avg: number | null;
}

/** Last 30 days ending `today` (inclusive), oldest first. Pure: no Date.now inside. */
export function buildDayBars(history: DayBarInput[], today: string): DayBar[] {
	const byDate = new Map(history.map((d) => [d.date, d]));
	const out: DayBar[] = [];
	const base = new Date(`${today}T12:00:00`);
	for (let i = 29; i >= 0; i--) {
		const d = new Date(base.getTime() - i * 86_400_000);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		const key = `${y}-${m}-${day}`;
		const entry = byDate.get(key);
		out.push({
			date: key,
			label: `${m}/${day}`,
			quizzes: entry?.quizzes ?? 0,
			avg: entry && entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : null,
		});
	}
	return out;
}
