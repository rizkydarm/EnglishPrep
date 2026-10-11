<script lang="ts" module>
  export {
    gradeBestTitle,
    gradeChooseIdea,
    gradeHighlight,
    gradeSentenceCompletion,
    highlightOverlap,
  } from "$lib/utils/reading-grade";
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import ReadingPassage from "./ReadingPassage.svelte";
  import { splitSentences } from "$lib/content-loader/reading";
  import {
    gradeBestTitle,
    gradeChooseIdea,
    gradeHighlight,
    gradeSentenceCompletion,
  } from "$lib/utils/reading-grade";

  type Mode = "tap_sentence" | "choose_idea" | "mcq";

  interface Props {
    /** Passage heading. */
    title?: string;
    /** Raw passage body (split via splitSentences when `sentences` is empty). */
    body?: string;
    /** Pre-split sentences. */
    sentences?: string[];
    /** Question mode. `mcq` covers sentence_completion + best_title (4 options). */
    mode: Mode;
    /** Question prompt shown in the side panel. */
    prompt?: string;
    /** Option texts for `choose_idea` / `mcq`. */
    options?: string[];
    /** For `choose_idea`: highlighted target sentence index. */
    targetSentence?: number | null;
    /** Key: option index for mcq/choose_idea, sentence indices for tap_sentence. */
    answer?: number | number[];
    /** Gap number the current mcq question fills (highlights the gap pill). */
    activeGap?: number | null;
    /** Gap number -> chosen option text, rendered inline in the passage. */
    filledGaps?: Record<number, string>;
    /** Lock input (e.g. after submit). */
    readonly?: boolean;
    /** Emits the user's answer: option index, or tapped sentence indices. */
    onAnswer?: (value: number | number[]) => void;
  }

  let {
    title = "",
    body = "",
    sentences = [],
    mode,
    prompt = "",
    options = [],
    targetSentence = null,
    answer = 0,
    activeGap = null,
    filledGaps = {},
    readonly = false,
    onAnswer,
  }: Props = $props();

  let passage: string[] = $derived(
    sentences.length > 0 ? sentences : body.trim() !== "" ? splitSentences(body) : [],
  );

  let tapped: number[] = $state([]);
  let picked: number | null = $state(null);
  let revealed: boolean = $state(false);
  let correct: boolean = $state(false);

  let keyIndices: number[] = $derived(Array.isArray(answer) ? answer : [answer]);
  let locked: boolean = $derived(readonly || revealed);

  function toggleSentence(i: number): void {
    if (locked || mode !== "tap_sentence") return;
    tapped = tapped.includes(i) ? tapped.filter((s) => s !== i) : [...tapped, i];
  }

  function pickOption(i: number): void {
    if (locked || mode === "tap_sentence") return;
    if (i < 0 || i >= options.length) return;
    picked = i;
  }

  function grade(): boolean {
    if (mode === "tap_sentence") return gradeHighlight(tapped, keyIndices);
    if (picked === null) return false;
    if (mode === "choose_idea") {
      const key = Array.isArray(answer) ? answer[0] : answer;
      return gradeChooseIdea(picked, key ?? 0);
    }
    if (mode === "mcq") {
      const key = Array.isArray(answer) ? answer[0] : answer;
      if (prompt.toLowerCase().includes("title")) return gradeBestTitle(picked, key ?? 0);
      return gradeSentenceCompletion(picked, key ?? 0);
    }
    return false;
  }

  export function submit(): boolean {
    correct = grade();
    revealed = true;
    if (mode === "tap_sentence") onAnswer?.([...tapped]);
    else if (picked !== null) onAnswer?.(picked);
    return correct;
  }

  export function reset(): void {
    tapped = [];
    picked = null;
    revealed = false;
    correct = false;
  }

  function optionState(i: number): "idle" | "picked" | "correct" | "wrong" {
    if (revealed && picked === i) return correct ? "correct" : "wrong";
    if (revealed && correct && picked === null && i === (Array.isArray(answer) ? answer[0] : answer)) {
      return "correct";
    }
    if (picked === i) return "picked";
    return "idle";
  }

  function onKeydown(e: KeyboardEvent): void {
    if (locked || mode === "tap_sentence") return;
    if (e.key >= "1" && e.key <= "9") {
      const i = Number(e.key) - 1;
      if (i < options.length) {
        e.preventDefault();
        pickOption(i);
      }
    } else if (e.key === "Escape") {
      picked = null;
      tapped = [];
    } else if (e.key === "Enter" && picked !== null) {
      e.preventDefault();
      submit();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });
</script>

