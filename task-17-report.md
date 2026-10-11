## Fix round 2

- `src/lib/utils/normalize.ts`: one-line comment above `levenshtein` documenting raw
  (non-normalized) comparison is intentional — diacritics/case count as edits;
  callers should normalize first if needed. No behavior change.
- `src/lib/stores/progress.svelte.ts`: `resetAll()` now also resets
  `profile.total_words_mastered` to 0 and persists `profile.json`
  (fixes stale-count bug where mastered count survived a reset).
- Verify: `bunx vitest run src/lib/utils/normalize.test.ts` → 12/12 passed;
  `bun run check` (svelte-check) → 0 errors, 1 pre-existing baseUrl deprecation warning.
