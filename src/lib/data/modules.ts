export type Area = "vocabulary" | "reading" | "writing";
export type View = "dashboard" | Area | "progress" | "settings";

export interface PracticeModule {
  id: string;
  name: string;
  area: Area;
  level: string;
  format: string;
  description: string;
  recommended?: boolean;
}

export const AREA_LABEL: Record<Area, string> = {
  vocabulary: "Vocabulary",
  reading: "Reading",
  writing: "Writing",
};

export const VIEW_TITLE: Record<View, string> = {
  dashboard: "Practice modules",
  vocabulary: "Vocabulary",
  reading: "Reading",
  writing: "Writing",
  progress: "Progress",
  settings: "Settings",
};

// Content below is transcribed from the product planning docs in feture_advice/.
// Only mechanics stated there are described. Levels follow the docs (CEFR B1 to B2).
export const MODULES: PracticeModule[] = [
  {
    id: "v1",
    name: "Real Word Detector",
    area: "vocabulary",
    level: "B1-B2",
    format: "DET-inspired",
    description:
      "One word appears on screen. Decide quickly whether it is a real English word or not.",
  },
  {
    id: "v2",
    name: "Contextual Word Completion",
    area: "vocabulary",
    level: "B1-B2",
    format: "DET / TOEIC-inspired",
    description:
      "Read an academic or professional sentence with a missing word, then type the word that fits the context.",
  },
  {
    id: "v3",
    name: "Collocation Builder",
    area: "vocabulary",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Get a headword and choose or arrange the most natural word pairing.",
  },
  {
    id: "v4",
    name: "Precision Replacement",
    area: "vocabulary",
    level: "B1-B2",
    format: "Custom format",
    description:
      "One word in a sentence is highlighted. Replace it with the most precise synonym for that context.",
  },
  {
    id: "v5",
    name: "Word Form Challenge",
    area: "vocabulary",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Get a base word, then type the form that fits the grammatical function.",
  },
  {
    id: "v6",
    name: "Formality Switch",
    area: "vocabulary",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Replace an informal expression with the version that fits academic writing or business communication.",
  },
  {
    id: "r1",
    name: "Interactive Reading Journey",
    area: "reading",
    level: "B1-B2",
    format: "DET-inspired",
    description:
      "One article becomes a chain of different challenges instead of separate questions.",
    recommended: true,
  },
  {
    id: "r2",
    name: "Evidence Hunt",
    area: "reading",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Read an article, then click or highlight the sentence that proves an answer.",
  },
  {
    id: "r3",
    name: "True False Not Given",
    area: "reading",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Read an article, then classify statements as True, False, or Not Given.",
  },
  {
    id: "r4",
    name: "Paragraph Heading Match",
    area: "reading",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Match each paragraph with the right heading from a larger set of options.",
  },
  {
    id: "r5",
    name: "Missing Sentence",
    area: "reading",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Choose the most logical sentence for each gap. Watch logic relations like contrast, cause and effect, example, and reference.",
  },
  {
    id: "r6",
    name: "Multi-Document Challenge",
    area: "reading",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Read related short documents, such as a customer email, a company notice, and a delivery schedule. Find the consistent information across them.",
  },
  {
    id: "r7",
    name: "Summary Reconstruction",
    area: "reading",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Read an article, then complete a summary with missing words. B1 gives a word bank, B2 asks for typed answers within a word limit.",
  },
  {
    id: "w1",
    name: "Sentence Repair Challenge",
    area: "writing",
    level: "B1-B2",
    format: "Custom format",
    description: "Fix one or more errors in a sentence directly.",
  },
  {
    id: "w2",
    name: "Paraphrase Challenge",
    area: "writing",
    level: "B1-B2",
    format: "Custom format",
    description: "Rewrite a sentence without changing its meaning.",
  },
  {
    id: "w3",
    name: "Sentence Fusion",
    area: "writing",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Combine two or three short sentences into one coherent sentence.",
  },
  {
    id: "w4",
    name: "Email Response Simulator",
    area: "writing",
    level: "B1-B2",
    format: "Custom format",
    description:
      "Reply to a simulation email from a customer, lecturer, manager, or coworker with the required points covered.",
  },
];

export const RECOMMENDED = MODULES.find((m) => m.recommended) ?? MODULES[0];

export function modulesOf(area: Area): PracticeModule[] {
  return MODULES.filter((m) => m.area === area);
}

export function searchModules(query: string): PracticeModule[] {
  const q = query.trim().toLowerCase();
  if (!q) return MODULES;
  return MODULES.filter((m) =>
    `${m.name} ${m.description} ${AREA_LABEL[m.area]} ${m.format}`
      .toLowerCase()
      .includes(q),
  );
}
