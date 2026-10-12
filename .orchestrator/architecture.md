# Architecture (contract-first, condensed)

- **Shell:** Tauri 2.x (macOS 13+, plugins `fs, store, dialog, path` saja; CSP `connect-src 'none'`)
- **Frontend:** Svelte 5 Runes + TypeScript + Vite; shadcn-svelte + Tailwind v4 + lucide-svelte (no emoji icons, no CDN webfont — system stacks only)
- **Content:** live folder `~/Library/Application Support/com.ielts-toeic-preps/content/` via plugin-fs, fallback bundle `src-tauri/resources/content/`; Zod validate at load, invalid → skip + toast (never crash)
- **State:** tauri-plugin-store JSON (`settings, profile, progress, srs, history`); localStorage cache only
- **Ownership (Epic 8):**
  - `H-001` E2E runtime — no code (report only: `docs/e2e-report.md`)
  - `H-002` midnight tick — `src/lib/views/Dashboard.svelte` (+ test)
  - `H-003` seed images — `src-tauri/resources/content/writing/**` only
  - `H-004` re-gate review — no code, full diff `main..HEAD`
- **Rules:** 1 task = 1 branch = 1 worktree = 1 agent; ≤15 menit/task; never 2 writers on same file concurrently; yellow `#F2F7A0` = correct/score/mastered only (no streak/XP/hearts); no drag & drop anywhere.
