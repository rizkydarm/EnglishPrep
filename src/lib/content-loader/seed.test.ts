import { describe, expect, it } from "vitest";
import { WritingPromptsFileSchema } from "../types/schema.js";
import { findDuplicateIds, type IdRef } from "./integrity.js";
import { loadPassage, loadQuestions, loadVocab, type ContentFile } from "./loader.js";
import { extractGapNumbers, splitSentences } from "./reading.js";

const vocabModules = import.meta.glob("/src-tauri/resources/content/vocab/*.{csv,json}", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const passageModules = import.meta.glob("/src-tauri/resources/content/reading/passages/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const questionModules = import.meta.glob("/src-tauri/resources/content/reading/questions/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const writingModules = import.meta.glob("/src-tauri/resources/content/writing/prompts.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function toFiles(modules: Record<string, string>): ContentFile[] {
  return Object.entries(modules)
    .map(([path, content]) => ({ file: path.replace(/^.*\/content\//, ""), content }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

const vocabFiles = () => toFiles(vocabModules);
const passageFiles = () => toFiles(passageModules);
const questionFiles = () => toFiles(questionModules);

describe("seed vocab", () => {
  it("has 50 valid entries, no skips, unique ids", () => {
    const { ok, skipped } = loadVocab(vocabFiles());
    expect(skipped).toEqual([]);
    expect(ok).toHaveLength(50);
    expect(new Set(ok.map((v) => v.id)).size).toBe(50);
  });

  it("spans all four levels", () => {
    const { ok } = loadVocab(vocabFiles());
    expect(new Set(ok.map((v) => v.level))).toEqual(
      new Set(["b1-core", "b1-plus", "b2-core", "b2-mastery"]),
    );
  });
});

describe("seed reading", () => {
  it("has 5 valid passages with the required level spread", () => {
    const { ok, skipped } = loadPassage(passageFiles());
    expect(skipped).toEqual([]);
    expect(ok).toHaveLength(5);
    const byLevel = ok.reduce<Record<string, number>>((acc, p) => {
      acc[p.level] = (acc[p.level] ?? 0) + 1;
      return acc;
    }, {});
    expect(byLevel).toEqual({ "b1-core": 1, "b1-plus": 1, "b2-core": 2, "b2-mastery": 1 });
  });

  it("has a questions file per passage, all linked to real passages", () => {
    const passages = loadPassage(passageFiles()).ok;
    const { ok, skipped } = loadQuestions(questionFiles());
    expect(skipped).toEqual([]);
    expect(ok).toHaveLength(5);
    const ids = new Set(passages.map((p) => p.id));
    for (const q of ok) expect(ids.has(q.passage_id)).toBe(true);
  });

  it("keeps gaps and highlight indices consistent with each passage", () => {
    const passages = loadPassage(passageFiles()).ok;
    const questions = loadQuestions(questionFiles()).ok;
    const problems: string[] = [];
    for (const q of questions) {
      const passage = passages.find((p) => p.id === q.passage_id);
      if (passage === undefined) {
        problems.push(`${q.passage_id}: no matching passage`);
        continue;
      }
      const sentences = splitSentences(passage.body);
      const gaps = extractGapNumbers(passage.body);
      const asked = new Set<number>();
      for (const item of q.items) {
        if (item.type === "sentence_completion") {
          asked.add(item.gap);
          if (!gaps.includes(item.gap)) {
            problems.push(`${q.passage_id} ${item.id}: gap ${item.gap} is not marked in the passage`);
          }
        }
        if (item.type === "highlight_idea" && item.variant === "tap_sentence") {
          for (const idx of item.answer_sentences) {
            if (idx >= sentences.length) {
              problems.push(`${q.passage_id} ${item.id}: index ${idx} out of range (${sentences.length} sentences)`);
            }
          }
          if (item.answer_text !== undefined && sentences[item.answer_sentences[0]] !== item.answer_text) {
            problems.push(`${q.passage_id} ${item.id}: answer_text does not match sentence ${item.answer_sentences[0]}`);
          }
        }
        if (item.type === "highlight_idea" && item.variant === "choose_idea") {
          if (item.sentence >= sentences.length) {
            problems.push(`${q.passage_id} ${item.id}: sentence ${item.sentence} out of range`);
          }
        }
      }
      for (const g of gaps) {
        if (!asked.has(g)) problems.push(`${q.passage_id}: gap ${g} has no matching question`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("seed writing", () => {
  it("has 10 valid prompts covering the three types", () => {
    const entries = Object.values(writingModules);
    if (entries.length !== 1) expect.fail("writing/prompts.json is missing");
    const parsed = WritingPromptsFileSchema.safeParse(JSON.parse(entries[0]));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.items).toHaveLength(10);
    expect(new Set(parsed.data.items.map((i) => i.type))).toEqual(
      new Set(["sentence_order", "grammar_fix", "image_description"]),
    );
  });
});

describe("seed id integrity", () => {
  it("has globally unique ids across vocab, passages, questions, and prompts", () => {
    const refs: IdRef[] = [];
    for (const v of loadVocab(vocabFiles()).ok) refs.push({ id: v.id, source: "vocab" });
    for (const p of loadPassage(passageFiles()).ok) {
      refs.push({ id: p.id, source: "reading/passages" });
    }
    for (const q of loadQuestions(questionFiles()).ok) {
      for (const item of q.items) {
        refs.push({ id: item.id, source: `reading/questions/${q.passage_id}` });
      }
    }
    const writing = WritingPromptsFileSchema.safeParse(
      JSON.parse(Object.values(writingModules)[0]),
    );
    if (!writing.success) expect.fail("writing/prompts.json is invalid");
    for (const item of writing.data.items) {
      refs.push({ id: item.id, source: "writing/prompts.json" });
    }
    expect(findDuplicateIds(refs)).toEqual([]);
  });
});
