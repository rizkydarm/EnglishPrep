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

<article class="card-3d p-6 bg-card" aria-label={title !== "" ? title : "Reading passage"}>
  {#if title !== ""}
    <h2 class="serif text-xl md:text-2xl font-black mb-4 tracking-tight text-foreground border-b-2 border-border dark:border-border pb-3">{title}</h2>
  {/if}
  <div class="serif text-[17px] md:text-[18px] leading-[1.8] text-foreground space-y-2">
    {#if display.length === 0}
      <p class="p-6 text-center text-muted-foreground font-sans">No passage content.</p>
    {/if}
    {#each display as sentence, i (i)}
      {@const state = sentenceState(i)}
      {#if interactive}
        <button
          type="button"
          class="sentence sentence-{state} w-full text-left p-2 rounded-xl border-2 border-transparent transition-all {state === 'selected' ? 'highlight-user !border-cyan' : state === 'correct' ? 'highlight-correct' : state === 'wrong' ? 'bg-destructive-bg !border-destructive' : 'hover:bg-muted/70 dark:hover:bg-card/70'}"
          aria-pressed={selectedSet.has(i)}
          aria-label={`Sentence ${i + 1}${selectedSet.has(i) ? ", selected" : ""}`}
          onclick={() => onToggle?.(i)}
        >
          <span class="w-6 h-6 rounded-full border-2 border-border-strong bg-muted dark:bg-card font-sans font-black text-[11px] inline-flex items-center justify-center mr-2 shrink-0 align-middle shadow-[0_1px_0_var(--border-strong)]" aria-hidden="true">{i + 1}</span>
          <span class="sentence-text">
            {#each sentence.chunks as chunk, ci (`${ci}-${chunk.kind === "gap" ? `g${chunk.gap}` : chunk.text}`)}
              {#if chunk.kind === "gap"}
                <span
                  class="gap-pill font-sans font-extrabold text-xs px-2.5 py-0.5 rounded-lg border-2 border-border-strong bg-card dark:bg-card text-primary shadow-[0_1px_0_var(--border-strong)] {activeGap === chunk.gap ? '!bg-yellow !text-accent-ink ring-2 ring-primary' : ''} {filledGaps[chunk.gap] !== undefined && filledGaps[chunk.gap] !== '' ? '!border-success !text-success-text' : ''}"
                >{gapLabel(chunk.gap)}</span>
              {:else}
                {chunk.text}
              {/if}
            {/each}
          </span>
        </button>
      {:else}
        <p class="sentence sentence-{state} p-2 rounded-xl transition-all {state === 'selected' ? 'highlight-user' : state === 'correct' ? 'highlight-correct' : state === 'wrong' ? 'bg-destructive-bg !border-destructive' : ''}">
          <span class="sentence-text">
            {#each sentence.chunks as chunk, ci (`${ci}-${chunk.kind === "gap" ? `g${chunk.gap}` : chunk.text}`)}
              {#if chunk.kind === "gap"}
                <span
                  class="gap-pill font-sans font-extrabold text-xs px-2.5 py-0.5 rounded-lg border-2 border-border-strong bg-card dark:bg-card text-primary shadow-[0_1px_0_var(--border-strong)] {activeGap === chunk.gap ? '!bg-yellow !text-accent-ink' : ''} {filledGaps[chunk.gap] !== undefined && filledGaps[chunk.gap] !== '' ? '!border-success !text-success-text' : ''}"
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

  {#if interactive}
    <div class="mt-4 pt-4 border-t-2 border-border dark:border-border flex flex-wrap gap-2 text-xs font-bold font-sans">
      <span class="px-2.5 py-1 rounded-full border-2 border-border-strong bg-cyan text-accent-ink shadow-[0_1px_0_var(--border-strong)]">Your highlight</span>
      <span class="px-2.5 py-1 rounded-full border-2 border-dashed border-border-strong bg-yellow text-accent-ink shadow-[0_1px_0_var(--border-strong)]">Correct answer</span>
    </div>
  {/if}
</article>

<style>
  .highlight-user {
    background: rgba(101, 208, 244, 0.45) !important;
    border-bottom: 3px solid var(--cyan) !important;
  }
  .highlight-correct {
    background: var(--yellow) !important;
    color: var(--accent-ink) !important;
    border: 2.5px dashed var(--border-strong) !important;
  }
  .gap-pill:not(:disabled):hover {
    transform: translateY(-1px);
  }
  .gap-pill:not(:disabled):active {
    transform: translateY(0);
  }
  .sentence:not(:disabled):active {
    transform: scale(0.99);
  }
</style>
