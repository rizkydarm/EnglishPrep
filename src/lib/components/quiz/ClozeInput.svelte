<script lang="ts">
  import { checkClozeAnswer, type ClozeVocabQuestion } from "$lib/utils/vocab-factory.js";

  interface Props {
    /** Cloze question (mode "type" | "word_bank"). Null/undefined renders the empty state. */
    question?: ClozeVocabQuestion | null;
    /** Called once the user checks: (isCorrect, userAnswer). */
    onAnswer?: (isCorrect: boolean, userAnswer: string) => void;
    /** Called on Esc (clears selection first, then exits). */
    onExit?: () => void;
    /** Show a loading skeleton instead of content. */
    loading?: boolean;
    /** Error message to display instead of content. */
    error?: string | null;
    /** Disable all interaction. */
    disabled?: boolean;
  }

  let {
    question = null,
    onAnswer,
    onExit,
    loading = false,
    error = null,
    disabled = false,
  }: Props = $props();

  let input: string = $state("");
  let picked: string | null = $state(null);
  let answered: boolean = $state(false);
  let isCorrect: boolean = $state(false);

  let seenId: string | null = $state(null);
  $effect(() => {
    const id = question?.id ?? null;
    if (id !== seenId) {
      seenId = id;
      input = "";
      picked = null;
      answered = false;
      isCorrect = false;
    }
  });

  function userAnswer(): string {
    if (!question) return "";
    return question.mode === "type" ? input : (picked ?? "");
  }

  function canCheck(): boolean {
    if (!question || answered || disabled) return false;
    return userAnswer().trim() !== "";
  }

  function check(): void {
    if (!question || !canCheck()) return;
    isCorrect = checkClozeAnswer(userAnswer(), question);
    answered = true;
    onAnswer?.(isCorrect, userAnswer());
  }

  function pick(word: string): void {
    if (answered || disabled) return;
    picked = picked === word ? null : word;
  }

  function sentenceParts(): { before: string; after: string; hasBlank: boolean } {
    const s = question?.sentenceWithBlank ?? "";
    const idx = s.indexOf("_____");
    if (idx < 0) return { before: s, after: "", hasBlank: false };
    return { before: s.slice(0, idx), after: s.slice(idx + 5), hasBlank: true };
  }

  function onKeydown(e: KeyboardEvent): void {
    if (disabled) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (picked !== null || input !== "") {
        picked = null;
        input = "";
      } else {
        onExit?.();
      }
      return;
    }
    if (e.key === "Enter" && canCheck()) {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      // In type mode the input's own Enter also checks; avoid double handling.
      if (question?.mode === "word_bank" || tag !== "INPUT") {
        e.preventDefault();
        check();
      }
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<section
  class="cloze"
  class:cloze-correct={answered && isCorrect}
  class:cloze-wrong={answered && !isCorrect}
  aria-label="Complete the sentence"
  aria-live="polite"
>
  {#if loading}
    <p class="state" role="status">Loading question…</p>
  {:else if error}
    <p class="state state-error" role="alert">{error}</p>
  {:else if !question}
    <p class="state">No question available.</p>
  {:else}
    {@const parts = sentenceParts()}
    <div class="meta">
      <span class="badge">Complete the sentence</span>
      <span class="badge badge-level">{question.level}</span>
      <span class="badge badge-level">{question.mode === "type" ? "Type answer" : "Word bank"}</span>
    </div>

    <p class="sentence">
      <span>{parts.before}</span>
      {#if parts.hasBlank}
        <span
          class="blank"
          class:blank-filled={userAnswer().trim() !== ""}
          class:blank-correct={answered && isCorrect}
          class:blank-wrong={answered && !isCorrect}
          aria-label={userAnswer().trim() !== "" ? `Answer: ${userAnswer()}` : "Blank"}
        >{userAnswer().trim() !== "" ? userAnswer() : "_____"}</span>
      {/if}
      <span>{parts.after}</span>
    </p>

    {#if question.mode === "type"}
      <div class="type-row">
        <input
          class="type-input"
          type="text"
          placeholder="Type the missing word…"
          aria-label="Missing word"
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          disabled={answered || disabled}
          bind:value={input}
          onkeydown={(e) => {
            if (e.key === "Enter" && canCheck()) {
              e.preventDefault();
              check();
            }
          }}
        />
      </div>
    {:else if question.wordBank && question.wordBank.length > 0}
      <div class="bank" role="group" aria-label="Word bank">
        {#each question.wordBank as word (`${word}`)}
          <button
            type="button"
            class="chip"
            class:chip-selected={picked === word}
            class:chip-correct={answered && word === question.targetWord}
            class:chip-wrong={answered && picked === word && !isCorrect}
            aria-pressed={picked === word}
            disabled={answered || disabled}
            onclick={() => pick(word)}
          >
            {word}
          </button>
        {/each}
      </div>
    {:else}
      <p class="state">Word bank is empty for this question.</p>
    {/if}

    <div class="actions">
      {#if !answered}
        <button type="button" class="check" disabled={!canCheck()} onclick={check}>
          Check ↵
        </button>
      {:else}
        <p class="feedback {isCorrect ? 'feedback-ok' : 'feedback-bad'}" role="status">
          {isCorrect ? "Correct!" : `Correct answer: ${question.targetWord}`}
        </p>
      {/if}
    </div>
    <p class="hint">Spelling close enough counts (one-letter difference accepted) · Enter checks · Esc {picked !== null || input !== "" ? "clears" : "exits"}</p>
  {/if}
</section>

<style>
  .cloze {
    background: #ffffff;
    border: 2px solid #e7e5e4;
    border-radius: 16px;
    padding: 1.25rem;
  }
  :global(.dark) .cloze {
    background: #1e1e20;
    border-color: #2a2a2e;
  }
  .cloze-correct {
    border-color: #10b981;
    animation: cloze-flash 250ms ease-out;
  }
  .cloze-wrong {
    border-color: #ef4444;
    animation: cloze-shake 250ms ease-out;
  }
  .meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
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
  .sentence {
    font-size: 1.1rem;
    line-height: 2;
    margin: 0 0 1rem;
  }
  .blank {
    display: inline-block;
    min-width: 6rem;
    padding: 0.1rem 0.7rem;
    margin: 0 0.25rem;
    border: 2px solid #6d28d9;
    border-radius: 8px;
    font-weight: 700;
    text-align: center;
    vertical-align: baseline;
  }
  .blank-filled {
    background: color-mix(in srgb, #6d28d9 10%, transparent);
  }
  .blank-correct {
    border-color: #10b981;
    background: color-mix(in srgb, #10b981 12%, transparent);
    animation: cloze-flash 250ms ease-out;
  }
  .blank-wrong {
    border-color: #ef4444;
    background: color-mix(in srgb, #ef4444 8%, transparent);
    animation: cloze-shake 250ms ease-out;
  }
  .type-row {
    display: flex;
    gap: 0.625rem;
  }
  .type-input {
    flex: 1;
    min-height: 44px;
    padding: 0.7rem 0.9rem;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
  }
  :global(.dark) .type-input {
    border-color: #2a2a2e;
  }
  .type-input:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
    border-color: #6d28d9;
  }
  .type-input:disabled {
    opacity: 0.7;
  }
  .bank {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
  }
  .chip {
    min-height: 44px;
    min-width: 44px;
    padding: 0.6rem 1rem;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: transform 80ms ease-out, border-color 120ms ease-out, background 120ms ease-out;
  }
  :global(.dark) .chip {
    border-color: #2a2a2e;
  }
  .chip:not(:disabled):hover {
    border-color: #6d28d9;
  }
  .chip:not(:disabled):active {
    transform: scale(0.98) translateY(1px);
  }
  .chip:focus-visible,
  .check:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
  }
  .chip:disabled {
    cursor: default;
    opacity: 0.85;
  }
  .chip-selected {
    border-color: #6d28d9;
    background: color-mix(in srgb, #6d28d9 8%, transparent);
  }
  .chip-correct {
    border-color: #10b981;
    background: color-mix(in srgb, #10b981 12%, transparent);
    animation: cloze-flash 250ms ease-out;
  }
  .chip-wrong {
    border-color: #ef4444;
    background: color-mix(in srgb, #ef4444 8%, transparent);
    animation: cloze-shake 250ms ease-out;
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
  @keyframes cloze-flash {
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
  @keyframes cloze-shake {
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
    .cloze-correct,
    .cloze-wrong,
    .blank-correct,
    .blank-wrong,
    .chip-correct,
    .chip-wrong {
      animation: none;
    }
    .chip,
    .check {
      transition: none;
    }
  }
</style>
