# Agent Task Prompt — template + contoh terisi (Epic 8)

> Cara pakai: copy blok TEMPLATE, isi slot `[...]`, paste ke agent worker
> (Codex/Agy/OpenCode/dll). 1 task = 1 agent = 1 worktree = 1 branch.
> Nilai slot diambil dari `.orchestrator/task-registry.json` dan GitHub issue.

## TEMPLATE (executor: muse / deepseek)

```text
You are [AGENT] (executor). Task [TASK-ID]: [TITLE].
Repo: [REPO-URL] | GitHub issue: #[N] | Board: [PROJECT-URL]

1. READ FIRST (source of truth, urutan ini):
   - PRD.md §[X] (acceptance untuk task ini)
   - .orchestrator/architecture.md (ownership + rules)
   - .orchestrator/task-registry.json (task [TASK-ID]: allowed_paths, acceptance_criteria)
   - File yang akan diubah (current state)

2. SETUP WORKSPACE (jangan kerja di main checkout):
   git worktree add .worktrees/[SLUG] -b agent/[SLUG] main
   cd .worktrees/[SLUG]
   gh issue view [N]   (konfirmasi scope)

3. CONSTRAINTS:
   - Hanya boleh edit: [ALLOWED PATHS, mis. src/lib/views/Dashboard.svelte + test-nya]
   - DILARANG: edit file di luar allowed paths, ubah design tokens,
     tambah dependensi, ubah routing/kontrak tanpa persetujuan.
   - Offline rule: system font stacks + lucide icons saja; tanpa network call.
   - ≤15 menit, 1 commit.

4. ACCEPTANCE (task DONE hanya jika semua hijau):
   - [CRITERION 1]
   - [CRITERION 2]

5. VALIDATE di worktree-mu:
   bun run check && bunx vitest run && bun run build
   (+ [extra, mis. bun run validate:content])

6. FINISH:
   - Commit di branch agent/[SLUG], push branch. JANGAN merge ke main.
   - Reply dengan TASK REPORT:
     Task ID: / Status: / Files changed: / Branch: /
     Tests executed-passed-failed: / Blockers: / Next action:
```

## TEMPLATE (reviewer: agy — tanpa worktree, tanpa edit kode)

```text
You are agy (reviewer/auditor). Review task [TASK-ID] pada branch agent/[SLUG]
vs main. GitHub issue: #[N].

1. READ: PRD.md §[X], issue #[N], lalu `git diff main...agent/[SLUG]`.
2. CHECK: acceptance issue terpenuhi? Zero network call? Zero drag&drop?
   AA contrast + light/dark + keyboard (utk UI)? File di luar allowed paths tersentuh?
3. DO NOT edit code. Outputkan REVIEW REPORT:
   Verdict: PASS / FAIL + temuan bernomor (file:line + alasan).
   FAIL → PM kembalikan status task ke todo beserta nomor temuan.
```

## CONTOH TERISI — H-001 (muse, issue #1)

```text
You are muse (executor). Task H-001: Runtime E2E offline launch (Tauri, Wi-Fi off).
Repo: https://github.com/rizkydarm/EnglishPrep | GitHub issue: #1
Board: https://github.com/users/rizkydarm/projects/3

1. READ FIRST: PRD.md §14 (13 baris checklist); .orchestrator/architecture.md;
   .orchestrator/task-registry.json (task H-001).

2. SETUP:
   git worktree add .worktrees/h-001-e2e-runtime -b agent/h-001-e2e-runtime main
   cd .worktrees/h-001-e2e-runtime

3. CONSTRAINTS: NO app code — hanya tulis docs/e2e-report.md.
   DILARANG edit src/, src-tauri/, atau config apapun. Temuan bug dicatat
   di report sebagai follow-up, bukan difix di task ini.

4. ACCEPTANCE:
   - Tauri window launches offline (Wi-Fi off)
   - Cold start <2s, question render <100ms
   - PRD §14 13/13 checked at runtime
   - Report at docs/e2e-report.md

5. VALIDATE: bun run check && bunx vitest run && bun run tauri build

6. FINISH: commit + push branch agent/h-001-e2e-runtime, JANGAN merge.
   Reply TASK REPORT (format di template).
```

## CONTOH TERISI — H-003 (deepseek, issue #3)

```text
You are deepseek (executor). Task H-003: Seed images + alternatives (Q-004 follow-up).
Repo: https://github.com/rizkydarm/EnglishPrep | GitHub issue: #3
Board: https://github.com/users/rizkydarm/projects/3

1. READ FIRST: PRD.md §6.6 + §11 (image prompts boleh placeholder);
   .orchestrator/architecture.md; .orchestrator/task-registry.json (task H-003);
   src-tauri/resources/content/writing/prompts.json.

2. SETUP:
   git worktree add .worktrees/h-003-seed-images -b agent/h-003-seed-images main
   cd .worktrees/h-003-seed-images

3. CONSTRAINTS: hanya src-tauri/resources/content/writing/** dan
   scripts/validate-content.ts. DILARANG sentuh src/, UI, atau schema.
   NOTE: butuh aset biner owner — jika tidak tersedia, PARK task dengan jujur
   (tulis alasan di TASK REPORT), jangan fabricate gambar.

4. ACCEPTANCE:
   - 3 image placeholders replaced or honestly kept per PRD §11
   - alternatives filled where available
   - validate:content green

5. VALIDATE: bun run validate:content && bun run check

6. FINISH: commit + push branch agent/h-003-seed-images, JANGAN merge.
   Reply TASK REPORT (format di template).
```

## CONTOH TERISI — H-002 (muse, issue #2)

```text
You are muse (executor). Task H-002: Midnight tick fix (Dashboard 30-day chart).
Repo: https://github.com/rizkydarm/EnglishPrep | GitHub issue: #2
Board: https://github.com/users/rizkydarm/projects/3

1. READ FIRST: PRD.md §7.9 + §8; .orchestrator/architecture.md;
   .orchestrator/task-registry.json (task H-002); src/lib/views/Dashboard.svelte.

2. SETUP:
   git worktree add .worktrees/h-002-midnight-tick -b agent/h-002-midnight-tick main
   cd .worktrees/h-002-midnight-tick

3. CONSTRAINTS: hanya src/lib/views/Dashboard.svelte, src/lib/utils/*.ts,
   dan test-nya. DILARANG sentuh design tokens, stores lain, routing.

4. ACCEPTANCE:
   - Day rollover at midnight refreshes 30-day bar chart tanpa reload
   - No duplicate/missing day bucket
   - vitest covers rollover

5. VALIDATE: bun run check && bunx vitest run && bun run build

6. FINISH: commit + push branch agent/h-002-midnight-tick, JANGAN merge.
   Reply TASK REPORT (format di template).
```
