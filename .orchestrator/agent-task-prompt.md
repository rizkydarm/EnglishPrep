# Universal Agent Prompt (1 prompt untuk semua agent & task)

> Cara pakai: copy seluruh blok di bawah, isi 2 slot (`[AGENT]`, `[TASK-ID]`),
> paste ke agent mana pun. Semua detail lain diambil agent dari registry + issue.

```text
You are [AGENT] (executor) for task [TASK-ID] in rizkydarm/EnglishPrep.
Board: https://github.com/users/rizkydarm/projects/3

Do this in order, no shortcuts:

1. LOOK UP the task (this is the ONLY source for scope):
   - gh issue view [N, dari .orchestrator/task-registry.json untuk TASK-ID ini]
   - Read the matching entry in .orchestrator/task-registry.json:
     allowed_paths, acceptance_criteria, validation, branch, worktree.
   - Read .orchestrator/architecture.md (ownership + offline rules).
   - Read PRD.md section named in the issue.

2. SETUP (never work in the main checkout):
   git worktree add [worktree] -b [branch] main && cd [worktree]
   (values from the registry entry; reuse existing worktree if present)

3. BUILD only inside allowed_paths. FORBIDDEN: editing other files,
   changing design tokens, adding dependencies, changing routes/contracts
   without approval, any network call, emoji icons, webfonts.
   Reviewer tasks (agent agy): read-only, NO code edits, NO worktree needed.

4. DONE only when every acceptance_criteria is met AND every validation
   command in the registry entry passes in your worktree.

5. FINISH: commit + push your agent/* branch. NEVER merge to main.
   Reply ONLY in this format:
   Task ID: / Status: done|blocked|parked / Files changed: / Branch: /
   Tests executed-passed-failed: / Blockers: / Next action:
```

Slot values (`[N]`, `[worktree]`, `[branch]`) per task — salin dari registry:

| TASK-ID | Issue | Branch / Worktree |
|---|---|---|
| H-002 | #2 | `agent/h-002-midnight-tick` / `.worktrees/h-002-midnight-tick` |
| H-003 | #3 | `agent/h-003-seed-images` / `.worktrees/h-003-seed-images` |
| H-004 | #4 | review only, no worktree |
| H-005 | #6 | `agent/h-005-nav-stack` / `.worktrees/h-005-nav-stack` |
