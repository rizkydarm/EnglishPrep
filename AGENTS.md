
## Source of Truth
Always refer to these files before starting any task, and keep them in sync as the project evolves:
- **`PRD.md`** — what the user wants. The authoritative definition of product intent, scope, features, schemas, and acceptance criteria. Never build beyond it or contradict it without confirming.
- **`README.md`** — the app spec. The authoritative description of the implementation: stack, versions, project layout, commands, and how the app is built and run.
- **`FEATURES.md`** — the features of the app. The detailed catalog of quiz types and capabilities per skill area (Vocabulary, Reading, Writing), plus supporting systems, session formats, and the phased feature roadmap. Consult it for the full feature surface and phasing.

If these ever conflict, `PRD.md` defines *what* and *why*; `README.md` defines *how*; `FEATURES.md` defines the feature detail and roadmap. Surface any mismatch instead of guessing.

## Always Use These Plugins
Use the following plugins/skills on every relevant task — do not skip them:
- **graphify** — for any question about the codebase, its architecture, file relationships, or project content. Treat such questions as a graphify query first. If `graphify-out/graph.json` exists, use `graphify query` directly instead of re-scanning files.
- **superpowers** — for engineering work. Apply its proven workflows (test-driven development, systematic debugging, collaboration patterns) by default when implementing, fixing, or refactoring.

## Anti Slop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.agents/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.agents/skills/antislop-ui/SKILL.md`
- Copy & text: `antislop-copywriting`: `.agents/skills/antislop-copywriting/SKILL.md`
- People: `antislop-human`: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.agents/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.

## Team — 3 AI Agents (Markdown-Driven SDD)

Source of truth operasional: `TASKS.md` (kanban, status todo/doing/review/done) +
`PROGRESS.md` (live log) + `docs/superpowers/plans/*` (detail per Epic).
Aturan: 1 task = 1 file, 1 agent, ≤15 menit, 1 commit. Ubah `[ ]`→`[x]` + append log saat selesai.
Reviewer fail → kembalikan status ke `todo`.

| Agent | Kekuatan | Tugas | Jangan |
|---|---|---|---|
| **agy** (Antigravity/Gemini) | long-context review, security audit, interaksi kompleks | T-006,010,013,016,019,023: review semua Epic, highlight-tap, a11y, offline audit, final gate | jangan tulis UI dari nol |
| **muse** (Muse Spark/Opencode, eksekutor lokal) | Svelte 5 Runes, Tauri 2, stores, quiz engine | T-004,007,008,009,012,014,015,017,018,020,021: Tauri hardening, factory, semua UI quiz, stores, views | jangan riset panjang |
| **deepseek** | murah, bulk generation, parser, test | T-001,002,003,005,011,022: toolchain, Zod schema, loader, seed 50+5+10, validate script | jangan UI nuanced |

DAG: `T-001∥T-004 → T-002 → (T-003∥T-007∥T-014) → ... → T-023 gate`.
Ruling R1: jika `agy` ternyata bukan Antigravity, ganti baris tabel tanpa ubah task.

## UI/UX Pro Max
Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
Installed skill file: `.agents/skills/ui-ux-pro-max/SKILL.md`

Whenever designing, building, styling, reviewing, or fixing user interfaces, pages, components, interactions, typography, color palettes, or accessibility:
- **Mandatory skill lookup:** Always read and follow `.agents/skills/ui-ux-pro-max/SKILL.md` before generating or modifying UI.
- **Design system generation:** For new pages or UI features, generate the tailored design system using the reasoning engine:
  `python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<product_type> <keywords>" --design-system`
- **Domain & stack queries:** Use targeted search queries for specific concerns:
  - Styles & colors: `python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain style` (or `--domain color`)
  - Typography: `python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain typography`
  - Stack best practices: `python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack svelte` (or `html-tailwind`)
- **Quality & checklist:** Enforce the 119 UX guidelines, design reasoning rules, accessibility standards (contrast, focus, touch targets, reduced motion), and avoid anti-patterns.