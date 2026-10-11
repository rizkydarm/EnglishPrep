<script lang="ts">
	import type { QuizMode } from "$lib/stores/quiz.svelte.js";
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import NewspaperIcon from "@lucide/svelte/icons/newspaper";
	import PenLineIcon from "@lucide/svelte/icons/pen-line";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import AwardIcon from "@lucide/svelte/icons/award";
	import BarChart3Icon from "@lucide/svelte/icons/bar-chart-3";

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

	const empty = $derived(!loading && !error && vocabCount + readingCount + writingCount === 0);
	const vocabPercent = $derived(
		vocabCount > 0 ? Math.min(100, Math.round((mastered / vocabCount) * 100)) : 0,
	);
</script>

<div class="home flex flex-col gap-8 pb-10" aria-label="Home">
	<!-- Hero Section (Template-Homepage.html) -->
	<section class="grid items-center gap-8 md:grid-cols-[1.2fr_.8fr]">
		<div>
			<div class="mb-3 inline-flex items-center gap-2">
				<span class="badge-pill bg-yellow text-accent-ink">
					<SparklesIcon class="size-3.5" /> CEFR B1–B2
				</span>
			</div>
			<h1 class="text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl lg:text-[42px]">
				What do you want to<br />
				<span class="text-primary">master today?</span>
			</h1>
			<p class="font-serif mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
				Focused offline drills for CEFR B1 Core to B2 Mastery. No streak pressure, no hearts, just real deliberate practice.
			</p>
			<div class="mt-6 flex flex-wrap gap-3">
				<button
					type="button"
					class="btn-3d px-6 text-base"
					onclick={() => onStart?.("vocab")}
					disabled={vocabCount === 0}
				>
					Start Vocab Drill →
				</button>
				<button
					type="button"
					class="btn-3d btn-3d-white px-6 text-base"
					onclick={() => onOpenDashboard?.()}
				>
					<BarChart3Icon class="size-5" />
					View Dashboard
				</button>
			</div>
		</div>

		<!-- Daily Tip Card with subtle rotation -->
		<div class="hidden md:block">
			<div class="mode-card rotate-[-2deg] bg-yellow p-5 text-accent-ink shadow-[0_6px_0_var(--border-strong)]">
				<div class="flex items-center justify-between text-xs font-black tracking-wider text-accent-ink/70">
					<span>DAILY TIP</span>
					<AwardIcon class="size-4" />
				</div>
				<p class="font-serif mt-2.5 text-[16px] leading-snug font-medium text-accent-ink">
					B2 Mastery words are 70% collocations. Learn <span class="font-bold underline decoration-2">accomplish a task</span> rather than just isolated definitions.
				</p>
				<div class="mt-3 flex items-center gap-2 text-xs font-bold text-accent-ink">
					<span class="badge-pill bg-white text-accent-ink border-border-strong">IELTS Band 6.5+</span>
					<span class="badge-pill bg-white text-accent-ink border-border-strong">TOEIC 750+</span>
				</div>
			</div>
		</div>
	</section>

	{#if loading}
		<div class="grid gap-6 md:grid-cols-3" aria-label="Loading practice modes">
			{#each [0, 1, 2] as i (i)}
				<div class="card-3d p-6 animate-pulse" role="status">
					<div class="bg-muted mb-4 size-14 rounded-2xl"></div>
					<div class="bg-muted mb-2 h-6 w-3/4 rounded-lg"></div>
					<div class="bg-muted h-4 w-full rounded"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div role="alert" class="card-3d border-destructive bg-destructive/10 p-5 text-sm font-semibold text-destructive">
			{error}
		</div>
	{:else if empty}
		<div role="status" class="card-3d border-dashed p-8 text-center text-muted-foreground">
			No practice content found. Verify your content directory and tap Reload in Settings.
		</div>
	{:else}
		<!-- Mode Cards (Template-Homepage.html Hybrid) -->
		<section class="grid gap-6 md:grid-cols-3">
			<!-- 1. Vocabulary Drill -->
			<article class="mode-card flex flex-col p-6">
				<div class="flex items-start justify-between">
					<div class="flex size-14 items-center justify-center rounded-2xl border-2 border-border-strong bg-primary text-primary-foreground shadow-[0_3px_0_var(--border-strong)]">
						<BookOpenIcon class="size-7" />
					</div>
					<span class="badge-pill bg-card text-foreground">
						{vocabCount} words
					</span>
				</div>
				<h2 class="mt-5 text-2xl font-extrabold tracking-tight">Vocab Drill</h2>
				<p class="mt-1 text-sm leading-snug text-muted-foreground">
					MCQ · True/False · Tap-to-Pair · Cloze typing & word bank
				</p>
				<div class="mt-5">
					<div class="flex items-center justify-between text-xs font-bold">
						<span>Mastery progress</span>
						<span class="text-primary">{vocabPercent}%</span>
					</div>
					<div class="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-border-strong bg-muted dark:bg-card">
						<div
							class="h-full bg-primary transition-all duration-300"
							style="width: {vocabPercent}%;"
						></div>
					</div>
					<p class="mt-1 text-xs font-bold text-muted-foreground">
						{mastered} of {vocabCount} words in Box 5
					</p>
				</div>
				<button
					type="button"
					class="btn-3d mt-5 w-full text-base"
					disabled={vocabCount === 0}
					onclick={() => onStart?.("vocab")}
				>
					Start Vocab →
				</button>
			</article>

			<!-- 2. Reading Drill -->
			<article class="mode-card flex flex-col p-6">
				<div class="flex items-start justify-between">
					<div class="flex size-14 items-center justify-center rounded-2xl border-2 border-border-strong bg-primary text-primary-foreground shadow-[0_3px_0_var(--border-strong)]">
						<NewspaperIcon class="size-7" />
					</div>
					<span class="badge-pill bg-card text-foreground">
						{readingCount} questions
					</span>
				</div>
				<h2 class="mt-5 text-2xl font-extrabold tracking-tight">Reading</h2>
				<p class="mt-1 text-sm leading-snug text-muted-foreground">
					Gap insertion · Sentence tap highlight · Main idea · Best title
				</p>
				<div class="mt-5 flex flex-wrap gap-2">
					<span class="badge-pill bg-card text-foreground">B2 Core</span>
					<span class="badge-pill bg-card text-foreground">280–350 words</span>
					<span class="badge-pill bg-card text-foreground">Tap-to-select</span>
				</div>
				<button
					type="button"
					class="btn-3d mt-5 w-full text-base"
					disabled={readingCount === 0}
					onclick={() => onStart?.("reading")}
				>
					Start Reading →
				</button>
			</article>

			<!-- 3. Writing Drill -->
			<article class="mode-card flex flex-col p-6">
				<div class="flex items-start justify-between">
					<div class="flex size-14 items-center justify-center rounded-2xl border-2 border-border-strong bg-primary text-primary-foreground shadow-[0_3px_0_var(--border-strong)]">
						<PenLineIcon class="size-7" />
					</div>
					<span class="badge-pill bg-card text-foreground">
						{writingCount} prompts
					</span>
				</div>
				<h2 class="mt-5 text-2xl font-extrabold tracking-tight">Writing</h2>
				<p class="mt-1 text-sm leading-snug text-muted-foreground">
					Sentence order · Grammar fix · Image description self-score
				</p>
				<div class="mt-4 rounded-xl border-2 border-border-strong bg-muted p-3">
					<span class="text-[10px] font-black uppercase tracking-wider opacity-70">Example format</span>
					<p class="font-serif mt-1 text-xs font-semibold">
						"Despite the challenges, the project was delivered."
					</p>
				</div>
				<button
					type="button"
					class="btn-3d mt-5 w-full text-base"
					disabled={writingCount === 0}
					onclick={() => onStart?.("writing")}
				>
					Start Writing →
				</button>
			</article>
		</section>
	{/if}

	<!-- Quick Activity Banner (Template-Homepage.html) -->
	<button
		type="button"
		class="card-3d flex w-full cursor-pointer flex-wrap items-center justify-between gap-4 p-5 text-left transition-transform hover:translate-y-[-2px] active:translate-y-0"
		onclick={() => onOpenDashboard?.()}
		aria-label="Today's activity summary: {mastered} words mastered, {quizzesToday} quizzes today, {avgScore}% average score. Click to open dashboard."
	>
		<div class="flex flex-wrap items-center gap-3">
			<span class="badge-pill bg-yellow text-accent-ink">
				TODAY
			</span>
			<span class="font-bold">
				<strong>{quizzesToday}</strong> quizzes completed
			</span>
			<span class="text-muted-foreground">·</span>
			<span class="font-bold">
				<strong>{avgScore}%</strong> average score
			</span>
			<span class="text-muted-foreground">·</span>
			<span class="font-bold text-primary">
				<strong>{mastered}</strong> mastered
			</span>
		</div>
		<div class="inline-flex items-center gap-2 font-bold text-primary">
			<span>Open full dashboard</span>
			<ArrowRightIcon class="size-4" />
		</div>
	</button>
</div>

<style>
	.home {
		animation: home-enter 200ms ease-out;
	}
	@keyframes home-enter {
		from {
			transform: translateY(6px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>
