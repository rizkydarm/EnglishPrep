<script lang="ts">
	import type { SessionSummary } from "$lib/views/session-data.js";

	interface Props {
		summary: SessionSummary;
		onReviewWrong?: () => void;
		onNewQuiz?: () => void;
		onHome?: () => void;
	}

	let { summary, onReviewWrong, onNewQuiz, onHome }: Props = $props();

	const MODE_LABEL = { vocab: "Vocabulary", reading: "Reading", writing: "Writing" } as const;

	const celebrated = $derived(summary.scorePct !== null && summary.scorePct >= 80);
	const confetti = $derived(
		celebrated
			? Array.from({ length: 12 }, (_, i) => ({
					id: i,
					x: (i % 6) * 16 - 40,
					delay: (i % 4) * 0.12,
					color: i % 3 === 0 ? "#10b981" : i % 3 === 1 ? "#6d28d9" : "#f59e0b",
					round: i % 2 === 0,
				}))
			: [],
	);

	const groups = $derived.by(() => {
		const map = new Map<string, { label: string; earned: number; total: number }>();
		for (const e of summary.entries) {
			if (e.excluded) continue;
			const g = map.get(e.typeLabel) ?? { label: e.typeLabel, earned: 0, total: 0 };
			g.earned += Math.min(1, Math.max(0, e.earned));
			g.total += 1;
			map.set(e.typeLabel, g);
		}
		return [...map.values()];
	});

	function fmtDuration(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${String(s).padStart(2, "0")}`;
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === "Escape") {
			e.preventDefault();
			onHome?.();
		}
	}

	const RING_C = 2 * Math.PI * 26;
	const ringOffset = $derived(
		summary.scorePct === null ? RING_C : RING_C * (1 - summary.scorePct / 100),
	);
	const scoreLabel = $derived(summary.scorePct === null ? "N/A" : `${summary.scorePct}%`);
	const headline = $derived(
		summary.scorePct === null
			? "Self-assessed — no auto score"
			: summary.scorePct >= 80
				? "Excellent!"
				: summary.scorePct >= 60
					? "Good effort!"
					: "Keep practicing!",
	);
</script>

<svelte:window onkeydown={onKeydown} />

<section class="results" aria-label="Quiz results">
	{#if celebrated}
		<div class="confetti" aria-hidden="true">
			{#each confetti as p (p.id)}
				<span
					class="particle"
					class:round={p.round}
					style="--tx: {p.x}px; --delay: {p.delay}s; background: {p.color};"
				></span>
			{/each}
		</div>
	{/if}

	<div class="head">
		<div
			class="ring-wrap"
			role="img"
			aria-label={summary.scorePct === null ? "No auto score" : `Score ${summary.scorePct} percent`}
		>
			<svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
				<circle cx="32" cy="32" r="26" class="ring-bg" />
				<circle
					cx="32"
					cy="32"
					r="26"
					class="ring-fg"
					stroke-dasharray={RING_C}
					stroke-dashoffset={ringOffset}
					transform="rotate(-90 32 32)"
				/>
			</svg>
			<span class="ring-num">{scoreLabel}</span>
		</div>
		<div class="head-text">
			<h1 class="title">
				{MODE_LABEL[summary.mode]} quiz — {headline}
			</h1>
			<p class="sub">
				{summary.correctCount} correct · {summary.wrongCount} wrong
				{#if summary.excludedCount > 0}· {summary.excludedCount} self-assessed{/if}
				· {fmtDuration(summary.durationSec)}
			</p>
		</div>
	</div>

	{#if groups.length > 0}
		<div class="group">
			<h2 class="group-title">Per-type breakdown</h2>
			<div class="bars">
				{#each groups as g (g.label)}
					{@const pct = g.total > 0 ? Math.round((g.earned / g.total) * 100) : 0}
					<div class="bar-row">
						<span class="bar-label">{g.label}</span>
						<div class="bar-track" role="img" aria-label="{g.label}: {pct} percent">
							<div class="bar-fill" style="width: {pct}%;"></div>
						</div>
						<span class="bar-num">{pct}%</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if summary.selfAssessed.length > 0}
		<div class="group">
			<h2 class="group-title">Self-assessed (excluded from auto %)</h2>
			<ul class="self-list">
				{#each summary.selfAssessed as s (s.promptId)}
					<li class="self-item">
						<span class="badge badge-self">{s.label}</span>
						<p class="review-text">{s.userText}</p>
						{#if s.selfScore > 0}
							<p class="self-score">Self-score: {s.selfScore} of {s.selfMax}</p>
						{:else}
							<p class="self-score">Not self-scored</p>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="group">
		<h2 class="group-title">Answer review</h2>
		{#if summary.entries.length === 0}
			<p class="state" role="status">No answers recorded.</p>
		{:else}
			<ol class="review-list">
				{#each summary.entries as e, i (e.itemId)}
					<li class="review-item" class:review-wrong={!e.excluded && e.earned < 0.999}>
						<div class="review-head">
							<span class="badge">{e.typeLabel}</span>
							{#if e.excluded}
								<span class="badge badge-self">Self-assessed</span>
							{:else if e.earned >= 0.999}
								<span class="verdict verdict-ok" aria-label="Correct">✓</span>
							{:else}
								<span class="verdict verdict-bad" aria-label="Question {i + 1} incorrect">✗</span>
							{/if}
						</div>
						<p class="review-line"><span class="review-key">You:</span> {e.userText}</p>
						{#if !e.excluded}
							<p class="review-line"><span class="review-key">Correct:</span> {e.correctText}</p>
						{/if}
						{#if e.definition_id}
							<p class="review-def">Arti: {e.definition_id}</p>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</div>

	<div class="actions">
		<button
			type="button"
			class="btn btn-primary"
			disabled={summary.wrongIds.length === 0}
			onclick={() => onReviewWrong?.()}
		>
			Review wrong answers{summary.wrongIds.length > 0 ? ` (${summary.wrongIds.length})` : ""}
		</button>
		<button type="button" class="btn" onclick={() => onNewQuiz?.()}>New quiz</button>
		<button type="button" class="btn" onclick={() => onHome?.()}>Back to home</button>
	</div>
</section>

<style>
	.results {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		animation: results-enter 250ms ease-out;
		overflow: hidden;
	}
	.confetti {
		position: absolute;
		top: 4.5rem;
		left: 50%;
		width: 0;
		height: 0;
		pointer-events: none;
	}
	.particle {
		position: absolute;
		left: 0;
		top: 0;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 2px;
		opacity: 0;
		animation: confetti-fall 1.2s ease-out var(--delay) forwards;
	}
	.particle.round {
		border-radius: 999px;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.ring-wrap {
		position: relative;
		flex: none;
		width: 5.5rem;
		height: 5.5rem;
	}
	.ring {
		width: 100%;
		height: 100%;
	}
	.ring-bg {
		fill: none;
		stroke: #e7e5e4;
		stroke-width: 6;
	}
	.ring-fg {
		fill: none;
		stroke: #6d28d9;
		stroke-width: 6;
		stroke-linecap: round;
		transition: stroke-dashoffset 400ms ease-out;
	}
	:global(.dark) .ring-bg {
		stroke: #2a2a2e;
	}
	.ring-num {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		font-size: 1.125rem;
	}
	.title {
		margin: 0;
		font-size: 1.375rem;
		letter-spacing: -0.01em;
	}
	.sub {
		margin: 0.25rem 0 0;
		font-size: 0.9rem;
		opacity: 0.7;
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}
	.group-title {
		margin: 0;
		font-size: 1rem;
	}
	.bars {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.bar-row {
		display: grid;
		grid-template-columns: minmax(7rem, 11rem) 1fr 3rem;
		align-items: center;
		gap: 0.625rem;
	}
	.bar-label {
		font-size: 0.85rem;
		font-weight: 600;
	}
	.bar-track {
		height: 0.75rem;
		border-radius: 999px;
		background: #e7e5e4;
		overflow: hidden;
	}
	:global(.dark) .bar-track {
		background: #2a2a2e;
	}
	.bar-fill {
		height: 100%;
		border-radius: 999px;
		background: #6d28d9;
		transition: width 300ms ease-out;
	}
	.bar-num {
		font-size: 0.85rem;
		font-weight: 800;
		text-align: right;
	}
	.self-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.self-item,
	.review-item {
		background: #ffffff;
		border: 2px solid #e7e5e4;
		border-radius: 16px;
		padding: 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	:global(.dark) .self-item,
	:global(.dark) .review-item {
		background: #1e1e20;
		border-color: #2a2a2e;
	}
	.review-wrong {
		border-color: #ef4444;
	}
	.review-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.review-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
	.badge-self {
		background: transparent;
		border: 2px dashed #6d28d9;
	}
	.verdict {
		margin-left: auto;
		font-weight: 800;
		font-size: 1.1rem;
	}
	.verdict-ok {
		color: #10b981;
	}
	.verdict-bad {
		color: #ef4444;
	}
	.review-line,
	.review-text,
	.review-def,
	.self-score {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.55;
	}
	.review-key {
		font-weight: 700;
	}
	.review-def {
		color: #6d28d9;
		font-weight: 600;
	}
	.self-score {
		font-weight: 700;
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
		transition: transform 80ms ease-out;
	}
	:global(.dark) .btn {
		border-color: #2a2a2e;
	}
	.btn:not(:disabled):active {
		transform: scale(0.98) translateY(1px);
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.btn:focus-visible {
		outline: 2px solid #6d28d9;
		outline-offset: 2px;
	}
	.btn-primary {
		background: #6d28d9;
		border-color: #6d28d9;
		color: #fff;
	}
	@keyframes results-enter {
		from {
			transform: translateY(8px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	@keyframes confetti-fall {
		0% {
			transform: translate(0, 0) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translate(var(--tx), 9rem) rotate(340deg);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.results {
			animation: none;
		}
		.particle {
			animation: none;
			display: none;
		}
		.bar-fill,
		.ring-fg {
			transition: none;
		}
	}
</style>
