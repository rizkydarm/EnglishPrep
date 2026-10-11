# MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fondasi offline + kontrak konten yang tervalidasi sehingga Epic 1-5 bisa dibangun paralel tanpa rework skema.

**Architecture:** Zod sebagai single source of truth tipe; content-loader murni (tanpa Tauri import) agar bisa di-test di vitest; Tauri hanya untuk fs/store/dialog + CSP offline.

**Tech Stack:** Tauri 2.12, Svelte 5 Runes, TypeScript 6.0.3, Tailwind 4.3, zod, papaparse, gray-matter, vitest, bun.

**Spec:** `PRD.md` §4, §6, §8, §11, §12; `FEATURES.md` Fase 1; `README.md` stack table.

## Global Constraints

- 100% offline: zero network calls, CSP blocks all network, Tauri allowlist hanya `fs, dialog, path` (+ `store, opener` yang sudah ada).
- `level` ∈ `b1-core | b1-plus | b2-core | b2-mastery` verbatim (PRD §6.3).
- `id` unique, kebab-case, stabil (dipakai SRS & history).
- File invalid di-skip + warning toast, never crash (PRD §6.1, §6.7).
- matching = tap-to-pair, bukan drag & drop; tidak ada drag di manapun.
- `bun run check` (svelte-check) harus hijau setiap task.

## Review Focus

- `id` dengan `../` atau path aneh lolos lalu dibaca sebagai path → harus ditolak sebagai slug saja.
- CSV dengan koma di dalam quote (contoh definisi) pecah kolom → parser harus PapaParse, bukan split koma.
- `[[GAP:n]]` duplikat / loncat nomor → loader harus tolak dengan pesan jelas.
- Kata tanpa `distractors` tetap bisa MCQ → factory harus auto-generate, bukan crash.
- Content folder belum ada di first run → app harus seed-copy dari bundle, bukan blank.

---

### Task 1: Toolchain test + deps (T-001, deepseek)

**Files:**
- Modify: `package.json`
- Create: `scripts/validate-content.ts`
- Test: `bunx vitest run` (smoke)

**Interfaces:**
- Consumes: none
- Produces: `bun run validate:content`, `bunx vitest run` tersedia untuk semua task berikutnya.

- [ ] **Step 1: Tambah deps konten + vitest**

Run: `bun add zod papaparse gray-matter && bun add -d vitest`
Expected: `package.json` berisi keempatnya.

- [ ] **Step 2: Tulis `scripts/validate-content.ts` stub yang import schema**

```ts
import { VocabEntrySchema } from "../src/lib/types/schema.js";
```

- [ ] **Step 3: Verifikasi toolchain**

Run: `bun run check && bunx vitest run`
Expected: PASS (0 test, 0 type error).

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock scripts/validate-content.ts
git commit -m "chore: add zod papaparse gray-matter vitest toolchain"
```

### Task 2: Zod schema kontrak (T-002, deepseek)

**Files:**
- Create: `src/lib/types/schema.ts`
- Test: `src/lib/types/schema.test.ts`

**Interfaces:**
- Consumes: PRD §6.3–6.6 exact shapes.
- Produces: `VocabEntry, ReadingPassage, ReadingQuestions, WritingPrompt, Level` + `*Schema` untuk loader dan semua factory.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { VocabEntrySchema } from "./schema.js";
describe("VocabEntry", () => {
  it("rejects bad level", () => {
    expect(() => VocabEntrySchema.parse({ id: "x", word: "x", pos: "noun", level: "C2", topic: "work", definition_en: "d", definition_id: "d", example_en: "e", example_id: "e", source: "s" })).toThrow();
  });
  it("accepts full PRD example abundant", () => {
    expect(() => VocabEntrySchema.parse({ id: "abundant", word: "abundant", pos: "adjective", level: "b2-core", topic: "environment", definition_en: "existing in large quantities; more than enough", definition_id: "berlimpah", example_en: "The region has abundant supplies of fresh water.", example_id: "x", source: "oxford_5000" })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/lib/types/schema.test.ts`
Expected: FAIL with "No such file" / "not defined".

