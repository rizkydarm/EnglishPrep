<script lang="ts">
	import type { QuizMode } from "$lib/stores/quiz.svelte.js";

	interface Props {
		vocabCount: number;
		readingCount: number;
		writingCount: number;
		mastered: number;
		quizzesToday: number;
		avgScore: number;
		loading?: boolean;
		error?: string | null;
		onStart?: (mode: QuizMode) => void;
		onOpenDashboard?: () => void;
	}

	let {
		vocabCount,
		readingCount,
		writingCount,
		mastered,
		quizzesToday,
		avgScore,
		loading = false,
		error = null,
		onStart,
		onOpenDashboard,
	}: Props = $props();

	const CARDS: { mode: QuizMode; title: string; blurb: string; cta: string; count: number }[] = $derived([
		{ mode: "vocab", title: "Vocabulary", blurb: "5 tap-to-answer types, SRS review built in.", cta: "Start Vocab Drill", count: vocabCount },
		{ mode: "reading", title: "Reading", blurb: "Passages with gap-fill, highlight and best-title.", cta: "Start Reading Drill", count: readingCount },
		{ mode: "writing", title: "Writing", blurb: "Order, fix and describe — self-scored, honestly.", cta: "Start Writing Drill", count: writingCount },
	]);

	const empty = $derived(!loading && !error && vocabCount + readingCount + writingCount === 0);
</script>

<section class="home" aria-label="Home">
	<div class="hero">
		<h1 class="hero-title">What do you want to master today?</h1>
		<p class="hero-sub">Short offline drills for CEFR B1 to B2. Pick a mode to start.</p>
	</div>

	{#if loading}
		<div class="cards" aria-label="Loading modes">
			{#each [0, 1, 2] as i (i)}
				<div class="card skeleton" role="status" aria-label="Loading mode {i + 1}">
					<div class="sk-line sk-title"></div>
					<div class="sk-line"></div>
					<div class="sk-line sk-short"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<p class="state state-error" role="alert">{error}</p>
	{:else if empty}
		<p class="state" role="status">No practice content found. Check the content folder and reload.</p>
	{:else}
		<div class="cards">
			{#each CARDS as card (card.mode)}
				<article class="card" aria-label="{card.title} mode">
					<h2 class="card-title">{card.title}</h2>
					<p class="card-blurb">{card.blurb}</p>
					<p class="card-count" aria-label="{card.count} {card.title} items available">
						{card.count} item{card.count === 1 ? "" : "s"}
					</p>
					<button
						type="button"
						class="cta"
						disabled={card.count === 0}
						onclick={() => onStart?.(card.mode)}
					>
						{card.cta}
					</button>
				</article>
			{/each}
		</div>
	{/if}

	<button
		type="button"
		class="stats"
		onclick={() => onOpenDashboard?.()}
		aria-label="Open dashboard: {mastered} words mastered, {quizzesToday} quizzes today, average score {avgScore} percent"
	>
		<span class="stat"><strong>{mastered}</strong> words mastered</span>
		<span class="stat-sep" aria-hidden="true">·</span>
		<span class="stat"><strong>{quizzesToday}</strong> quizzes today</span>
		<span class="stat-sep" aria-hidden="true">·</span>
		<span class="stat"><strong>{avgScore}%</strong> average score</span>
		<span class="stats-go" aria-hidden="true">→</span>
	</button>
</section>

<style>
	.home {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		animation: home-enter 250ms ease-out;
	}
	.hero-title {
		margin: 0;
		font-size: 1.5rem;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}
	.hero-sub {
		margin: 0.25rem 0 0;
		font-size: 0.9375rem;
		opacity: 0.7;
	}
	.cards {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}
	@media (min-width: 720px) {
		.cards {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.card {
		background: #ffffff;
		border: 2px solid #e7e5e4;
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		transition: transform 120ms ease-out, border-color 120ms ease-out;
	}
	:global(.dark) .card {
		background: #1e1e20;
		border-color: #2a2a2e;
	}
	.card-title {
		margin: 0;
		font-size: 1.0625rem;
	}
	.card-blurb {
		margin: 0;
		font-size: 0.85rem;
		opacity: 0.7;
		line-height: 1.5;
		flex: 1;
	}
	.card-count {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		font-weight: 700;
		color: #6d28d9;
	}
	.cta {
		margin-top: 0.5rem;
		min-height: 44px;
		border: none;
		border-radius: 12px;
		background: #6d28d9;
		color: #fff;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		transition: transform 80ms ease-out;
	}
	.cta:not(:disabled):active {
		transform: scale(0.98) translateY(1px);
	}
	.cta:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.cta:focus-visible,
	.stats:focus-visible {
		outline: 2px solid #6d28d9;
		outline-offset: 2px;
	}
	.stats {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
		padding: 0.625rem 0.9rem;
		border: 2px solid #e7e5e4;
		border-radius: 12px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
		text-align: left;
	}
	:global(.dark) .stats {
		border-color: #2a2a2e;
	}
	.stats:hover {
		border-color: #6d28d9;
	}
	.stat strong {
		font-weight: 800;
	}
	.stat-sep {
		opacity: 0.4;
	}
	.stats-go {
		margin-left: auto;
		font-weight: 800;
		color: #6d28d9;
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
	.skeleton {
		gap: 0.625rem;
	}
	.sk-line {
		height: 0.9rem;
		border-radius: 6px;
		background: #e7e5e4;
	}
	:global(.dark) .sk-line {
		background: #2a2a2e;
	}
	.sk-title {
		height: 1.2rem;
		width: 55%;
	}
	.sk-short {
		width: 35%;
	}
	@keyframes home-enter {
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
		.home {
			animation: none;
		}
		.card,
		.cta {
			transition: none;
		}
	}
</style>
