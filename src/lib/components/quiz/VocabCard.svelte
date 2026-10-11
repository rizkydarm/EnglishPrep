<script lang="ts">
  import type {
    BestWordVocabQuestion,
    McqVocabQuestion,
    TrueFalseVocabQuestion,
  } from "$lib/utils/vocab-factory.js";

  export type VocabCardQuestion = McqVocabQuestion | TrueFalseVocabQuestion | BestWordVocabQuestion;

  interface Props {
    /** Question to render (mcq | true_false | best_word). Null/undefined renders the empty state. */
    question?: VocabCardQuestion | null;
    /** Called once the user checks an answer: (isCorrect, selectedIndex). Fires exactly once per question. */
    onAnswer?: (isCorrect: boolean, selectedIndex: number) => void;
    /** Called when the user requests advance after answering (Enter/Space). Never re-fires onAnswer. */
    onNext?: () => void;
    /** Called on Esc (exit / dismiss). */
    onExit?: () => void;
    /** Show a loading skeleton instead of content. */
    loading?: boolean;
    /** Error message to display instead of content. */
    error?: string | null;
    /** Disable all interaction (e.g. timer expired). */
    disabled?: boolean;
  }

  let {
    question = null,
    onAnswer,
    onNext,
    onExit,
    loading = false,
    error = null,
    disabled = false,
  }: Props = $props();

  let selected: number = $state(-1);
  let answered: boolean = $state(false);
  let isCorrect: boolean = $state(false);
  let lastKey: string = $state("");

  // Reset local state whenever a new question arrives.
  let seenId: string | null = $state(null);
  $effect(() => {
    const id = question?.id ?? null;
    if (id !== seenId) {
      seenId = id;
      selected = -1;
      answered = false;
      isCorrect = false;
    }
  });

  function optionCount(): number {
    if (!question) return 0;
    if (question.type === "true_false") return 2;
    return question.options.length;
  }

  function correctIndex(): number {
    if (!question) return -1;
    if (question.type === "true_false") return question.isTrue ? 0 : 1;
    return question.answerIndex;
  }

  function heading(): string {
    if (!question) return "";
    if (question.type === "mcq") return question.prompt;
    if (question.type === "best_word") return question.sentenceWithBlank;
    return question.statement;
  }

  function options(): string[] {
    if (!question) return [];
    if (question.type === "true_false") return ["True", "False"];
    return question.options;
  }

  function check(): void {
    if (!question || answered || selected < 0 || disabled) return;
    isCorrect = selected === correctIndex();
    answered = true;
    onAnswer?.(isCorrect, selected);
  }

  function next(): void {
    if (!answered) {
      check();
      return;
    }
    // Parent advances the question; reset handled by the id effect.
    onNext?.();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      onExit?.();
      return;
    }
    if (disabled) return;
    if (answered) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        next();
      }
      return;
    }
    const count = optionCount();
    if (e.key >= "1" && e.key <= String(Math.min(9, count))) {
      const idx = Number(e.key) - 1;
      if (idx < count) {
        e.preventDefault();
        lastKey = e.key;
        selected = idx;
      }
      return;
    }
    if (question?.type === "true_false") {
      const k = e.key.toLowerCase();
      if (k === "t") {
        e.preventDefault();
        selected = 0;
        return;
      }
      if (k === "f") {
        e.preventDefault();
        selected = 1;
        return;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      check();
    }
  }

  function optionState(i: number): "idle" | "selected" | "correct" | "wrong" {
    if (answered) {
      if (i === correctIndex()) return "correct";
      if (i === selected) return "wrong";
      return "idle";
    }
    return i === selected ? "selected" : "idle";
  }
</script>

<svelte:window onkeydown={onKeydown} />

<section
  class="card-3d p-6"
  class:card-correct={answered && isCorrect}
  class:card-wrong={answered && !isCorrect}
  aria-label="Vocabulary question"
  aria-live="polite"
>
  {#if loading}
    <p class="p-6 text-center text-muted-foreground font-semibold" role="status">Loading question…</p>
  {:else if error}
    <p class="p-4 rounded-xl border-2 border-destructive bg-destructive-bg text-destructive-text font-bold" role="alert">{error}</p>
  {:else if !question}
    <p class="p-6 text-center text-muted-foreground font-semibold">No question available.</p>
  {:else}
    <div class="flex items-center justify-between gap-2 mb-4">
      <span class="badge-pill bg-card text-foreground text-xs">
        {question.type === "best_word" ? "Best word" : question.type === "true_false" ? "True / False" : "Multiple choice"}
      </span>
      <span class="badge-pill bg-yellow text-accent-ink text-xs">
        {question.level}
      </span>
    </div>

    <h3 class="text-xl md:text-2xl font-black text-foreground mb-6 leading-snug">
      {heading()}
    </h3>

    {#if question.type === "true_false"}
      <div class="grid grid-cols-2 gap-4" role="group" aria-label="True or false">
        {#each options() as label, i (`${i}-${label}`)}
          <button
            type="button"
            class="choice flex items-center justify-center gap-3 min-h-[58px] text-lg font-extrabold {optionState(i) === 'selected' ? 'selected' : optionState(i) === 'correct' ? 'correct' : optionState(i) === 'wrong' ? 'wrong' : ''}"
            aria-pressed={selected === i}
            disabled={answered || disabled}
            onclick={() => {
              if (!answered && !disabled) selected = i;
            }}
          >
            <span class="w-7 h-7 rounded-lg border-2 border-border-strong bg-muted dark:bg-card flex items-center justify-center text-xs font-black shrink-0" aria-hidden="true">
              {i === 0 ? "T" : "F"}
            </span>
            <span>{label}</span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2" role="group" aria-label="Answer options">
        {#each options() as label, i (`${i}-${label}`)}
          {@const optKey = ["A", "B", "C", "D"][i] ?? String(i + 1)}
          <button
            type="button"
            class="choice flex items-center gap-3 {optionState(i) === 'selected' ? 'selected' : optionState(i) === 'correct' ? 'correct' : optionState(i) === 'wrong' ? 'wrong' : ''}"
            aria-pressed={selected === i}
            disabled={answered || disabled}
            onclick={() => {
              if (!answered && !disabled) selected = i;
            }}
          >
            <span class="w-8 h-8 rounded-xl border-2 border-border-strong bg-muted dark:bg-card flex items-center justify-center text-xs font-black shrink-0" aria-hidden="true">
              {optKey}
            </span>
            <span class="flex-1 font-bold text-base">{label}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if !answered}
      <div class="mt-6">
        <button
          type="button"
          class="btn-3d w-full h-[52px] text-base font-extrabold flex items-center justify-center"
          disabled={selected < 0 || disabled}
          onclick={check}
        >
          Check Answer ↵
        </button>
      </div>
    {/if}

    <div class="mt-4 flex items-center justify-between text-xs font-bold text-muted-foreground opacity-80">
      <span>Keys 1–{optionCount()} select</span>
      <span>Enter checks</span>
      <span>Esc exits</span>
    </div>
    {#if lastKey !== ""}
      <span class="sr" aria-hidden="true">{lastKey}</span>
    {/if}
  {/if}
</section>

<style>
  .card-correct {
    border-color: #10B981 !important;
  }
  .card-wrong {
    border-color: #EF4444 !important;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