- [ ] **Step 3: Implement schemas di `src/lib/types/schema.ts` (zod, Level union verbatim, id kebab-case regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`, CSV list coercion via preprocess `;`-split)**

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/lib/types/schema.test.ts && bun run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/schema.ts src/lib/types/schema.test.ts
git commit -m "feat: add zod content schemas per PRD 6.3-6.6"
```

### Task 3: Content loader + quarantine (T-003, deepseek)

**Files:**
- Create: `src/lib/content-loader/loader.ts`, `src/lib/content-loader/reading.ts`
- Test: `src/lib/content-loader/loader.test.ts`

**Interfaces:**
- Consumes: `*Schema` dari Task 2.
- Produces: `loadVocab(csv|json), loadPassage(md), loadQuestions(json)` → `{ ok, skipped: {file, reason}[] }` untuk toast.

- [ ] **Step 1: Write failing test (invalid file di-skip, bukan throw; CSV quote-koma tidak pecah; GAP duplikat ditolak)**

- [ ] **Step 2: Run test, expect FAIL**

Run: `bunx vitest run src/lib/content-loader/loader.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement loader murni (PapaParse header:true, gray-matter frontmatter, GAP regex `\[\[GAP:(\d+)\]\]`, kumpulkan skipped, jangan throw)**

- [ ] **Step 4: Run test, expect PASS**

Run: `bunx vitest run src/lib/content-loader/loader.test.ts && bun run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content-loader/
git commit -m "feat: add quarantining content loader"
```

### Task 4: Tauri offline hardening (T-004, muse)

**Files:**
- Modify: `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/lib.rs`
- Test: manual `bun run tauri dev` + grep no-http

**Interfaces:**
- Consumes: none (paralel dengan Task 1).
- Produces: `contentDir()` path + seed-copy + `fs/store/dialog/path` commands untuk stores (Task T-017).

- [ ] **Step 1: Set CSP `default-src 'self'; connect-src 'none'` dan bundle resources `resources/content/**/*`, window 1280x800 min 960x640**

- [ ] **Step 2: Tambah capabilities `fs:default, store:default, dialog:default, path:default`, identifier ganti `com.ielts-toeic-preps`**

- [ ] **Step 3: Implement `get_content_dir + ensure_seeded` di `lib.rs` (first-run copy, Reload trigger)**

- [ ] **Step 4: Verifikasi**

Run: `cargo check --manifest-path src-tauri/Cargo.toml && grep -ri "http" src-tauri/src/ || true`
Expected: cargo ok, tidak ada fetch/http.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/
git commit -m "feat: harden tauri offline + seed content dir"
```

### Task 5: Seed content (T-005, deepseek)

**Files:**
- Create: `src-tauri/resources/content/vocab/*`, `reading/passages/*.md`, `reading/questions/*.json`, `writing/prompts.json`

**Interfaces:**
- Consumes: schemas Task 2 + loader Task 3.
- Produces: 50 vocab + 5 reading (1/1/2/1 per level) + 10 writing untuk seluruh Epic 1-4.

- [ ] **Step 1: Generate 50 vocab (work, travel, education, technology, environment, health) + 5 passage 180-450 kata + 10 prompts, semua `level` terisi**

- [ ] **Step 2: Verifikasi**

Run: `bun run validate:content`
Expected: PASS, 0 skipped.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/resources/content/ scripts/validate-content.ts
git commit -m "feat: add v1 seed content 50+5+10"
```

### Task 6: Security + schema review (T-006, agy)

**Files:** review-only, tanpa kode baru kecuali temuan.

- [x] **Step 1: Audit `id` regex, path join, CSP, allowlist, `[[GAP]]` handling**
- [x] **Step 2: Verdict SPEC ✅/❌ + quality; jika ❌, kembalikan task terkait ke `todo` dengan alasan di `PROGRESS.md`**
- [x] **Step 3: Append log ke `PROGRESS.md`, tanpa commit kode**

## Self-Review

1. **Spec coverage:** §4 offline→Task4; §6.3-6.6→Task2+5; §6.7→Task3; §8 paths→Task4 (implementasi stores di T-017); §11 seed→Task5; §12 perf→dicatat di Review Focus + T-019. Gap: none untuk Epic 0.
2. **Step scan:** tiap step satu aksi + hasil checkable. Fixed: tidak ada "handle edge cases" generik.
3. **Type consistency:** `Level, VocabEntry, loadVocab` dipakai konsisten Task2→3→5.
4. **Review Focus:** 5 baris di atas, masing-masing punya pemilik (Task2 id-regex, Task3 csv/gap/distractor, Task4 seed-copy).
5. **Proportion:** plan ini hanya Epic 0 (±6 task). Epic 1-5 tetap di `TASKS.md` sebagai kanban, detail plan dibuat saat Epic 0 hijau agar tidak jadi transkrip.
