import { describe, expect, it } from "vitest";
import { findDuplicateIds, formatDuplicate } from "./integrity.js";

describe("findDuplicateIds", () => {
  it("returns [] when every id is unique", () => {
    const dups = findDuplicateIds([
      { id: "abundant", source: "vocab" },
      { id: "remote-work", source: "reading/passages" },
      { id: "wr-001", source: "writing/prompts.json" },
    ]);
    expect(dups).toEqual([]);
  });

  it("detects an id shared across two content types", () => {
    const dups = findDuplicateIds([
      { id: "shared", source: "vocab" },
      { id: "shared", source: "reading/passages" },
      { id: "unique", source: "vocab" },
    ]);
    expect(dups).toHaveLength(1);
    expect(dups[0].id).toBe("shared");
    expect([...dups[0].sources].sort()).toEqual(["reading/passages", "vocab"]);
  });

  it("detects an id repeated inside a single source", () => {
    const dups = findDuplicateIds([
      { id: "dup", source: "vocab" },
      { id: "dup", source: "vocab" },
    ]);
    expect(dups).toHaveLength(1);
    expect(dups[0].sources).toEqual(["vocab", "vocab"]);
  });

  it("is deterministic, sorted by id", () => {
    const dups = findDuplicateIds([
      { id: "z", source: "a" },
      { id: "z", source: "b" },
      { id: "a", source: "a" },
      { id: "a", source: "b" },
    ]);
    expect(dups.map((d) => d.id)).toEqual(["a", "z"]);
  });

  it("formats a duplicate with its sources", () => {
    const dups = findDuplicateIds([
      { id: "dup", source: "vocab" },
      { id: "dup", source: "writing/prompts.json" },
    ]);
    expect(formatDuplicate(dups[0])).toBe(
      'duplicate id "dup" appears 2 times: vocab, writing/prompts.json',
    );
  });
});
