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
    if (disabled) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (selectedLeft !== null || selectedRight !== null) {
        selectedLeft = null;
        selectedRight = null;
      } else {
        onExit?.();
      }
    }
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

<section class="matching" aria-label="Matching question" aria-live="polite">
  {#if loading}
    <p class="state" role="status">Loading matching question…</p>
  {:else if error}
    <p class="state state-error" role="alert">{error}</p>
  {:else if !question}
    <p class="state">No matching question available.</p>
  {:else if question.pairs.length === 0}
    <p class="state">This matching set has no pairs.</p>
  {:else}
    <div class="meta">
      <span class="badge">Matching · {question.pairCount} pairs</span>
      <span class="badge badge-level">{question.level}</span>
      <span class="progress" aria-label="{assignedCount()} of {totalPairs()} pairs assigned">
        {assignedCount()}/{totalPairs()} paired
      </span>
    </div>

    <div class="grid">
      <div class="column" role="group" aria-label="Words">
        {#each question.leftItems as item (item.id)}
          <button
            type="button"
            class="chip {leftClass(item.id)}"
            class:chip-just={justLocked === item.id}
            aria-pressed={selectedLeft === item.id}
            disabled={assigned[item.id] !== undefined || graded || disabled}
            onclick={() => tapLeft(item.id)}
          >
            {item.text}
          </button>
        {/each}
      </div>
      <div class="column" role="group" aria-label="Definitions">
        {#each question.rightItems as item (item.id)}
          <button
            type="button"
            class="chip {rightClass(item.id)}"
            aria-pressed={selectedRight === item.id}
            disabled={Object.values(assigned).includes(item.id) || graded || disabled}
            onclick={() => tapRight(item.id)}
          >
            {item.text}
          </button>
        {/each}
      </div>
    </div>

    <div class="actions">
      {#if !graded}
        <button type="button" class="ghost" disabled={assignedCount() === 0 || disabled} onclick={reset}>
          Reset
        </button>
        <p class="hint">Tap a word, then tap its match. Each pair locks; partial credit per correct pair. Esc clears selection.</p>
      {:else}
        <p class="feedback {correctPairs === totalPairs() ? 'feedback-ok' : 'feedback-mixed'}" role="status">
          {correctPairs}/{totalPairs()} correct ({Math.round(score * 100)}%)
        </p>
        <button type="button" class="ghost" onclick={reset}>Try again</button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .matching {
    background: #ffffff;
    border: 2px solid #e7e5e4;
    border-radius: 16px;
    padding: 1.25rem;
  }
  :global(.dark) .matching {
    background: #1e1e20;
    border-color: #2a2a2e;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
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
  .progress {
    margin-left: auto;
    font-size: 0.8rem;
    font-weight: 700;
    opacity: 0.75;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .column {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .chip {
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
  .ghost:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
  }
  .chip:disabled {
    cursor: default;
  }
  .chip-selected {
    border-color: #6d28d9;
    background: color-mix(in srgb, #6d28d9 8%, transparent);
  }
  .chip-locked {
    border-color: #6d28d9;
    background: color-mix(in srgb, #6d28d9 12%, transparent);
  }
  .chip-just {
    animation: match-confirm 250ms ease-out;
  }
  .chip-correct {
    border-color: #10b981;
    background: color-mix(in srgb, #10b981 12%, transparent);
    animation: match-confirm 250ms ease-out;
  }
  .chip-wrong {
    border-color: #ef4444;
    background: color-mix(in srgb, #ef4444 8%, transparent);
    animation: match-shake 250ms ease-out;
  }
  .actions {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .ghost {
    min-height: 44px;
    min-width: 44px;
    padding: 0.6rem 1.1rem;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 80ms ease-out;
  }
  :global(.dark) .ghost {
    border-color: #2a2a2e;
  }
  .ghost:not(:disabled):active {
    transform: scale(0.98) translateY(1px);
  }
  .ghost:disabled {
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
  .feedback-mixed {
    color: #6d28d9;
  }
  .hint {
    margin: 0;
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
  @keyframes match-confirm {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.04);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes match-shake {
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
    .chip-just,
    .chip-correct,
    .chip-wrong {
      animation: none;
    }
    .chip,
    .ghost {
      transition: none;
    }
  }
</style>
