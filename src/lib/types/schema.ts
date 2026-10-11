import { z } from "zod";

export const LevelSchema = z.enum(["b1-core", "b1-plus", "b2-core", "b2-mastery"]);
export type Level = z.infer<typeof LevelSchema>;

export const IdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function csvList(optional = true) {
  const inner = optional ? z.array(z.string()).optional() : z.array(z.string());
  return z.preprocess((v) => {
    if (v === undefined || v === null) return undefined;
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      const t = v.trim();
      if (t === "") return undefined;
      return t
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return v;
  }, inner);
}

export const VocabEntrySchema = z.object({
  id: IdSchema,
  word: z.string().min(1),
  pos: z.string().min(1),
  level: LevelSchema,
  topic: z.string().min(1),
  definition_en: z.string().min(1),
  definition_id: z.string().min(1),
  example_en: z.string().min(1),
  example_id: z.string().min(1),
  synonyms: csvList(),
  antonyms: csvList(),
  distractors: csvList(),
  collocations: csvList(),
  source: z.string().min(1),
  mastery_level: z.number().int().min(0).optional(),
});
export type VocabEntry = z.infer<typeof VocabEntrySchema>;

export const ReadingPassageSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  level: LevelSchema,
  topic: z.string().min(1),
  body: z.string().min(1),
});
export type ReadingPassage = z.infer<typeof ReadingPassageSchema>;

const SentenceCompletionSchema = z.object({
  id: IdSchema,
  type: z.literal("sentence_completion"),
  gap: z.number().int().positive(),
  options: z.array(z.string().min(1)).length(4),
  answer: z.number().int().min(0).max(3),
  explanation_en: z.string().optional(),
  explanation_id: z.string().optional(),
});

const HighlightTapSchema = z.object({
  id: IdSchema,
  type: z.literal("highlight_idea"),
  variant: z.literal("tap_sentence"),
  prompt: z.string().min(1),
  answer_sentences: z.array(z.number().int().min(0)).min(1),
  answer_text: z.string().optional(),
});

const HighlightChooseSchema = z.object({
  id: IdSchema,
  type: z.literal("highlight_idea"),
  variant: z.literal("choose_idea"),
  sentence: z.number().int().min(0),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answer: z.number().int().min(0),
});

const BestTitleSchema = z.object({
  id: IdSchema,
  type: z.literal("best_title"),
  options: z.array(z.string().min(1)).length(4),
  answer: z.number().int().min(0).max(3),
});

export const ReadingQuestionItemSchema = z.union([
  SentenceCompletionSchema,
  HighlightTapSchema,
  HighlightChooseSchema,
  BestTitleSchema,
]);
export type ReadingQuestionItem = z.infer<typeof ReadingQuestionItemSchema>;

export const ReadingQuestionsSchema = z.object({
  passage_id: IdSchema,
  items: z.array(ReadingQuestionItemSchema).min(1),
});
export type ReadingQuestions = z.infer<typeof ReadingQuestionsSchema>;

const SentenceOrderSchema = z.object({
  id: IdSchema,
  type: z.literal("sentence_order"),
  level: LevelSchema,
  words: z.array(z.string().min(1)).min(2),
  correct: z.string().min(1),
  alternatives: z.array(z.string()).default([]),
  grammar_focus: z.string().optional(),
});

const GrammarFixSchema = z.object({
  id: IdSchema,
  type: z.literal("grammar_fix"),
  level: LevelSchema,
  sentence: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
  hint: z.string().optional(),
  explanation_id: z.string().optional(),
});

const ImageDescriptionSchema = z.object({
  id: IdSchema,
  type: z.literal("image_description"),
  level: LevelSchema,
  image: z.string().min(1),
  prompt: z.string().min(1),
  model_answer: z.string().min(1),
  keywords: z.preprocess((v) => {
    if (typeof v === "string") {
      const t = v.trim();
      if (t === "") return [];
      return t
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return v;
  }, z.array(z.string()).min(1)),
  self_score_max: z.number().int().positive().optional(),
});

export const WritingPromptSchema = z.union([
  SentenceOrderSchema,
  GrammarFixSchema,
  ImageDescriptionSchema,
]);
export type WritingPrompt = z.infer<typeof WritingPromptSchema>;

export const WritingPromptsFileSchema = z.object({
  items: z.array(WritingPromptSchema).min(1),
});
export type WritingPromptsFile = z.infer<typeof WritingPromptsFileSchema>;
