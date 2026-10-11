# TASKS.md — IELTS & TOEIC Preps (Single Source of Truth)

> Kanban untuk 3-agent team. `git pull` = lihat progress.
> Status: `todo / doing / review / done`. 1 task = 1 file, 1 agent, ≤15 menit, 1 commit.
> Detail step-by-step Epic 0 ada di `docs/superpowers/plans/2026-10-11-mvp-foundation.md`.

**Legend:** `agy` = Antigravity/Gemini (reviewer + audit + interaksi kompleks) ·
`muse` = Muse Spark/Opencode (eksekutor Svelte/Tauri) ·
`deepseek` = DeepSeek (skema, parser, test, seed content massal)

## Epic 0 — Foundation & Contracts (P0, jalan dulu)

### T-001 — [deepseek] Toolchain test + deps konten
- **Agent:** deepseek · **Estimasi:** 10 mnt · **File:** `package.json`, `scripts/validate-content.ts`
- **Depends On:** none
- **Steps:** `bun add zod papaparse gray-matter` + `bun add -d vitest`; script Zod dry-run
- **Acceptance:** `bun run check` hijau, `bunx vitest run` hijau (0 test ok)
- **Status:** done (4849459, review: 1 parked minor → T-005)

### T-002 — [deepseek] Zod schema = kontrak PRD §6.3–6.6
- **Agent:** deepseek · **Estimasi:** 12 mnt · **File:** `src/lib/types/schema.ts`
- **Depends On:** T-001
- **Acceptance:** export `VocabEntry, ReadingPassage, ReadingQuestions, WritingPrompt, Level`; invalid `level` ditolak; test `schema.test.ts` hijau
- **Status:** done (9194727, review clean, 2 minors deferred)

### T-003 — [deepseek] Content loader + quarantine (PRD §6.7)
- **Agent:** deepseek · **Estimasi:** 15 mnt · **File:** `src/lib/content-loader/loader.ts`
- **Depends On:** T-002
- **Acceptance:** file invalid di-skip + warning (tidak crash); CSV semicolon-list + PapaParse; MD gray-matter + `[[GAP:n]]`; test loader hijau
- **Status:** todo

