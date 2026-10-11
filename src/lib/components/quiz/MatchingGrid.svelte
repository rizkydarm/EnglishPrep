<script lang="ts">
  import { matchingPartial } from "$lib/utils/scoring.js";
  import type { MatchingVocabQuestion } from "$lib/utils/vocab-factory.js";

  interface Props {
    /** Matching question (4 or 6 pairs). Null/undefined renders the empty state. */
    question?: MatchingVocabQuestion | null;
    /** Called once all pairs are assigned and graded: (score 0..1, correctPairs, totalPairs). */
    onAnswer?: (score: number, correctPairs: number, totalPairs: number) => void;
    /** Called on Esc with nothing selected. */
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

  let selectedLeft: string | null = $state(null);
  let selectedRight: string | null = $state(null);
  /** left pair id -> assigned right pair id. An entry locks both chips. */
  let assigned: Record<string, string> = $state({});
  let graded: boolean = $state(false);
  let score: number = $state(0);
  let correctPairs: number = $state(0);
  let justLocked: string | null = $state(null);

  let seenId: string | null = $state(null);
  $effect(() => {
    const id = question?.id ?? null;
    if (id !== seenId) {
      seenId = id;
      selectedLeft = null;
      selectedRight = null;
      assigned = {};
      graded = false;
      score = 0;
      correctPairs = 0;
      justLocked = null;
    }
  });

  function totalPairs(): number {
    return question?.pairs.length ?? 0;
  }

  function assignedCount(): number {
    return Object.keys(assigned).length;
  }

  function pairCorrect(leftId: string): boolean {
    return assigned[leftId] === leftId;
  }

  function tryAssign(): void {
    if (!question || graded || disabled) return;
    if (selectedLeft === null || selectedRight === null) return;
    if (assigned[selectedLeft] !== undefined) {
      selectedLeft = null;
      selectedRight = null;
      return;
    }
    assigned = { ...assigned, [selectedLeft]: selectedRight };
    justLocked = selectedLeft;
    const lockedId = selectedLeft;
    setTimeout(() => {
      if (justLocked === lockedId) justLocked = null;
    }, 300);
    selectedLeft = null;
    selectedRight = null;
    if (Object.keys(assigned).length >= totalPairs() && totalPairs() > 0) {
      grade();
    }
  }

  function grade(): void {
    if (!question || graded) return;
    let correct = 0;
    for (const leftId of Object.keys(assigned)) {
      if (pairCorrect(leftId)) correct += 1;
    }
    correctPairs = correct;
    score = matchingPartial(correct, totalPairs());
    graded = true;
    onAnswer?.(score, correctPairs, totalPairs());
  }

  function tapLeft(id: string): void {
    if (graded || disabled || assigned[id] !== undefined) return;
    selectedLeft = selectedLeft === id ? null : id;
    tryAssign();
  }

  function tapRight(id: string): void {
    if (graded || disabled) return;
    if (Object.values(assigned).includes(id)) return;
    selectedRight = selectedRight === id ? null : id;
    tryAssign();
  }

  function reset(): void {
    selectedLeft = null;
    selectedRight = null;
    assigned = {};
    graded = false;
    score = 0;
    correctPairs = 0;
    justLocked = null;
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      if (!disabled && (selectedLeft !== null || selectedRight !== null)) {
        selectedLeft = null;
        selectedRight = null;
      } else {
        onExit?.();
      }
      return;
    }
    if (disabled) return;
  }

  function leftClass(id: string): string {
    if (assigned[id] !== undefined) {
      if (!graded) return "chip-locked";
      return pairCorrect(id) ? "chip-correct" : "chip-wrong";
    }
    return selectedLeft === id ? "chip-selected" : "";
  }

  function rightClass(id: string): string {
    const leftId = Object.keys(assigned).find((k) => assigned[k] === id);
    if (leftId !== undefined) {
      if (!graded) return "chip-locked";
      return pairCorrect(leftId) ? "chip-correct" : "chip-wrong";
    }
    return selectedRight === id ? "chip-selected" : "";
  }
</script>

<svelte:window onkeydown={onKeydown} />

