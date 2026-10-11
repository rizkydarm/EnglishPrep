// Navigation labels for the app shell.
// The app has exactly three practice modes (PRD §7.1): Vocabulary, Reading,
// Writing. They are chosen on Home, not routed by the shell. The shell only
// routes the top-level destinations below.

export type View = "dashboard" | "progress" | "settings";

export const VIEW_TITLE: Record<View, string> = {
	dashboard: "Home",
	progress: "Progress",
	settings: "Settings",
};
