// Persistence layer (PRD §8).
// JSON files via tauri-plugin-store are the source of truth;
// localStorage is a fallback cache only. Everything stays local.

import { Store } from "@tauri-apps/plugin-store";

const backing = new Map<string, Promise<Store | null>>();

function cacheKey(filename: string): string {
	return `lms:${filename}`;
}

function getBackingStore(filename: string): Promise<Store | null> {
	let pending = backing.get(filename);
	if (!pending) {
		pending = Store.load(filename).then(
			(store) => store,
			() => null,
		);
		backing.set(filename, pending);
	}
	return pending;
}

export function isTauri(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function readCache<T>(filename: string): T | undefined {
	try {
		const raw = localStorage.getItem(cacheKey(filename));
		if (raw === null) return undefined;
		return JSON.parse(raw) as T;
	} catch {
		return undefined;
	}
}

function writeCache<T>(filename: string, value: T): void {
	try {
		localStorage.setItem(cacheKey(filename), JSON.stringify(value));
	} catch {
		// Quota or privacy mode: JSON file remains the source of truth.
	}
}

/** Load state from the JSON store file, falling back to the localStorage cache. */
export async function loadState<T>(filename: string, fallback: T): Promise<T> {
	const store = await getBackingStore(filename);
	if (store) {
		try {
			const value = await store.get<T>("state");
			if (value !== undefined && value !== null) {
				writeCache(filename, value);
				return value;
			}
		} catch {
			// Fall through to cache.
		}
	}
	const cached = readCache<T>(filename);
	if (cached !== undefined) return cached;
	return fallback;
}

/** Save state to the JSON store file and mirror it into the localStorage cache. */
export async function saveState<T>(filename: string, value: T): Promise<void> {
	writeCache(filename, value);
	const store = await getBackingStore(filename);
	if (!store) return;
	try {
		await store.set("state", value);
		await store.save();
	} catch {
		// Cache already written; store write can retry on next save.
	}
}

/** Remove persisted state from both the JSON store file and the cache. */
export async function clearState(filename: string): Promise<void> {
	try {
		localStorage.removeItem(cacheKey(filename));
	} catch {
		// Ignore.
	}
	const store = await getBackingStore(filename);
	if (!store) return;
	try {
		await store.delete("state");
		await store.save();
	} catch {
		// Ignore.
	}
}
