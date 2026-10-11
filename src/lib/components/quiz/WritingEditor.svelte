<script lang="ts">
  import { isAccepted, normalizeSentence, sentencesEqual } from "$lib/utils/normalize";
  import type { WritingPrompt } from "$lib/types/schema";

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
    { score: 1, label: "1 — One relevant idea, major gaps" },
    { score: 2, label: "2 — Some ideas, limited coverage" },
    { score: 3, label: "3 — Covers main ideas, some detail" },
    { score: 4, label: "4 — Clear, covers most keywords" },
    { score: 5, label: "5 — Complete, natural, all key ideas" },
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

<section class="writing-editor" aria-label="Writing exercise">
  {#if prompt == null || !valid}
    <div class="fallback" role="status">
      <p class="fallback-title">No writing prompt available.</p>
      <p class="fallback-sub">This prompt is empty or invalid and was skipped.</p>
      {#if onSkip && !disabled}
        <div class="actions">
          <button type="button" class="btn btn-primary" onclick={() => onSkip?.()}>
            Skip this question
          </button>
        </div>
      {/if}
    </div>
  {:else if prompt.type === "sentence_order"}
    <div class="block">
      <p class="instruction">Tap the words in order to build the sentence.</p>
      {#if prompt.grammar_focus}
        <p class="meta">Focus: {prompt.grammar_focus}</p>
      {/if}

      <div class="answer-line" aria-live="polite" aria-label="Your sentence">
        {#if placed.length === 0}
          <span class="placeholder">Tap words below…</span>
        {:else}
          {#each placed as wordIndex, k (k)}
            <button
              type="button"
              class="chip chip-placed"
              disabled={disabled || checked}
              aria-label={`Remove ${prompt.words[wordIndex]}`}
              onclick={() => removeChip(k)}
            >{prompt.words[wordIndex]} <span aria-hidden="true">×</span></button>
          {/each}
        {/if}
      </div>

      <div class="bank" aria-label="Word choices">
        {#each bank as wordIndex (wordIndex)}
          <button
            type="button"
            class="chip"
            disabled={disabled || checked}
            aria-label={`Add ${prompt.words[wordIndex]}`}
            onclick={() => placeChip(wordIndex)}
          >{prompt.words[wordIndex]}</button>
        {/each}
        {#if bank.length === 0}
          <span class="placeholder">All words placed.</span>
        {/if}
      </div>

      <div class="actions">
        {#if !checked}
          <button
            type="button"
            class="btn btn-primary"
            disabled={disabled || placed.length === 0}
            onclick={checkOrder}
          >Check</button>
          <button
            type="button"
            class="btn"
            disabled={disabled || placed.length === 0}
            onclick={clearPlaced}
          >Clear</button>
        {:else if !disabled}
          <button type="button" class="btn" onclick={retryOrder}>Try again</button>
        {/if}
      </div>

      {#if checked}
        <p class="feedback feedback-{correct ? 'correct' : 'wrong'}" role="status">
          {correct ? "Correct!" : "Not quite — compare with the answer below."}
        </p>
        {#if !correct}
          <p class="answer-reveal">Answer: {prompt.correct}</p>
        {/if}
      {/if}
    </div>
  {:else if prompt.type === "grammar_fix"}
    <div class="block">
      <p class="instruction">Fix the error in the sentence.</p>
      <blockquote class="given">{prompt.sentence}</blockquote>

      {#if prompt.hint}
        <div class="hint-row">
          <button
            type="button"
            class="btn btn-small"
            aria-expanded={showHint}
            disabled={disabled}
            onclick={() => (showHint = !showHint)}
          >{showHint ? "Hide hint" : "Show hint"}</button>
          {#if showHint}
            <p class="hint">{prompt.hint}</p>
          {/if}
        </div>
      {/if}

      <label class="field-label" for="grammar-input">Your correction</label>
      <textarea
        id="grammar-input"
        class="textarea"
        rows={3}
        value={text}
        disabled={disabled || checked}
        placeholder="Type the corrected sentence…"
        oninput={(e) => (text = (e.target as HTMLTextAreaElement).value)}
      ></textarea>

      <div class="actions">
        {#if !checked}
          <button
            type="button"
            class="btn btn-primary"
            disabled={disabled || text.trim() === ""}
            onclick={checkGrammar}
          >Check</button>
        {:else if !disabled}
          <button type="button" class="btn" onclick={retryGrammar}>Try again</button>
        {/if}
      </div>

      {#if checked}
        <p class="feedback feedback-{correct ? 'correct' : 'wrong'}" role="status">
          {correct ? "Correct!" : "Not quite — see an accepted answer below."}
        </p>
        {#if !correct}
          <p class="answer-reveal">Accepted: {prompt.accepted[0]}</p>
        {/if}
        {#if prompt.explanation_id}
          <p class="meta">{prompt.explanation_id}</p>
        {/if}
      {/if}
    </div>
  {:else}
    <div class="block">
      <p class="instruction">{prompt.prompt}</p>
      <img class="desc-image" src={prompt.image} alt={prompt.prompt} loading="lazy" />

      <label class="field-label" for="desc-input">Your description (2–3 sentences)</label>
      <textarea
        id="desc-input"
        class="textarea"
        rows={4}
        value={text}
        disabled={disabled || submittedSelf}
        placeholder="Describe what is happening in the picture…"
        oninput={(e) => (text = (e.target as HTMLTextAreaElement).value)}
      ></textarea>

      {#if !revealed}
        <div class="actions">
          <button
            type="button"
            class="btn btn-primary"
            disabled={disabled || text.trim() === ""}
            onclick={revealModel}
          >Reveal model answer</button>
        </div>
        <p class="meta">Your answer is not auto-graded. Compare it yourself below.</p>
      {:else}
        <div class="model">
          <h3 class="model-title">Model answer</h3>
          <p class="model-text">{prompt.model_answer}</p>
          <h3 class="model-title">Keyword checklist</h3>
          <ul class="keywords">
            {#each prompt.keywords as keyword (keyword)}
              <li class="keyword keyword-{keywordHit(keyword) ? 'hit' : 'miss'}">
                <span aria-hidden="true">{keywordHit(keyword) ? "✓" : "○"}</span>
                {keyword}
              </li>
            {/each}
          </ul>
          <p class="meta" aria-live="polite">{hitCount} of {prompt.keywords.length} keywords found.</p>
        </div>

        <div class="self-score" aria-label="Self assessment">
          <p class="self-badge">Self-assessed — excluded from auto score</p>
          <h3 class="model-title">Guided rubric — score yourself honestly</h3>
          <ol class="rubric">
            {#each RUBRIC.filter((r) => r.score <= scoreMax) as item (item.score)}
              <li>{item.label}</li>
            {/each}
          </ol>
          <div class="score-row" role="group" aria-label={`Self score, 1 to ${scoreMax}`}>
            {#each Array.from({ length: scoreMax }, (_, i) => i + 1) as n (n)}
              <button
                type="button"
                class="score-btn"
                class:score-active={selfScore === n}
                aria-pressed={selfScore === n}
                disabled={disabled || submittedSelf}
                aria-label={`Score ${n} of ${scoreMax}`}
                onclick={() => (selfScore = n)}
              >{n}</button>
            {/each}
          </div>
          <div class="actions">
            <button
              type="button"
              class="btn btn-primary"
              disabled={disabled || selfScore == null || submittedSelf}
              onclick={submitSelfScore}
            >Submit self-score{submittedSelf ? "ted" : ""}</button>
          </div>
          {#if submittedSelf}
            <p class="feedback feedback-self" role="status">
              Self-assessed score {selfScore} of {scoreMax} recorded — not counted in the auto %.
            </p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .writing-editor {
    background: #ffffff;
    border: 1px solid #e7e5e4;
    border-radius: 16px;
    padding: 1.25rem;
  }
  :global(.dark) .writing-editor {
    background: #1e1e20;
    border-color: #2a2a2e;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .instruction {
    margin: 0;
    font-weight: 700;
    font-size: 1rem;
  }
  .meta {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.75;
  }
  .fallback {
    border: 2px dashed #e7e5e4;
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
  }
  :global(.dark) .fallback {
    border-color: #2a2a2e;
  }
  .fallback-title {
    margin: 0;
    font-weight: 700;
  }
  .fallback-sub {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    opacity: 0.75;
  }
  .answer-line,
  .bank {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0.625rem;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
  }
  :global(.dark) .answer-line,
  :global(.dark) .bank {
    border-color: #2a2a2e;
  }
  .placeholder {
    font-size: 0.875rem;
    opacity: 0.6;
    align-self: center;
  }
  .chip {
    min-height: 44px;
    min-width: 44px;
    padding: 0.5rem 0.875rem;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  :global(.dark) .chip {
    border-color: #2a2a2e;
  }
  .chip:hover:not(:disabled) {
    border-color: #6d28d9;
  }
  .chip:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
  }
  .chip:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .chip-placed {
    border-color: #6d28d9;
    background: color-mix(in srgb, #6d28d9 8%, transparent);
  }
  .given {
    margin: 0;
    padding: 0.75rem 1rem;
    border-left: 4px solid #6d28d9;
    border-radius: 0 12px 12px 0;
    background: color-mix(in srgb, #6d28d9 6%, transparent);
    font-size: 1rem;
  }
  .hint-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .hint {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.85;
  }
  .field-label {
    font-size: 0.875rem;
    font-weight: 700;
  }
  .textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: 1.6;
    resize: vertical;
  }
  :global(.dark) .textarea {
    border-color: #2a2a2e;
  }
  .textarea:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .btn {
    min-height: 44px;
    padding: 0.625rem 1.25rem;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  :global(.dark) .btn {
    border-color: #2a2a2e;
  }
  .btn:hover:not(:disabled) {
    border-color: #6d28d9;
  }
  .btn:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .btn:active:not(:disabled) {
    transform: scale(0.98) translateY(1px);
  }
  .btn-primary {
    background: #6d28d9;
    border-color: #6d28d9;
    color: #ffffff;
  }
  .btn-small {
    min-height: 44px;
    padding: 0.4rem 0.875rem;
    font-size: 0.875rem;
  }
  .feedback {
    margin: 0;
    padding: 0.625rem 0.875rem;
    border-radius: 12px;
    font-weight: 700;
  }
  .feedback-correct {
    background: color-mix(in srgb, #10b981 12%, transparent);
    border: 2px solid #10b981;
    animation: writing-flash 250ms ease-out;
  }
  .feedback-wrong {
    background: color-mix(in srgb, #ef4444 10%, transparent);
    border: 2px solid #ef4444;
    animation: writing-shake 250ms ease-out;
  }
  .feedback-self {
    background: color-mix(in srgb, #6d28d9 8%, transparent);
    border: 2px dashed #6d28d9;
  }
  .answer-reveal {
    margin: 0;
    font-size: 0.9375rem;
  }
  .desc-image {
    width: 100%;
    max-height: 320px;
    object-fit: cover;
    border-radius: 12px;
    border: 1px solid #e7e5e4;
  }
  :global(.dark) .desc-image {
    border-color: #2a2a2e;
  }
  .model {
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  :global(.dark) .model {
    border-color: #2a2a2e;
  }
  .model-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
  }
  .model-text {
    margin: 0;
    line-height: 1.6;
  }
  .keywords {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .keyword {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: 2px solid #e7e5e4;
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 600;
  }
  :global(.dark) .keyword {
    border-color: #2a2a2e;
  }
  .keyword-hit {
    border-color: #10b981;
    background: color-mix(in srgb, #10b981 10%, transparent);
  }
  .self-score {
    border: 2px dashed #6d28d9;
    border-radius: 12px;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .self-badge {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #6d28d9;
  }
  .rubric {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .score-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .score-btn {
    min-width: 44px;
    min-height: 44px;
    border: 2px solid #e7e5e4;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
  :global(.dark) .score-btn {
    border-color: #2a2a2e;
  }
  .score-btn:hover:not(:disabled) {
    border-color: #6d28d9;
  }
  .score-btn:focus-visible {
    outline: 2px solid #6d28d9;
    outline-offset: 2px;
  }
  .score-active {
    background: #6d28d9;
    border-color: #6d28d9;
    color: #ffffff;
  }
  @keyframes writing-flash {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  @keyframes writing-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .feedback-correct,
    .feedback-wrong,
    .btn:active:not(:disabled) {
      animation: none;
      transform: none;
    }
  }
</style>
