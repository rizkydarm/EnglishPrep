<script lang="ts">
  import { onMount } from "svelte";
  import type { Component } from "svelte";
  import { ModeWatcher, setMode } from "mode-watcher";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import { VIEW_TITLE, type View } from "$lib/data/modules.js";
  import Home from "$lib/views/Home.svelte";
  import SetupSheet from "$lib/views/SetupSheet.svelte";
  import QuizShell from "$lib/views/QuizShell.svelte";
  import Results from "$lib/views/Results.svelte";
  import Dashboard from "$lib/views/Dashboard.svelte";
  import type { QuizMode } from "$lib/stores/quiz.svelte.js";
  import { settings, type Appearance } from "$lib/stores/settings.svelte.js";
  import { progress } from "$lib/stores/progress.svelte.js";
  import { srs, todayStr } from "$lib/stores/srs.svelte.js";
  import type { Level } from "$lib/types/schema.js";
  import { loadContentFiles } from "$lib/content-loader/source.js";
  import {
    buildSession,
    buildWrongSession,
    buildWrongSessionFromHistory,
    countReadingQuestions,
    parseContentBundle,
    resolveHistoryRows,
    type ContentBundle,
    type QuizItem,
    type SessionSetup,
    type SessionSummary,
  } from "$lib/views/session-data.js";

  let view = $state<View>("dashboard");
  let settingsViewComponent = $state<Component | null>(null);
  let settingsViewLoading = $state(false);
  let settingsViewLoadError = $state(false);
  let settingsViewPromise: Promise<void> | null = null;

  function preloadSettingsView(): Promise<void> {
    if (settingsViewComponent) return Promise.resolve();
    if (settingsViewPromise) return settingsViewPromise;

    settingsViewLoading = true;
    settingsViewLoadError = false;
    settingsViewPromise = import("$lib/views/SettingsView.svelte")
      .then(({ default: component }) => {
        settingsViewComponent = component;
      })
      .catch(() => {
        settingsViewLoadError = true;
        settingsViewPromise = null;
      })
      .finally(() => {
        settingsViewLoading = false;
      });
    return settingsViewPromise;
  }

  function prefetchView(next: View): void {
    if (next === "settings") void preloadSettingsView();
  }

  // Apply the persisted appearance once, and on real change only. Guarded so opening a
  // view never re-applies the theme — that redundant restyle made Settings feel slow.
  let appliedAppearance: Appearance | null = null;
  $effect(() => {
    if (!settings.loaded) return;
    if (appliedAppearance === settings.appearance) return;
    appliedAppearance = settings.appearance;
    setMode(settings.appearance);
  });

  function navigate(next: View) {
    view = next;
    prefetchView(next);
  }

  // ---- Epic 4 session flow (T-018): Home → Setup → Quiz → Results ----
  let bundle = $state<ContentBundle | null>(null);
  let contentError = $state<string | null>(null);
  let contentToast = $state<string | null>(null);
  let setupMode = $state<QuizMode | null>(null);
  let stage = $state<"idle" | "quiz" | "results">("idle");
  let activeItems = $state<QuizItem[]>([]);
  let activeLevels = $state<Level[]>([]);
  let activeTimer = $state<0 | 15 | 30 | 60>(0);
  let activeMode = $state<QuizMode>("vocab");
  let summary = $state<SessionSummary | null>(null);
  let quizRunId = $state(0);

  const todayUtc = () => new Date().toISOString().slice(0, 10);
  const vocabCount = $derived(bundle?.vocab.length ?? 0);
  const readingCount = $derived(bundle ? countReadingQuestions(bundle) : 0);
  const writingCount = $derived(bundle?.prompts.length ?? 0);
  const mastered = $derived(srs.masteredCount);
  const quizzesToday = $derived(progress.daily.find((d) => d.date === todayUtc())?.quizzes ?? 0);
  const avgScore = $derived.by(() => {
    const scored = progress.sessions.filter((s) => s.score_pct !== null);
    return scored.length === 0
      ? 0
      : Math.round(scored.reduce((n, s) => n + (s.score_pct ?? 0), 0) / scored.length);
  });
  const definitionByWordId = $derived<Record<string, string>>(
    Object.fromEntries((bundle?.vocab ?? []).map((v) => [v.id, v.definition_id])),
  );
  const contentLoading = $derived(bundle === null && contentError === null);

  function skippedToast(skipped: { file: string; reason: string }[]): string | null {
    return skipped.length > 0
      ? `${skipped.length} content file(s) skipped: ${skipped.map((s) => `${s.file} (${s.reason})`).join("; ")}`
      : null;
  }

  async function loadContent(): Promise<void> {
    const result = await loadContentFiles();
    const parsed = parseContentBundle(result.files);
    bundle = parsed;
    contentToast = skippedToast(parsed.skipped);
  }

  onMount(() => {
    void (async () => {
      try {
        await loadContent();
      } catch (e) {
        contentError = e instanceof Error ? e.message : "Could not load practice content.";
      }
    })();
    settings.onReloadContent(async () => {
      const result = await loadContentFiles();
      const parsed = parseContentBundle(result.files);
      bundle = parsed;
      contentToast = skippedToast(parsed.skipped);
      return { skipped: parsed.skipped, source: result.source, note: result.note };
    });
    void settings.load();
    void progress.load();
    void srs.load();
  });

  function startSetup(mode: QuizMode) {
    setupMode = mode;
  }

  function availableFor(mode: QuizMode): number {
    if (mode === "vocab") return vocabCount;
    if (mode === "reading") return readingCount;
    return writingCount;
  }

  function handleSetupStart(setup: SessionSetup) {
    if (!bundle) return;
    const due = setup.mode === "vocab" && setup.srsEnabled ? srs.dueToday() : [];
    activeItems = buildSession(bundle, setup, due);
    activeMode = setup.mode;
    activeLevels = setup.levels;
    activeTimer = setup.timerPerQ;
    setupMode = null;
    summary = null;
    quizRunId += 1;
    stage = "quiz";
  }

  async function persistSummary(s: SessionSummary) {
    try {
      await progress.recordSession({
        mode: s.mode,
        levels: s.levels,
        correct: s.correctCount,
        total: s.autoTotalCount,
        duration_sec: s.durationSec,
        wrong_ids: s.wrongIds,
        score_pct: s.scorePct,
      });
      for (const u of s.srsUpdates) await srs.recordResult(u.wordId, u.correct, todayStr());
    } catch {
      // Local persistence is best-effort; the results screen already shows the score.
    }
  }

  function handleQuizFinish(s: SessionSummary) {
    summary = s;
    stage = "results";
    void persistSummary(s);
  }

  function handleReviewWrong() {
    if (!summary || summary.wrongIds.length === 0) return;
    activeItems = buildWrongSession(activeItems, summary.wrongIds);
    summary = null;
    quizRunId += 1;
    stage = "quiz";
  }

  function handleNewQuiz() {
    if (summary) setupMode = summary.mode;
    summary = null;
    stage = "idle";
  }

  function exitSession() {
    stage = "idle";
    summary = null;
    activeItems = [];
  }

  function goHome() {
    exitSession();
    navigate("dashboard");
  }
