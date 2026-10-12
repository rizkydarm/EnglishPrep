# Project Spec (Orchestrator SSOT pointer)

> Lapisan 1 GitHub Projects + Lapisan 2 orchestrator lokal (MULTI_AGENT.md Fase 1 — manual orchestration).
> Dokumen ini pointer, bukan duplikat spec.

- **What/why:** `PRD.md` (canonical product intent, acceptance §14 = 13 baris)
- **How:** `README.md` (stack, commands) + `src-tauri/tauri.conf.json`
- **Feature detail:** `FEATURES.md`
- **UI spec:** `design/DESIGN.md` (blue `#2373F4` / cyan `#65D0F4` / yellow `#F2F7A0`); PRD §10 wins on conflict
- **Kanban lokal:** `TASKS.md` (status todo/doing/review/done) + `PROGRESS.md` (live log)
- **Remote kanban:** GitHub Issues + GitHub Project (board) — 1 issue = 1 task, label `epic-8`
- **Sprint goal (Epic 8):** Hardening + runtime E2E — tutup sisa parked (midnight tick, Q-004 images) + verifikasi PRD §14 13/13 di runtime Tauri offline (Wi-Fi off)

## Quality gate (manual Fase 1)

Setiap task selesai → `bun run check` + `bunx vitest run` + `bun run build` hijau di worktree-nya → report `TASK REPORT` → integrator merge ke `main` → update `TASKS.md` + `PROGRESS.md`.
