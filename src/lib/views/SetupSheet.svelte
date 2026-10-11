<script lang="ts">
	import type { QuizMode } from "$lib/stores/quiz.svelte.js";
	import type { Level } from "$lib/types/schema.js";
	import { LEVELS, LEVEL_LABEL, VOCAB_TYPES, VOCAB_TYPE_LABEL, type SessionSetup } from "$lib/views/session-data.js";

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
				<h2 class="sheet-title">{MODE_TITLE[mode]}</h2>
				<button type="button" class="icon-btn" aria-label="Close setup" onclick={() => onClose?.()}>
					✕
				</button>
			</div>

			{#if available === 0}
				<p class="state" role="status">No content available for this mode yet.</p>
			{:else}
				<div class="group">
					<p class="group-label" id="setup-count-label">
						Questions · <strong>{clamped}</strong>{isClamped ? ` (max ${maxCount} available)` : ""}
					</p>
					<div class="presets" role="group" aria-labelledby="setup-count-label">
						{#each COUNTS as n (n)}
							<button
								type="button"
								class="chip"
								class:chip-active={clamped === Math.min(n, maxCount)}
								aria-pressed={clamped === Math.min(n, maxCount)}
								onclick={() => (count = Math.min(n, maxCount))}
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
					<p class="group-label" id="setup-level-label">Difficulty (multi-select)</p>
					<div class="chips" role="group" aria-labelledby="setup-level-label">
						{#each LEVELS as level (level)}
							<button
								type="button"
								class="chip"
								class:chip-active={levels.includes(level)}
								aria-pressed={levels.includes(level)}
								onclick={() => toggleLevel(level)}
							>{LEVEL_LABEL[level]}</button>
						{/each}
					</div>
					{#if !levelsValid}
						<p class="warn" role="alert">Pick at least one difficulty.</p>
					{/if}
				</div>

				<div class="group">
					<p class="group-label" id="setup-timer-label">Timer per question</p>
					<div class="chips" role="group" aria-labelledby="setup-timer-label">
						{#each TIMERS as t (t.value)}
							<button
								type="button"
								class="chip"
								class:chip-active={timer === t.value}
								aria-pressed={timer === t.value}
								onclick={() => (timer = t.value)}
							>{t.label}</button>
						{/each}
					</div>
					{#if timer > 0}
						<p class="note">Timer expiry auto-submits the question as incorrect.</p>
					{/if}
				</div>

				{#if mode === "vocab"}
					<div class="group">
						<p class="group-label" id="setup-cloze-label">Cloze input mode</p>
						<div class="chips" role="group" aria-labelledby="setup-cloze-label">
							<button
								type="button"
								class="chip"
								class:chip-active={clozeMode === "word_bank"}
								aria-pressed={clozeMode === "word_bank"}
								onclick={() => (clozeMode = "word_bank")}
							>Word bank</button>
							<button
								type="button"
								class="chip"
								class:chip-active={clozeMode === "type"}
								aria-pressed={clozeMode === "type"}
								onclick={() => (clozeMode = "type")}
							>Type answer</button>
						</div>
					</div>

					<div class="group">
						<p class="group-label" id="setup-pair-label">Matching pairs</p>
						<div class="chips" role="group" aria-labelledby="setup-pair-label">
							<button
								type="button"
								class="chip"
								class:chip-active={pairCount === 4}
								aria-pressed={pairCount === 4}
								onclick={() => (pairCount = 4)}
							>4 pairs</button>
							<button
								type="button"
								class="chip"
								class:chip-active={pairCount === 6}
								aria-pressed={pairCount === 6}
								onclick={() => (pairCount = 6)}
							>6 pairs</button>
						</div>
					</div>

					<div class="group">
						<p class="group-label" id="setup-types-label">Question types (at least one)</p>
						<div class="checks" role="group" aria-labelledby="setup-types-label">
							{#each VOCAB_TYPES as t (t)}
								<label class="check">
									<input
										type="checkbox"
										checked={types.includes(t)}
										onchange={() => toggleType(t)}
									/>
									<span>{VOCAB_TYPE_LABEL[t]}</span>
								</label>
							{/each}
						</div>
						{#if !typesValid}
							<p class="warn" role="alert">Keep at least one question type.</p>
						{/if}
					</div>

					<div class="group">
						<label class="check check-row">
							<input
								type="checkbox"
								bind:checked={srsEnabled}
								disabled={srsDue === 0}
							/>
							<span>Include review words (~30% due SRS{srsDue > 0 ? `, ${srsDue} due` : ", none due"})</span>
						</label>
					</div>
				{/if}
			{/if}

			<div class="actions">
				<button type="button" class="btn" onclick={() => onClose?.()}>Cancel</button>
				<button
					type="button"
					class="btn btn-primary"
					disabled={!canStart}
					onclick={start}
				>
					Start quiz · {clamped} question{clamped === 1 ? "" : "s"}
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
		background: rgba(0, 0, 0, 0.45);
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
		max-width: 34rem;
		max-height: 88vh;
		overflow-y: auto;
		background: #ffffff;
		border: 2px solid #e7e5e4;
		border-radius: 16px 16px 0 0;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		animation: sheet-up 250ms ease-out;
	}
	@media (min-width: 720px) {
		.sheet {
			border-radius: 16px;
		}
	}
	:global(.dark) .sheet {
		background: #1e1e20;
		border-color: #2a2a2e;
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.sheet-title {
		margin: 0;
		font-size: 1.125rem;
	}
	.icon-btn {
		min-width: 44px;
		min-height: 44px;
		border: 2px solid #e7e5e4;
		border-radius: 12px;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	:global(.dark) .icon-btn {
		border-color: #2a2a2e;
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.group-label {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
	}
	.presets,
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.chip {
		min-height: 44px;
		min-width: 44px;
		padding: 0.5rem 0.9rem;
		border: 2px solid #e7e5e4;
		border-radius: 12px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		transition: transform 80ms ease-out, border-color 120ms ease-out;
	}
	:global(.dark) .chip {
		border-color: #2a2a2e;
	}
	.chip:not(:disabled):hover {
		border-color: #6d28d9;
	}
	.chip:not(:disabled):active {
		transform: scale(0.98) translateY(1px);
	}
	.chip-active {
		border-color: #6d28d9;
		background: color-mix(in srgb, #6d28d9 10%, transparent);
	}
	.chip:focus-visible,
	.icon-btn:focus-visible,
	.btn:focus-visible,
	.slider:focus-visible,
	.check input:focus-visible {
		outline: 2px solid #6d28d9;
		outline-offset: 2px;
	}
	.slider {
		width: 100%;
		min-height: 44px;
		accent-color: #6d28d9;
	}
	.checks {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-height: 44px;
		font-size: 0.9375rem;
		cursor: pointer;
	}
	.check input {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: #6d28d9;
		flex: none;
	}
	.check-row {
		font-weight: 600;
	}
	.note {
		margin: 0;
		font-size: 0.8rem;
		opacity: 0.65;
	}
	.warn {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		color: #ef4444;
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
		justify-content: flex-end;
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
	.btn-primary {
		background: #6d28d9;
		border-color: #6d28d9;
		color: #fff;
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
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
			transform: translateY(8px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.overlay,
		.sheet {
			animation: none;
		}
		.chip {
			transition: none;
		}
	}
</style>
