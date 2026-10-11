import { describe, expect, it } from "vitest";
import { VocabEntrySchema, type VocabEntry } from "../types/schema.js";
import {
  checkClozeAnswer,
  createBestWordQuestion,
  createClozeQuestion,
  createMatchingQuestion,
  createMcqQuestion,
  createTrueFalseQuestion,
  generateVocabQuiz,
  pickDistractors,
} from "./vocab-factory.js";

const RAW_POOL = [
  {
    id: "abundant",
    word: "abundant",
    pos: "adjective",
    level: "b2-core",
    topic: "environment",
    definition_en: "existing in large quantities; more than enough",
    definition_id: "berlimpah; jumlahnya banyak",
    example_en: "The region has abundant supplies of fresh water.",
    example_id: "Wilayah itu memiliki pasokan air tawar yang melimpah.",
    synonyms: ["plentiful", "ample"],
    antonyms: ["scarce"],
    distractors: ["ample", "scattered", "fragile"],
    collocations: ["abundant supplies"],
    source: "oxford_5000",
  },
  {
    id: "scarce",
    word: "scarce",
    pos: "adjective",
    level: "b2-core",
    topic: "environment",
    definition_en: "not easy to find or get; rare",
    definition_id: "langka; jarang ditemukan",
    example_en: "Food was scarce during the winter months.",
    example_id: "Makanan langka selama musim dingin.",
    distractors: ["plentiful", "dense"],
    source: "oxford_5000",
  },
  {
    id: "fragile",
    word: "fragile",
    pos: "adjective",
    level: "b2-core",
    topic: "general",
    definition_en: "easily broken or damaged",
    definition_id: "rapuh; mudah pecah",
    example_en: "Handle these fragile glasses with care.",
    example_id: "Pegang gelas-gelas rapuh ini dengan hati-hati.",
    source: "oxford_5000",
  },
  {
    id: "scattered",
    word: "scattered",
    pos: "adjective",
    level: "b2-core",
    topic: "general",
    definition_en: "spread over a wide area or occurring irregularly",
    definition_id: "tersebar; berserakan",
    example_en: "There were scattered showers throughout the day.",
    example_id: "Ada hujan yang tersebar sepanjang hari.",
    source: "oxford_5000",
  },
  {
    id: "dense",
    word: "dense",
    pos: "adjective",
    level: "b2-core",
    topic: "environment",
    definition_en: "closely compacted in substance; crowded",
    definition_id: "padat; lebat",
    example_en: "They walked through the dense forest.",
    example_id: "Mereka berjalan melalui hutan yang lebat.",
    source: "oxford_5000",
  },
  {
    id: "innovation",
    word: "innovation",
    pos: "noun",
    level: "b2-core",
    topic: "technology",
    definition_en: "the introduction of new things, ideas, or methods",
    definition_id: "inovasi; penemuan baru",
    example_en: "The company is known for technological innovation.",
    example_id: "Perusahaan itu dikenal karena inovasi teknologi.",
    source: "oxford_5000",
  },
  {
    id: "sustainable",
    word: "sustainable",
    pos: "adjective",
    level: "b2-core",
    topic: "environment",
    definition_en: "able to be maintained at a certain rate or level",
    definition_id: "berkelanjutan",
    example_en: "We need sustainable farming practices.",
    example_id: "Kita butuh praktik pertanian berkelanjutan.",
    source: "oxford_5000",
  },
  {
    id: "efficiency",
    word: "efficiency",
    pos: "noun",
    level: "b2-core",
    topic: "work",
    definition_en: "the state or quality of being efficient",
    definition_id: "efisiensi",
    example_en: "Energy efficiency has improved greatly.",
    example_id: "Efisiensi energi telah sangat meningkat.",
    source: "oxford_5000",
  },
  {
    id: "collaborate",
    word: "collaborate",
    pos: "verb",
    level: "b2-core",
    topic: "work",
    definition_en: "work jointly on an activity or project",
    definition_id: "berkolaborasi",
    example_en: "Teams collaborate across different offices.",
    example_id: "Tim berkolaborasi lintas kantor berbeda.",
    source: "oxford_5000",
  },
  {
    id: "crucial",
    word: "crucial",
    pos: "adjective",
    level: "b2-core",
    topic: "general",
    definition_en: "decisive or critical, especially in the success of something",
    definition_id: "sangat penting; krusial",
    example_en: "Water is crucial for survival.",
    example_id: "Air sangat penting untuk kelangsungan hidup.",
    source: "oxford_5000",
  },
];

const SAMPLE_POOL: VocabEntry[] = RAW_POOL.map((r) => VocabEntrySchema.parse(r));

