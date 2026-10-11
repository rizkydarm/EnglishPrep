<script lang="ts">
	import VocabCard from "$lib/components/quiz/VocabCard.svelte";
	import MatchingGrid from "$lib/components/quiz/MatchingGrid.svelte";
	import ClozeInput from "$lib/components/quiz/ClozeInput.svelte";
	import HighlightPassage from "$lib/components/quiz/HighlightPassage.svelte";
	import WritingEditor, { type WritingResult } from "$lib/components/quiz/WritingEditor.svelte";
	import { quiz, type QuizMode, type TimerPerQ } from "$lib/stores/quiz.svelte.js";
	import type { Level, WritingPrompt } from "$lib/types/schema.js";
	import type {
		BestWordVocabQuestion,
		ClozeVocabQuestion,
		MatchingVocabQuestion,
		McqVocabQuestion,
		TrueFalseVocabQuestion,
	} from "$lib/utils/vocab-factory.js";
	import {
		LEVEL_LABEL,
		correctTextFor,
		summarizeSession,
		type ItemOutcome,
		type QuizItem,
		type ReadingPayload,
		type SessionSummary,
	} from "$lib/views/session-data.js";

	interface Props {
		items: QuizItem[];
		mode: QuizMode;
		levels: Level[];
		timerPerQ: TimerPerQ;
		definitionByWordId?: Record<string, string>;
		onFinish?: (summary: SessionSummary) => void;
		onExit?: () => void;
	}

	let { items, mode, levels, timerPerQ, definitionByWordId = {}, onFinish, onExit }: Props = $props();

	let outcomes = $state<Record<string, ItemOutcome>>({});
	let expired = $state<Record<string, boolean>>({});
	let confirming = $state(false);
	let remaining = $state<number>(timerPerQ);
	let startedAt = $state(Date.now());
	let nextBtn: HTMLButtonElement | null = $state(null);

	// Own the session in the quiz store (exit discards — nothing persisted here).
	$effect(() => {
		quiz.start({
			mode,
			levels: [...levels],
			count: items.length,
			timerPerQ,
			items: items.map((i) => ({ id: i.id, kind: i.kind, word_id: i.word_id, payload: i.payload })),
		});
		startedAt = Date.now();
		outcomes = {};
		expired = {};
		confirming = false;
	});

	const current = $derived((quiz.current as unknown as QuizItem | null) ?? null);
	const total = $derived(items.length);
	const answered = $derived(current !== null && outcomes[current.id] !== undefined);
	const locked = $derived(current !== null && (answered || expired[current.id] === true));
	const levelBadge = $derived(levels.map((l) => LEVEL_LABEL[l] ?? l).join(" · "));

	// Per-question countdown. Expiry auto-submits as incorrect (PRD §7.2).
	// Paused once the answer is recorded (feedback shown); expiry guard kept.
	$effect(() => {
		const id = current?.id;
		const t = timerPerQ;
		if (id === undefined || t <= 0 || quiz.status !== "active") return;
		if (outcomes[id] !== undefined) return;
		remaining = t;
		const started = Date.now();
		const iv = setInterval(() => {
			if (outcomes[id] !== undefined) {
				clearInterval(iv);
				return;
			}
			const left = t - Math.floor((Date.now() - started) / 1000);
			remaining = Math.max(0, left);
			if (left <= 0) {
				clearInterval(iv);
				const item = items.find((it) => it.id === id);
				if (item && outcomes[item.id] === undefined && quiz.status === "active") {
					expired[item.id] = true;
					record(item.id, {
						earned: 0,
						userText: "No answer — time expired",
						correctText: correctTextFor(item),
					});
				}
			}
		}, 250);
		return () => clearInterval(iv);
	});

	// Move focus to Next once an answer lands (keyboard flow: 1-4/Enter, then Next).
	let lastAnsweredId: string | null = $state(null);
	$effect(() => {
		const id = current?.id ?? null;
		const isAnswered = id !== null && outcomes[id] !== undefined;
		if (isAnswered && lastAnsweredId !== id) {
			lastAnsweredId = id;
			nextBtn?.focus();
		}
		if (!isAnswered && id !== lastAnsweredId) lastAnsweredId = null;
	});

	function record(itemId: string, outcome: ItemOutcome): void {
		if (outcomes[itemId] !== undefined) return;
		outcomes[itemId] = outcome;
		quiz.setAnswer(itemId, outcome.excluded ? "self" : outcome.earned);
	}

	function advance(): void {
		if (!current || outcomes[current.id] === undefined) return;
		if (quiz.isLast) {
			quiz.finish();
			onFinish?.(
				summarizeSession(items, outcomes, Math.round((Date.now() - startedAt) / 1000), mode, levels, definitionByWordId),
			);
		} else {
			quiz.next();
		}
	}

	function askExit(): void {
		confirming = true;
	}

	function confirmExit(): void {
		confirming = false;
		quiz.exitQuiz();
		onExit?.();
	}

	// ---- per-kind answer mapping (user text + credit for the review list) ----

	function vocabLabels(item: QuizItem): string[] {
		const p = item.payload as McqVocabQuestion | BestWordVocabQuestion | TrueFalseVocabQuestion;
		if (p.type === "true_false") return ["True", "False"];
		return (p as McqVocabQuestion | BestWordVocabQuestion).options;
	}

	function onVocabAnswer(item: QuizItem, ok: boolean, selected: number): void {
		const labels = vocabLabels(item);
		record(item.id, {
			earned: ok ? 1 : 0,
			userText: labels[selected] ?? `Option ${selected + 1}`,
			correctText: correctTextFor(item),
			raw: selected,
		});
	}

	function onMatchingAnswer(item: QuizItem, score: number, cp: number, tp: number): void {
		record(item.id, {
			earned: Math.min(1, Math.max(0, score)),
			userText: `${cp}/${tp} pairs matched`,
			correctText: correctTextFor(item),
		});
	}

	function onClozeAnswer(item: QuizItem, ok: boolean, answer: string): void {
		record(item.id, {
			earned: ok ? 1 : 0,
			userText: answer === "" ? "(empty)" : answer,
			correctText: correctTextFor(item),
			raw: answer,
		});
	}

	function readingMcqOptions(item: QuizItem): string[] {
		const r = item.payload as ReadingPayload;
		const q = r.item;
		if (q.type === "sentence_completion" || q.type === "best_title") return q.options;
		if (q.type === "highlight_idea" && q.variant === "choose_idea") return q.options;
		return [];
	}

	function readingPrompt(item: QuizItem): string {
		const r = item.payload as ReadingPayload;
		const q = r.item;
		if (q.type === "sentence_completion") return `Choose the best sentence to fill gap ${q.gap}.`;
		if (q.type === "best_title") return "Choose the best title for this passage.";
		if (q.type === "highlight_idea") return q.prompt;
		return "";
	}

	function readingKey(item: QuizItem): number {
		const r = item.payload as ReadingPayload;
		const q = r.item;
		if (q.type === "sentence_completion" || q.type === "best_title") return q.answer;
		if (q.type === "highlight_idea" && q.variant === "choose_idea") return q.answer;
		return -1;
	}

	function onReadingMcq(item: QuizItem, picked: number): void {
		const options = readingMcqOptions(item);
		record(item.id, {
			earned: picked === readingKey(item) ? 1 : 0,
			userText: options[picked] ?? `Option ${picked + 1}`,
			correctText: correctTextFor(item),
			raw: picked,
		});
	}

	function onReadingTap(item: QuizItem, tapped: number[]): void {
		const r = item.payload as ReadingPayload;
		const q = r.item;
		const key = q.type === "highlight_idea" && q.variant === "tap_sentence" ? q.answer_sentences : [];
		const ok = key.length === tapped.length && key.every((k) => tapped.includes(k));
		record(item.id, {
			earned: ok ? 1 : 0,
			userText: tapped.length === 0 ? "(none tapped)" : tapped.map((i) => `Sentence ${i + 1}`).join(", "),
			correctText: correctTextFor(item),
			raw: tapped,
		});
	}

	function onWritingResult(item: QuizItem, result: WritingResult): void {
		if (result.selfAssessed) {
			onWritingSelf(item, result);
			return;
		}
		record(item.id, {
			earned: result.correct === true ? 1 : 0,
			userText: result.userAnswer === "" ? "(empty)" : result.userAnswer,
			correctText: correctTextFor(item),
		});
	}

	function onWritingSelf(item: QuizItem, result: WritingResult): void {
		const p = item.payload as WritingPrompt;
		const max = p.type === "image_description" ? (p.self_score_max ?? 5) : 5;
		record(item.id, {
			earned: 0,
			userText: result.userAnswer === "" ? "(empty)" : result.userAnswer,
			correctText: "Self-assessed — not auto-graded",
			excluded: true,
			selfScore: result.selfScore ?? 0,
			selfMax: max,
		});
	}

	function feedbackFor(item: QuizItem): string {
		const o = outcomes[item.id];
		if (!o) return "";
		if (o.excluded) return "Self-assessed — recorded separately, not in the auto %.";
		if (expired[item.id] === true) return "Time expired — counted as incorrect.";
		if (o.earned >= 0.999) return "Correct!";
		if (o.earned > 0) return `Partially correct (${Math.round(o.earned * 100)}%).`;
		return "Not quite.";
	}

	function filledGapsFor(item: QuizItem): Record<number, string> {
		if (item.kind !== "reading_completion") return {};
		const o = outcomes[item.id];
		if (!o || typeof o.raw !== "number") return {};
		const r = item.payload as ReadingPayload;
		const q = r.item;
		if (q.type !== "sentence_completion") return {};
		const picked = q.options[o.raw] ?? "";
		return picked === "" ? {} : { [q.gap]: picked };
	}

	function mcqAnswer(item: QuizItem): number {
		const r = item.payload as ReadingPayload;
		const q = r.item;
		if (q.type === "sentence_completion" || q.type === "best_title") return q.answer;
		return 0;
	}

	function mcqGap(item: QuizItem): number | null {
		const r = item.payload as ReadingPayload;
		const q = r.item;
		return q.type === "sentence_completion" ? q.gap : null;
	}

	function tapAnswer(item: QuizItem): number[] {
		const r = item.payload as ReadingPayload;
		const q = r.item;
		return q.type === "highlight_idea" && q.variant === "tap_sentence" ? q.answer_sentences : [];
	}

	function chooseSentence(item: QuizItem): number | null {
		const r = item.payload as ReadingPayload;
		const q = r.item;
		return q.type === "highlight_idea" && q.variant === "choose_idea" ? q.sentence : null;
	}

	function chooseAnswer(item: QuizItem): number {
		const r = item.payload as ReadingPayload;
		const q = r.item;
		return q.type === "highlight_idea" && q.variant === "choose_idea" ? q.answer : 0;
	}

	const RING_C = 2 * Math.PI * 9;
	const ringOffset = $derived(timerPerQ > 0 ? RING_C * (1 - remaining / timerPerQ) : 0);
