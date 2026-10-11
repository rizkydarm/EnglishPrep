// Deterministic writing grader helpers (PRD §7.6).
// Pure string utils — no Tauri imports.

export function normalizeSentence(input: string): string {
	return input
		.toLowerCase()
		.replace(/[''']/g, '')
		.replace(/[^a-z0-9\s]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function sentencesEqual(a: string, b: string): boolean {
	return normalizeSentence(a) === normalizeSentence(b);
}

export function isAccepted(input: string, acceptedList: string[]): boolean {
	const target = normalizeSentence(input);
	return acceptedList.some((candidate) => normalizeSentence(candidate) === target);
}

// Raw comparison is intentional: diacritics/case count as edits here (normalize before calling if needed).
export function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;
	let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
	for (let i = 1; i <= m; i++) {
		const curr: number[] = [i];
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
		}
		prev = curr;
	}
	return prev[n];
}

export function withinEditDistance(a: string, b: string, max: number): boolean {
	return levenshtein(a, b) <= max;
}