describe("Vocab Question Factory", () => {
  describe("pickDistractors", () => {
    it("uses explicit distractors if available and sufficient", () => {
      const distractors = pickDistractors(SAMPLE_POOL[0], SAMPLE_POOL, 3, "word");
      expect(distractors).toHaveLength(3);
      expect(distractors).toEqual(["ample", "scattered", "fragile"]);
    });

    it("auto-generates distractors from pool matching same level & POS if explicit missing", () => {
      const entryWithoutDistractors = SAMPLE_POOL[2]; // fragile
      const distractors = pickDistractors(entryWithoutDistractors, SAMPLE_POOL, 3, "word");
      expect(distractors).toHaveLength(3);
      expect(distractors).not.toContain(entryWithoutDistractors.word);
    });
  });

  describe("Type 1: Multiple Choice (MCQ)", () => {
    it("generates 4 options with exact answerIndex pointing to the correct choice", () => {
      const mcq = createMcqQuestion(SAMPLE_POOL[0], SAMPLE_POOL, "word_to_def");
      expect(mcq.type).toBe("mcq");
      expect(mcq.word_id).toBe("abundant");
      expect(mcq.options).toHaveLength(4);
      expect(mcq.answerIndex).toBeGreaterThanOrEqual(0);
      expect(mcq.answerIndex).toBeLessThan(4);
      expect(mcq.options[mcq.answerIndex]).toBe(SAMPLE_POOL[0].definition_en);
    });

    it("supports def_to_word direction", () => {
      const mcq = createMcqQuestion(SAMPLE_POOL[0], SAMPLE_POOL, "def_to_word");
      expect(mcq.options[mcq.answerIndex]).toBe("abundant");
    });
  });

  describe("Type 2: True / False", () => {
    it("generates a valid statement with boolean isTrue", () => {
      const tfTrue = createTrueFalseQuestion(SAMPLE_POOL[0], SAMPLE_POOL, true);
      expect(tfTrue.type).toBe("true_false");
      expect(tfTrue.isTrue).toBe(true);
      expect(tfTrue.statement).toContain("abundant");
      expect(tfTrue.statement).toContain(SAMPLE_POOL[0].definition_en);

      const tfFalse = createTrueFalseQuestion(SAMPLE_POOL[0], SAMPLE_POOL, false);
      expect(tfFalse.isTrue).toBe(false);
      expect(tfFalse.statement).toContain("abundant");
      expect(tfFalse.statement).not.toContain(SAMPLE_POOL[0].definition_en);
    });
  });

  describe("Type 3: Matching (4 or 6 pairs)", () => {
    it("generates 4 pairs with shuffled left and right items", () => {
      const matching = createMatchingQuestion(SAMPLE_POOL.slice(0, 4), 4);
      expect(matching.type).toBe("matching");
      expect(matching.pairs).toHaveLength(4);
      expect(matching.leftItems).toHaveLength(4);
      expect(matching.rightItems).toHaveLength(4);

      // Verify pair ids match
      const leftIds = matching.leftItems.map((i) => i.id).sort();
      const rightIds = matching.rightItems.map((i) => i.id).sort();
      expect(leftIds).toEqual(rightIds);
    });

    it("generates 6 pairs when 6 entries provided", () => {
      const matching = createMatchingQuestion(SAMPLE_POOL.slice(0, 6), 6);
      expect(matching.pairs).toHaveLength(6);
    });
  });

  describe("Type 4: Complete the Sentence (Cloze)", () => {
    it("creates cloze with blank replacing target word in example_en", () => {
      const cloze = createClozeQuestion(SAMPLE_POOL[0], SAMPLE_POOL, "word_bank");
      expect(cloze.type).toBe("cloze");
      expect(cloze.sentenceWithBlank).toContain("_____");
      expect(cloze.sentenceWithBlank).not.toContain("abundant");
      expect(cloze.wordBank).toHaveLength(4);
      expect(cloze.wordBank).toContain("abundant");
    });

    it("checks cloze answer accepting exact match, synonyms, and edit distance <= 1", () => {
      const cloze = createClozeQuestion(SAMPLE_POOL[0], SAMPLE_POOL, "type");
      expect(checkClozeAnswer("abundant", cloze)).toBe(true);
      expect(checkClozeAnswer("Abundant", cloze)).toBe(true);
      expect(checkClozeAnswer("abundnt", cloze)).toBe(true); // edit distance 1
      expect(checkClozeAnswer("plentiful", cloze)).toBe(true); // synonym
      expect(checkClozeAnswer("completely wrong", cloze)).toBe(false);
    });
  });

  describe("Type 5: Best Word in Context", () => {
    it("generates 4 word choices for sentence context with correct answerIndex", () => {
      const bestWord = createBestWordQuestion(SAMPLE_POOL[0], SAMPLE_POOL);
      expect(bestWord.type).toBe("best_word");
      expect(bestWord.sentenceWithBlank).toContain("_____");
      expect(bestWord.options).toHaveLength(4);
      expect(bestWord.options[bestWord.answerIndex]).toBe("abundant");
    });
  });

  describe("generateVocabQuiz (session quiz builder)", () => {
    it("generates a session with requested count and all 5 types", () => {
      const quiz = generateVocabQuiz(SAMPLE_POOL, {
        count: 5,
        types: ["mcq", "true_false", "matching", "cloze", "best_word"],
      });
      expect(quiz).toHaveLength(5);
      const types = quiz.map((q) => q.type);
      expect(types).toContain("mcq");
      expect(types).toContain("true_false");
      expect(types).toContain("matching");
      expect(types).toContain("cloze");
      expect(types).toContain("best_word");
    });

    it("prioritizes seedWordIds (e.g. SRS reviews)", () => {
      const quiz = generateVocabQuiz(SAMPLE_POOL, {
        count: 3,
        types: ["mcq"],
        seedWordIds: ["dense", "scarce"],
      });
      const wordIds = quiz.map((q) => q.word_id);
      expect(wordIds).toContain("dense");
      expect(wordIds).toContain("scarce");
    });
  });
});
