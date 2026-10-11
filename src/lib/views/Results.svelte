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
					color: i % 3 === 0 ? "var(--success)" : i % 3 === 1 ? "var(--primary)" : "var(--warn)",
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

	const scoreLabel = $derived(summary.scorePct === null ? "N/A" : `${summary.scorePct}%`);
	const headline = $derived(
		summary.scorePct === null
			? "Self-assessed, no auto score"
			: summary.scorePct >= 80
				? "Excellent!"
				: summary.scorePct >= 60
					? "Good effort!"
					: "Keep practicing!",
	);
</script>

<svelte:window onkeydown={onKeydown} />

<section class="results space-y-8" aria-label="Quiz results">
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

	<!-- Result Summary Top -->
	<div class="grid md:grid-cols-[.9fr_1.1fr] gap-6 items-center">
		<div class="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
			<div
				class="score-ring"
				role="img"
				aria-label={summary.scorePct === null ? "No auto score" : `Score ${summary.scorePct} percent`}
			>
				{scoreLabel}
			</div>
			<div>
				<h1 class="text-3xl md:text-4xl font-black tracking-tight leading-tight">
					{headline}
				</h1>
				<p class="font-serif italic text-muted-foreground mt-2 text-base">
					You got {summary.correctCount}/{summary.autoTotalCount} correct in {MODE_LABEL[summary.mode]} Drill
					{#if summary.excludedCount > 0}· {summary.excludedCount} self-assessed{/if}
				</p>
			</div>
			<div class="flex flex-wrap gap-2 justify-center md:justify-start">
				<span class="badge-pill bg-yellow text-accent-ink border-border-strong font-extrabold">
					+{summary.correctCount} correct
				</span>
				{#if summary.wrongCount > 0}
					<span class="badge-pill bg-card text-foreground border-border-strong font-extrabold">
						{summary.wrongCount} wrong → SRS
					</span>
				{/if}
				<span class="badge-pill bg-card text-foreground border-border-strong font-extrabold">
					⏱ {fmtDuration(summary.durationSec)}
				</span>
			</div>
			<div class="flex flex-wrap gap-3 mt-2 w-full">
				<button
					type="button"
					class="btn-3d flex-1 min-h-[50px] px-4 text-sm font-extrabold"
					disabled={summary.wrongIds.length === 0}
					onclick={() => onReviewWrong?.()}
				>
					Review Wrong Answers{summary.wrongIds.length > 0 ? ` (${summary.wrongIds.length})` : ""} →
				</button>
				<button
					type="button"
					class="btn-3d btn-3d-white flex-1 min-h-[50px] px-4 text-sm font-extrabold"
					onclick={() => onNewQuiz?.()}
				>
					New Quiz
				</button>
				<button
					type="button"
					class="btn-3d btn-3d-white min-h-[50px] px-5 text-sm font-extrabold"
					onclick={() => onHome?.()}
				>
					Dashboard
				</button>
			</div>
		</div>

		<!-- Breakdown Card -->
		<div class="card-3d p-6">
			<div class="font-extrabold text-base flex justify-between items-center">
				<span>Breakdown</span>
				<span class="badge-pill border-border-strong text-xs {summary.mode === 'reading' ? 'bg-cyan text-accent-ink' : summary.mode === 'writing' ? 'bg-yellow text-accent-ink' : 'bg-primary text-primary-foreground'}">
					{MODE_LABEL[summary.mode]}
				</span>
			</div>
			{#if groups.length > 0}
				<div class="mt-4 space-y-3.5">
					{#each groups as g, idx (g.label)}
						{@const pct = g.total > 0 ? Math.round((g.earned / g.total) * 100) : 0}
						{@const barColor = idx % 3 === 0 ? "var(--primary)" : idx % 3 === 1 ? "var(--secondary)" : "var(--cyan)"}
						<div>
							<div class="flex justify-between text-xs font-bold mb-1.5">
								<span>{g.label}</span>
								<span class="text-foreground/80">{g.earned}/{g.total} ({pct}%)</span>
							</div>
							<div
								class="h-2.5 rounded-full bg-muted border-2 border-border-strong overflow-hidden"
								role="img"
								aria-label="{g.label}: {pct} percent"
							>
								<div
									class="h-full rounded-full transition-all duration-300"
									style="width: {pct}%; background: {barColor};"
								></div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground mt-4 italic">No auto-scored items to break down.</p>
			{/if}

			{#if summary.srsUpdates && summary.srsUpdates.length > 0}
				<div class="mt-5 p-4 rounded-xl border-2 border-border-strong bg-yellow text-accent-ink shadow-sm">
					<div class="text-[11px] font-black tracking-wider uppercase">SPACED REPETITION</div>
					<div class="text-[13px] font-bold mt-1">
						{summary.srsUpdates.length} words updated in Leitner schedule:
						<span class="underline">
							{summary.srsUpdates.map(u => u.wordId).slice(0, 5).join(", ")}{summary.srsUpdates.length > 5 ? "..." : ""}
						</span>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Self-assessed (Writing) -->
	{#if summary.selfAssessed.length > 0}
		<div class="mt-8">
			<h2 class="font-black text-xl tracking-tight mb-4">Self-Assessed Writing</h2>
			<div class="grid md:grid-cols-2 gap-4">
				{#each summary.selfAssessed as s (s.promptId)}
					<div class="card-3d p-5 flex flex-col justify-between">
						<div>
							<div class="flex justify-between items-center mb-2">
								<span class="badge-pill bg-muted border-border-strong">{s.label}</span>
								<span class="badge-pill bg-yellow text-accent-ink border-border-strong font-extrabold">
									{s.selfScore > 0 ? `Score: ${s.selfScore}/${s.selfMax}` : "Not scored"}
								</span>
							</div>
							<p class="font-serif italic text-sm text-foreground/90 whitespace-pre-wrap">{s.userText}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Review Answers List -->
	<div class="mt-8">
		<div class="flex items-center justify-between mb-4">
			<h2 class="font-black text-xl tracking-tight">Answer Review</h2>
			<span class="text-xs font-bold text-muted-foreground">{summary.entries.length} questions recorded</span>
		</div>

		{#if summary.entries.length === 0}
			<div class="card-3d p-6 text-center text-muted-foreground font-medium">
				No answers recorded in this session.
			</div>
		{:else}
			<div class="grid md:grid-cols-2 gap-4">
				{#each summary.entries as e (e.itemId)}
					{@const isCorrect = !e.excluded && e.earned >= 0.999}
					{@const isWrong = !e.excluded && e.earned < 0.999}
					<div class="card-3d p-5 flex flex-col justify-between" class:border-destructive={isWrong}>
						<div>
							<div class="flex justify-between items-center gap-2">
								<span class="badge-pill bg-cyan/25 border-border-strong text-foreground font-extrabold text-xs">
									{e.typeLabel}
								</span>
								{#if e.excluded}
									<span class="badge-pill bg-yellow text-accent-ink border-border-strong font-extrabold">
										Self-assessed
									</span>
								{:else if isCorrect}
									<span class="badge-pill bg-success-bg text-success-text border-success font-extrabold">
										CORRECT ✓
									</span>
								{:else}
									<span class="badge-pill bg-destructive-bg text-destructive-text border-destructive font-extrabold">
										WRONG ✗
									</span>
								{/if}
							</div>

							<div class="mt-3 text-sm">
								<div class="text-xs text-muted-foreground font-semibold">Your answer:</div>
								<div class="font-bold text-foreground mt-0.5" class:line-through={isWrong}>
									{e.userText || "(No answer)"}
								</div>
							</div>

							{#if !e.excluded && isWrong}
								<div class="mt-2 text-sm">
									<div class="text-xs text-muted-foreground font-semibold">Correct answer:</div>
									<div class="font-extrabold text-primary mt-0.5">
										{e.correctText}
									</div>
								</div>
							{/if}

							{#if e.definition_id}
								<div class="font-serif italic mt-3 p-3 rounded-xl bg-muted/60 border-2 border-border-strong text-xs text-foreground/90">
									<span class="font-sans font-bold not-italic text-primary block mb-0.5 text-[11px] uppercase tracking-wider">Definisi / Arti:</span>
									{e.definition_id}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style>
	.results {
		position: relative;
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
		z-index: 20;
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
	}
</style>