<div class="reading-layout">
  <div class="reading-main">
    <ReadingPassage
      {title}
      sentences={passage}
      selected={mode === "tap_sentence" ? tapped : []}
      onToggle={mode === "tap_sentence" ? toggleSentence : undefined}
      readonly={locked || mode !== "tap_sentence"}
      {revealed}
      correctIndices={keyIndices}
      {filledGaps}
      {activeGap}
    />
    {#if mode === "choose_idea" && targetSentence !== null && passage[targetSentence] !== undefined}
      <p class="target-note">Highlighted sentence {targetSentence + 1}: “{passage[targetSentence]}”</p>
    {/if}
  </div>

  <aside class="question-panel" aria-label="Question">
    {#if prompt !== ""}
      <p class="question-prompt">{prompt}</p>
    {/if}

    {#if mode === "tap_sentence"}
      <p class="tap-hint">Tap the sentence{keyIndices.length > 1 ? "s" : ""} that show the answer. Tap again to untap.</p>
      {#if tapped.length > 0}
        <p class="tap-count" aria-live="polite">{tapped.length} selected</p>
      {/if}
      <button
        type="button"
        class="check-btn"
        disabled={locked || tapped.length === 0}
        onclick={submit}
      >
        Check answer
      </button>
    {:else}
      <div class="options" role="radiogroup" aria-label={prompt !== "" ? prompt : "Options"}>
        {#each options as option, i (i)}
          <button
            type="button"
            role="radio"
            aria-checked={picked === i}
            class="option option-{optionState(i)}"
            disabled={locked}
            onclick={() => pickOption(i)}
          >
            <span class="option-key" aria-hidden="true">{i + 1}</span>
            <span>{option}</span>
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="check-btn"
        disabled={locked || picked === null}
        onclick={submit}
      >
        Check answer
      </button>
    {/if}

    {#if revealed}
      <p class="feedback feedback-{correct ? 'correct' : 'wrong'}" role="status" aria-live="polite">
        {correct ? "Correct." : "Not quite — try reviewing the passage."}
      </p>
    {/if}
  </aside>
</div>

<style>
  .reading-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    align-items: start;
  }
  @media (min-width: 960px) {
    .reading-layout {
      grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    }
    .question-panel {
      position: sticky;
      top: 1rem;
    }
  }
  .reading-main {
    min-width: 0;
  }
  .target-note {
    margin: 0.75rem 0 0;
    padding: 0.75rem;
    border: 2px solid #6d28d9;
    border-radius: 12px;
    background: #ffffff;
    line-height: 1.6;
  }
  :global(.dark) .target-note {
    background: #1e1e20;
  }
  .question-panel {
    background: #ffffff;
    border: 1px solid #e7e5e4;
    border-radius: 16px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  :global(.dark) .question-panel {
    background: #1e1e20;
    border-color: #2a2a2e;
  }
  .question-prompt {
    margin: 0;
    font-weight: 700;
    line-height: 1.5;
  }
  .tap-hint,
  .tap-count {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.8;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .option {
    display: flex;
    gap: 0.625rem;
    align-items: center;
    min-height: 44px;
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  :global(.dark) .option {
    border-color: #2a2a2e;
  }
  .option:hover:not(:disabled) {
    border-color: #6d28d9;
  }
  .option:focus-visible,
  .check-btn:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
  }
  .option:disabled {
    cursor: default;
    opacity: 0.75;
  }
  .option-key {
    flex: none;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 8px;
    background: #e7e5e4;
    color: #44403c;
    font-size: 0.8rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  :global(.dark) .option-key {
    background: #2a2a2e;
    color: #d6d3d1;
  }
  .option-picked {
    border-color: #6d28d9;
    background: color-mix(in srgb, #6d28d9 8%, transparent);
  }
  .option-correct {
    border-color: #10b981;
    background: color-mix(in srgb, #10b981 10%, transparent);
    animation: reading-flash 250ms ease-out;
  }
  .option-wrong {
    border-color: #ef4444;
    background: color-mix(in srgb, #ef4444 8%, transparent);
    animation: reading-shake 250ms ease-out;
  }
  .check-btn {
    min-height: 44px;
    border: none;
    border-radius: 12px;
    background: #6d28d9;
    color: #fff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .check-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .feedback {
    margin: 0;
    font-weight: 700;
  }
  .feedback-correct {
    color: #10b981;
  }
  .feedback-wrong {
    color: #ef4444;
  }
  @keyframes reading-flash {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes reading-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-4px);
    }
    75% {
      transform: translateX(4px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .option-correct,
    .option-wrong {
      animation: none;
    }
  }
</style>
