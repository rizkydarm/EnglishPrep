import matter from "gray-matter";
import Papa from "papaparse";
import type { ZodError } from "zod";
import {
  ReadingPassageSchema,
  ReadingQuestionsSchema,
  VocabEntrySchema,
  type ReadingPassage,
  type ReadingQuestions,
  type VocabEntry,
} from "$lib/types/schema.js";
import { validateGaps } from "./reading.js";

export interface ContentFile {
  file: string;
  content: string;
}

export interface SkippedFile {
  file: string;
  reason: string;
}

export interface LoadResult<T> {
  ok: T[];
  skipped: SkippedFile[];
}

function issuesReason(err: ZodError): string {
  const parts = err.issues.map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`);
  const joined = parts.join("; ");
  return joined.length > 300 ? `${joined.slice(0, 297)}...` : joined;
}

function skip(file: string, reason: string): SkippedFile {
  return { file, reason: reason.length > 300 ? `${reason.slice(0, 297)}...` : reason };
}

export function loadVocab(files: ContentFile[]): LoadResult<VocabEntry> {
  const ok: VocabEntry[] = [];
  const skipped: SkippedFile[] = [];
  for (const { file, content } of files) {
    try {
      const trimmed = content.trim();
      let rows: unknown[];
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const parsed: unknown = JSON.parse(content);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const parsed = Papa.parse<Record<string, string>>(content, {
          header: true,
          skipEmptyLines: true,
        });
        if (parsed.errors.length > 0) {
          skipped.push(skip(file, `CSV parse error: ${parsed.errors[0].message}`));
          continue;
        }
        rows = parsed.data;
      }
      const entries: VocabEntry[] = [];
      let failed: string | null = null;
      for (let i = 0; i < rows.length; i++) {
        const r = VocabEntrySchema.safeParse(rows[i]);
        if (!r.success) {
          failed = `row ${i}: ${issuesReason(r.error)}`;
          break;
        }
        entries.push(r.data);
      }
      if (failed !== null) {
        skipped.push(skip(file, failed));
        continue;
      }
      ok.push(...entries);
    } catch (e) {
      skipped.push(skip(file, e instanceof Error ? e.message : "unknown parse error"));
    }
  }
  return { ok, skipped };
}

export function loadPassage(files: ContentFile[]): LoadResult<ReadingPassage> {
  const ok: ReadingPassage[] = [];
  const skipped: SkippedFile[] = [];
  for (const { file, content } of files) {
    try {
      let data: Record<string, unknown>;
      let body: string;
      try {
        const parsed = matter(content);
        data = parsed.data as Record<string, unknown>;
        body = parsed.content.trim();
      } catch (e) {
        skipped.push(skip(file, e instanceof Error ? e.message : "frontmatter parse error"));
        continue;
      }
      if (!data || typeof data !== "object" || Object.keys(data).length === 0 || body.length === 0) {
        skipped.push(skip(file, "missing gray-matter frontmatter or empty body"));
        continue;
      }
      const r = ReadingPassageSchema.safeParse({ ...data, body });
      if (!r.success) {
        skipped.push(skip(file, issuesReason(r.error)));
        continue;
      }
      const gapError = validateGaps(r.data.body);
      if (gapError !== null) {
        skipped.push(skip(file, gapError));
        continue;
      }
      ok.push(r.data);
    } catch (e) {
      skipped.push(skip(file, e instanceof Error ? e.message : "unknown parse error"));
    }
  }
  return { ok, skipped };
}

export function loadQuestions(files: ContentFile[]): LoadResult<ReadingQuestions> {
  const ok: ReadingQuestions[] = [];
  const skipped: SkippedFile[] = [];
  for (const { file, content } of files) {
    try {
      const parsed: unknown = JSON.parse(content);
      const r = ReadingQuestionsSchema.safeParse(parsed);
      if (!r.success) {
        skipped.push(skip(file, issuesReason(r.error)));
        continue;
      }
      ok.push(r.data);
    } catch (e) {
      skipped.push(skip(file, e instanceof Error ? e.message : "unknown parse error"));
    }
  }
  return { ok, skipped };
}
