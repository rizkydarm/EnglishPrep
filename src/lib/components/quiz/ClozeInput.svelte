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
    if (e.key === "Escape") {
      e.preventDefault();
      if (!disabled && (picked !== null || input !== "")) {
        picked = null;
        input = "";
      } else {
        onExit?.();
      }
      return;
    }
    if (disabled) return;
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
  class="card-3d p-6"
  class:card-correct={answered && isCorrect}
  class:card-wrong={answered && !isCorrect}
  aria-label="Complete the sentence"
  aria-live="polite"
>
  {#if loading}
    <p class="p-6 text-center text-muted-foreground font-semibold" role="status">Loading question…</p>
  {:else if error}
    <p class="p-4 rounded-xl border-2 border-destructive bg-destructive-bg text-destructive-text font-bold" role="alert">{error}</p>
  {:else if !question}
    <p class="p-6 text-center text-muted-foreground font-semibold">No question available.</p>
  {:else}
    {@const parts = sentenceParts()}
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center gap-2">
        <span class="badge-pill bg-card text-foreground text-xs">
          Complete sentence
        </span>
        <span class="badge-pill bg-yellow text-accent-ink text-xs">
          {question.level}
        </span>
      </div>
      <span class="badge-pill bg-muted dark:bg-card text-foreground text-xs font-bold">
        {question.mode === "type" ? "Typing mode" : "Word bank"}
      </span>
    </div>

    <!-- Sentence with Blank in Serif (Template-Quiz.html) -->
    <div class="serif text-[18px] md:text-[21px] leading-relaxed text-foreground my-6 p-4 rounded-xl border-2 border-border-strong bg-muted/50 dark:bg-muted">
      <span>{parts.before}</span>
      {#if parts.hasBlank}
        <span
          class="inline-block min-w-[130px] border-b-[3.5px] border-border-strong px-3 pb-0.5 text-center font-bold font-sans transition-colors {answered && isCorrect ? 'border-success text-success-text bg-success-bg rounded-t-lg' : answered && !isCorrect ? 'border-destructive text-destructive-text bg-destructive-bg rounded-t-lg' : userAnswer().trim() !== '' ? 'text-primary' : 'text-muted-foreground'}"
          aria-label={userAnswer().trim() !== "" ? `Answer: ${userAnswer()}` : "Blank"}
        >{userAnswer().trim() !== "" ? userAnswer() : "__________"}</span>
      {/if}
      <span>{parts.after}</span>
    </div>

    {#if question.mode === "type"}
      <div class="space-y-2">
        <label for="cloze-type-input" class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Type the missing word</label>
        <input
          id="cloze-type-input"
          class="w-full border-[2.5px] border-border-strong rounded-xl h-[52px] px-4 font-extrabold text-base focus:border-primary bg-card text-foreground shadow-[0_3px_0_var(--border-strong)] outline-none transition-all"
          type="text"
          placeholder="e.g. accomplished"
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
      <div class="space-y-2">
        <div class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Select from word bank</div>
        <div class="flex flex-wrap gap-2.5" role="group" aria-label="Word bank">
          {#each question.wordBank as word, i (`${i}-${word}`)}
            <button
              type="button"
              class="match-pill text-sm md:text-base font-extrabold {picked === word ? 'selected' : ''} {answered && word === question.targetWord ? 'matched' : ''} {answered && picked === word && !isCorrect ? 'wrong' : ''}"
              aria-pressed={picked === word}
              disabled={answered || disabled}
              onclick={() => pick(word)}
            >
              {word}
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <p class="p-4 text-center text-muted-foreground font-semibold">Word bank is empty for this question.</p>
    {/if}

    <div class="mt-6">
      {#if !answered}
        <button
          type="button"
          class="btn-3d w-full h-[52px] text-base font-extrabold flex items-center justify-center"
          disabled={!canCheck()}
          onclick={check}
        >
          Check Answer ↵
        </button>
      {:else}
        <div
          class="p-4 rounded-xl border-2 border-border-strong font-extrabold text-sm flex items-center gap-3 {isCorrect ? 'bg-success-bg text-success-text border-success' : 'bg-destructive-bg text-destructive-text border-destructive'}"
          role="status"
        >
          <span class="text-xl">{isCorrect ? "✓" : "✗"}</span>
          <span>{isCorrect ? "Correct answer!" : `Not quite. Correct word: “${question.targetWord}”`}</span>
        </div>
      {/if}
    </div>

    <div class="mt-4 flex items-center justify-between text-xs font-bold text-muted-foreground opacity-80">
      <span>Spelling tolerance: 1 character</span>
      <span>Enter checks</span>
      <span>Esc {picked !== null || input !== "" ? "clears" : "exits"}</span>
    </div>
  {/if}
</section>

<style>
  .card-correct {
    border-color: #10B981 !important;
  }
  .card-wrong {
    border-color: #EF4444 !important;
  }
</style>


