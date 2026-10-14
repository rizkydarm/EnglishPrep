<script lang="ts">
  import { progress, type HistorySession } from "$lib/stores/progress.svelte.js";
  import { srs, todayStr } from "$lib/stores/srs.svelte.js";
  import type { Level } from "$lib/types/schema.js";
  import { buildDayBars } from "$lib/utils/day-bars.js";
import {
    buildReviewSession,
    getDueWords,
    type QueuedItem,
    type SessionItem,
  } from "$lib/utils/review-queue.js";
  import { isMastered } from "$lib/utils/srs.js";
  import { onMount } from "svelte";
  import CalendarXIcon from "@lucide/svelte/icons/calendar-x";
  import HistoryIcon from "@lucide/svelte/icons/history";
  import PlayIcon from "@lucide/svelte/icons/play";
  import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
  import SettingsIcon from "@lucide/svelte/icons/settings";

  export interface ReviewRow {
    id: string;
    label: string;
    detail?: string;
  }

  interface Props {
    /** Vocab bank (id + level) used for the per-level breakdown. */
    words?: { id: string; level: Level }[];
    /** Extra wrong-answer stubs appended after due words in a review session. */
    reviewStubs?: SessionItem[];
    /** Max items in a Start Review session. */
    reviewCount?: number;
    /** Called with the queue built by buildReviewSession (caller starts the quiz). */
    onStartReview?: (queue: QueuedItem<SessionItem>[]) => void;
    /** Called when the user taps Review-wrong on a history session. */
    onReviewWrong?: (session: HistorySession) => void;
    /** Called when the user taps the Settings shortcut (PRD §7.9). */
    onOpenSettings?: () => void;
    /** Map a history session to per-question review rows; falls back to wrong_ids. */
    resolveRows?: (session: HistorySession) => ReviewRow[];
  }

  let {
    words = [],
    reviewStubs = [],
    reviewCount = 10,
    onStartReview,
    onReviewWrong,
    onOpenSettings,
    resolveRows,
  }: Props = $props();

  const LEVELS: Level[] = ["b1-core", "b1-plus", "b2-core", "b2-mastery"];
  const LEVEL_LABEL: Record<Level, string> = {
    "b1-core": "B1 Core",
    "b1-plus": "B1+",
    "b2-core": "B2 Core",
    "b2-mastery": "B2 Mastery",
  };

  // Reactive today: refreshes the 30-day window + due words past midnight.
  let today = $state(todayStr());

  onMount(() => {
    function tick(): void {
      const next = todayStr();
      if (next !== today) today = next;
    }
    const id = setInterval(tick, 30_000);
    function onVisible(): void {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  });

  const dueWords = $derived(getDueWords(srs.entries, today));
  const learningCount = $derived(srs.learningCount);
  const masteredCount = $derived(srs.masteredCount);
  const totalTracked = $derived(srs.size);

  interface LevelRow {
    level: Level;
    label: string;
    bank: number;
    learning: number;
    mastered: number;
  }

  const perLevel = $derived<LevelRow[]>(
    LEVELS.map((level) => {
      const ids = new Set(words.filter((w) => w.level === level).map((w) => w.id));
      let learning = 0;
      let mastered = 0;
      for (const [wordId, state] of Object.entries(srs.entries)) {
        if (!ids.has(wordId)) continue;
        if (isMastered(state)) mastered += 1;
        else learning += 1;
      }
      return { level, label: LEVEL_LABEL[level], bank: ids.size, learning, mastered };
    }),
  );

  const last30 = $derived(buildDayBars(progress.daily, today));

  const maxQuizzes = $derived(Math.max(1, ...last30.map((d) => d.quizzes)));

  const sessions = $derived(
    [...progress.sessions].sort((a, b) => b.date.localeCompare(a.date)),
  );

  let expandedId = $state<string | null>(null);
  let reviewStatus = $state<string | null>(null);
  let wrongStatus = $state<string | null>(null);
  let settingsStatus = $state<string | null>(null);

  function startReview(): void {
    const queue = buildReviewSession(dueWords, reviewStubs, reviewCount);
    if (queue.length === 0) {
      reviewStatus = "Nothing to review right now.";
      return;
    }
    reviewStatus = null;
    onStartReview?.(queue);
    if (!onStartReview) {
      reviewStatus = `Review session ready: ${queue.length} item${queue.length === 1 ? "" : "s"}.`;
    }
  }

  function toggleDetail(id: string): void {
    expandedId = expandedId === id ? null : id;
  }

  function handleReviewWrong(session: HistorySession): void {
    onReviewWrong?.(session);
    wrongStatus = onReviewWrong
      ? null
      : "Review-wrong replay is not wired up in this view.";
  }

  function openSettings(): void {
    onOpenSettings?.();
    settingsStatus = onOpenSettings ? null : "Settings is not available in this view.";
  }

  function rowsFor(session: HistorySession): ReviewRow[] {
    if (resolveRows) return resolveRows(session);
    return session.wrong_ids.map((id) => ({ id, label: id }));
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString();
  }

  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
</script>

<div class="flex flex-col gap-6">
  <!-- Top Bar -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-3xl md:text-4xl font-black tracking-tight">Progress & Mastery</h1>
      <p class="text-muted-foreground font-serif italic text-base mt-1">
        What is due, how mastery is tracking, and past sessions.
      </p>
    </div>
    <button
      type="button"
      class="btn-3d btn-3d-white min-h-[44px] px-4 text-sm font-extrabold"
      onclick={openSettings}
      aria-label="Open settings"
    >
      <SettingsIcon class="size-4" /> Settings
    </button>
  </div>

  {#if settingsStatus}
    <p class="text-muted-foreground text-sm" role="status">{settingsStatus}</p>
  {/if}

  <!-- Top 3 Tactile Cards (Template-Dashboard.html lines 62-66) -->
  <div class="grid md:grid-cols-3 gap-4">
    <!-- Card 1: Kotoba Mastered -->
    <div class="card-3d p-5 flex flex-col justify-between">
      <div>
        <div class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">KOTOBA MASTERED</div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-[40px] font-black leading-none">{masteredCount}</span>
          <span class="badge-pill bg-yellow text-accent-ink border-border-strong font-extrabold text-xs">
            {learningCount} learning
          </span>
        </div>
        <p class="mt-3 text-xs text-muted-foreground font-medium">
          {#each perLevel as row, i}
            <span>{row.label} {row.mastered}</span>{#if i < perLevel.length - 1} • {/if}
          {/each}
        </p>
      </div>
      <div class="mt-4 pt-3 border-t-2 border-border-strong/15 text-xs text-muted-foreground flex justify-between">
        <span>Total tracked:</span>
        <span class="font-extrabold text-foreground">{totalTracked} words</span>
      </div>
    </div>

    <!-- Card 2: Daily Activity Bar Sparkline -->
    <div class="card-3d p-5 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between">
          <div class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">DAILY ACTIVITY</div>
          <span class="badge-pill bg-muted border-border-strong text-[11px]">Last 14 days</span>
        </div>
        <div class="mt-4 flex gap-1.5 items-end h-[64px] px-1" aria-label="Recent daily activity">
          {#each last30.slice(16) as day, idx (day.date)}
            {@const pct = maxQuizzes > 0 ? Math.max(day.quizzes > 0 ? 15 : 6, Math.round((day.quizzes / maxQuizzes) * 100)) : 6}
            {@const color = day.quizzes === 0 ? "var(--muted)" : idx % 3 === 0 ? "var(--primary)" : idx % 3 === 1 ? "var(--secondary)" : "var(--cyan)"}
            <div
              class="flex-1 rounded-t-md border-2 border-border-strong transition-all duration-200"
              style="height: {pct}%; background: {color};"
              title="{day.label}: {day.quizzes} quiz{day.quizzes === 1 ? '' : 'zes'}{day.avg !== null ? `, avg ${day.avg}%` : ''}"
            ></div>
          {/each}
        </div>
      </div>
      <div class="mt-4 pt-3 border-t-2 border-border-strong/15 text-xs text-muted-foreground flex justify-between">
        <span>Busiest day:</span>
        <span class="font-extrabold text-foreground">{maxQuizzes} quiz{maxQuizzes === 1 ? "" : "zes"}</span>
      </div>
    </div>

    <!-- Card 3: SRS Due Today -->
    <div class="card-3d p-5 bg-yellow text-accent-ink border-border-strong flex flex-col justify-between">
      <div>
        <div class="flex justify-between items-center">
          <div class="text-[11px] font-black uppercase tracking-wider">SRS DUE TODAY</div>
          <span class="badge-pill bg-card text-foreground border-border-strong text-[11px]">Leitner</span>
        </div>
        <div class="text-[40px] font-black leading-none mt-2">{dueWords.length}</div>
        <div class="text-[13px] font-bold mt-1">
          {dueWords.length === 0 ? "All caught up! Zero cards due." : "Words need review across boxes."}
        </div>
      </div>
      <div>
        <button
          type="button"
          class="btn-3d w-full min-h-[44px] mt-4 bg-card text-foreground hover:bg-muted border-border-strong text-sm font-extrabold flex items-center justify-center gap-2"
          disabled={dueWords.length === 0 && reviewStubs.length === 0}
          onclick={startReview}
        >
          <PlayIcon class="size-4 fill-current" /> Start Review →
        </button>
        {#if reviewStatus}
          <p class="mt-2 text-xs font-bold text-foreground" role="status">{reviewStatus}</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Mastery By Level -->
  <div class="card-3d p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-black text-xl tracking-tight">Mastery by Level</h2>
      <span class="badge-pill bg-muted border-border-strong text-xs font-bold">
        {words.length === 0 ? "All Levels" : `${totalTracked} tracked words`}
      </span>
    </div>

    <div class="space-y-4">
      {#each perLevel as row, idx (row.level)}
        {@const denom = Math.max(1, row.bank > 0 ? row.bank : row.learning + row.mastered)}
        {@const pct = Math.round((row.mastered / denom) * 100)}
        {@const barColor = idx === 0 ? "var(--primary)" : idx === 1 ? "var(--secondary)" : idx === 2 ? "var(--cyan)" : "var(--yellow)"}
        <div>
          <div class="flex items-center justify-between text-sm font-bold mb-1.5">
            <span class="text-base">{row.label}</span>
            <span class="text-muted-foreground text-xs">
              {row.mastered} mastered · {row.learning} learning{#if row.bank > 0} · {row.bank} total{/if} ({pct}%)
            </span>
          </div>
          <div
            class="h-3 rounded-full bg-muted border-2 border-border-strong overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="{row.label} mastered {pct} percent"
          >
            <div
              class="h-full rounded-full transition-all duration-300"
              style="width: {pct}%; background: {barColor};"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Detailed 30-Day Activity Chart -->
  <div class="card-3d p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-black text-xl tracking-tight">Daily Quiz Frequency (30 Days)</h2>
      <span class="badge-pill bg-muted border-border-strong text-xs font-bold">
        {last30[0].label} – {last30[29].label}
      </span>
    </div>

    {#if last30.every((d) => d.quizzes === 0)}
      <div class="p-8 text-center text-muted-foreground font-medium">
        <CalendarXIcon class="size-8 mx-auto mb-2 opacity-50" />
        No activity recorded yet. Complete a quiz to view your 30-day frequency.
      </div>
    {:else}
      <div class="overflow-x-auto py-2">
        <svg
          viewBox="0 0 600 160"
          class="h-40 w-full min-w-[540px]"
          role="img"
          aria-label="Bar chart of quizzes per day for the last 30 days"
        >
          {#each last30 as day, i (day.date)}
            {@const h = Math.round((day.quizzes / maxQuizzes) * 120)}
            {@const x = 8 + i * 19.5}
            {@const fillColor = day.quizzes > 0 ? (i % 2 === 0 ? "var(--primary)" : "var(--secondary)") : "var(--muted)"}
            <rect
              x={x}
              y={140 - h}
              width={14}
              height={Math.max(day.quizzes > 0 ? 4 : 2, h)}
              rx={3}
              style="fill: {fillColor}; stroke: var(--border-strong); stroke-width: 1.5px;"
            >
              <title>{day.label}: {day.quizzes} quiz{day.quizzes === 1 ? "" : "zes"}{day.avg !== null ? `, avg ${day.avg}%` : ""}</title>
            </rect>
          {/each}
          <line x1={4} y1={140} x2={596} y2={140} style="stroke: var(--border-strong); stroke-width: 2px;" />
        </svg>
      </div>
      <p class="text-xs text-muted-foreground mt-2 font-medium">
        Hover any bar to view date and quiz count. Busiest day: <strong class="text-foreground">{maxQuizzes} quiz{maxQuizzes === 1 ? "" : "zes"}</strong>.
      </p>
    {/if}
  </div>

  <!-- History • Daily Scores (Template-Dashboard.html lines 67-74) -->
  <div class="card-3d p-0 overflow-hidden">
    <div class="p-4 md:p-5 font-black border-b-[2.5px] border-border-strong flex justify-between items-center bg-card">
      <div class="flex items-center gap-2">
        <HistoryIcon class="size-5" />
        <span class="text-lg">History • Daily Scores</span>
      </div>
      <span class="badge-pill bg-muted border-border-strong text-xs font-bold">
        {sessions.length} session{sessions.length === 1 ? "" : "s"}
      </span>
    </div>

    {#if sessions.length === 0}
      <div class="p-8 text-center text-muted-foreground font-medium">
        No quiz history yet. Your finished sessions will appear here.
      </div>
    {:else}
      <div class="divide-y-2 divide-border-strong">
        {#each sessions as session (session.id)}
          {@const expanded = expandedId === session.id}
          {@const rows = expanded ? rowsFor(session) : []}
          <div class="p-4 md:p-5 flex flex-col gap-3 transition-colors hover:bg-muted/40">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-extrabold text-sm">{formatDate(session.date)}</span>
                <span class="badge-pill border-border-strong font-extrabold text-xs uppercase {session.mode === 'reading' ? 'bg-cyan text-accent-ink' : session.mode === 'writing' ? 'bg-yellow text-accent-ink' : 'bg-primary text-primary-foreground'}">
                  {session.mode}
                </span>
                {#each session.levels as level (level)}
                  <span class="badge-pill bg-card border-border-strong text-xs">
                    {LEVEL_LABEL[level] ?? level}
                  </span>
                {/each}
              </div>
              <div class="flex items-center gap-3">
                <span class="badge-pill bg-yellow text-accent-ink border-border-strong font-black text-sm">
                  {session.score_pct === null ? "N/A" : `${session.score_pct}%`}
                </span>
                <span class="text-xs font-bold text-muted-foreground">
                  {session.correct}/{session.total} · {formatDuration(session.duration_sec)}
                </span>
                <button
                  type="button"
                  class="btn-3d btn-3d-white min-h-[36px] px-3 text-xs font-extrabold"
                  aria-expanded={expanded}
                  aria-controls={`history-detail-${session.id}`}
                  onclick={() => toggleDetail(session.id)}
                >
                  {expanded ? "Hide" : "Review"}
                </button>
              </div>
            </div>

            {#if expanded}
              <div
                id={`history-detail-${session.id}`}
                role="region"
                aria-label={`Review of ${formatDate(session.date)} ${session.mode} session`}
                class="mt-2 p-4 rounded-xl border-2 border-border-strong bg-muted/50"
              >
                <div class="font-bold text-sm mb-2">
                  Session Breakdown ({session.correct} of {session.total} correct · {formatDuration(session.duration_sec)})
                </div>
                {#if rows.length === 0}
                  <p class="text-sm text-muted-foreground">
                    {session.wrong_ids.length === 0
                      ? "Perfect session! Nothing wrong to review."
                      : "No detailed question rows available for this past session."}
                  </p>
                {:else}
                  <ul class="space-y-1.5 text-sm">
                    {#each rows as row (row.id)}
                      <li class="flex items-start gap-2">
                        <span class="badge-pill bg-destructive-bg text-destructive-text border-destructive text-[10px] shrink-0 font-extrabold">WRONG</span>
                        <span class="font-bold">{row.label}</span>
                        {#if row.detail}
                          <span class="text-muted-foreground">({row.detail})</span>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}

                <div class="mt-4 flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    class="btn-3d min-h-[38px] px-4 text-xs font-extrabold flex items-center gap-1.5"
                    disabled={session.wrong_ids.length === 0}
                    onclick={() => handleReviewWrong(session)}
                  >
                    <RotateCcwIcon class="size-3.5" />
                    Review Wrong ({session.wrong_ids.length})
                  </button>
                  <button
                    type="button"
                    class="btn-3d btn-3d-white min-h-[38px] px-3 text-xs font-extrabold"
                    onclick={() => toggleDetail(session.id)}
                  >
                    Close
                  </button>
                </div>
                {#if wrongStatus}
                  <p class="text-destructive font-bold text-xs mt-2" role="status">{wrongStatus}</p>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
