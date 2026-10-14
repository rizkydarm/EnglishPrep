# E2E Report — H-001: Runtime offline launch (Tauri, Wi-Fi off)

- Task: H-001 (issue #1), agent muse, branch `agent/h-001-e2e-runtime`
- Date: 2026-10-13. Commit tested: `77b34fa` (main tip; worktree fast-forwarded, branch had no unique commits)
- Machine: macOS arm64, rustc 1.98.1, bun 1.4.2, Xcode CLT installed
- Constraint honored: no app code touched. Only this file created.

## Validation commands (fresh runs in worktree)

| Command | Result |
|---|---|
| `bun run check` | 0 errors (1 pre-existing `baseUrl` TS7 deprecation warning) |
| `bunx vitest run` | 12 files, 106 tests, all pass (594 ms) |
| `bun run validate:content` | PASS: vocab=50 passages=5 questions=26 prompts=10, 0 skipped |
| `bun run tauri build` | exit 0, release profile in 2m27s. `LMS.app` 5.17 MiB, `LMS_0.1.0_aarch64.dmg` 2.79 MiB |

## Runtime launch (GUI session, network ON)

- Launch 1: `open LMS.app` → process alive ≤0.5 s (pgrep poll), pid 47957. `lsof -i` on pid: zero sockets.
- Launch 2: pid 48016, plus its `com.apple.WebKit.Networking` XPC pid 48025. `lsof -i` on both: zero sockets.
- Quit: clean both times via AppleScript `tell application "LMS" to quit` (responsive event loop).
- Literal Wi-Fi-off run: NOT performed. Reason: sandbox has no sudo (`sudo -n` fails), `networksetup` cannot toggle en0. Follow-up for human with the machine: turn Wi-Fi off, launch `LMS.app`, confirm first screen renders.

## Static offline evidence (supports §14 items 1 and 11)

- CSP: `default-src 'self'; connect-src 'none'` (`src-tauri/tauri.conf.json`).
- Zero network sinks in `src/`: no `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource` (grep clean).
- Zero remote URLs: only `$schema` comment and `devUrl http://localhost:1420` (dev only).
- Zero CDN fonts/styles: grep for `fonts.google`, `cdn`, `@import.*url` clean. System stacks only.
- Sidebar `onPrefetch` is a local dynamic import (`preloadSettingsView` in `src/App.svelte`), not a network call.
- Resources bundled: `resources: ["resources/content/**/*"]`.

## PRD §14 checklist (13 items)

Legend: VERIFIED = evidence in hand. RUNTIME-PENDING = needs interactive GUI run, recorded as follow-up, not claimed.

1. Launches offline, no internet calls: VERIFIED as far as sandbox allows (launch + zero sockets + CSP + zero sinks). Wi-Fi-off manual run: RUNTIME-PENDING (no sudo).
2. Homepage 3 modes (Vocab, Reading, Writing): static present (`src/lib/views/Home.svelte`). Interactive check: RUNTIME-PENDING.
3. Pre-quiz settings respected: settings fields exist (`src/lib/views/session-data.ts`, `SetupSheet.svelte`); covered partly by `session-data.test.ts` (vitest green). End-to-end respect: RUNTIME-PENDING.
4. 5 vocab + 3 reading + 3 writing types playable E2E: seed counts validated (item 13). Full playthrough: RUNTIME-PENDING.
5. Tap-to-pair; cloze typed + word-bank: components exist (`ClozeInput.svelte`, matching views). Runtime: RUNTIME-PENDING.
6. Reading highlight sentence tap-to-select: `HighlightPassage.svelte` exists. Runtime: RUNTIME-PENDING.
7. Results + wrong-answer review (ID translation for vocab): `Results.svelte` + `review-queue.test.ts` green. Runtime: RUNTIME-PENDING.
8. SRS intervals + dashboard mastery/due: `srs.test.ts`, `scoring.test.ts` green. Runtime display: RUNTIME-PENDING.
9. New CSV/MD reflected after Reload Content: `content-loader/reading.test.ts`, `integrity.test.ts` green. Runtime: RUNTIME-PENDING.
10. Light/dark instant + system: mode-watcher wiring in code. Visual timing: RUNTIME-PENDING.
11. Fully functional with network disabled: same evidence and limit as item 1.
12. No drag and drop anywhere: VERIFIED static. Grep for `draggable|ondrag|dragstart|dropzone|dataTransfer` in `src/` returns nothing.
13. 50 vocab + 5 reading + 10 writing seed validated: VERIFIED via `validate:content` PASS (vocab=50, passages=5, prompts=10, 0 skipped).

## Timings

- Cold start <2 s: process alive ≤0.5 s after `open` (both launches). First-paint time NOT instrumented: follow-up (needs in-app timing mark or screen recording on a human machine).
- Question render <100 ms: NOT measured, no DOM perf test in repo: follow-up (suggest vitest bench or `performance.now()` marks in `QuizShell.svelte`).

## Findings / follow-ups (no fixes in this task)

1. (human) Wi-Fi-off manual launch + first-screen check.
2. (H-004 or new task) Interactive playthrough of all 11 question types with stopwatch evidence.
3. (new task) Add render-timing instrumentation (`QuizShell.svelte`) or a vitest perf test for the 100 ms criterion.
4. No bugs found in code paths inspected. No files outside `docs/e2e-report.md` modified.
