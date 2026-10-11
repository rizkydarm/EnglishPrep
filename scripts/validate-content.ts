import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  VocabEntrySchema,
  WritingPromptsFileSchema,
} from "../src/lib/types/schema.js";
import { loadPassage, loadQuestions, loadVocab } from "../src/lib/content-loader/loader.js";

const ROOT = new URL("..", import.meta.url).pathname;
const CONTENT = join(ROOT, "src-tauri", "resources", "content");

interface Failure {
  file: string;
  reason: string;
}

const failures: Failure[] = [];
let vocabCount = 0;
let passageCount = 0;
let questionCount = 0;
let promptCount = 0;

function readFiles(dir: string, ext: string): { file: string; content: string }[] {
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(ext)).sort();
  } catch {
    failures.push({ file: relative(ROOT, dir), reason: "directory missing" });
    return [];
  }
  return names.map((n) => ({ file: join(dir, n), content: readFileSync(join(dir, n), "utf8") }));
}

// Touch the static schema import so the module is genuinely wired (T-001 parked minor).
void VocabEntrySchema;

const vocabFiles = [
  ...readFiles(join(CONTENT, "vocab"), ".csv"),
  ...readFiles(join(CONTENT, "vocab"), ".json"),
];
{
  const r = loadVocab(vocabFiles);
  vocabCount = r.ok.length;
  for (const s of r.skipped) failures.push({ file: relative(ROOT, s.file), reason: s.reason });
}

const passageFiles = readFiles(join(CONTENT, "reading", "passages"), ".md");
const passageIds = new Set<string>();
{
  const r = loadPassage(passageFiles);
  passageCount = r.ok.length;
  for (const p of r.ok) passageIds.add(p.id);
  for (const s of r.skipped) failures.push({ file: relative(ROOT, s.file), reason: s.reason });
}

const questionFiles = readFiles(join(CONTENT, "reading", "questions"), ".json");
{
  const r = loadQuestions(questionFiles);
  for (const q of r.ok) {
    questionCount += q.items.length;
    if (!passageIds.has(q.passage_id)) {
      failures.push({
        file: `reading/questions (passage_id: ${q.passage_id})`,
        reason: `no matching passage file for passage_id "${q.passage_id}"`,
      });
    }
  }
  for (const s of r.skipped) failures.push({ file: relative(ROOT, s.file), reason: s.reason });
}

{
  const raw = readFiles(join(CONTENT, "writing"), ".json").filter((f) =>
    f.file.endsWith("prompts.json"),
  );
  if (raw.length === 0) {
    failures.push({ file: "writing/prompts.json", reason: "file missing" });
  } else {
    for (const f of raw) {
      try {
        const parsed: unknown = JSON.parse(f.content);
        const r = WritingPromptsFileSchema.safeParse(parsed);
        if (!r.success) {
          failures.push({
            file: relative(ROOT, f.file),
            reason: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
          });
        } else {
          promptCount = r.data.items.length;
        }
      } catch (e) {
        failures.push({
          file: relative(ROOT, f.file),
          reason: e instanceof Error ? e.message : "unknown parse error",
        });
      }
    }
  }
}

if (vocabCount !== 50) {
  failures.push({ file: "vocab/*", reason: `expected 50 vocab entries, got ${vocabCount}` });
}
if (passageCount !== 5) {
  failures.push({ file: "reading/passages/*", reason: `expected 5 passages, got ${passageCount}` });
}
if (promptCount !== 10) {
  failures.push({ file: "writing/prompts.json", reason: `expected 10 prompts, got ${promptCount}` });
}

if (failures.length > 0) {
  console.error("[validate:content] FAIL");
  for (const f of failures) console.error(`- ${f.file}: ${f.reason}`);
  process.exit(1);
}

console.log(
  `[validate:content] PASS — vocab=${vocabCount} passages=${passageCount} questions=${questionCount} prompts=${promptCount}, 0 skipped.`,
);
