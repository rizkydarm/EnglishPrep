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
  class="vocab-card"
  class:card-correct={answered && isCorrect}
  class:card-wrong={answered && !isCorrect}
  aria-label="Vocabulary question"
  aria-live="polite"
>
  {#if loading}
    <p class="state" role="status">Loading question…</p>
  {:else if error}
    <p class="state state-error" role="alert">{error}</p>
  {:else if !question}
    <p class="state">No question available.</p>
  {:else}
    <div class="meta">
      <span class="badge">{question.type === "best_word" ? "Best word" : question.type === "true_false" ? "True / False" : "Multiple choice"}</span>
      <span class="badge badge-level">{question.level}</span>
    </div>
    <h2 class="prompt">{heading()}</h2>

    {#if question.type === "true_false"}
      <div class="tf-row" role="group" aria-label="True or false">
        {#each options() as label, i (`${i}-${label}`)}
          <button
            type="button"
            class="option tf-btn option-{optionState(i)}"
            aria-pressed={selected === i}
            disabled={answered || disabled}
            onclick={() => {
              if (!answered && !disabled) selected = i;
            }}
          >
            <span class="key" aria-hidden="true">{i === 0 ? "T" : "F"}</span>
            {label}
          </button>
        {/each}
      </div>
    {:else}
      <div class="options" role="group" aria-label="Answer options">
        {#each options() as label, i (`${i}-${label}`)}
          <button
            type="button"
            class="option option-{optionState(i)}"
            aria-pressed={selected === i}
            disabled={answered || disabled}
            onclick={() => {
              if (!answered && !disabled) selected = i;
            }}
          >
            <span class="key" aria-hidden="true">{i + 1}</span>
            <span>{label}</span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="actions">
      {#if !answered}
        <button type="button" class="check" disabled={selected < 0 || disabled} onclick={check}>
          Check ↵
        </button>
      {:else}
        <p class="feedback {isCorrect ? 'feedback-ok' : 'feedback-bad'}" role="status">
          {isCorrect ? "Correct!" : "Not quite — the highlighted answer is correct."}
        </p>
      {/if}
    </div>
    <p class="hint">Keys 1–{optionCount()} select · Enter checks · Esc exits</p>
    {#if lastKey !== ""}
      <span class="sr" aria-hidden="true">{lastKey}</span>
    {/if}
  {/if}
</section>

<style>
  .vocab-card {
    background: #ffffff;
    border: 2px solid #e7e5e4;
    border-radius: 16px;
    padding: 1.25rem;
  }
  :global(.dark) .vocab-card {
    background: #1e1e20;
    border-color: #2a2a2e;
  }
  .card-correct {
    border-color: #10b981;
    animation: vocab-flash 250ms ease-out;
  }
  .card-wrong {
    border-color: #ef4444;
    animation: vocab-shake 250ms ease-out;
  }
  .meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    background: color-mix(in srgb, #6d28d9 10%, transparent);
    color: #6d28d9;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .badge-level {
    background: transparent;
    border: 1px solid #e7e5e4;
    color: inherit;
    opacity: 0.8;
  }
  :global(.dark) .badge-level {
    border-color: #2a2a2e;
  }
  .prompt {
    font-size: 1.125rem;
    line-height: 1.55;
    margin: 0 0 1rem;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .tf-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 44px;
    padding: 0.7rem 0.9rem;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform 80ms ease-out, border-color 120ms ease-out, background 120ms ease-out;
  }
  :global(.dark) .option {
    border-color: #2a2a2e;
  }
  .option:not(:disabled):hover {
    border-color: #6d28d9;
  }
  .option:not(:disabled):active {
    transform: scale(0.98) translateY(1px);
  }
  .option:focus-visible,
  .check:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
  }
  .option:disabled {
    cursor: default;
    opacity: 0.85;
  }
  .key {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.75rem;
    height: 1.75rem;
    padding: 0 0.4rem;
    border-radius: 8px;
    background: #e7e5e4;
    color: #44403c;
    font-size: 0.8rem;
    font-weight: 700;
  }
  :global(.dark) .key {
    background: #2a2a2e;
    color: #d6d3d1;
  }
  .option-selected {
    border-color: #6d28d9;
    background: color-mix(in srgb, #6d28d9 8%, transparent);
  }
  .option-correct {
    border-color: #10b981;
    background: color-mix(in srgb, #10b981 12%, transparent);
    animation: vocab-flash 250ms ease-out;
  }
  .option-wrong {
    border-color: #ef4444;
    background: color-mix(in srgb, #ef4444 8%, transparent);
    animation: vocab-shake 250ms ease-out;
  }
  .tf-btn {
    justify-content: center;
    font-weight: 700;
    font-size: 1.05rem;
    min-height: 56px;
  }
  .actions {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .check {
    min-height: 44px;
    min-width: 44px;
    padding: 0.65rem 1.25rem;
    border: none;
    border-radius: 12px;
    background: #6d28d9;
    color: #fff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 80ms ease-out;
  }
  .check:not(:disabled):active {
    transform: scale(0.98) translateY(1px);
  }
  .check:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .feedback {
    margin: 0;
    font-weight: 700;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .feedback-ok {
    color: #10b981;
  }
  .feedback-bad {
    color: #ef4444;
  }
  .hint {
    margin: 0.75rem 0 0;
    font-size: 0.78rem;
    opacity: 0.65;
  }
  .state {
    margin: 0;
    padding: 1rem;
    border: 2px dashed #e7e5e4;
    border-radius: 12px;
    min-height: 44px;
  }
  :global(.dark) .state {
    border-color: #2a2a2e;
  }
  .state-error {
    border-color: #ef4444;
    border-style: solid;
    color: #ef4444;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  @keyframes vocab-flash {
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
  @keyframes vocab-shake {
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
    .card-correct,
    .card-wrong,
    .option-correct,
    .option-wrong {
      animation: none;
    }
    .option,
    .check {
      transition: none;
    }
  }
</style>
