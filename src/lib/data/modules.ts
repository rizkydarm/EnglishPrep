// Navigation labels for the app shell.
// The app has exactly three practice modes (PRD §7.1): Vocabulary, Reading,
// Writing. There is no browsable module catalog.

export type Area = "vocabulary" | "reading" | "writing";
export type View = "dashboard" | Area | "progress" | "settings";

export const AREA_LABEL: Record<Area, string> = {
	vocabulary: "Vocabulary",
	reading: "Reading",
	writing: "Writing",
};

export const VIEW_TITLE: Record<View, string> = {
	dashboard: "Home",
	vocabulary: "Vocabulary",
	reading: "Reading",
	writing: "Writing",
	progress: "Progress",
	settings: "Settings",
};
