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
	let remaining = $state<number>(0);
	let startedAt = $state(Date.now());
	let nextBtn: HTMLButtonElement | null = $state(null);

	// Own the session in the quiz store (exit discards; nothing persisted here).
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
					// Self-assessed items (image description) stay out of the auto %
					// even when they time out (PRD §7.7).
					const selfAssessed = item.kind === "writing_image";
					record(item.id, {
						earned: 0,
						userText: "No answer (time expired)",
						correctText: selfAssessed ? "Not self-scored" : correctTextFor(item),
						...(selfAssessed ? { excluded: true } : {}),
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
			correctText: "Self-assessed, not auto-graded",
			excluded: true,
			selfScore: result.selfScore ?? 0,
			selfMax: max,
		});
	}

	function feedbackFor(item: QuizItem): string {
		const o = outcomes[item.id];
		if (!o) return "";
		if (o.excluded) return "Self-assessed, recorded separately, not in the auto %.";
		if (expired[item.id] === true) return "Time expired, counted as incorrect.";
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

<section class="quiz min-h-screen" aria-label="Quiz session">
	{#if items.length === 0}
		<div class="card-3d max-w-md mx-auto p-8 text-center my-12">
			<p class="font-extrabold text-xl text-foreground" role="status">No questions in this session.</p>
			<p class="serif text-muted-foreground mt-2">Try different setup options or content levels.</p>
			<button type="button" class="btn-3d w-full h-[48px] mt-6" onclick={() => onExit?.()}>Back to Home</button>
		</div>
	{:else if current !== null}
		<!-- Header (Template-Quiz.html) -->
		<header class="sticky top-0 z-20 bg-card/95 backdrop-blur border-b-[2.5px] border-border-strong -mx-4 -mt-4 px-4 py-3 md:-mx-6 md:-mt-6 md:px-6 mb-8">
			<div class="max-w-[1120px] mx-auto flex items-center gap-3 md:gap-4">
				<button
					type="button"
					class="w-10 h-10 rounded-xl border-2 border-border-strong flex items-center justify-center bg-card font-black text-sm shadow-[0_2px_0_var(--border-strong)] hover:bg-muted dark:hover:bg-card active:translate-y-[2px] active:shadow-none transition-all"
					onclick={askExit}
					aria-label="Exit quiz"
				>
					✕
				</button>

				<!-- 14px thick progress bar -->
				<div
					class="flex-1 h-[14px] rounded-full border-[2.5px] border-border-strong overflow-hidden bg-muted dark:bg-card"
					role="progressbar"
					aria-valuenow={quiz.index + 1}
					aria-valuemin={1}
					aria-valuemax={total}
					aria-label="Quiz progress"
				>
					<div
						class="h-full bg-primary transition-all duration-300"
						style="width: {((quiz.index + 1) / total) * 100}%;"
					></div>
				</div>

				<!-- Question counter -->
				<div class="px-3 py-1 rounded-full border-2 border-border-strong font-extrabold text-xs bg-card whitespace-nowrap shadow-[0_1px_0_var(--border-strong)]">
					{quiz.index + 1} / {total}
				</div>

				<!-- Timer -->
				{#if timerPerQ > 0}
					<div
						class="px-3 py-1 rounded-full border-2 border-border-strong font-extrabold text-xs whitespace-nowrap shadow-[0_1px_0_var(--border-strong)] {remaining <= 5 ? 'bg-yellow text-accent-ink border-border-strong font-black animate-pulse' : 'bg-card text-foreground'}"
						role="timer"
						aria-label="{remaining} seconds left"
					>
						⏱ {remaining}s
					</div>
				{/if}

				<!-- Skill-Aware Level Badge -->
				<div class="hidden sm:inline-flex px-3 py-1 rounded-full border-2 border-border-strong font-extrabold text-[11px] {mode === 'reading' ? 'bg-cyan text-accent-ink' : mode === 'writing' ? 'bg-yellow text-accent-ink' : 'bg-primary text-primary-foreground'} shadow-[0_1px_0_var(--border-strong)]">
					{levelBadge}
				</div>
			</div>
		</header>

		<!-- Main Layout (Template-Quiz.html). Reading keeps a wide two-column
		     (passage + question); vocab/writing use a single centered column so
		     the quiz card sits in the middle with the question nav above it. -->
		<div class="{current.kind.startsWith('reading') ? 'max-w-[1120px] mx-auto pb-12 space-y-6' : 'mx-auto w-full max-w-3xl pb-12 space-y-6'}">
			<!-- Context + question navigation (above the card in single-column mode) -->
			<aside class="space-y-4">
				<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-border-strong text-[11px] font-extrabold bg-card shadow-[0_2px_0_var(--border-strong)]">
					<span class="w-2.5 h-2.5 rounded-full border border-border-strong {mode === 'reading' ? 'bg-cyan' : mode === 'writing' ? 'bg-yellow' : 'bg-primary'}"></span>
					{mode.toUpperCase()} • {current.typeLabel}
				</div>

				<h2 class="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight text-foreground">
					{#if current.kind === "matching"}
						Match the word with its correct definition
					{:else if current.kind === "cloze"}
						Complete the sentence with the missing word
					{:else if current.kind.startsWith("reading")}
						Reading Comprehension
					{:else if current.kind.startsWith("writing")}
						Writing & Structure Drill
					{:else}
						Vocabulary Practice
					{/if}
				</h2>

				<p class="serif text-muted-foreground text-base md:text-lg leading-relaxed">
					{#if current.kind === "matching"}
						Tap a word on the left, then tap its meaning on the right. Faster than drag & drop for desktop.
					{:else if current.kind === "cloze"}
						Type or choose the missing word. Spelling close enough counts (one-letter tolerance).
					{:else if current.kind.startsWith("reading")}
						The passage stays visible on the left while you answer the questions on the right.
					{:else if current.kind.startsWith("writing")}
						Construct sentences, correct grammatical mistakes, or describe images.
					{:else}
						Select the best option from the choices. Press 1–4 on your keyboard or tap a card.
					{/if}
				</p>

				{#if current.pairWordIds && current.pairWordIds.length > 0}
					<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-border-strong bg-yellow text-accent-ink font-extrabold text-xs shadow-[0_2px_0_var(--border-strong)]">
						<span>SRS Box</span>
						<span>Reviews {current.pairWordIds.length} words for retention</span>
					</div>
				{/if}

				<!-- Discrete Question Jump Overview -->
				<div class="pt-4 border-t-2 border-border dark:border-border">
					<div class="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Question Navigation</div>
					<div class="flex flex-wrap gap-2" role="group" aria-label="Session questions">
						{#each items as it, i (it.id)}
							{@const done = outcomes[it.id] !== undefined}
							{@const isCurrent = it.id === current.id}
							{@const activeBg = mode === 'reading' ? 'bg-cyan text-accent-ink' : mode === 'writing' ? 'bg-yellow text-accent-ink' : 'bg-primary text-primary-foreground'}
							<button
								type="button"
								class="w-8 h-8 rounded-xl border-2 border-border-strong font-extrabold text-xs flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0 {isCurrent ? `${activeBg} shadow-[0_3px_0_var(--border-strong)] ring-2 ring-border-strong ring-offset-1` : done ? 'bg-success-bg text-success-text shadow-[0_2px_0_var(--border-strong)]' : 'bg-card text-muted-foreground opacity-60 shadow-[0_1px_0_var(--border-strong)]'}"
								disabled={!done || isCurrent}
								aria-label="Question {i + 1}{done ? ', answered' : ''}{isCurrent ? ', current' : ''}"
								onclick={() => quiz.goTo(i)}
							>
								{i + 1}
							</button>
						{/each}
					</div>
				</div>
			</aside>

			<!-- Interactive question component + feedback/advance -->
			<div class="space-y-4">
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
							onSkip={() =>
								record(current.id, {
									earned: 0,
									userText: "Skipped (no valid prompt)",
									correctText: "Not auto-graded",
									excluded: true,
								})}
							onExit={askExit}
							disabled={locked}
						/>
					{/if}
				{/key}

				<!-- Feedback & Advance Controls -->
				<div class="mt-4">
					{#if answered}
						{#if outcomes[current.id]?.earned < 0.999}
							<div
								class="card-3d p-4 mb-3 flex items-center justify-between gap-3 bg-destructive-bg border-destructive"
								role="status"
							>
								<div class="font-extrabold text-base text-destructive-text">
									{feedbackFor(current)}
								</div>
							</div>
						{/if}
						<button
							type="button"
							class="btn-3d w-full h-[52px] text-lg font-black flex items-center justify-center gap-2"
							bind:this={nextBtn}
							onclick={advance}
						>
							{quiz.isLast ? "See Results →" : "Next Question →"}
						</button>
					{:else}
						<p class="text-xs font-bold text-center text-muted-foreground">
							{#if timerPerQ > 0 && expired[current.id] !== true}
								⏱ Answer before the timer runs out.
							{:else}
								Choose or enter your answer above to continue.
							{/if}
						</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Exit Confirmation Modal (Duolingo Style) -->
	{#if confirming}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
			role="presentation"
			onclick={(e) => { if (e.target === e.currentTarget) confirming = false; }}
		>
			<div
				class="card-3d w-full max-w-md p-6 bg-card"
				role="alertdialog"
				aria-modal="true"
				aria-label="Exit quiz"
				aria-describedby="exit-desc"
			>
				<h2 class="text-2xl font-black text-foreground">Exit practice?</h2>
				<p class="serif text-muted-foreground mt-2 text-base" id="exit-desc">
					The incomplete session is discarded and not saved to your history.
				</p>
				<div class="flex gap-3 mt-6">
					<button
						type="button"
						class="btn-3d btn-3d-white flex-1 h-[48px] font-bold"
						onclick={() => (confirming = false)}
					>
						Keep practicing
					</button>
					<button
						type="button"
						class="btn-3d flex-1 h-[48px] font-bold !bg-destructive !border-border-strong text-destructive-foreground"
						onclick={confirmExit}
					>
						Discard session
					</button>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	.quiz {
		animation: quiz-enter 250ms ease-out;
	}
	@keyframes quiz-enter {
		from {
			transform: translateY(6px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.quiz {
			animation: none;
		}
	}
</style>