</script>

<ModeWatcher />
<Sidebar.Provider>
  <AppSidebar {view} onNavigate={navigate} onPrefetch={prefetchView} />
  <Sidebar.Inset>
    <header class="flex h-16 shrink-0 items-center gap-3 border-b-[2.5px] border-border-strong bg-card px-4 md:px-6">
      <!-- Desktop sidebar toggle lives in the sidebar footer (bottom-left). This one is
           mobile-only, where the sidebar renders as a sheet. -->
      <Sidebar.Trigger
        class="interactive size-10 shrink-0 rounded-xl border-2 border-border-strong shadow-none hover:bg-muted md:hidden"
      />
      <Separator orientation="vertical" class="h-6 w-[2px] bg-border-strong/20 md:hidden" />
      <div class="flex items-center gap-2">
        <p class="text-base font-black tracking-tight">{VIEW_TITLE[view]}</p>
        <span class="badge-pill bg-yellow text-accent-ink border-border-strong text-[11px] font-black hidden sm:inline-flex">B1–B2 LAB</span>
      </div>
    </header>
    {#if contentToast}
      <!-- Content-skip banner. Lives OUTSIDE the scroll container so it never
           interacts with the quiz header's negative top margin (-mt-4/-mt-6). -->
      <div
        role="alert"
        class="shrink-0 border-b-[2.5px] border-border-strong bg-yellow px-4 py-3 text-sm font-semibold md:px-6 dark:bg-yellow/40"
      >
        <div class="mx-auto flex w-full max-w-5xl items-center gap-3">
          <span class="flex-1 text-foreground">{contentToast}</span>
          <button
            type="button"
            class="btn-3d btn-3d-white min-h-[36px] px-3 text-xs font-extrabold"
            onclick={() => (contentToast = null)}
          >
            Dismiss
          </button>
        </div>
      </div>
    {/if}
    <main class="flex-1 overflow-y-auto p-4 md:p-6">
      {#if stage === "quiz"}
        <div class="mx-auto w-full max-w-5xl">
          {#key quizRunId}
            <QuizShell
              items={activeItems}
              mode={activeMode}
              levels={activeLevels}
              timerPerQ={activeTimer}
              {definitionByWordId}
              onFinish={handleQuizFinish}
              onExit={exitSession}
            />
          {/key}
        </div>
      {:else if stage === "results" && summary}
        <div class="mx-auto w-full max-w-5xl">
          <Results
            {summary}
            onReviewWrong={handleReviewWrong}
            onNewQuiz={handleNewQuiz}
            onHome={goHome}
          />
        </div>
      {:else}
        <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
          {#if view === "dashboard"}
            <Home
              vocabCount={vocabCount}
              readingCount={readingCount}
              writingCount={writingCount}
              {mastered}
              {quizzesToday}
              {avgScore}
              loading={contentLoading}
              error={contentError}
              onStart={startSetup}
              onOpenDashboard={() => navigate("progress")}
            />
          {:else if view === "progress"}
            <Dashboard
              words={(bundle?.vocab ?? []).map((v) => ({ id: v.id, level: v.level }))}
              onStartReview={(queue) => {
                if (!bundle) return;
                const dueIds = queue.map((q) => q.id);
                activeItems = buildSession(
                  bundle,
                  {
                    mode: "vocab",
                    count: Math.min(Math.max(dueIds.length, 1), 10),
                    levels: ["b1-core", "b1-plus", "b2-core", "b2-mastery"],
                    timerPerQ: settings.defaultTimer,
                    clozeMode: "type",
                    pairCount: 4,
                    types: ["mcq", "true_false", "matching", "cloze", "best_word"],
                    srsEnabled: true,
                  },
                  dueIds,
                );
                activeMode = "vocab";
                activeLevels = ["b1-core", "b1-plus", "b2-core", "b2-mastery"];
                activeTimer = settings.defaultTimer;
                setupMode = null;
                summary = null;
                quizRunId += 1;
                stage = "quiz";
              }}
              onReviewWrong={(histSession) => {
                if (!bundle || histSession.wrong_ids.length === 0) return;
                const wrongItems = buildWrongSessionFromHistory(bundle, histSession);
                if (wrongItems.length > 0) {
                  activeItems = wrongItems;
                  activeMode = histSession.mode;
                  activeLevels = histSession.levels;
                  activeTimer = 0;
                  setupMode = null;
                  summary = null;
                  quizRunId += 1;
                  stage = "quiz";
                }
              }}
              resolveRows={(histSession) => (bundle ? resolveHistoryRows(bundle, histSession) : [])}
              onOpenSettings={() => navigate("settings")}
            />
          {:else if view === "settings"}
            {#if settingsViewComponent}
              {@const SettingsView = settingsViewComponent}
              <SettingsView />
            {:else if settingsViewLoadError}
              <div class="card-3d p-5" role="alert">
                <p class="font-bold">Settings could not be loaded.</p>
                <button
                  type="button"
                  class="btn-3d btn-3d-white mt-3 min-h-11 px-4 text-sm"
                  onclick={() => void preloadSettingsView()}
                >
                  Try again
                </button>
              </div>
            {:else if settingsViewLoading}
              <p class="text-muted-foreground p-4 text-sm" role="status">Loading settings…</p>
            {/if}
          {/if}
        </div>
      {/if}
    </main>
  </Sidebar.Inset>
</Sidebar.Provider>

{#if setupMode !== null}
  <SetupSheet
    open={setupMode !== null}
    mode={setupMode}
    available={availableFor(setupMode)}
    srsDue={setupMode === "vocab" ? srs.dueCount() : 0}
    defaults={{ count: 10, levels: [settings.defaultDifficulty], timer: settings.defaultTimer }}
    onClose={() => (setupMode = null)}
    onStart={handleSetupStart}
  />
{/if}
