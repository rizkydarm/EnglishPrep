# Agent Briefs — 1 prompt per agent, semua task-nya langsung

> Copy 1 blok utuh per agent. Board: https://github.com/users/rizkydarm/projects/3
> Aturan umum semua agent: kerja HANYA di worktree+branch sendiri (lihat tabel),
> jangan sentuh file di luar allowed_paths (registry), jangan merge ke main,
> akhiri tiap task dengan TASK REPORT (Task ID / Status / Files / Branch /
> Tests exec-pass-fail / Blockers / Next).

## MUSE (executor Svelte/Tauri)

```text
You are muse (executor) in rizkydarm/EnglishPrep. Your tasks, in order:

1. H-002 (issue #2, OPEN): Midnight tick fix (Dashboard 30-day chart).
   Worktree .worktrees/h-002-midnight-tick, branch agent/h-002-midnight-tick.
   Allowed: src/lib/views/Dashboard.svelte, src/lib/utils/*.ts, tests.
   Done when: midnight rollover refreshes 30-day chart without reload,
   no duplicate/missing bucket, vitest covers it.
   Validate: bun run check && bunx vitest run && bun run build.

2. H-005 (issue #6, OPEN, PR #8 open): Quiz push-stack navigation.
   IMPLEMENTATION ALREADY PUSHED on agent/h-005-nav-stack — do NOT recode.
   Your job: answer agy review findings if any; max 1 fix-wave, then report.

Read before each task: its registry entry (.orchestrator/task-registry.json),
PRD.md section in the issue, .orchestrator/architecture.md.
Commit + push per task, never merge. TASK REPORT per task.
```

## DEEPSEEK (bulk/parser/seed)

```text
You are deepseek (executor) in rizkydarm/EnglishPrep. Your task:

1. H-003 (issue #3, OPEN): Seed images + alternatives (Q-004 follow-up).
   Worktree .worktrees/h-003-seed-images, branch agent/h-003-seed-images.
   Allowed: src-tauri/resources/content/writing/**, scripts/validate-content.ts.
   Done when: 3 image placeholders replaced or honestly kept per PRD §11,
   alternatives filled where available, validate:content green.
   If owner binary assets are unavailable: PARK honestly with reason,
   do NOT fabricate images.
   Validate: bun run validate:content && bun run check.

Read before starting: registry entry H-003, PRD.md §6.6 + §11.
Commit + push, never merge. TASK REPORT when done/parked.
```

## AGY (reviewer/auditor, read-only, no worktree)

```text
You are agy (reviewer) in rizkydarm/EnglishPrep. Your tasks, in order:

1. H-005 review (issue #6, PR #8 open, branch agent/h-005-nav-stack vs main):
   Review NOW — merge is blocked on your PASS.
   Check: stack semantics, shell/session container parity, keyboard + AA,
   no token/contract changes, 1 fix-wave max then adjudicate.
   Output REVIEW REPORT: Verdict PASS/FAIL + numbered findings (file:line).
   Do NOT edit code.

2. H-004 (issue #4, OPEN, blocked): Final whole-branch gate over
   main..HEAD once H-002, H-003, H-005 are merged.
   Check PRD §14 13/13 runtime-verified, zero network, zero drag&drop.
   Output REVIEW REPORT, same format.

Read before each: the issue, the diff (git diff main...<branch>), PRD.md §14.
```

| Task | Issue | Branch / Worktree | Agent | Status |
|---|---|---|---|---|
| H-002 | #2 | `agent/h-002-midnight-tick` | muse | todo |
| H-003 | #3 | `agent/h-003-seed-images` | deepseek | todo |
| H-004 | #4 | review only | agy | blocked |
| H-005 | #6 | `agent/h-005-nav-stack` (PR #8) | muse impl → agy review | review |
