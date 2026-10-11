<script lang="ts">
  import { onMount } from "svelte";
  import { ModeWatcher } from "mode-watcher";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import { AREA_LABEL, VIEW_TITLE, type View } from "$lib/data/modules.js";
  import Home from "$lib/views/Home.svelte";
  import SetupSheet from "$lib/views/SetupSheet.svelte";
  import QuizShell from "$lib/views/QuizShell.svelte";
  import Results from "$lib/views/Results.svelte";
  import Dashboard from "$lib/views/Dashboard.svelte";
  import SettingsView from "$lib/views/SettingsView.svelte";
  import type { QuizMode } from "$lib/stores/quiz.svelte.js";
  import { settings } from "$lib/stores/settings.svelte.js";
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

  const FONT_STACK = {
    sans: `-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif`,
    serif: `Georgia, Palatino, "Palatino Linotype", serif`,
    mono: `"SF Mono", Menlo, Consolas, monospace`,
  } as const;

  let view = $state<View>("dashboard");

  $effect(() => {
    if (settings.loaded) {
      try {
        document.documentElement.dataset.font = settings.font;
        document.documentElement.style.fontFamily = FONT_STACK[settings.font];
      } catch {
        // Non-DOM environment
      }
    }
  });

  function navigate(next: View) {
    view = next;
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
      ? `${skipped.length} content file(s) skipped: ${skipped.map((s) => s.file).join(", ")}`
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

  function areaMode(v: View): QuizMode {
    if (v === "vocabulary") return "vocab";
    if (v === "reading") return "reading";
    return "writing";
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
  <AppSidebar {view} onNavigate={navigate} />
  <Sidebar.Inset>
    <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <Sidebar.Trigger class="size-11" />
      <Separator orientation="vertical" class="h-6" />
      <p class="text-sm font-medium">{VIEW_TITLE[view]}</p>
    </header>
    <main class="flex-1 overflow-y-auto p-4 md:p-6">
      {#if contentToast}
        <div
          role="alert"
          class="mx-auto mb-4 flex w-full max-w-5xl items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
        >
          <span class="flex-1">{contentToast}</span>
          <button
            type="button"
            class="min-h-11 shrink-0 rounded-lg px-2 font-medium underline"
            onclick={() => (contentToast = null)}
          >
            Dismiss
          </button>
        </div>
      {/if}
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
          {:else if view === "vocabulary" || view === "reading" || view === "writing"}
            {@const mode = areaMode(view)}
            <div>
              <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">
                {AREA_LABEL[view]}
              </h1>
              <p class="text-muted-foreground mt-1 text-sm">
                {availableFor(mode)} item{availableFor(mode) === 1 ? "" : "s"} available. Choose
                settings, then start a drill.
              </p>
              <div class="mt-3">
                <Button disabled={availableFor(mode) === 0} onclick={() => startSetup(mode)}>
                  Start {AREA_LABEL[view]} drill
                </Button>
              </div>
            </div>
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
            <SettingsView />
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
