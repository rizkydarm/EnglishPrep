import { describe, expect, it } from "vitest";
import { VocabEntrySchema } from "./schema.js";
describe("VocabEntry", () => {
  it("rejects bad level", () => {
    expect(() => VocabEntrySchema.parse({ id: "x", word: "x", pos: "noun", level: "C2", topic: "work", definition_en: "d", definition_id: "d", example_en: "e", example_id: "e", source: "s" })).toThrow();
  });
  it("accepts full PRD example abundant", () => {
    expect(() => VocabEntrySchema.parse({ id: "abundant", word: "abundant", pos: "adjective", level: "b2-core", topic: "environment", definition_en: "existing in large quantities; more than enough", definition_id: "berlimpah", example_en: "The region has abundant supplies of fresh water.", example_id: "x", source: "oxford_5000" })).not.toThrow();
  });
});
