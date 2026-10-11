<script lang="ts">
  import { splitSentences } from "$lib/content-loader/reading";

  interface Props {
    /** Passage heading. */
    title?: string;
    /** Raw passage body; may contain inline [[GAP:n]] markers. */
    body?: string;
    /** Pre-split sentences (may each contain [[GAP:n]] markers). Takes precedence if non-empty. */
    sentences?: string[];
    /** Currently tapped sentence indices. */
    selected?: number[];
    /** Called on sentence tap. Omit for read-only rendering. */
    onToggle?: (index: number) => void;
    /** Read-only: sentences render as plain text, no buttons. */
    readonly?: boolean;
    /** After grading: paint selected sentences correct/wrong. */
    revealed?: boolean;
    /** Key sentence indices used with `revealed`. */
    correctIndices?: number[];
    /** Gap number -> filled option text shown inside the gap pill. */
    filledGaps?: Record<number, string>;
    /** Gap number currently asked about; its pill gets an accent ring. */
    activeGap?: number | null;
  }

  let {
    title = "",
    body = "",
    sentences = [],
    selected = [],
    onToggle,
    readonly = false,
    revealed = false,
    correctIndices = [],
    filledGaps = {},
    activeGap = null,
  }: Props = $props();

  const GAP_SPLIT_RE = /\[\[GAP:(\d+)\]\]/g;

  interface GapChunk {
    kind: "gap";
    gap: number;
  }
  interface TextChunk {
    kind: "text";
    text: string;
  }
  type Chunk = GapChunk | TextChunk;

  interface DisplaySentence {
    chunks: Chunk[];
  }

  function chunkSentence(sentence: string): DisplaySentence {
    const chunks: Chunk[] = [];
    GAP_SPLIT_RE.lastIndex = 0;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = GAP_SPLIT_RE.exec(sentence)) !== null) {
      if (m.index > last) chunks.push({ kind: "text", text: sentence.slice(last, m.index) });
      chunks.push({ kind: "gap", gap: Number(m[1]) });
      last = m.index + m[0].length;
    }
    if (last < sentence.length) chunks.push({ kind: "text", text: sentence.slice(last) });
    return { chunks };
  }

  let source: string[] = $derived(
    sentences.length > 0 ? sentences : body.trim() !== "" ? splitSentences(body) : [],
  );
  let display: DisplaySentence[] = $derived(source.map(chunkSentence));
  let selectedSet: Set<number> = $derived(new Set(selected));
  let correctSet: Set<number> = $derived(new Set(correctIndices));
  let interactive: boolean = $derived(!readonly && onToggle !== undefined);

  function sentenceState(i: number): "idle" | "selected" | "correct" | "wrong" {
    if (revealed && selectedSet.has(i)) return correctSet.has(i) ? "correct" : "wrong";
    if (selectedSet.has(i)) return "selected";
    return "idle";
  }

  function gapLabel(gap: number): string {
    const filled = filledGaps[gap];
    return filled !== undefined && filled !== "" ? filled : `___ ${gap} ___`;
  }
</script>

<article class="reading-passage" aria-label={title !== "" ? title : "Reading passage"}>
  {#if title !== ""}
    <h2 class="reading-title">{title}</h2>
  {/if}
  <div class="reading-body">
    {#each display as sentence, i (i)}
      {@const state = sentenceState(i)}
      {#if interactive}
        <button
          type="button"
          class="sentence sentence-{state}"
          aria-pressed={selectedSet.has(i)}
          aria-label={`Sentence ${i + 1}${selectedSet.has(i) ? ", selected" : ""}`}
          onclick={() => onToggle?.(i)}
        >
          <span class="sentence-num" aria-hidden="true">{i + 1}</span>
          <span class="sentence-text">
            {#each sentence.chunks as chunk (chunk.kind === "gap" ? `g${chunk.gap}` : chunk.text)}
              {#if chunk.kind === "gap"}
                <span
                  class="gap-pill"
                  class:gap-active={activeGap === chunk.gap}
                  class:gap-filled={filledGaps[chunk.gap] !== undefined && filledGaps[chunk.gap] !== ""}
                >{gapLabel(chunk.gap)}</span>
              {:else}
                {chunk.text}
              {/if}
            {/each}
          </span>
        </button>
      {:else}
        <p class="sentence sentence-{state}">
          <span class="sentence-text">
            {#each sentence.chunks as chunk (chunk.kind === "gap" ? `g${chunk.gap}` : chunk.text)}
              {#if chunk.kind === "gap"}
                <span
                  class="gap-pill"
                  class:gap-active={activeGap === chunk.gap}
                  class:gap-filled={filledGaps[chunk.gap] !== undefined && filledGaps[chunk.gap] !== ""}
                >{gapLabel(chunk.gap)}</span>
              {:else}
                {chunk.text}
              {/if}
            {/each}
          </span>
        </p>
      {/if}
    {/each}
  </div>
</article>

<style>
  .reading-passage {
    background: #ffffff;
    border: 1px solid #e7e5e4;
    border-radius: 16px;
    padding: 1.25rem;
  }
  :global(.dark) .reading-passage {
    background: #1e1e20;
    border-color: #2a2a2e;
  }
  .reading-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 1rem;
  }
  .reading-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sentence {
    display: flex;
    gap: 0.625rem;
    align-items: flex-start;
    width: 100%;
    min-height: 44px;
    padding: 0.625rem 0.75rem;
    margin: 0;
    border: 2px solid transparent;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: 1.6;
    text-align: left;
  }
  button.sentence {
    cursor: pointer;
  }
  button.sentence:hover {
    border-color: #e7e5e4;
  }
  :global(.dark) button.sentence:hover {
    border-color: #2a2a2e;
  }
  button.sentence:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
  }
  .sentence-num {
    flex: none;
    width: 1.5rem;
    height: 1.5rem;
    margin-top: 0.15rem;
    border-radius: 999px;
    background: #e7e5e4;
    color: #44403c;
    font-size: 0.75rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  :global(.dark) .sentence-num {
    background: #2a2a2e;
    color: #d6d3d1;
  }
  .sentence-selected {
    border-color: #6d28d9;
    background: color-mix(in srgb, #6d28d9 8%, transparent);
  }
  .sentence-correct {
    border-color: #10b981;
    background: color-mix(in srgb, #10b981 10%, transparent);
    animation: reading-flash 250ms ease-out;
  }
  .sentence-wrong {
    border-color: #ef4444;
    background: color-mix(in srgb, #ef4444 8%, transparent);
    animation: reading-shake 250ms ease-out;
  }
  .gap-pill {
    display: inline-block;
    padding: 0.1rem 0.55rem;
    margin: 0 0.15rem;
    border: 2px solid #6d28d9;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85em;
    white-space: nowrap;
  }
  .gap-filled {
    background: color-mix(in srgb, #6d28d9 10%, transparent);
  }
  .gap-active {
    box-shadow: 0 0 0 2px color-mix(in srgb, #6d28d9 45%, transparent);
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
    .sentence-correct,
    .sentence-wrong {
      animation: none;
    }
  }
</style>
