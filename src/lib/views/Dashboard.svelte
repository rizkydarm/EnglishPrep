<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { progress, type HistorySession } from "$lib/stores/progress.svelte.js";
  import { srs, todayStr } from "$lib/stores/srs.svelte.js";
  import type { Level } from "$lib/types/schema.js";
  import {
    buildReviewSession,
    getDueWords,
    type QueuedItem,
    type SessionItem,
  } from "$lib/utils/review-queue.js";
  import { isMastered } from "$lib/utils/srs.js";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
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

  // Fresh date on every recompute (no stale-today when left mounted past midnight).
  const dueWords = $derived(getDueWords(srs.entries, todayStr()));
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

  interface DayBar {
    date: string;
    label: string;
    quizzes: number;
    avg: number | null;
  }

  const last30 = $derived.by<DayBar[]>(() => {
    const byDate = new Map(progress.daily.map((d) => [d.date, d]));
    const out: DayBar[] = [];
    const base = new Date(`${todayStr()}T12:00:00`);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(base.getTime() - i * 86_400_000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;
      const entry = byDate.get(key);
      out.push({
        date: key,
        label: `${m}/${day}`,
        quizzes: entry?.quizzes ?? 0,
        avg:
          entry && entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : null,
      });
    }
    return out;
  });

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

