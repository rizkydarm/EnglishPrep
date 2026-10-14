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
- **Status:** done (19af71a, review clean, 2 minors deferred)

### T-004 — [muse] Tauri offline hardening (PRD §4, §12)
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/lib.rs`
- **Depends On:** none
- **Acceptance:** plugins `fs, store, dialog, path` saja; CSP block network; `~/Library/Application Support/com.ielts-toeic-preps/content/` seed-copy on first run; `bun run tauri dev` jalan
- **Status:** done (9f8f3e9, review clean; scope minors → T-006)

### T-005 — [deepseek] Seed content valid (PRD §11)
- **Agent:** deepseek · **Estimasi:** 15 mnt · **File:** `src-tauri/resources/content/**` (50 vocab, 5 reading, 10 writing)
- **Depends On:** T-002, T-003
- **Acceptance:** `bun run validate:content` hijau; 1 B1-Core, 1 B1+, 2 B2-Core, 1 B2-Mastery reading
- **Status:** done (25f143a proxy + b36875b deepseek fix; 4 answer indices corrected, missing gap-3 question added; images placeholder per PRD §11)

### T-006 — [agy] Security + schema review Epic 0
- **Agent:** agy · **Estimasi:** 8 mnt · **File:** review `src/lib/types/schema.ts`, `src/lib/content-loader/*`, `src-tauri/**`
- **Depends On:** T-003, T-004, T-005
- **Acceptance:** tidak ada SQL/path injection via `id`, tidak ada network call, ada index/unique `id`; temuan → balikin status ke `todo`
- **Status:** done (review clean, SPEC ✅; 2 advisories logged in PROGRESS.md)

## Epic 1 — Vocab Engine (PRD §7.4, 5 tipe)

### T-007 — [muse] SRS + scoring utils (Leitner 1-3-7-14-30)
- **Agent:** muse · **Estimasi:** 10 mnt · **File:** `src/lib/utils/srs.ts`, `src/lib/utils/scoring.ts`
- **Depends On:** T-002
- **Acceptance:** correct→box+1, wrong→box 1, box5=mastered; matching partial `correct_pairs/total_pairs`; test hijau
- **Status:** done (ad25c4c deepseek proxy; srs 9/9, scoring 4/4, suite 38/38, check 0 errors)

### T-008 — [muse] Vocab question factory (5 tipe + auto-distractor)
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/utils/vocab-factory.ts`
- **Depends On:** T-007
- **Acceptance:** MCQ 4 opsi, T/F, matching 4/6 pasang, cloze type+wordbank (edit-distance ≤1), best-word-context; distractor auto same-level/POS; no-repeat per session
- **Status:** done (agy proxy for muse; vocab-factory 5 types + auto-distractor + fuzzy cloze; test 12/12)

### T-009 — [muse] Vocab UI: VocabCard + MatchingGrid + ClozeInput
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/components/quiz/VocabCard.svelte`, `MatchingGrid.svelte`, `ClozeInput.svelte`
- **Depends On:** T-008
- **Acceptance:** tap-to-pair (bukan drag), keyboard 1-4/Enter/Esc, feedback hijau/shake 250ms; `prefers-reduced-motion` ok
- **Status:** done (channel split fixed, re-review 4/5; shortcuts → T-010)

### T-010 — [agy] A11y + motion audit Vocab UI
- **Agent:** agy · **Estimasi:** 8 mnt · **File:** review Epic 1 UI
- **Depends On:** T-009
- **Acceptance:** focus ring, AA contrast light/dark, tap target ≥44px, tidak ada drag; temuan → `todo`
- **Status:** done (agy review PASS: focus rings, AA contrast, 44px tap targets, 250ms motion, reduced-motion ok)

## Epic 2 — Reading Engine (PRD §7.5)

### T-011 — [deepseek] Reading parser (sentence split + GAP)
- **Agent:** deepseek · **Estimasi:** 10 mnt · **File:** `src/lib/content-loader/reading.ts`
- **Depends On:** T-003
- **Acceptance:** split kalimat deterministik, `[[GAP:n]]` → gap index; test 3 passage hijau
- **Status:** done (3e77441; reading.test 8/8, suite 25/25, check 0 errors)

### T-012 — [muse] Reading UI: passage + tap-to-select highlight
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/components/quiz/ReadingPassage.svelte`, `HighlightPassage.svelte`
- **Depends On:** T-011
- **Acceptance:** side-by-side → stacked <960px; tap kalimat (bukan free-select); gap-fill 4 opsi, best-title 4 opsi; grading deterministik
- **Status:** done (c599625 + fix f0f5e9d, re-review 6/6, build passes)

### T-013 — [agy] Grading-fallback review Reading
- **Agent:** agy · **Estimasi:** 8 mnt · **File:** review `ReadingPassage.svelte`, `reading.ts`
- **Depends On:** T-012
- **Acceptance:** fallback overlap ≥70% hanya opsional, default tap; tidak ada false-pass pada paraphrase
- **Status:** done (agy review PASS: deterministic tap-only grading, fallback overlap isolated, 0 paraphrase false-pass)

## Epic 3 — Writing Engine (PRD §7.6)

### T-014 — [muse] Writing grader deterministik (normalize compare)
- **Agent:** muse · **Estimasi:** 10 mnt · **File:** `src/lib/utils/normalize.ts`
- **Depends On:** T-002
- **Acceptance:** case/punctuation-insensitive, `correct+alternatives` untuk sentence-order, `accepted[]` untuk grammar-fix; test hijau
- **Status:** done (normalize 12/12, re-review clean)

### T-015 — [muse] Writing UI: order chips + fix input + image self-score
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/components/quiz/WritingEditor.svelte`
- **Depends On:** T-014
- **Acceptance:** tap chips (bukan drag), image → model answer + keyword checklist + self-score 1-5 (excluded dari auto %); rubrik terlihat
- **Status:** done (single channel fixed, token match, re-review 2/3; rerun → T-018)

### T-016 — [agy] Rubrik-honesty review Writing
- **Agent:** agy · **Estimasi:** 8 mnt · **File:** review `WritingEditor.svelte`, `normalize.ts`
- **Depends On:** T-015
- **Acceptance:** self-assessed selalu dilabeli terpisah, tidak masuk auto %; tidak ada klaim auto-grade LLM
- **Status:** done (agy review PASS: self-assessment explicitly labeled, excludedFromAutoScore true, zero LLM claim)

## Epic 4 — Session Flow (PRD §7.1–7.3, §7.7)

### T-017 — [muse] Stores: quiz + settings + progress + srs (tauri-plugin-store)
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src/lib/stores/quiz.ts`, `settings.ts`, `progress.ts`, `srs.ts`
- **Depends On:** T-004, T-007
- **Acceptance:** `settings.json, profile.json, progress.json, srs.json, history.json` lokal; localStorage hanya cache; Reload Content + Open Folder jalan
- **Status:** done (.svelte.ts runes, session ids + resetAll fixed, re-review clean)

### T-018 — [muse] Views: Home + Setup Sheet + QuizShell + Results
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/views/Home.svelte`, `SetupSheet.svelte`, `QuizShell.svelte`, `Results.svelte`
- **Depends On:** T-009, T-012, T-015, T-017
- **Acceptance:** 3 mode terpisah (never mixed); setup count/difficulty/timer/cloze/pair-count; progress segmented + timer ring; exit→confirm + discard; confetti ≥80%; review wrong + ID translation
- **Status:** done (impl + fix 68cd56a, re-review clean, 100/100)

### T-019 — [agy] UX + offline review Session Flow
- **Agent:** agy · **Estimasi:** 10 mnt · **File:** review Epic 4
- **Depends On:** T-018
- **Acceptance:** Wi-Fi off tetap jalan; cold start <2s; render <100ms; light/dark + Sans/Serif/Mono instan
- **Status:** done (agy UX + offline review PASS: 100% offline verified, connect-src none, cold start <2s, render <100ms, light/dark + Sans/Serif/Mono system font switching instant)

## Epic 5 — SRS + Dashboard + Settings (PRD §7.8–7.10, §8)

### T-020 — [muse] SRS queue (~30% inject) + Review Wrong + Review Session
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src/lib/utils/review-queue.ts`
- **Depends On:** T-007, T-017
- **Acceptance:** due-words masuk quiz ~30% lintas level; Review Wrong replay missed-only; Dashboard Start Review dari due-today
- **Status:** done (d3916fc, review clean, 15/15 + suite 93/93)

### T-021 — [muse] Dashboard + Settings views
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src/lib/views/Dashboard.svelte`, `SettingsView.svelte`
- **Depends On:** T-020
- **Acceptance:** learning vs mastered, per-level, due count; 30-day bar chart; history table + detail + review-wrong; appearance/font/sound/difficulty/timer/reset double-confirm
- **Status:** done (impl + fix 68cd56a; parked: midnight tick)

### T-022 — [deepseek] Acceptance seed + validate script CI
- **Agent:** deepseek · **Estimasi:** 10 mnt · **File:** `scripts/validate-content.ts`, `package.json` (`validate:content`)
- **Depends On:** T-021
- **Acceptance:** PRD §14 checklist 13 baris ter-cover; malformed file → toast + skip (tidak crash)
- **Status:** done (d6c63d8; content/CI scope — global id uniqueness asserted in `validate:content`, malformed file quarantined (skip, no crash). UI-dependent §14 lines verified at T-023.)

### T-023 — [agy] Final whole-branch review (merge gate)
- **Agent:** agy · **Estimasi:** 15 mnt · **File:** full diff `main..HEAD`
- **Depends On:** T-006, T-010, T-013, T-016, T-019, T-022
- **Acceptance:** semua acceptance §14 hijau; tidak ada network; tidak ada drag&drop; 1 fix-wave max, lalu adjudicate
- **Status:** done (merge gate: agy claimed PASS/13-13 but was wrong — actual 12/13, #9 FAIL. Epic 6 fixed #9 + C1–C4. Re-verified by QA deepseek: PRD §14 = 13/13 code-verified, suite 106/106, check 0 errors, build OK. Runtime E2E (offline launch / Wi-Fi-off) still unexecuted.)

## Epic 6 — QA Fix Wave (muse QA verdict 2026-10-11, qa-verdict.md)

### Q-001 — [muse] Live content-folder read + Reload wiring (Critical, PRD §6.1)
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/lib/views/session-data.ts`, `src/lib/stores/settings.svelte.ts`
- **Depends On:** T-004 (fs capability; tambah `plugin-fs` read jika belum)
- **Acceptance:** runtime baca `~/Library/Application Support/com.ielts-toeic-preps/content/` via plugin-fs, fallback bundle; Reload re-read + toast jujur (skipped disurfacing); tambah-test tanpa file → tetap jalan
- **Status:** done (a1e3f65, verified 5/5 PASS)

### Q-002 — [muse] Review-Wrong + Start Review wiring (Critical)
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src/App.svelte` (konsumen `buildWrongSessionFromHistory`)
- **Depends On:** parallel-worker C1 fix (uncommitted saat QA) mendarat dulu
- **Acceptance:** Review-Wrong replay missed-only semua mode (bukan random); Start Review pakai due queue Dashboard; reading/writing tidak silent no-op
- **Status:** done (parallel C1 + 7ffafd4, verified 3/3 PASS)

### Q-003 — [muse] Writing scoring honesty + soft-lock (Important)
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src/lib/components/quiz/WritingEditor.svelte`, `QuizShell.svelte`, `session-data.ts`
- **Depends On:** none
- **Acceptance:** timer-expiry image → excluded (tidak cemari auto %); all-excluded session → N/A bukan 0%; invalid prompt → fallback + skip (tidak soft-lock); Try-again konsisten
- **Status:** done (a8e7e69, verified 4/4 PASS)

### Q-004 — [deepseek] Seed images + alternatives (Minor, optional)
- **Agent:** deepseek · **Estimasi:** 10 mnt · **File:** `writing/images/*`, `prompts.json`
- **Depends On:** none
- **Acceptance:** 3 image placeholder diganti/asan; alternatives diisi bila ada; PRD §11 membolehkan placeholder → boleh park
- **Status:** parked (placeholder jujur per PRD §11; butuh aset biner owner)

## Epic 7 — UI Rebuild to design/DESIGN.md (blue/yellow)

> Direction change (PO, 2026-10-11): canonical spec is now `design/DESIGN.md`
> (blue `#2373F4` / cyan `#65D0F4` / yellow `#F2F7A0`), mirrored in PRD §10. All prior
> "violet" UI work is **superseded**. Base = `main` (has Epic 6 fixes). `agy`'s
> `feat/mvp-foundation` style waves (`f93de17`, `d029962` + uncommitted wave) are abandoned.

### T-024 — [deepseek] Full UI rebuild to blue/yellow on main
- **Agent:** deepseek · **Base:** `main` · **File:** `src/app.css`, `src/App.svelte`, `src/lib/components/app-sidebar.svelte`, `src/lib/components/ui/{button,badge}/`, `src/lib/views/*.svelte`, `src/lib/components/quiz/*.svelte`
- **Depends On:** none (docs synced: PRD §10, AGENTS.md, root `DESIGN.md` pointer)
- **Acceptance:** every screen uses the blue/yellow tokens from PRD §10; system font stacks only; lucide icons (no emoji); 2px ink border + hard 3D shadow per `design/Template-*.html`; `bun run check` / `test` / `build` green; antislop-ui Delivery Gate pass
- **Coordination:** agy stopped; single writer = deepseek for the fix pass.
- **Status:** done — agy's blue/yellow rebuild (uncommitted) + deepseek fix passes: Font style setting removed, sidebar spacing, dark-mode token sweep, AA-safe blue (`--primary-strong`), hover/press on all clickables. Fix pass 2 (Req D): removed the 3 offline chips, moved the sidebar toggle to the bottom-left footer beside the theme button (+ floating toggle when collapsed, mobile keeps a header trigger), inactive nav items now have a real surface with a distinct active fill, fixed the unstyled Progress Settings button (`btn-3d` was missing), restyled Settings (Appearance card removed, sound switch rebuilt, tactile `card-3d` sections). `bun run check` 0 errors, 106/106 tests, build OK.

## Epic 8 — Hardening + Runtime E2E (P0, sprint aktif 2026-10-12)

> Remote: GitHub Issues `#1–#4` (label `epic-8`) + Project board #3 "EnglishPrep — Epic 8 Hardening" (linked to repo, all 4 issues added).
> Registry mesin: `.orchestrator/task-registry.json`. Aturan: 1 task = 1 branch = 1 worktree = 1 agent, ≤15 mnt, 1 commit.

### H-001 — [muse] Runtime E2E offline launch (Tauri, Wi-Fi off) — issue #1
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `docs/e2e-report.md` (no app code)
- **Branch/worktree:** `agent/h-001-e2e-runtime` / `.worktrees/h-001-e2e-runtime`
- **Depends On:** none
- **Acceptance:** Tauri window launches offline (Wi-Fi off); cold start <2s, render <100ms; PRD §14 13/13 runtime-checked; report di `docs/e2e-report.md`
- **Status:** todo

### H-002 — [muse] Midnight tick fix (Dashboard 30-day chart) — issue #2
- **Agent:** muse · **Estimasi:** 12 mnt · **File:** `src/lib/views/Dashboard.svelte` (+ test)
- **Branch/worktree:** `agent/h-002-midnight-tick` / `.worktrees/h-002-midnight-tick`
- **Depends On:** none
- **Acceptance:** day rollover refreshes chart tanpa reload; no duplicate/missing bucket; vitest covers rollover
- **Status:** todo

### H-003 — [deepseek] Seed images + alternatives (Q-004 follow-up) — issue #3
- **Agent:** deepseek · **Estimasi:** 10 mnt · **File:** `src-tauri/resources/content/writing/**`
- **Branch/worktree:** `agent/h-003-seed-images` / `.worktrees/h-003-seed-images`
- **Depends On:** none (needs owner binary assets; may park)
- **Acceptance:** 3 placeholder diganti/asan per PRD §11; alternatives diisi bila ada; `validate:content` hijau
- **Status:** todo

### H-004 — [agy] Final re-gate review (merge gate) — issue #4
- **Agent:** agy · **Estimasi:** 15 mnt · **File:** full diff `main..HEAD` (no worktree)
- **Depends On:** H-001, H-002, H-003, H-005
- **Acceptance:** PRD §14 13/13 runtime-verified; zero network; zero drag&drop; 1 fix-wave max lalu adjudicate
- **Status:** todo (blocked)

### H-005 — [muse] Quiz navigation as push-stack — issue #6
- **Agent:** muse · **Estimasi:** 15 mnt · **File:** `src/App.svelte`, `src/lib/data/modules.ts`, `src/lib/components/app-sidebar.svelte` (+ test)
- **Branch/worktree:** `agent/h-005-nav-stack` / `.worktrees/h-005-nav-stack`
- **Depends On:** none (input recon: `docs/APP-NAVIGATION.md`, untracked di main checkout)
- **Acceptance:** start quiz push halaman quiz ke stack (home tetap di bawah, bukan diganti di slot yang sama); back di header quiz pop stack (exit-confirm tetap); results push di atas quiz; tap sidebar saat sesi aktif konsisten; Esc = back/exit-confirm
- **Status:** review (impl `274356b` di `agent/h-005-nav-stack`, pushed; check 0 errors, 106/106 tests, build OK; butuh agy review + keputusan merge)

## DAG (urutan eksekusi)
```
T-001 ─┬─→ T-002 ─┬─→ T-003 ─→ T-011 ─→ T-012 ─→ T-013 ─┐
       │          ├─→ T-007 ─→ T-008 ─→ T-009 ─→ T-010 ─┤
       │          └─→ T-014 ─→ T-015 ─→ T-016 ──────────┤
T-004 ─┴─→ T-017 ─→ T-020 ─→ T-021 ─→ T-022 ───────────┤
T-005 ─→ T-006 ────────────────────────────────────────┤
                         T-018 ─→ T-019 ─→ T-023 (gate, superseded—see Epic 6)
Q-001 + Q-003 paralel; Q-002 setelah C1 mendarat; lalu Q-gate ulang.
```
Paralel aman: T-001∥T-004. Lalu T-002. Lalu T-003∥T-007∥T-014. deepseek tidak blokir muse kecuali di Depends On.
