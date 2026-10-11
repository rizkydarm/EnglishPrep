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
    /** Explicit mcq sub-kind; replaces prompt-sniffing dispatch. */
    mcqKind?: "sentence_completion" | "best_title";
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
    /** Called on Esc when there is no selection to clear (exit / dismiss). */
    onExit?: () => void;
  }

  let {
    title = "",
    body = "",
    sentences = [],
    mode,
    prompt = "",
    mcqKind = "sentence_completion",
    options = [],
    targetSentence = null,
    answer = 0,
    activeGap = null,
    filledGaps = {},
    readonly = false,
    onAnswer,
    onExit,
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
      if (mcqKind === "best_title") return gradeBestTitle(picked, key ?? 0);
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
    if (e.key === "Escape") {
      if (!locked && (picked !== null || tapped.length > 0)) {
        picked = null;
        tapped = [];
        return;
      }
      onExit?.();
      return;
    }
    if (locked) return;
    const target = e.target as HTMLElement | null;
    if (target !== null) {
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      if (root !== null && !root.contains(target)) return;
    }
    if (mode === "tap_sentence") return;
    if (e.key >= "1" && e.key <= "4") {
      const i = Number(e.key) - 1;
      if (i < options.length) {
        e.preventDefault();
        pickOption(i);
      }
    } else if (e.key === "Enter" && picked !== null) {
      e.preventDefault();
      submit();
    }
  }

  let root: HTMLDivElement | null = $state(null);

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });
</script>

<div class="reading-layout" bind:this={root}>
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
      <div class="card-3d p-4 mt-4 bg-yellow text-accent-ink font-medium">
        <span class="text-xs font-extrabold uppercase tracking-wider block mb-1">Target Sentence {targetSentence + 1}</span>
        <p class="serif text-base italic">“{passage[targetSentence]}”</p>
      </div>
    {/if}
  </div>

  <aside class="card-3d p-6 bg-card space-y-4" aria-label="Question">
    {#if prompt !== ""}
      <h3 class="text-lg md:text-xl font-extrabold text-foreground leading-snug">
        {prompt}
      </h3>
    {/if}

    {#if mode === "tap_sentence"}
      <div class="p-3 rounded-xl border-2 border-border-strong bg-muted dark:bg-muted text-xs font-bold text-muted-foreground">
        Tap the sentence{keyIndices.length > 1 ? "s" : ""} on the left that show the answer. Tap again to deselect.
      </div>
      {#if tapped.length > 0}
        <div class="px-3 py-1 rounded-full border-2 border-border-strong bg-cyan text-accent-ink text-xs font-extrabold w-fit" aria-live="polite">
          {tapped.length} sentence{tapped.length === 1 ? "" : "s"} selected
        </div>
      {/if}
      <button
        type="button"
        class="btn-3d w-full h-[52px] font-extrabold"
        disabled={locked || tapped.length === 0}
        onclick={submit}
      >
        Check answer
      </button>
    {:else}
      <div class="space-y-3" role="radiogroup" aria-label={prompt !== "" ? prompt : "Options"}>
        {#each options as option, i (i)}
          {@const optKey = ["A", "B", "C", "D"][i] ?? String(i + 1)}
          <button
            type="button"
            role="radio"
            aria-checked={picked === i}
            class="choice flex items-center gap-3 {optionState(i) === 'picked' ? 'selected' : optionState(i) === 'correct' ? 'correct' : optionState(i) === 'wrong' ? 'wrong' : ''}"
            disabled={locked}
            onclick={() => pickOption(i)}
          >
            <span class="w-8 h-8 rounded-xl border-2 border-border-strong bg-muted dark:bg-card flex items-center justify-center text-xs font-black shrink-0" aria-hidden="true">
              {optKey}
            </span>
            <span class="flex-1 font-bold text-sm md:text-base">{option}</span>
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="btn-3d w-full h-[52px] font-extrabold mt-4"
        disabled={locked || picked === null}
        onclick={submit}
      >
        Check answer
      </button>
    {/if}

    {#if revealed}
      <div
        class="p-4 rounded-xl border-2 border-border-strong font-extrabold text-sm flex items-center gap-3 {correct ? 'bg-success-bg text-success-text border-success' : 'bg-destructive-bg text-destructive-text border-destructive'}"
        role="status"
        aria-live="polite"
      >
        <span class="text-xl">{correct ? "✓" : "✗"}</span>
        <span>{correct ? "Correct! Well done." : "Not quite. Check the highlighted sentence in the passage."}</span>
      </div>
    {/if}
  </aside>
</div>

<style>
  .reading-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: start;
  }
  @media (min-width: 960px) {
    .reading-layout {
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.95fr);
    }
  }
  .reading-main {
    min-width: 0;
  }
</style>