<div class="flex flex-col gap-4">
  <div class="flex flex-wrap items-start justify-between gap-2">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p class="text-muted-foreground mt-1 text-sm">Vocabulary mastery, activity, and quiz history.</p>
    </div>
    <Button variant="outline" class="min-h-11" onclick={openSettings} aria-label="Open settings">
      <SettingsIcon data-icon="inline-start" /> Settings
    </Button>
  </div>
  {#if settingsStatus}
    <p class="text-muted-foreground text-sm" role="status">{settingsStatus}</p>
  {/if}

  <!-- Vocabulary overview -->
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-base">Learning</Card.Title>
        <Card.Description>Words in SRS boxes 1–4.</Card.Description>
      </Card.Header>
      <Card.Content>
        <p class="text-3xl font-semibold" aria-label="{learningCount} words learning">{learningCount}</p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-base">Mastered</Card.Title>
        <Card.Description>Words that reached box 5.</Card.Description>
      </Card.Header>
      <Card.Content>
        <p class="text-3xl font-semibold" aria-label="{masteredCount} words mastered">{masteredCount}</p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-base">Due for review</Card.Title>
        <Card.Description>Words due today or overdue.</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="flex flex-wrap items-center gap-3">
          <p class="text-3xl font-semibold" aria-label="{dueWords.length} words due">{dueWords.length}</p>
          <Button
            class="min-h-11"
            disabled={dueWords.length === 0 && reviewStubs.length === 0}
            onclick={startReview}
          >
            <PlayIcon data-icon="inline-start" /> Start Review
          </Button>
        </div>
        {#if reviewStatus}
          <p class="text-muted-foreground mt-2 text-sm" role="status">{reviewStatus}</p>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  {#if dueWords.length === 0 && reviewStubs.length === 0}
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon"><BookOpenIcon /></Empty.Media>
        <Empty.Title>Nothing due for review</Empty.Title>
        <Empty.Description>You are all caught up. New cards become due after quizzes.</Empty.Description>
      </Empty.Header>
    </Empty.Root>
  {/if}

  <!-- Per-level breakdown -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Mastery by level</Card.Title>
      <Card.Description>
        {words.length === 0
          ? "Pass the vocab bank via the words prop for per-level totals."
          : `${totalTracked} tracked word${totalTracked === 1 ? "" : "s"}.`}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="flex flex-col gap-3">
        {#each perLevel as row (row.level)}
          {@const denom = Math.max(1, row.bank > 0 ? row.bank : row.learning + row.mastered)}
          {@const pct = Math.round((row.mastered / denom) * 100)}
          <li>
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="font-medium">{row.label}</span>
              <span class="text-muted-foreground">
                {row.mastered} mastered · {row.learning} learning{#if row.bank > 0} · {row.bank} in bank{/if}
              </span>
            </div>
            <div
              class="bg-muted mt-1 h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label="{row.label} mastered {pct} percent"
            >
              <div class="bg-primary h-full rounded-full" style={`width: ${pct}%`}></div>
            </div>
          </li>
        {/each}
      </ul>
    </Card.Content>
  </Card.Root>

  <!-- 30-day activity -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Last 30 days</Card.Title>
      <Card.Description>Quizzes completed per day; hover a bar for average score.</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if last30.every((d) => d.quizzes === 0)}
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon"><CalendarXIcon /></Empty.Media>
            <Empty.Title>No activity yet</Empty.Title>
            <Empty.Description>Finish a quiz and your daily activity will appear here.</Empty.Description>
          </Empty.Header>
        </Empty.Root>
      {:else}
        <svg
          viewBox="0 0 600 160"
          class="h-40 w-full"
          role="img"
          aria-label="Bar chart of quizzes per day for the last 30 days"
        >
          {#each last30 as day, i (day.date)}
            {@const h = Math.round((day.quizzes / maxQuizzes) * 120)}
            {@const x = 8 + i * 19.5}
            <rect
              x={x}
              y={140 - h}
              width={14}
              height={Math.max(day.quizzes > 0 ? 3 : 1, h)}
              rx={3}
              class={day.quizzes > 0 ? "fill-primary" : "fill-muted"}
            >
              <title>{day.label}: {day.quizzes} quiz{day.quizzes === 1 ? "" : "zes"}{day.avg !== null ? `, avg ${day.avg}%` : ""}</title>
            </rect>
          {/each}
          <line x1={4} y1={140} x2={596} y2={140} class="stroke-border" stroke-width={1} />
        </svg>
        <p class="text-muted-foreground mt-1 text-xs">
          {last30[0].label} – {last30[29].label} · busiest day: {maxQuizzes} quiz{maxQuizzes === 1 ? "" : "zes"}
        </p>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- History -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Quiz history</Card.Title>
      <Card.Description>Tap a row for full answer review.</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if sessions.length === 0}
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon"><HistoryIcon /></Empty.Media>
            <Empty.Title>No quiz history yet</Empty.Title>
            <Empty.Description>Your finished sessions will be listed here with scores and review.</Empty.Description>
          </Empty.Header>
        </Empty.Root>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-muted-foreground border-b text-left">
                <th scope="col" class="py-2 pr-3 font-medium">Date</th>
                <th scope="col" class="py-2 pr-3 font-medium">Mode</th>
                <th scope="col" class="py-2 pr-3 font-medium">Level</th>
                <th scope="col" class="py-2 pr-3 font-medium">Score</th>
                <th scope="col" class="py-2 pr-3 font-medium">Time</th>
                <th scope="col" class="py-2 font-medium"><span class="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody>
              {#each sessions as session (session.id)}
                {@const expanded = expandedId === session.id}
                {@const rows = expanded ? rowsFor(session) : []}
                <tr class="border-b last:border-0">
                  <td class="py-2 pr-3">{formatDate(session.date)}</td>
                  <td class="py-2 pr-3 capitalize">{session.mode}</td>
                  <td class="py-2 pr-3">
                    <span class="flex flex-wrap gap-1">
                      {#each session.levels as level (level)}
                        <Badge variant="secondary">{LEVEL_LABEL[level] ?? level}</Badge>
                      {/each}
                    </span>
                  </td>
                  <td class="py-2 pr-3">{session.correct}/{session.total} ({session.score_pct}%)</td>
                  <td class="py-2 pr-3">{formatDuration(session.duration_sec)}</td>
                  <td class="py-2">
                    <Button
                      variant="outline"
                      size="sm"
                      class="min-h-11"
                      aria-expanded={expanded}
                      aria-controls={`history-detail-${session.id}`}
                      onclick={() => toggleDetail(session.id)}
                    >
                      {expanded ? "Hide" : "Review"}
                    </Button>
                  </td>
                </tr>
                {#if expanded}
                  <tr>
                    <td colspan={6} class="pb-3">
                      <div
                        id={`history-detail-${session.id}`}
                        role="region"
                        aria-label={`Review of ${formatDate(session.date)} ${session.mode} session`}
                        class="bg-muted/50 rounded-xl border p-3"
                      >
                        <p class="text-sm font-medium">
                          {session.correct} of {session.total} correct · {formatDuration(session.duration_sec)}
                        </p>
                        {#if rows.length === 0}
                          <p class="text-muted-foreground mt-1 text-sm">
                            {session.wrong_ids.length === 0
                              ? "Perfect session — nothing to review."
                              : "No review details available for this session."}
                          </p>
                        {:else}
                          <ul class="mt-2 flex flex-col gap-1">
                            {#each rows as row (row.id)}
                              <li class="text-sm">
                                <span class="font-medium">{row.label}</span>
                                {#if row.detail}
                                  <span class="text-muted-foreground"> — {row.detail}</span>
                                {/if}
                              </li>
                            {/each}
                          </ul>
                        {/if}
                        <div class="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            class="min-h-11"
                            disabled={session.wrong_ids.length === 0}
                            onclick={() => handleReviewWrong(session)}
                          >
                            <RotateCcwIcon data-icon="inline-start" />
                            Review wrong ({session.wrong_ids.length})
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            class="min-h-11"
                            onclick={() => toggleDetail(session.id)}
                          >
                            Close
                          </Button>
                        </div>
                        {#if wrongStatus}
                          <p class="text-muted-foreground mt-2 text-sm" role="status">{wrongStatus}</p>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
