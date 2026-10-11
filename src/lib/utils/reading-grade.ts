// Deterministic reading graders (PRD §7.5, FEATURES R1–R2).
//
// All graders are pure and exact: a response is correct only when it matches
// the key. There is no fuzzy text fallback — highlight grading compares
// sentence indices tapped by the user against `answer_sentences`.

/** Sentence-completion gap fill: selected option index vs key. */
export function gradeSentenceCompletion(selected: number, answer: number): boolean {
  return selected === answer;
}

/** choose_idea variant: selected option index vs key. */
export function gradeChooseIdea(selected: number, answer: number): boolean {
  return selected === answer;
}

/** Best-title: selected option index vs key. */
export function gradeBestTitle(selected: number, answer: number): boolean {
  return selected === answer;
}

/** Set-equality over sentence indices: order-insensitive, duplicates ignored. */
function toIndexSet(indices: number[]): Set<number> {
  const set = new Set<number>();
  for (const i of indices) {
    if (Number.isInteger(i) && i >= 0) set.add(i);
  }
  return set;
}

/**
 * tap_sentence grading: correct only when the tapped set exactly equals the
 * key set — no missing and no extra sentences.
 */
export function gradeHighlight(selected: number[], answerSentences: number[]): boolean {
  const a = toIndexSet(selected);
  const b = toIndexSet(answerSentences);
  if (a.size !== b.size) return false;
  for (const i of a) {
    if (!b.has(i)) return false;
  }
  return true;
}

/**
 * Optional overlap ratio (0..1) for a possible future lenient fallback.
 * NOT used by default grading — kept exact per PRD §7.5 / T-013.
 */
export function highlightOverlap(selected: number[], answerSentences: number[]): number {
  const a = toIndexSet(selected);
  const b = toIndexSet(answerSentences);
  if (b.size === 0) return 0;
  let hit = 0;
  for (const i of a) {
    if (b.has(i)) hit++;
  }
  return hit / b.size;
}
