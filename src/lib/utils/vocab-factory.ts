import type { Level, VocabEntry } from "../types/schema.js";

export type VocabQuestionType =
  | "mcq"
  | "true_false"
  | "matching"
  | "cloze"
  | "best_word";

export interface BaseVocabQuestion {
  id: string;
  word_id: string;
  type: VocabQuestionType;
  level: Level;
  topic: string;
}

export interface McqVocabQuestion extends BaseVocabQuestion {
  type: "mcq";
  prompt: string;
  options: string[];
  answerIndex: number;
  direction: "word_to_def" | "def_to_word";
}

export interface TrueFalseVocabQuestion extends BaseVocabQuestion {
  type: "true_false";
  statement: string;
  isTrue: boolean;
  explanation_en?: string;
  explanation_id?: string;
}

export interface MatchingPair {
  id: string;
  word_id: string;
  word: string;
  definition: string;
}

export interface MatchingVocabQuestion extends BaseVocabQuestion {
  type: "matching";
  pairCount: 4 | 6;
  pairs: MatchingPair[];
  leftItems: { id: string; text: string }[];
  rightItems: { id: string; text: string }[];
}

export interface ClozeVocabQuestion extends BaseVocabQuestion {
  type: "cloze";
  sentenceWithBlank: string;
  targetWord: string;
  mode: "type" | "word_bank";
  wordBank?: string[];
  acceptedAnswers: string[];
}

export interface BestWordVocabQuestion extends BaseVocabQuestion {
  type: "best_word";
  sentenceWithBlank: string;
  options: string[];
  answerIndex: number;
  explanation_en?: string;
  explanation_id?: string;
}

export type VocabQuestion =
  | McqVocabQuestion
  | TrueFalseVocabQuestion
  | MatchingVocabQuestion
  | ClozeVocabQuestion
  | BestWordVocabQuestion;

export interface VocabQuizConfig {
  count: number;
  types?: VocabQuestionType[];
  clozeMode?: "type" | "word_bank";
  matchingPairCount?: 4 | 6;
  seedWordIds?: string[];
}

/**
 * Fisher-Yates array shuffle.
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Normalizes string for fuzzy comparison.
 */
