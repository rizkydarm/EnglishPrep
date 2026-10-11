import { describe, expect, it } from "vitest";
import { loadPassage, loadQuestions, loadVocab } from "./loader.js";

const VOCAB_CSV = `id,word,pos,level,topic,definition_en,definition_id,example_en,example_id,source
abundant,abundant,adjective,b2-core,environment,"existing in large quantities, more than enough",berlimpah,"The region has abundant supplies of fresh water.",Contoh,oxford_5000`;

const VOCAB_JSON = JSON.stringify([
  {
    id: "abundant",
    word: "abundant",
    pos: "adjective",
    level: "b2-core",
    topic: "environment",
    definition_en: "existing in large quantities",
    definition_id: "berlimpah",
    example_en: "The region has abundant supplies of fresh water.",
    example_id: "Contoh",
    source: "oxford_5000",
  },
]);

const PASSAGE_MD = `---
id: climate-change
title: Climate Change
level: b2-core
topic: environment
---
The climate is changing. [[GAP:1]] Scientists agree on this. [[GAP:2]] Action is needed.`;

describe("loadVocab", () => {
  it("skips invalid file instead of throwing", () => {
    const bad = JSON.stringify([{ id: "BAD ID!!", word: "", level: "C2" }]);
    let result;
    expect(() => {
      result = loadVocab([{ file: "bad.json", content: bad }]);
    }).not.toThrow();
    expect(result!.ok).toEqual([]);
    expect(result!.skipped).toHaveLength(1);
    expect(result!.skipped[0].file).toBe("bad.json");
    expect(typeof result!.skipped[0].reason).toBe("string");
  });

  it("parses CSV quoted commas via PapaParse (not naive split)", () => {
    const result = loadVocab([{ file: "vocab.csv", content: VOCAB_CSV }]);
    expect(result.skipped).toEqual([]);
    expect(result.ok).toHaveLength(1);
    expect(result.ok[0].definition_en).toBe("existing in large quantities, more than enough");
    expect(result.ok[0].id).toBe("abundant");
  });

  it("loads JSON vocab", () => {
    const result = loadVocab([{ file: "vocab.json", content: VOCAB_JSON }]);
    expect(result.skipped).toEqual([]);
    expect(result.ok).toHaveLength(1);
  });
});

describe("loadPassage", () => {
  it("parses gray-matter frontmatter + body", () => {
    const result = loadPassage([{ file: "climate-change.md", content: PASSAGE_MD }]);
    expect(result.skipped).toEqual([]);
    expect(result.ok).toHaveLength(1);
    expect(result.ok[0].id).toBe("climate-change");
    expect(result.ok[0].title).toBe("Climate Change");
    expect(result.ok[0].body).toContain("The climate is changing.");
  });

  it("rejects duplicate GAP numbers", () => {
    const dup = `---
id: dup-gaps
title: Dup
level: b1-core
topic: work
---
First [[GAP:1]] second [[GAP:1]] end.`;
    const result = loadPassage([{ file: "dup.md", content: dup }]);
    expect(result.ok).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/duplicate/i);
  });

  it("rejects missing GAP numbers in sequence", () => {
    const missing = `---
id: missing-gap
title: Missing
level: b1-core
topic: work
---
First [[GAP:1]] then [[GAP:3]] end.`;
    const result = loadPassage([{ file: "missing.md", content: missing }]);
    expect(result.ok).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/missing|sequence|gap/i);
  });

  it("skips invalid passage instead of throwing", () => {
    const result = loadPassage([{ file: "bad.md", content: "no frontmatter at all" }]);
    expect(result.ok).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].file).toBe("bad.md");
  });
});

describe("loadQuestions", () => {
  it("loads valid questions file", () => {
    const content = JSON.stringify({
      passage_id: "climate-change",
      items: [
        {
          id: "climate-change-q1",
          type: "sentence_completion",
          gap: 1,
          options: ["a", "b", "c", "d"],
          answer: 0,
        },
      ],
    });
    const result = loadQuestions([{ file: "q.json", content }]);
    expect(result.skipped).toEqual([]);
    expect(result.ok).toHaveLength(1);
  });

  it("skips invalid questions instead of throwing", () => {
    const result = loadQuestions([{ file: "bad.json", content: "{ not json" }]);
    expect(result.ok).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].file).toBe("bad.json");
  });
});

describe("malformed-file quarantine", () => {
  it("keeps valid files and isolates a malformed sibling without crashing", () => {
    const malformed = "{ this is not json at all";
    let result;
    expect(() => {
      result = loadVocab([
        { file: "good.json", content: VOCAB_JSON },
        { file: "bad.json", content: malformed },
      ]);
    }).not.toThrow();
    expect(result!.ok).toHaveLength(1);
    expect(result!.ok[0].id).toBe("abundant");
    expect(result!.skipped).toHaveLength(1);
    expect(result!.skipped[0].file).toBe("bad.json");
  });

  it("quarantines a passage with broken frontmatter and keeps the valid one", () => {
    const result = loadPassage([
      { file: "climate-change.md", content: PASSAGE_MD },
      { file: "broken.md", content: "no frontmatter at all" },
    ]);
    expect(result.ok).toHaveLength(1);
    expect(result.ok[0].id).toBe("climate-change");
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].file).toBe("broken.md");
  });
});
