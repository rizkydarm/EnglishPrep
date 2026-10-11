<script lang="ts">
  import { isAccepted, normalizeSentence, sentencesEqual } from "$lib/utils/normalize";
  import type { WritingPrompt } from "$lib/types/schema";
  import LightbulbIcon from "@lucide/svelte/icons/lightbulb";

  export interface WritingResult {
    promptId: string;
    type: WritingPrompt["type"];
    /** User-produced answer text (built sentence / typed correction / description). */
    userAnswer: string;
    /** Auto-graded verdict. Undefined for self-assessed items. */
    correct?: boolean;
    /** True only for image_description (PRD §7.6: never auto-graded). */
    selfAssessed: boolean;
    /** Image-description self score 1..max (default 5). */
    selfScore?: number;
    /** Image-description results must not enter the auto % (PRD §7.7). */
    excludedFromAutoScore: boolean;
  }

  interface Props {
    /** Writing prompt to render. Null/undefined renders the fallback. */
    prompt?: WritingPrompt | null;
    /** Called when an auto-graded item is checked; also the fallback channel for self-score when onSelfScore is absent. */
    onResult?: (result: WritingResult) => void;
    /** Called when a self-assessed item is submitted. When present, onResult is NOT fired for self-score (single channel). */
    onSelfScore?: (result: WritingResult) => void;
    /** Called on Esc key (exit / close dialog). */
    onExit?: () => void;
    /** Called when the prompt is unusable and the learner skips it (avoids soft-lock). */
    onSkip?: () => void;
    /** Disable all inputs (e.g. review mode). */
    disabled?: boolean;
  }

  let { prompt = null, onResult, onSelfScore, onExit, onSkip, disabled = false }: Props = $props();

  // ---- shared grading state ----
  let checked: boolean = $state(false);
  let correct: boolean = $state(false);

  // ---- sentence_order state (indices into prompt.words, handles duplicate words) ----
  let placed: number[] = $state([]);
  // ---- grammar_fix / image_description text state ----
  let text: string = $state("");
  let showHint: boolean = $state(false);
  // ---- image_description self-assessment state ----
  let revealed: boolean = $state(false);
  let selfScore: number | null = $state(null);
  let submittedSelf: boolean = $state(false);

  function resetState(): void {
    checked = false;
    correct = false;
    placed = [];
    text = "";
    showHint = false;
    revealed = false;
    selfScore = null;
    submittedSelf = false;
  }

  // Reset whenever a different prompt arrives.
  let lastPromptId: string | null = $state(null);
  $effect(() => {
    const id = prompt?.id ?? null;
    if (id !== lastPromptId) {
      lastPromptId = id;
      resetState();
    }
  });

  let valid: boolean = $derived(
    prompt != null &&
      (prompt.type === "sentence_order"
        ? prompt.words.length >= 2 && prompt.correct.trim() !== ""
        : prompt.type === "grammar_fix"
          ? prompt.sentence.trim() !== "" && prompt.accepted.length >= 1
          : prompt.image.trim() !== "" &&
            prompt.prompt.trim() !== "" &&
            prompt.model_answer.trim() !== "" &&
            prompt.keywords.length >= 1),
  );

  // ---- sentence_order derived ----
  let placedSet: Set<number> = $derived(new Set(placed));
  let bank: number[] = $derived(
    prompt?.type === "sentence_order" ? prompt.words.map((_, i) => i).filter((i) => !placedSet.has(i)) : [],
  );
  let builtSentence: string = $derived(
    prompt?.type === "sentence_order" ? placed.map((i) => prompt.words[i]).join(" ") : "",
  );

  function placeChip(index: number): void {
    if (disabled || checked || prompt?.type !== "sentence_order") return;
    if (placedSet.has(index)) return;
    placed = [...placed, index];
  }

  function removeChip(at: number): void {
    if (disabled || checked) return;
    placed = placed.filter((_, k) => k !== at);
  }

  function clearPlaced(): void {
    if (disabled || checked) return;
    placed = [];
  }

  function checkOrder(): void {
    if (disabled || prompt?.type !== "sentence_order" || placed.length === 0) return;
    const candidates = [prompt.correct, ...(prompt.alternatives ?? [])];
    correct = candidates.some((c) => sentencesEqual(builtSentence, c));
    checked = true;
    onResult?.({
      promptId: prompt.id,
      type: prompt.type,
      userAnswer: builtSentence,
      correct,
      selfAssessed: false,
      excludedFromAutoScore: false,
    });
  }

  function retryOrder(): void {
    checked = false;
    correct = false;
    placed = [];
  }

  // ---- grammar_fix ----
  function checkGrammar(): void {
    if (disabled || prompt?.type !== "grammar_fix" || text.trim() === "") return;
    correct = isAccepted(text, prompt.accepted);
    checked = true;
    onResult?.({
      promptId: prompt.id,
      type: prompt.type,
      userAnswer: text,
      correct,
      selfAssessed: false,
      excludedFromAutoScore: false,
    });
  }

  function retryGrammar(): void {
    checked = false;
    correct = false;
  }

  // ---- image_description ----
  // Token-boundary keyword match: both sides tokenized on non-word
  // boundaries (via normalizeSentence), hit = every keyword token
  // present in the input token set. Avoids raw-substring false
  // positives ("cat" vs "concatenate").
  function tokenize(input: string): string[] {
    const n = normalizeSentence(input);
    return n === "" ? [] : n.split(" ");
  }
  let textTokens: Set<string> = $derived(new Set(tokenize(text)));
  function keywordHit(keyword: string): boolean {
    const kt = tokenize(keyword);
    if (kt.length === 0 || textTokens.size === 0) return false;
    return kt.every((t) => textTokens.has(t));
  }

  let hitCount: number = $derived(
    prompt?.type === "image_description" ? prompt.keywords.filter(keywordHit).length : 0,
  );

  let scoreMax: number = $derived(
    prompt?.type === "image_description" ? (prompt.self_score_max ?? 5) : 5,
  );

  const RUBRIC: { score: number; label: string }[] = [
    { score: 1, label: "1: One relevant idea, major gaps" },
    { score: 2, label: "2: Some ideas, limited coverage" },
    { score: 3, label: "3: Covers main ideas, some detail" },
    { score: 4, label: "4: Clear, covers most keywords" },
    { score: 5, label: "5: Complete, natural, all key ideas" },
  ];

  function revealModel(): void {
    if (disabled || prompt?.type !== "image_description" || text.trim() === "") return;
    revealed = true;
  }

  function submitSelfScore(): void {
    if (disabled || prompt?.type !== "image_description" || selfScore == null) return;
    submittedSelf = true;
    const result: WritingResult = {
      promptId: prompt.id,
      type: prompt.type,
      userAnswer: text,
      correct: undefined,
      selfAssessed: true,
      selfScore,
      excludedFromAutoScore: true,
    };
    // Single channel only: prefer onSelfScore; fall back to onResult
    // only when no onSelfScore handler is wired (avoids double-record).
    if (onSelfScore) onSelfScore(result);
    else onResult?.(result);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      onExit?.();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      const target = event.target as HTMLElement | null;
      // In textareas Enter inserts newline; check on plain Enter per spec.
      if (target?.tagName === "TEXTAREA") event.preventDefault();
      if (disabled) return;
      if (prompt?.type === "sentence_order" && !checked) checkOrder();
      else if (prompt?.type === "grammar_fix" && !checked) checkGrammar();
      else if (prompt?.type === "image_description" && !revealed) revealModel();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="card-3d p-6 bg-card" aria-label="Writing exercise">
  {#if prompt == null || !valid}
    <div class="p-6 text-center" role="status">
      <p class="font-extrabold text-lg text-foreground">No writing prompt available.</p>
      <p class="serif text-muted-foreground mt-1">This prompt is empty or invalid and was skipped.</p>
      {#if onSkip && !disabled}
        <div class="mt-4">
          <button type="button" class="btn-3d px-6 h-[44px] font-bold" onclick={() => onSkip?.()}>
            Skip this question
          </button>
        </div>
      {/if}
    </div>
  {:else if prompt.type === "sentence_order"}
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-2">
        <span class="badge-pill bg-card text-xs">Sentence Order</span>
        {#if prompt.grammar_focus}
          <span class="badge-pill bg-yellow text-accent-ink text-xs">Focus: {prompt.grammar_focus}</span>
        {/if}
      </div>

      <p class="font-extrabold text-lg text-foreground">Tap the words in order to build the sentence.</p>

      <!-- Sentence building zone -->
      <div class="min-h-[56px] p-3 rounded-2xl border-[2.5px] border-border-strong bg-muted/80 dark:bg-muted flex flex-wrap gap-2 items-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]" aria-live="polite" aria-label="Your sentence">
        {#if placed.length === 0}
          <span class="text-xs font-bold text-muted-foreground px-2">Tap words below to arrange your sentence…</span>
        {:else}
          {#each placed as wordIndex, k (k)}
            <button
              type="button"
              class="px-3.5 py-1.5 rounded-full border-2 border-border-strong bg-cyan text-accent-ink font-extrabold text-sm shadow-[0_2px_0_var(--border-strong)] hover:-translate-y-0.5 active:translate-y-[2px] transition-all flex items-center gap-1.5"
              disabled={disabled || checked}
              aria-label={`Remove ${prompt.words[wordIndex]}`}
              onclick={() => removeChip(k)}
            >
              <span>{prompt.words[wordIndex]}</span>
              <span class="opacity-70 text-xs font-black" aria-hidden="true">✕</span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Word bank -->
      <div class="p-3 rounded-2xl border-2 border-border dark:border-border bg-card flex flex-wrap gap-2 items-center" aria-label="Word choices">
        {#each bank as wordIndex (wordIndex)}
          <button
            type="button"
            class="match-pill text-sm font-extrabold"
            disabled={disabled || checked}
            aria-label={`Add ${prompt.words[wordIndex]}`}
            onclick={() => placeChip(wordIndex)}
          >
            {prompt.words[wordIndex]}
          </button>
        {/each}
        {#if bank.length === 0}
          <span class="text-xs font-bold text-muted-foreground px-2">All words placed.</span>
        {/if}
      </div>

      <div class="flex gap-3 pt-2">
        {#if !checked}
          <button
            type="button"
            class="btn-3d flex-1 h-[52px] font-extrabold text-base"
            disabled={disabled || placed.length === 0}
            onclick={checkOrder}
          >Check Answer</button>
          <button
            type="button"
            class="btn-3d btn-3d-white px-5 h-[52px] font-bold text-sm"
            disabled={disabled || placed.length === 0}
            onclick={clearPlaced}
          >Clear</button>
        {:else if !disabled}
          <button type="button" class="btn-3d flex-1 h-[52px] font-extrabold text-base" onclick={retryOrder}>Try Again</button>
        {/if}
      </div>

      {#if checked}
        <div
          class="p-4 rounded-xl border-2 border-border-strong font-extrabold text-sm flex items-center gap-3 {correct ? 'bg-success-bg text-success-text border-success' : 'bg-destructive-bg text-destructive-text border-destructive'}"
          role="status"
        >
          <span class="text-xl">{correct ? "✓" : "✗"}</span>
          <div>
            <div>{correct ? "Correct sentence structure!" : "Not quite. Compare with the correct sentence below:"}</div>
            {#if !correct}
              <div class="serif text-base mt-1 underline">{prompt.correct}</div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {:else if prompt.type === "grammar_fix"}
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-2">
        <span class="badge-pill bg-card text-xs">Grammar Fix</span>
        <span class="badge-pill bg-yellow text-accent-ink text-xs">Correction Drill</span>
      </div>

      <p class="font-extrabold text-lg text-foreground">Fix the grammatical error in the sentence.</p>

      <blockquote class="serif p-4 rounded-xl border-2 border-border-strong bg-muted dark:bg-muted text-lg leading-relaxed text-foreground">
        “{prompt.sentence}”
      </blockquote>

      {#if prompt.hint}
        <div class="space-y-2">
          <button
            type="button"
            class="btn-3d btn-3d-white px-3 py-1 text-xs font-bold"
            aria-expanded={showHint}
            disabled={disabled}
            onclick={() => (showHint = !showHint)}
          >
            {#if showHint}
              Hide Hint
            {:else}
              <LightbulbIcon class="size-3.5" data-icon="inline-start" /> Show Hint
            {/if}
          </button>
          {#if showHint}
            <div class="p-3 rounded-xl border-2 border-border-strong bg-yellow/20 text-xs font-bold text-foreground">
              {prompt.hint}
            </div>
          {/if}
        </div>
      {/if}

      <div class="space-y-2">
        <label class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground" for="grammar-input">Your correction</label>
        <textarea
          id="grammar-input"
          class="w-full border-[2.5px] border-border-strong rounded-xl p-3 font-mono font-bold text-sm md:text-base focus:border-primary bg-card text-foreground shadow-[0_3px_0_var(--border-strong)] outline-none transition-all resize-y min-h-[90px]"
          rows={3}
          value={text}
          disabled={disabled || checked}
          placeholder="Type the corrected sentence…"
          oninput={(e) => (text = (e.target as HTMLTextAreaElement).value)}
        ></textarea>
      </div>

      <div class="pt-2">
        {#if !checked}
          <button
            type="button"
            class="btn-3d w-full h-[52px] font-extrabold text-base"
            disabled={disabled || text.trim() === ""}
            onclick={checkGrammar}
          >Check Answer</button>
        {:else if !disabled}
          <button type="button" class="btn-3d w-full h-[52px] font-extrabold text-base" onclick={retryGrammar}>Try Again</button>
        {/if}
      </div>

      {#if checked}
        <div
          class="p-4 rounded-xl border-2 border-border-strong font-extrabold text-sm flex items-center gap-3 {correct ? 'bg-success-bg text-success-text border-success' : 'bg-destructive-bg text-destructive-text border-destructive'}"
          role="status"
        >
          <span class="text-xl">{correct ? "✓" : "✗"}</span>
          <div>
            <div>{correct ? "Correct fix!" : "Not quite. See an accepted answer below:"}</div>
            {#if !correct}
              <div class="serif text-base mt-1 underline">“{prompt.accepted[0]}”</div>
            {/if}
            {#if prompt.explanation_id}
              <div class="text-xs font-normal opacity-80 mt-1">{prompt.explanation_id}</div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Image Description -->
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-2">
        <span class="badge-pill bg-card text-xs">Image Description</span>
        <span class="badge-pill bg-yellow text-accent-ink text-xs">Self-Assessed</span>
      </div>

      <p class="font-extrabold text-lg text-foreground">{prompt.prompt}</p>

      <div class="rounded-2xl border-[2.5px] border-border-strong overflow-hidden bg-muted dark:bg-muted shadow-[0_4px_0_var(--border-strong)] max-h-[300px] flex items-center justify-center">
        <img class="max-h-[300px] w-auto object-contain" src={prompt.image} alt={prompt.prompt} loading="lazy" />
      </div>

      <div class="space-y-2">
        <label class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground" for="desc-input">Your description (2–3 sentences)</label>
        <textarea
          id="desc-input"
          class="w-full border-[2.5px] border-border-strong rounded-xl p-3 font-sans font-bold text-sm md:text-base focus:border-primary bg-card text-foreground shadow-[0_3px_0_var(--border-strong)] outline-none transition-all resize-y min-h-[100px]"
          rows={4}
          value={text}
          disabled={disabled || submittedSelf}
          placeholder="Describe what is happening in the picture…"
          oninput={(e) => (text = (e.target as HTMLTextAreaElement).value)}
        ></textarea>
      </div>

      {#if !revealed}
        <button
          type="button"
          class="btn-3d w-full h-[52px] font-extrabold text-base"
          disabled={disabled || text.trim() === ""}
          onclick={revealModel}
        >
          Reveal Model Answer →
        </button>
        <p class="text-xs font-bold text-center text-muted-foreground">Self-assessed drill: compare your writing against the model answer.</p>
      {:else}
        <div class="card-3d p-5 bg-muted dark:bg-muted space-y-4">
          <div>
            <span class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Model Answer</span>
            <p class="serif text-base md:text-lg text-foreground mt-1 leading-relaxed">“{prompt.model_answer}”</p>
          </div>

          <div>
            <span class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Keyword Checklist</span>
            <div class="flex flex-wrap gap-2 mt-2">
              {#each prompt.keywords as keyword (keyword)}
                <span class="px-3 py-1 rounded-full border-2 border-border-strong font-extrabold text-xs flex items-center gap-1.5 {keywordHit(keyword) ? 'bg-success-bg text-success-text border-success' : 'bg-muted text-muted-foreground opacity-70'}">
                  <span>{keywordHit(keyword) ? "✓" : "○"}</span>
                  <span>{keyword}</span>
                </span>
              {/each}
            </div>
            <p class="text-xs font-bold text-muted-foreground mt-2" aria-live="polite">
              {hitCount} of {prompt.keywords.length} keywords used.
            </p>
          </div>
        </div>

        <div class="card-3d p-5 bg-yellow text-accent-ink space-y-3" aria-label="Self assessment">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-wider">Score Yourself (1–{scoreMax})</span>
            <span class="badge-pill bg-white text-accent-ink border-border-strong text-[10px] font-black">Excluded from %</span>
          </div>

          <div class="flex gap-2" role="group" aria-label={`Self score, 1 to ${scoreMax}`}>
            {#each Array.from({ length: scoreMax }, (_, i) => i + 1) as n (n)}
              <button
                type="button"
                class="w-11 h-11 rounded-xl border-2 border-border-strong font-extrabold text-base flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0 {selfScore === n ? 'bg-accent-ink text-yellow shadow-[0_3px_0_#000] scale-105' : 'bg-white text-accent-ink shadow-[0_2px_0_var(--border-strong)] hover:bg-slate-50'}"
                disabled={disabled || submittedSelf}
                aria-label={`Score ${n} of ${scoreMax}`}
                onclick={() => (selfScore = n)}
              >
                {n}
              </button>
            {/each}
          </div>

          <button
            type="button"
            class="btn-3d w-full h-[48px] font-extrabold !bg-foreground !text-background !border-border-strong"
            disabled={disabled || selfScore == null || submittedSelf}
            onclick={submitSelfScore}
          >
            Submit Self-Score{submittedSelf ? " (Recorded)" : ""}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</section>


