// Live content source (PRD §6.1).
// Reads the user-editable content folder at runtime via plugin-fs, falling back
// to the bundled seed when the folder is unavailable (browser dev, first run,
// read error, or an empty folder). Never throws: any failure degrades to bundle.

import type { ContentFile } from "./loader.js";

export interface ContentSourceResult {
	files: ContentFile[];
	source: "folder" | "bundle";
	/** Human note when the bundled seed was used instead of the folder. */
	note?: string;
}

const vocabModules = import.meta.glob("/src-tauri/resources/content/vocab/*.{csv,json}", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const passageModules = import.meta.glob("/src-tauri/resources/content/reading/passages/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const questionModules = import.meta.glob("/src-tauri/resources/content/reading/questions/*.json", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const writingModules = import.meta.glob("/src-tauri/resources/content/writing/prompts.json", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

function fromModules(modules: Record<string, string>): ContentFile[] {
	return Object.entries(modules).map(([path, content]) => ({
		file: path.replace(/^.*\/content\//, ""),
		content,
	}));
}

/** Bundled seed files (build-time). Always available; used as the fallback. */
export function bundledContentFiles(): ContentFile[] {
	return [
		...fromModules(vocabModules),
		...fromModules(passageModules),
		...fromModules(questionModules),
		...fromModules(writingModules),
	].sort((a, b) => a.file.localeCompare(b.file));
}

async function readDirFiles(dir: string, exts: string[], rel: string): Promise<ContentFile[]> {
	try {
		const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
		const entries = await readDir(dir);
		const out: ContentFile[] = [];
		for (const entry of entries) {
			if (entry.isDirectory) continue;
			if (!exts.some((e) => entry.name.endsWith(e))) continue;
			const content = await readTextFile(`${dir}/${entry.name}`);
			out.push({ file: `${rel}/${entry.name}`, content });
		}
		return out;
	} catch {
		// Missing subfolder or unreadable entry: treat as empty, not fatal.
		return [];
	}
}

/** Read the live user content folder. Returns null when unavailable or empty. */
export async function readFolderContentFiles(): Promise<ContentFile[] | null> {
	try {
		const { appDataDir, join } = await import("@tauri-apps/api/path");
		const { exists } = await import("@tauri-apps/plugin-fs");
		const root = await join(await appDataDir(), "content");
		if (!(await exists(root))) return null;
		const files: ContentFile[] = [
			...(await readDirFiles(await join(root, "vocab"), [".csv", ".json"], "vocab")),
			...(await readDirFiles(await join(root, "reading", "passages"), [".md"], "reading/passages")),
			...(await readDirFiles(await join(root, "reading", "questions"), [".json"], "reading/questions")),
			...(await readDirFiles(await join(root, "writing"), [".json"], "writing")),
		];
		return files.length > 0 ? files : null;
	} catch {
		return null;
	}
}

/** Load content files: live folder first, bundled seed as fallback. */
export async function loadContentFiles(): Promise<ContentSourceResult> {
	const folder = await readFolderContentFiles();
	if (folder) return { files: folder, source: "folder" };
	return { files: bundledContentFiles(), source: "bundle", note: "Using bundled seed content." };
}
