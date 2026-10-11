// Global app settings (PRD §7.10). Persisted to settings.json.
// Defaults: appearance system, font sans, sound on, difficulty b2-core, timer off.

import type { Level } from "$lib/types/schema";
import { loadState, saveState } from "./persist";

export type Appearance = "system" | "light" | "dark";
export type FontStyle = "sans" | "serif" | "mono";
export type TimerOption = 0 | 15 | 30 | 60;

export interface SettingsState {
	appearance: Appearance;
	font: FontStyle;
	sound: boolean;
	defaultDifficulty: Level;
	defaultTimer: TimerOption;
}

export const DEFAULT_SETTINGS: SettingsState = {
	appearance: "system",
	font: "sans",
	sound: true,
	defaultDifficulty: "b2-core",
	defaultTimer: 0,
};

export type ReloadListener = () => void | Promise<void>;

class SettingsStore {
	appearance = $state<Appearance>(DEFAULT_SETTINGS.appearance);
	font = $state<FontStyle>(DEFAULT_SETTINGS.font);
	sound = $state<boolean>(DEFAULT_SETTINGS.sound);
	defaultDifficulty = $state<Level>(DEFAULT_SETTINGS.defaultDifficulty);
	defaultTimer = $state<TimerOption>(DEFAULT_SETTINGS.defaultTimer);
	loaded = $state(false);

	private listeners = new Set<ReloadListener>();

	snapshot(): SettingsState {
		return {
			appearance: this.appearance,
			font: this.font,
			sound: this.sound,
			defaultDifficulty: this.defaultDifficulty,
			defaultTimer: this.defaultTimer,
		};
	}

	async load(): Promise<void> {
		const saved = await loadState<SettingsState>("settings.json", DEFAULT_SETTINGS);
		this.appearance = saved.appearance;
		this.font = saved.font;
		this.sound = saved.sound;
		this.defaultDifficulty = saved.defaultDifficulty;
		this.defaultTimer = saved.defaultTimer;
		this.loaded = true;
	}

	private async persist(): Promise<void> {
		await saveState("settings.json", this.snapshot());
	}

	async set(patch: Partial<SettingsState>): Promise<void> {
		if (patch.appearance !== undefined) this.appearance = patch.appearance;
		if (patch.font !== undefined) this.font = patch.font;
		if (patch.sound !== undefined) this.sound = patch.sound;
		if (patch.defaultDifficulty !== undefined) this.defaultDifficulty = patch.defaultDifficulty;
		if (patch.defaultTimer !== undefined) this.defaultTimer = patch.defaultTimer;
		await this.persist();
	}

	async reset(): Promise<void> {
		this.appearance = DEFAULT_SETTINGS.appearance;
		this.font = DEFAULT_SETTINGS.font;
		this.sound = DEFAULT_SETTINGS.sound;
		this.defaultDifficulty = DEFAULT_SETTINGS.defaultDifficulty;
		this.defaultTimer = DEFAULT_SETTINGS.defaultTimer;
		await this.persist();
	}

	/** Register a callback run when the user triggers Reload Content. */
	onReloadContent(listener: ReloadListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/** Notify all Reload Content listeners (content loader re-reads files). */
	async reloadContent(): Promise<void> {
		for (const listener of this.listeners) {
			await listener();
		}
	}
}

export const settings = new SettingsStore();

/** Open the editable content folder in Finder (PRD §6.1). No-op outside Tauri. */
export async function openContentFolder(): Promise<boolean> {
	try {
		const { appDataDir } = await import("@tauri-apps/api/path");
		const { join } = await import("@tauri-apps/api/path");
		const { openPath } = await import("@tauri-apps/plugin-opener");
		const dir = await join(await appDataDir(), "content");
		await openPath(dir);
		return true;
	} catch {
		return false;
	}
}
