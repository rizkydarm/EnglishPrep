<script lang="ts">
	import type { QuizMode } from "$lib/stores/quiz.svelte.js";
	import type { Level } from "$lib/types/schema.js";
	import { LEVELS, LEVEL_LABEL, VOCAB_TYPES, VOCAB_TYPE_LABEL, type SessionSetup } from "$lib/views/session-data.js";
	import { toggleVariants } from "$lib/components/ui/toggle/index.js";
	import { Switch } from "$lib/components/ui/switch/index.js";

	interface Defaults {
		count: number;
		levels: Level[];
		timer: 0 | 15 | 30 | 60;
	}

	interface Props {
		open: boolean;
		mode: QuizMode | null;
		/** Total items available for the mode (setup clamps the count to this). */
		available: number;
		/** Due SRS words (vocab only; enables the review toggle). */
		srsDue?: number;
		defaults?: Defaults;
		onClose?: () => void;
		onStart?: (setup: SessionSetup) => void;
	}

	let {
		open,
		mode,
		available,
		srsDue = 0,
		defaults = { count: 10, levels: ["b2-core"], timer: 0 },
		onClose,
		onStart,
	}: Props = $props();

	const COUNTS = [5, 10, 15, 20, 30];
	const TIMERS: { value: 0 | 15 | 30 | 60; label: string }[] = [
		{ value: 0, label: "Off" },
		{ value: 15, label: "15s" },
		{ value: 30, label: "30s" },
		{ value: 60, label: "60s" },
	];
	const MODE_TITLE: Record<QuizMode, string> = {
		vocab: "Vocabulary drill",
		reading: "Reading drill",
		writing: "Writing drill",
	};

	let count = $state(10);
	let levels = $state<Level[]>(["b2-core"]);
	let timer = $state<0 | 15 | 30 | 60>(0);
	let clozeMode = $state<"type" | "word_bank">("word_bank");
	let pairCount = $state<4 | 6>(4);
	let types = $state([...VOCAB_TYPES]);
	let srsEnabled = $state(true);

	// Reset to defaults every time the sheet opens.
	let lastOpen = $state(false);
	$effect(() => {
		if (open && !lastOpen) {
			count = defaults.count;
			levels = [...defaults.levels];
			timer = defaults.timer;
			clozeMode = "word_bank";
			pairCount = 4;
			types = [...VOCAB_TYPES];
			srsEnabled = true;
		}
		lastOpen = open;
	});

	const maxCount = $derived(Math.max(1, Math.min(30, available)));
	const clamped = $derived(Math.max(1, Math.min(count, maxCount)));
	const isClamped = $derived(count > maxCount);
	const levelsValid = $derived(levels.length >= 1);
	const typesValid = $derived(mode !== "vocab" || types.length >= 1);
	const canStart = $derived(open && mode !== null && levelsValid && typesValid && available > 0);

	function toggleLevel(level: Level): void {
		if (levels.includes(level)) {
			if (levels.length > 1) levels = levels.filter((l) => l !== level);
		} else {
			levels = [...levels, level];
		}
	}

	function toggleType(t: (typeof VOCAB_TYPES)[number]): void {
		if (types.includes(t)) {
			if (types.length > 1) types = types.filter((x) => x !== t);
		} else {
			types = [...types, t];
		}
	}

	function start(): void {
		if (!canStart || mode === null) return;
		onStart?.({
			mode,
			count: clamped,
			levels: [...levels],
			timerPerQ: timer,
			clozeMode,
			pairCount,
			types: [...types],
			srsEnabled: mode === "vocab" && srsEnabled,
		});
	}

	function onKeydown(e: KeyboardEvent): void {
		if (!open) return;
		if (e.key === "Escape") {
			e.preventDefault();
			onClose?.();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open && mode !== null}
	<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
		<div
			class="sheet"
			role="dialog"
			aria-modal="true"
			aria-label="Setup: {MODE_TITLE[mode]}"
		>
			<div class="sheet-head">
				<div>
					<h2 class="sheet-title">{MODE_TITLE[mode]}</h2>
					<p class="text-xs text-muted-foreground font-serif italic mt-0.5">Customize your practice session parameters</p>
				</div>
				<button type="button" class="icon-btn" aria-label="Close setup" onclick={() => onClose?.()}>
					✕
				</button>
			</div>

			{#if available === 0}
				<div class="state" role="status">No content available for this mode yet.</div>
			{:else}
				<div class="group">
					<p class="group-label" id="setup-count-label">
						Questions: <span class="badge-pill bg-yellow text-accent-ink ml-1">{clamped}</span>{isClamped ? ` (max ${maxCount} available)` : ""}
					</p>
					<div class="flex flex-wrap gap-2" role="group" aria-labelledby="setup-count-label">
						{#each COUNTS as n (n)}
							<button
								type="button"
								aria-pressed={clamped === Math.min(n, maxCount)}
								onclick={() => (count = Math.min(n, maxCount))}
								class={toggleVariants()}
							>{n}</button>
						{/each}
					</div>
					<input
						type="range"
						class="slider"
						min={1}
						max={maxCount}
						step={1}
						bind:value={count}
						aria-label="Number of questions"
					/>
				</div>

				<div class="group">
					<p class="group-label" id="setup-level-label">Difficulty (CEFR Level)</p>
					<div class="flex flex-wrap gap-2" role="group" aria-labelledby="setup-level-label">
						{#each LEVELS as level (level)}
							<button
								type="button"
								aria-pressed={levels.includes(level)}
								onclick={() => toggleLevel(level)}
								class={toggleVariants()}
							>{LEVEL_LABEL[level]}</button>
						{/each}
					</div>
					{#if !levelsValid}
						<p class="warn" role="alert">Pick at least one difficulty.</p>
					{/if}
				</div>

				<div class="group">
					<p class="group-label" id="setup-timer-label">Timer per question</p>
					<div class="flex flex-wrap gap-2" role="group" aria-labelledby="setup-timer-label">
						{#each TIMERS as t (t.value)}
							<button
								type="button"
								aria-pressed={timer === t.value}
								onclick={() => (timer = t.value)}
								class={toggleVariants()}
							>{t.label}</button>
						{/each}
					</div>
					{#if timer > 0}
						<p class="note">Timer expiry auto-submits question as incorrect.</p>
					{/if}
				</div>

				{#if mode === "vocab"}
					<div class="group">
						<p class="group-label" id="setup-cloze-label">Cloze input mode</p>
						<div class="flex flex-wrap gap-2" role="group" aria-labelledby="setup-cloze-label">
							<button
								type="button"
								aria-pressed={clozeMode === "word_bank"}
								onclick={() => (clozeMode = "word_bank")}
								class={toggleVariants()}
							>Word bank</button>
							<button
								type="button"
								aria-pressed={clozeMode === "type"}
								onclick={() => (clozeMode = "type")}
								class={toggleVariants()}
							>Type answer</button>
						</div>
					</div>

					<div class="group">
						<p class="group-label" id="setup-pair-label">Matching pairs</p>
						<div class="flex flex-wrap gap-2" role="group" aria-labelledby="setup-pair-label">
							<button
								type="button"
								aria-pressed={pairCount === 4}
								onclick={() => (pairCount = 4)}
								class={toggleVariants()}
							>4 pairs</button>
							<button
								type="button"
								aria-pressed={pairCount === 6}
								onclick={() => (pairCount = 6)}
								class={toggleVariants()}
							>6 pairs</button>
						</div>
					</div>

					<div class="group">
						<p class="group-label" id="setup-types-label">Question types</p>
						<div class="flex flex-wrap gap-2" role="group" aria-labelledby="setup-types-label">
							{#each VOCAB_TYPES as t (t)}
								<button
									type="button"
									aria-pressed={types.includes(t)}
									onclick={() => toggleType(t)}
									class={toggleVariants()}
								>{VOCAB_TYPE_LABEL[t]}</button>
							{/each}
						</div>
						{#if !typesValid}
							<p class="warn" role="alert">Keep at least one question type.</p>
						{/if}
					</div>

					<div class="group">
						<div
							class="flex items-center justify-between gap-4 rounded-xl border-2 border-border-strong bg-muted/40 p-3"
						>
							<span class="text-sm font-bold"
								>Include SRS review words (~30%{srsDue > 0
									? `, ${srsDue} due today`
									: ", none due"})</span
							>
							<Switch
								bind:checked={srsEnabled}
								disabled={srsDue === 0}
								aria-label="Include SRS review words"
							/>
						</div>
					</div>
				{/if}
			{/if}

			<div class="actions pt-3 border-t-2 border-border-strong">
				<button type="button" class="btn-3d btn-3d-white min-h-[48px] px-5 text-sm font-extrabold" onclick={() => onClose?.()}>Cancel</button>
				<button
					type="button"
					class="btn-3d min-h-[48px] px-6 text-sm font-extrabold flex-1"
					disabled={!canStart}
					onclick={start}
				>
					Start Drill · {clamped} question{clamped === 1 ? "" : "s"} →
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(2px);
		animation: fade-in 200ms ease-out;
	}
	@media (min-width: 720px) {
		.overlay {
			align-items: center;
			padding: 1.5rem;
		}
	}
	.sheet {
		width: 100%;
		max-width: 36rem;
		max-height: 88vh;
		overflow-y: auto;
		background: var(--card);
		border: 2.5px solid var(--border-strong);
		border-radius: 24px 24px 0 0;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		box-shadow: var(--shadow-3d-lg);
		animation: sheet-up 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@media (min-width: 720px) {
		.sheet {
			border-radius: 24px;
		}
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 2px solid var(--border-strong);
		padding-bottom: 0.75rem;
	}
	.sheet-title {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: -0.01em;
	}
	.icon-btn {
		min-width: 40px;
		min-height: 40px;
		border: 2px solid var(--border-strong);
		border-radius: 12px;
		background: var(--card);
		box-shadow: 0 3px 0 0 var(--border-strong);
		color: inherit;
		font-weight: 800;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}
	.icon-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 0 0 var(--border-strong);
	}
	.icon-btn:active {
		transform: translateY(2px);
		box-shadow: 0 1px 0 0 var(--border-strong);
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.group-label {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 800;
	}
	.icon-btn:focus-visible,
	.slider:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.slider {
		width: 100%;
		min-height: 40px;
		accent-color: var(--primary);
	}
	.note {
		margin: 0;
		font-size: 0.8rem;
		color: var(--muted-foreground);
	}
	.warn {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 800;
		color: var(--destructive);
	}
	.state {
		margin: 0;
		padding: 1.25rem;
		border: 2px dashed var(--border-strong);
		border-radius: 16px;
		text-align: center;
		font-weight: 600;
	}
	.actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes sheet-up {
		from {
			transform: translateY(12px) scale(0.98);
			opacity: 0;
		}
		to {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.overlay,
		.sheet {
			animation: none;
		}
		.icon-btn {
			transition: none;
		}
	}
</style>