<section class="card-3d p-6" aria-label="Matching question" aria-live="polite">
  {#if loading}
    <p class="p-6 text-center text-muted-foreground font-semibold" role="status">Loading matching question…</p>
  {:else if error}
    <p class="p-4 rounded-xl border-2 border-destructive bg-destructive-bg text-destructive-text font-bold" role="alert">{error}</p>
  {:else if !question}
    <p class="p-6 text-center text-muted-foreground font-semibold">No matching question available.</p>
  {:else if question.pairs.length === 0}
    <p class="p-6 text-center text-muted-foreground font-semibold">This matching set has no pairs.</p>
  {:else}
    <div class="flex items-center justify-between gap-2 mb-6">
      <div class="flex items-center gap-2">
        <span class="badge-pill bg-card text-foreground text-xs">
          Matching · {question.pairCount} pairs
        </span>
        <span class="badge-pill bg-yellow text-accent-ink text-xs">
          {question.level}
        </span>
      </div>
      <span class="badge-pill bg-cyan/20 text-accent-ink dark:text-cyan text-xs font-black" aria-label="{assignedCount()} of {totalPairs()} pairs assigned">
        {assignedCount()}/{totalPairs()} paired
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3 md:gap-4">
      <div class="space-y-3" role="group" aria-label="Words">
        {#each question.leftItems as item (item.id)}
          <button
            type="button"
            class="match-pill w-full text-left font-bold text-sm md:text-base {leftClass(item.id)}"
            class:chip-just={justLocked === item.id}
            aria-pressed={selectedLeft === item.id}
            disabled={assigned[item.id] !== undefined || graded || disabled}
            onclick={() => tapLeft(item.id)}
          >
            {item.text}
          </button>
        {/each}
      </div>
      <div class="space-y-3" role="group" aria-label="Definitions">
        {#each question.rightItems as item (item.id)}
          <button
            type="button"
            class="match-pill w-full text-left font-semibold text-xs md:text-sm {rightClass(item.id)}"
            aria-pressed={selectedRight === item.id}
            disabled={Object.values(assigned).includes(item.id) || graded || disabled}
            onclick={() => tapRight(item.id)}
          >
            {item.text}
          </button>
        {/each}
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t-2 border-border dark:border-border">
      {#if !graded}
        <button
          type="button"
          class="btn-3d btn-3d-white px-4 h-[44px] text-xs font-bold"
          disabled={assignedCount() === 0 || disabled}
          onclick={reset}
        >
          Clear Selection
        </button>
        <p class="text-xs font-bold text-muted-foreground">
          Tap a word on the left, then tap its match on the right. Esc clears selection.
        </p>
      {:else}
        <div
          class="p-3 px-4 rounded-xl border-2 border-border-strong font-extrabold text-sm flex items-center gap-2 {correctPairs === totalPairs() ? 'bg-success-bg text-success-text border-success' : 'bg-yellow text-accent-ink'}"
          role="status"
        >
          <span>{correctPairs === totalPairs() ? "✓" : "★"}</span>
          <span>{correctPairs}/{totalPairs()} correct ({Math.round(score * 100)}%)</span>
        </div>
        <button type="button" class="btn-3d px-5 h-[44px] text-xs font-black" onclick={reset}>
          Try Again
        </button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .chip-selected {
    background: var(--cyan) !important;
    transform: scale(1.02);
  }
  .chip-locked {
    background: #EFF6FF !important;
    border-color: var(--primary) !important;
  }
  :global(.dark) .chip-locked {
    background: rgba(35, 115, 244, 0.2) !important;
    border-color: var(--primary) !important;
  }
  .chip-correct {
    background: var(--yellow) !important;
    color: var(--border-strong) !important;
    text-decoration: line-through;
    opacity: 0.8;
  }
  .chip-wrong {
    background: #FEE2E2 !important;
    border-color: #EF4444 !important;
    color: #991B1B !important;
  }
  :global(.dark) .chip-wrong {
    background: rgba(239, 68, 68, 0.2) !important;
    color: #FCA5A5 !important;
  }
  .chip-just {
    animation: match-pop 250ms ease-out;
  }
  @keyframes match-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
</style>