</script>

<section class="quiz" aria-label="Quiz session">
	{#if items.length === 0}
		<p class="state" role="status">No questions in this session — try different setup options.</p>
		<button type="button" class="btn btn-primary" onclick={() => onExit?.()}>Back</button>
	{:else if current !== null}
		<div class="topbar">
			<div class="segments" role="group" aria-label="Session progress">
				{#each items as it, i (it.id)}
					{@const done = outcomes[it.id] !== undefined}
					{@const isCurrent = it.id === current.id}
					<button
						type="button"
						class="seg"
						class:seg-done={done}
						class:seg-current={isCurrent}
						disabled={!done || isCurrent}
						aria-label="Question {i + 1}{done ? ", answered" : ""}{isCurrent ? ", current" : ""}"
						onclick={() => quiz.goTo(i)}
					></button>
				{/each}
			</div>
			<div class="topbar-meta">
				<span class="qcount" aria-live="polite">Q {quiz.index + 1}/{total}</span>
				<span class="badge">{levelBadge}</span>
				{#if timerPerQ > 0}
					<span
						class="timer"
						class:timer-low={remaining <= 5}
						role="timer"
						aria-label="{remaining} seconds left"
					>
						<svg class="ring" viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="12" r="9" class="ring-bg" />
							<circle
								cx="12"
								cy="12"
								r="9"
								class="ring-fg"
								stroke-dasharray={RING_C}
								stroke-dashoffset={ringOffset}
								transform="rotate(-90 12 12)"
							/>
						</svg>
						<span>{remaining}s</span>
					</span>
				{/if}
				<button type="button" class="btn-exit" onclick={askExit} aria-label="Exit quiz">
					Exit
				</button>
			</div>
		</div>

		<div class="quiz-grid">
			<aside class="support" aria-label="Session support">
				<h2 class="support-title">{current.typeLabel}</h2>
				<p class="support-text">
					{#if current.kind === "matching"}
						Tap a word, then tap its match. Partial credit per correct pair.
					{:else if current.kind === "cloze"}
						Spelling close enough counts (one-letter difference accepted).
					{:else if current.kind.startsWith("reading")}
						The passage stays visible while you answer.
					{:else if current.kind.startsWith("writing")}
						Image descriptions are self-assessed and excluded from the auto %.
					{:else}
						Keys 1–4 select · Enter checks · Esc exits.
					{/if}
				</p>
				{#if current.pairWordIds && current.pairWordIds.length > 0}
					<p class="support-text">Reviews {current.pairWordIds.length} words for SRS.</p>
				{/if}
			</aside>

			<div class="question">
				{#key current.id}
					{#if current.kind === "mcq" || current.kind === "true_false" || current.kind === "best_word"}
						<VocabCard
							question={current.payload as McqVocabQuestion | TrueFalseVocabQuestion | BestWordVocabQuestion}
							onAnswer={(ok, idx) => onVocabAnswer(current, ok, idx)}
							onNext={advance}
							onExit={askExit}
							disabled={locked}
						/>
					{:else if current.kind === "matching"}
						<MatchingGrid
							question={current.payload as MatchingVocabQuestion}
							onAnswer={(score, cp, tp) => onMatchingAnswer(current, score, cp, tp)}
							onExit={askExit}
							disabled={locked}
						/>
					{:else if current.kind === "cloze"}
						<ClozeInput
							question={current.payload as ClozeVocabQuestion}
							onAnswer={(ok, ans) => onClozeAnswer(current, ok, ans)}
							onExit={askExit}
							disabled={locked}
						/>
					{:else if current.kind === "reading_completion" || current.kind === "reading_title"}
						{@const rp = current.payload as ReadingPayload}
						<HighlightPassage
							title={rp.passage.title}
							sentences={rp.sentences}
							mode="mcq"
							mcqKind={current.kind === "reading_title" ? "best_title" : "sentence_completion"}
							prompt={readingPrompt(current)}
							options={readingMcqOptions(current)}
							answer={mcqAnswer(current)}
							activeGap={mcqGap(current)}
							filledGaps={filledGapsFor(current)}
							readonly={locked}
							onAnswer={(v) => { if (typeof v === "number") onReadingMcq(current, v); }}
							onExit={askExit}
						/>
					{:else if current.kind === "reading_tap"}
						{@const rp = current.payload as ReadingPayload}
						<HighlightPassage
							title={rp.passage.title}
							sentences={rp.sentences}
							mode="tap_sentence"
							prompt={readingPrompt(current)}
							answer={tapAnswer(current)}
							readonly={locked}
							onAnswer={(v) => { if (Array.isArray(v)) onReadingTap(current, v); }}
							onExit={askExit}
						/>
					{:else if current.kind === "reading_choose"}
						{@const rp = current.payload as ReadingPayload}
						<HighlightPassage
							title={rp.passage.title}
							sentences={rp.sentences}
							mode="choose_idea"
							prompt={readingPrompt(current)}
							options={readingMcqOptions(current)}
							targetSentence={chooseSentence(current)}
							answer={chooseAnswer(current)}
							readonly={locked}
							onAnswer={(v) => { if (typeof v === "number") onReadingMcq(current, v); }}
							onExit={askExit}
						/>
					{:else}
						<WritingEditor
							prompt={current.payload as WritingPrompt}
							onResult={(r) => onWritingResult(current, r)}
							onSelfScore={(r) => onWritingSelf(current, r)}
							onExit={askExit}
							disabled={locked}
						/>
					{/if}
				{/key}

				<div class="nav">
					{#if answered}
						<p class="feedback" role="status">{feedbackFor(current)}</p>
						<button
							type="button"
							class="btn btn-primary"
							bind:this={nextBtn}
							onclick={advance}
						>
							{quiz.isLast ? "See results" : "Next →"}
						</button>
					{:else}
						<p class="hint">
							{#if timerPerQ > 0 && expired[current.id] !== true}Answer before the timer runs out.{:else}Answer above, then continue.{/if}
						</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if confirming}
		<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) confirming = false; }}>
			<div class="dialog" role="alertdialog" aria-modal="true" aria-label="Exit quiz" aria-describedby="exit-desc">
				<h2 class="dialog-title">Exit quiz?</h2>
				<p class="dialog-text" id="exit-desc">The incomplete session is discarded and not saved.</p>
				<div class="dialog-actions">
					<button type="button" class="btn" autofocus onclick={() => (confirming = false)}>
						Keep practicing
					</button>
					<button type="button" class="btn btn-danger" onclick={confirmExit}>
						Discard session
					</button>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	.quiz {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		animation: quiz-enter 250ms ease-out;
	}
	.topbar {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}
	.segments {
		display: flex;
		gap: 0.375rem;
	}
	.seg {
		flex: 1;
		height: 0.625rem;
		min-width: 1.5rem;
		border: none;
		border-radius: 999px;
		background: #e7e5e4;
		padding: 0;
		transition: background 300ms ease-out;
	}
	.seg:disabled {
		cursor: default;
	}
	.seg-done {
		background: #10b981;
	}
	.seg-current {
		background: #6d28d9;
	}
	button.seg:not(:disabled) {
		cursor: pointer;
	}
	:global(.dark) .seg {
		background: #2a2a2e;
	}
	:global(.dark) .seg-done {
		background: #10b981;
	}
	:global(.dark) .seg-current {
		background: #6d28d9;
	}
	.seg:focus-visible,
	.btn:focus-visible,
	.btn-exit:focus-visible {
		outline: 2px solid #6d28d9;
		outline-offset: 2px;
	}
	.topbar-meta {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex-wrap: wrap;
	}
	.qcount {
		font-weight: 800;
		font-size: 0.9375rem;
	}
	.badge {
		display: inline-flex;
		align-items: center;
		min-height: 28px;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		border: 1px solid #e7e5e4;
		font-size: 0.75rem;
		font-weight: 700;
		opacity: 0.85;
	}
	:global(.dark) .badge {
		border-color: #2a2a2e;
	}
	.timer {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-left: auto;
		font-weight: 800;
		font-size: 0.9rem;
	}
	.timer-low {
		color: #ef4444;
	}
	.ring {
		width: 1.5rem;
		height: 1.5rem;
	}
	.ring-bg {
		fill: none;
		stroke: #e7e5e4;
		stroke-width: 3;
	}
	.ring-fg {
		fill: none;
		stroke: #6d28d9;
		stroke-width: 3;
		stroke-linecap: round;
		transition: stroke-dashoffset 250ms linear;
	}
	.timer-low .ring-fg {
		stroke: #ef4444;
	}
	:global(.dark) .ring-bg {
		stroke: #2a2a2e;
	}
	.btn-exit {
		min-height: 44px;
		min-width: 44px;
		padding: 0.5rem 1rem;
		border: 2px solid #e7e5e4;
		border-radius: 12px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	:global(.dark) .btn-exit {
		border-color: #2a2a2e;
	}
	.quiz-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		align-items: start;
	}
	@media (min-width: 960px) {
		.quiz-grid {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		}
	}
	.support {
		background: #ffffff;
		border: 2px solid #e7e5e4;
		border-radius: 16px;
		padding: 1rem;
	}
	:global(.dark) .support {
		background: #1e1e20;
		border-color: #2a2a2e;
	}
	.support-title {
		margin: 0 0 0.375rem;
		font-size: 1rem;
	}
	.support-text {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		line-height: 1.55;
		opacity: 0.8;
	}
	.question {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	.nav {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.feedback {
		margin: 0;
		font-weight: 800;
		flex: 1;
		min-width: 10rem;
	}
	.hint {
		margin: 0;
		font-size: 0.82rem;
		opacity: 0.65;
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
		transition: transform 80ms ease-out;
	}
	:global(.dark) .btn {
		border-color: #2a2a2e;
	}
	.btn:not(:disabled):active {
		transform: scale(0.98) translateY(1px);
	}
	.btn-primary {
		background: #6d28d9;
		border-color: #6d28d9;
		color: #fff;
	}
	.btn-danger {
		background: #ef4444;
		border-color: #ef4444;
		color: #fff;
	}
	.state {
		margin: 0;
		padding: 1rem;
		border: 2px dashed #e7e5e4;
		border-radius: 12px;
	}
	:global(.dark) .state {
		border-color: #2a2a2e;
	}
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.45);
		animation: quiz-enter 200ms ease-out;
	}
	.dialog {
		width: 100%;
		max-width: 24rem;
		background: #ffffff;
		border: 2px solid #e7e5e4;
		border-radius: 16px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}
	:global(.dark) .dialog {
		background: #1e1e20;
		border-color: #2a2a2e;
	}
	.dialog-title {
		margin: 0;
		font-size: 1.0625rem;
	}
	.dialog-text {
		margin: 0;
		font-size: 0.9rem;
		opacity: 0.8;
	}
	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.375rem;
	}
	@keyframes quiz-enter {
		from {
			transform: translateY(8px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.quiz,
		.overlay {
			animation: none;
		}
		.seg,
		.ring-fg,
		.btn {
			transition: none;
		}
	}
</style>