export function normalizeWord(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'(){}\[\]]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const s1 = a;
  const s2 = b;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const d: number[][] = [];
  for (let i = 0; i <= len1; i++) d[i] = [i];
  for (let j = 0; j <= len2; j++) d[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[len1][len2];
}

/**
 * Picks distractor options from explicit entry distractors or auto-generated from pool.
 */
export function pickDistractors(
  target: VocabEntry,
  pool: VocabEntry[],
  count: number,
  field: "word" | "definition_en" | "definition_id" = "word",
): string[] {
  if (field === "word" && target.distractors && target.distractors.length >= count) {
    return target.distractors.slice(0, count);
  }

  const seen = new Set<string>();
  seen.add(target[field] as string);
  const result: string[] = [];

  // Priority 1: Same level & same POS
  for (const entry of pool) {
    if (entry.id !== target.id && entry.level === target.level && entry.pos === target.pos) {
      const val = entry[field] as string;
      if (val && !seen.has(val)) {
        seen.add(val);
        result.push(val);
        if (result.length >= count) return result;
      }
    }
  }

  // Priority 2: Same level
  for (const entry of pool) {
    if (entry.id !== target.id && entry.level === target.level) {
      const val = entry[field] as string;
      if (val && !seen.has(val)) {
        seen.add(val);
        result.push(val);
        if (result.length >= count) return result;
      }
    }
  }

  // Priority 3: Any in pool
  for (const entry of pool) {
    if (entry.id !== target.id) {
      const val = entry[field] as string;
      if (val && !seen.has(val)) {
        seen.add(val);
        result.push(val);
        if (result.length >= count) return result;
      }
    }
  }

  return result;
}

/**
 * Replace word occurrence in example with a blank.
 */
function makeBlankSentence(example: string, word: string): string {
  const regex = new RegExp(`\\b${word}\\b`, "i");
  if (regex.test(example)) {
    return example.replace(regex, "_____");
  }
  // Fallback: simple replace
  return example.replace(new RegExp(word, "i"), "_____");
}

/**
 * Type 1: Multiple Choice Question (MCQ).
 */
export function createMcqQuestion(
  entry: VocabEntry,
  pool: VocabEntry[],
  direction: "word_to_def" | "def_to_word" = "word_to_def",
): McqVocabQuestion {
  const isWordToDef = direction === "word_to_def";
  const correctAnswer = isWordToDef ? entry.definition_en : entry.word;
  const distractorField = isWordToDef ? "definition_en" : "word";
  const distractors = pickDistractors(entry, pool, 3, distractorField);

  const rawOptions = [correctAnswer, ...distractors];
  const shuffledOptions = shuffle(rawOptions);
  const answerIndex = shuffledOptions.indexOf(correctAnswer);

  const prompt = isWordToDef
    ? `What is the definition of "${entry.word}"?`
    : `Which word means "${entry.definition_en}"?`;

  return {
    id: `mcq-${entry.id}-${Date.now()}`,
    word_id: entry.id,
    type: "mcq",
    level: entry.level,
    topic: entry.topic,
    prompt,
    options: shuffledOptions,
    answerIndex,
    direction,
  };
}

/**
 * Type 2: True / False Question.
 */
export function createTrueFalseQuestion(
  entry: VocabEntry,
  pool: VocabEntry[],
  forceTrue?: boolean,
): TrueFalseVocabQuestion {
  const isTrue = forceTrue !== undefined ? forceTrue : Math.random() < 0.5;
  let definitionToUse = entry.definition_en;

  if (!isTrue) {
    const distractors = pickDistractors(entry, pool, 1, "definition_en");
    if (distractors.length > 0) {
      definitionToUse = distractors[0];
    } else {
      definitionToUse = "unrelated meaning";
    }
  }

  const statement = `"${entry.word}" means "${definitionToUse}".`;

  return {
    id: `tf-${entry.id}-${Date.now()}`,
    word_id: entry.id,
    type: "true_false",
    level: entry.level,
    topic: entry.topic,
    statement,
    isTrue,
    explanation_en: entry.example_en,
    explanation_id: entry.definition_id,
  };
}

/**
 * Type 3: Matching Question (Tap-to-pair, 4 or 6 pairs).
 */
export function createMatchingQuestion(
  entries: VocabEntry[],
  pairCount: 4 | 6 = 4,
): MatchingVocabQuestion {
  const chosen = entries.slice(0, pairCount);
  const pairs: MatchingPair[] = chosen.map((e, idx) => ({
    id: `pair-${idx}-${e.id}`,
    word_id: e.id,
    word: e.word,
    definition: e.definition_id || e.definition_en,
  }));

  const leftItems = shuffle(pairs.map((p) => ({ id: p.id, text: p.word })));
  const rightItems = shuffle(pairs.map((p) => ({ id: p.id, text: p.definition })));

  return {
    id: `matching-${chosen[0]?.id || "group"}-${Date.now()}`,
    word_id: chosen[0]?.id || "",
    type: "matching",
    level: chosen[0]?.level || "b2-core",
    topic: chosen[0]?.topic || "general",
    pairCount,
    pairs,
    leftItems,
    rightItems,
  };
}

/**
 * Type 4: Complete the Sentence (Cloze).
 */
export function createClozeQuestion(
  entry: VocabEntry,
  pool: VocabEntry[],
  mode: "type" | "word_bank" = "word_bank",
): ClozeVocabQuestion {
  const sentenceWithBlank = makeBlankSentence(entry.example_en, entry.word);
  const acceptedAnswers = [entry.word, ...(entry.synonyms ?? [])];

  let wordBank: string[] | undefined = undefined;
  if (mode === "word_bank") {
    const distractors = pickDistractors(entry, pool, 3, "word");
    wordBank = shuffle([entry.word, ...distractors]);
  }

  return {
    id: `cloze-${entry.id}-${Date.now()}`,
    word_id: entry.id,
    type: "cloze",
    level: entry.level,
    topic: entry.topic,
    sentenceWithBlank,
    targetWord: entry.word,
    mode,
    wordBank,
    acceptedAnswers,
  };
}

/**
 * Validates a user answer for a cloze question with edit distance <= 1 or synonym match.
 */
export function checkClozeAnswer(userAnswer: string, question: ClozeVocabQuestion): boolean {
  const normalizedUser = normalizeWord(userAnswer);
  if (!normalizedUser) return false;

  for (const accepted of question.acceptedAnswers) {
    const normalizedAccepted = normalizeWord(accepted);
    if (normalizedUser === normalizedAccepted) return true;
    if (levenshtein(normalizedUser, normalizedAccepted) <= 1) return true;
  }

  return false;
}

/**
 * Type 5: Best Word in Context.
 */
export function createBestWordQuestion(
  entry: VocabEntry,
  pool: VocabEntry[],
): BestWordVocabQuestion {
  const sentenceWithBlank = makeBlankSentence(entry.example_en, entry.word);
  const distractors = pickDistractors(entry, pool, 3, "word");
  const options = shuffle([entry.word, ...distractors]);
  const answerIndex = options.indexOf(entry.word);

  return {
    id: `best-word-${entry.id}-${Date.now()}`,
    word_id: entry.id,
    type: "best_word",
    level: entry.level,
    topic: entry.topic,
    sentenceWithBlank,
    options,
    answerIndex,
    explanation_en: entry.example_en,
    explanation_id: entry.definition_id,
  };
}

/**
 * Generates a full vocabulary quiz session.
 */
export function generateVocabQuiz(
  pool: VocabEntry[],
  config: VocabQuizConfig,
): VocabQuestion[] {
  const availableTypes: VocabQuestionType[] =
    config.types && config.types.length > 0
      ? config.types
      : ["mcq", "true_false", "matching", "cloze", "best_word"];

  const questions: VocabQuestion[] = [];
  const usedWordIds = new Set<string>();

  // Prioritize seed words (e.g. from SRS review queue)
  const prioritized: VocabEntry[] = [];
  if (config.seedWordIds && config.seedWordIds.length > 0) {
    for (const id of config.seedWordIds) {
      const found = pool.find((e) => e.id === id);
      if (found) prioritized.push(found);
    }
  }

  const remaining = pool.filter((e) => !prioritized.some((p) => p.id === e.id));
  const candidatePool = [...prioritized, ...shuffle(remaining)];

  let poolIdx = 0;
  let typeIdx = 0;

  while (questions.length < config.count && poolIdx < candidatePool.length) {
    const type = availableTypes[typeIdx % availableTypes.length];
    typeIdx++;

    if (type === "matching") {
      const pairCount = config.matchingPairCount ?? 4;
      // Get unused entries for matching
      const matchingEntries: VocabEntry[] = [];
      while (matchingEntries.length < pairCount && poolIdx < candidatePool.length) {
        const item = candidatePool[poolIdx++];
        if (!usedWordIds.has(item.id)) {
          matchingEntries.push(item);
          usedWordIds.add(item.id);
        }
      }
      if (matchingEntries.length >= pairCount) {
        questions.push(createMatchingQuestion(matchingEntries, pairCount));
      }
    } else {
      const entry = candidatePool[poolIdx++];
      if (!usedWordIds.has(entry.id)) {
        usedWordIds.add(entry.id);
        if (type === "mcq") {
          questions.push(createMcqQuestion(entry, pool));
        } else if (type === "true_false") {
          questions.push(createTrueFalseQuestion(entry, pool));
        } else if (type === "cloze") {
          questions.push(createClozeQuestion(entry, pool, config.clozeMode ?? "word_bank"));
        } else if (type === "best_word") {
          questions.push(createBestWordQuestion(entry, pool));
        }
      }
    }
  }

  return questions;
}
