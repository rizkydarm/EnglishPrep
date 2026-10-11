// Leitner-style spaced repetition for vocabulary (PRD §7.8).
// Boxes 1..5 map to review intervals of 1, 3, 7, 14 and 30 days.
// A correct answer advances one box; a wrong answer resets to box 1.
// Reaching box 5 marks the word as mastered.

export const SRS_INTERVALS_DAYS: readonly number[] = [1, 3, 7, 14, 30];
export const SRS_MAX_BOX = SRS_INTERVALS_DAYS.length;

export interface SrsState {
  box: number;
  next_review: string;
  wrong_count: number;
}

// Dates are plain "YYYY-MM-DD" strings so they sort and compare lexically.
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dueDateForBox(box: number, from: string): string {
  const clamped = Math.min(Math.max(box, 1), SRS_MAX_BOX);
  return addDays(from, SRS_INTERVALS_DAYS[clamped - 1]);
}

export function initialSrsState(today: string): SrsState {
  return { box: 1, next_review: dueDateForBox(1, today), wrong_count: 0 };
}

export function reviewWord(state: SrsState, correct: boolean, today: string): SrsState {
  if (!correct) {
    return { box: 1, next_review: dueDateForBox(1, today), wrong_count: state.wrong_count + 1 };
  }
  const box = Math.min(state.box + 1, SRS_MAX_BOX);
  return { box, next_review: dueDateForBox(box, today), wrong_count: state.wrong_count };
}

export function isMastered(state: SrsState): boolean {
  return state.box >= SRS_MAX_BOX;
}

export function isDue(state: SrsState, today: string): boolean {
  return state.next_review <= today;
}