### T-004 — [muse] Tauri offline hardening (PRD §4, §12)
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/lib.rs`
- **Depends On:** none
- **Acceptance:** plugins `fs, store, dialog, path` saja; CSP block network; `~/Library/Application Support/com.ielts-toeic-preps/content/` seed-copy on first run; `bun run tauri dev` jalan
- **Status:** todo

### T-005 — [deepseek] Seed content valid (PRD §11)
- **Agent:** deepseek · **Estimasi:** 15 mnt · **File:** `src-tauri/resources/content/**` (50 vocab, 5 reading, 10 writing)
- **Depends On:** T-002, T-003
- **Acceptance:** `bun run validate:content` hijau; 1 B1-Core, 1 B1+, 2 B2-Core, 1 B2-Mastery reading
- **Status:** todo

### T-006 — [agy] Security + schema review Epic 0
- **Agent:** agy · **Estimasi:** 8 mnt · **File:** review `src/lib/types/schema.ts`, `src/lib/content-loader/*`, `src-tauri/**`
- **Depends On:** T-003, T-004, T-005
- **Acceptance:** tidak ada SQL/path injection via `id`, tidak ada network call, ada index/unique `id`; temuan → balikin status ke `todo`
- **Status:** todo

## Epic 1 — Vocab Engine (PRD §7.4, 5 tipe)

### T-007 — [muse] SRS + scoring utils (Leitner 1-3-7-14-30)
- **Agent:** muse · **Estimasi:** 10 mnt · **File:** `src/lib/utils/srs.ts`, `src/lib/utils/scoring.ts`
- **Depends On:** T-002
- **Acceptance:** correct→box+1, wrong→box 1, box5=mastered; matching partial `correct_pairs/total_pairs`; test hijau
- **Status:** todo

### T-008 — [muse] Vocab question factory (5 tipe + auto-distractor)
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/utils/vocab-factory.ts`
- **Depends On:** T-007
- **Acceptance:** MCQ 4 opsi, T/F, matching 4/6 pasang, cloze type+wordbank (edit-distance ≤1), best-word-context; distractor auto same-level/POS; no-repeat per session
- **Status:** todo

### T-009 — [muse] Vocab UI: VocabCard + MatchingGrid + ClozeInput
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/components/quiz/VocabCard.svelte`, `MatchingGrid.svelte`, `ClozeInput.svelte`
- **Depends On:** T-008
- **Acceptance:** tap-to-pair (bukan drag), keyboard 1-4/Enter/Esc, feedback hijau/shake 250ms; `prefers-reduced-motion` ok
- **Status:** todo

### T-010 — [agy] A11y + motion audit Vocab UI
- **Agent:** agy · **Estimasi:** 8 mnt · **File:** review Epic 1 UI
- **Depends On:** T-009
- **Acceptance:** focus ring, AA contrast light/dark, tap target ≥44px, tidak ada drag; temuan → `todo`
- **Status:** todo

## Epic 2 — Reading Engine (PRD §7.5)

### T-011 — [deepseek] Reading parser (sentence split + GAP)
- **Agent:** deepseek · **Estimasi:** 10 mnt · **File:** `src/lib/content-loader/reading.ts`
- **Depends On:** T-003
- **Acceptance:** split kalimat deterministik, `[[GAP:n]]` → gap index; test 3 passage hijau
- **Status:** todo

### T-012 — [muse] Reading UI: passage + tap-to-select highlight
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/components/quiz/ReadingPassage.svelte`, `HighlightPassage.svelte`
- **Depends On:** T-011
- **Acceptance:** side-by-side → stacked <960px; tap kalimat (bukan free-select); gap-fill 4 opsi, best-title 4 opsi; grading deterministik
- **Status:** todo

### T-013 — [agy] Grading-fallback review Reading
- **Agent:** agy · **Estimasi:** 8 mnt · **File:** review `ReadingPassage.svelte`, `reading.ts`
- **Depends On:** T-012
- **Acceptance:** fallback overlap ≥70% hanya opsional, default tap; tidak ada false-pass pada paraphrase
- **Status:** todo

## Epic 3 — Writing Engine (PRD §7.6)

### T-014 — [muse] Writing grader deterministik (normalize compare)
- **Agent:** muse · **Estimasi:** 10 mnt · **File:** `src/lib/utils/normalize.ts`
- **Depends On:** T-002
- **Acceptance:** case/punctuation-insensitive, `correct+alternatives` untuk sentence-order, `accepted[]` untuk grammar-fix; test hijau
- **Status:** todo

### T-015 — [muse] Writing UI: order chips + fix input + image self-score
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/components/quiz/WritingEditor.svelte`
- **Depends On:** T-014
- **Acceptance:** tap chips (bukan drag), image → model answer + keyword checklist + self-score 1-5 (excluded dari auto %); rubrik terlihat
- **Status:** todo

### T-016 — [agy] Rubrik-honesty review Writing
- **Agent:** agy · **Estimasi:** 8 mnt · **File:** review `WritingEditor.svelte`, `normalize.ts`
- **Depends On:** T-015
- **Acceptance:** self-assessed selalu dilabeli terpisah, tidak masuk auto %; tidak ada klaim auto-grade LLM
- **Status:** todo

## Epic 4 — Session Flow (PRD §7.1–7.3, §7.7)

### T-017 — [muse] Stores: quiz + settings + progress + srs (tauri-plugin-store)
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src/lib/stores/quiz.ts`, `settings.ts`, `progress.ts`, `srs.ts`
- **Depends On:** T-004, T-007
- **Acceptance:** `settings.json, profile.json, progress.json, srs.json, history.json` lokal; localStorage hanya cache; Reload Content + Open Folder jalan
- **Status:** todo

### T-018 — [muse] Views: Home + Setup Sheet + QuizShell + Results
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/views/Home.svelte`, `SetupSheet.svelte`, `QuizShell.svelte`, `Results.svelte`
- **Depends On:** T-009, T-012, T-015, T-017
- **Acceptance:** 3 mode terpisah (never mixed); setup count/difficulty/timer/cloze/pair-count; progress segmented + timer ring; exit→confirm + discard; confetti ≥80%; review wrong + ID translation
- **Status:** todo

### T-019 — [agy] UX + offline review Session Flow
- **Agent:** agy · **Estimasi:** 10 mnt · **File:** review Epic 4
- **Depends On:** T-018
- **Acceptance:** Wi-Fi off tetap jalan; cold start <2s; render <100ms; light/dark + Sans/Serif/Mono instan
- **Status:** todo

## Epic 5 — SRS + Dashboard + Settings (PRD §7.8–7.10, §8)

### T-020 — [muse] SRS queue (~30% inject) + Review Wrong + Review Session
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src/lib/utils/review-queue.ts`
- **Depends On:** T-007, T-017
- **Acceptance:** due-words masuk quiz ~30% lintas level; Review Wrong replay missed-only; Dashboard Start Review dari due-today
- **Status:** todo

### T-021 — [muse] Dashboard + Settings views
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src/lib/views/Dashboard.svelte`, `SettingsView.svelte`
- **Depends On:** T-020
- **Acceptance:** learning vs mastered, per-level, due count; 30-day bar chart; history table + detail + review-wrong; appearance/font/sound/difficulty/timer/reset double-confirm
- **Status:** todo

### T-022 — [deepseek] Acceptance seed + validate script CI
- **Agent:** deepseek · **Estimasi:** 10 mnt · **File:** `scripts/validate-content.ts`, `package.json` (`validate:content`)
- **Depends On:** T-021
- **Acceptance:** PRD §14 checklist 13 baris ter-cover; malformed file → toast + skip (tidak crash)
- **Status:** todo

### T-023 — [agy] Final whole-branch review (merge gate)
- **Agent:** agy · **Estimasi:** 15 mnt · **File:** full diff `main..HEAD`
- **Depends On:** T-006, T-010, T-013, T-016, T-019, T-022
- **Acceptance:** semua acceptance §14 hijau; tidak ada network; tidak ada drag&drop; 1 fix-wave max, lalu adjudicate
- **Status:** todo

## DAG (urutan eksekusi)
```
T-001 ─┬─→ T-002 ─┬─→ T-003 ─→ T-011 ─→ T-012 ─→ T-013 ─┐
       │          ├─→ T-007 ─→ T-008 ─→ T-009 ─→ T-010 ─┤
       │          └─→ T-014 ─→ T-015 ─→ T-016 ──────────┤
T-004 ─┴─→ T-017 ─→ T-020 ─→ T-021 ─→ T-022 ───────────┤
T-005 ─→ T-006 ────────────────────────────────────────┤
                         T-018 ─→ T-019 ─→ T-023 (gate)
```
Paralel aman: T-001∥T-004. Lalu T-002. Lalu T-003∥T-007∥T-014. deepseek tidak blokir muse kecuali di Depends On.
