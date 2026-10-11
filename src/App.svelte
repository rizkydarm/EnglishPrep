<script lang="ts">
  import { onMount, tick } from "svelte";
  import { ModeWatcher, modeStorageKey, setMode } from "mode-watcher";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { cn } from "$lib/utils.js";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import {
    AREA_LABEL,
    MODULES,
    RECOMMENDED,
    VIEW_TITLE,
    modulesOf,
    searchModules,
    type Area,
    type PracticeModule,
    type View,
  } from "$lib/data/modules.js";
  import StarIcon from "@lucide/svelte/icons/star";
  import SearchXIcon from "@lucide/svelte/icons/search-x";
  import BookmarkIcon from "@lucide/svelte/icons/bookmark";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import MonitorIcon from "@lucide/svelte/icons/monitor";
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

  const FAVORITES_KEY = "epl-favorites";
  const AREAS: Area[] = ["vocabulary", "reading", "writing"];

  function loadFavorites(): string[] {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
      return [];
    } catch {
      return [];
    }
  }

  function initialTheme(): "light" | "dark" | "system" {
    try {
      const saved = localStorage.getItem(modeStorageKey.current);
      return saved === "light" || saved === "dark" ? saved : "system";
    } catch {
      return "system";
    }
  }

  let view = $state<View>("dashboard");
  let query = $state("");
  let selectedId = $state<string | null>(null);
  let favorites = $state<string[]>(loadFavorites());
  let themeChoice = $state<"light" | "dark" | "system">(initialTheme());

  $effect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Storage unavailable. Favorites last for this session only.
    }
  });

  const FONT_STACK = {
    sans: `-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif`,
    serif: `Georgia, Palatino, "Palatino Linotype", serif`,
    mono: `"SF Mono", Menlo, Consolas, monospace`,
  } as const;

  $effect(() => {
    setMode(themeChoice);
  });

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

  const results = $derived(searchModules(query));
  const selected = $derived(MODULES.find((m) => m.id === selectedId) ?? null);
  const favoriteModules = $derived(MODULES.filter((m) => favorites.includes(m.id)));
  const showFeatured = $derived(!query.trim() && view === "dashboard");

  $effect(() => {
    if (selectedId && !results.some((m) => m.id === selectedId)) selectedId = null;
  });

  function navigate(next: View) {
    view = next;
    selectedId = null;
    query = "";
  }

  function toggleSelect(id: string) {
    selectedId = selectedId === id ? null : id;
    if (selectedId) {
      tick().then(() => document.getElementById("module-detail-title")?.focus());
    }
  }

  function toggleFavorite(id: string) {
    favorites = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
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
  const avgScore = $derived(
    progress.sessions.length === 0
      ? 0
      : Math.round(progress.sessions.reduce((n, s) => n + s.score_pct, 0) / progress.sessions.length),
  );
  const definitionByWordId = $derived<Record<string, string>>(
    Object.fromEntries((bundle?.vocab ?? []).map((v) => [v.id, v.definition_id])),
  );
  const contentLoading = $derived(bundle === null && contentError === null);

  async function loadContent(): Promise<void> {
    const result = await loadContentFiles();
    const parsed = parseContentBundle(result.files);
    bundle = parsed;
    contentToast =
      parsed.skipped.length > 0
        ? `${parsed.skipped.length} content file(s) skipped: ${parsed.skipped
            .map((s) => s.file)
            .join(", ")}`
        : null;
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
      contentToast =
        parsed.skipped.length > 0
          ? `${parsed.skipped.length} content file(s) skipped: ${parsed.skipped
              .map((s) => s.file)
              .join(", ")}`
          : null;
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
  <AppSidebar {view} favoriteCount={favorites.length} onNavigate={navigate} />
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
          <div>
            <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">
              Pick a module to start
            </h1>
            <p class="text-muted-foreground mt-1 text-sm">
              Short challenges for CEFR B1 to B2. Select a card to see how it works.
            </p>
          </div>
          <Field.Group>
            <Field.Field>
              <Field.Label for="module-search">Search modules</Field.Label>
              <Input
                id="module-search"
                type="search"
                placeholder="Try reading or paraphrase"
                autocomplete="off"
                bind:value={query}
              />
              <Field.Description>
                {results.length} of {MODULES.length} modules shown.
              </Field.Description>
            </Field.Field>
          </Field.Group>
          {#if results.length === 0}
            <Empty.Root>
              <Empty.Header>
                <Empty.Media variant="icon"><SearchXIcon /></Empty.Media>
                <Empty.Title>No modules match</Empty.Title>
                <Empty.Description>
                  Nothing matches "{query.trim()}". Try a different keyword or clear the search.
                </Empty.Description>
              </Empty.Header>
              <Empty.Content>
                <Button variant="outline" onclick={() => (query = "")}>Clear search</Button>
              </Empty.Content>
            </Empty.Root>
          {:else}
            {#if showFeatured}
              {@render moduleCard(RECOMMENDED, true)}
            {/if}
            {#each AREAS as area (area)}
              {@const items = results
                .filter((m) => m.area === area)
                .filter((m) => !showFeatured || m.id !== RECOMMENDED.id)}
              {#if items.length > 0}
                <section aria-label={AREA_LABEL[area]} class="flex flex-col gap-3">
                  <h2 class="text-lg font-semibold tracking-tight">{AREA_LABEL[area]}</h2>
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {#each items as m (m.id)}
                      {@render moduleCard(m, false)}
                    {/each}
                  </div>
                </section>
              {/if}
            {/each}
          {/if}
          {#if selected}
            {@render detailCard(selected)}
          {/if}
        {:else if view === "vocabulary" || view === "reading" || view === "writing"}
          {@const items = modulesOf(view)}
          <div>
            <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">
              {AREA_LABEL[view]}
            </h1>
            <p class="text-muted-foreground mt-1 text-sm">
              {items.length} modules. Select a card to see how it works.
            </p>
            <div class="mt-3">
              <Button onclick={() => startSetup(areaMode(view))}>
                Start {AREA_LABEL[view]} drill
              </Button>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {#each items as m (m.id)}
              {@render moduleCard(m, false)}
            {/each}
          </div>
          {#if selected}
            {@render detailCard(selected)}
          {/if}
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

{#snippet moduleCard(m: PracticeModule, featured: boolean)}
  {@const active = selectedId === m.id}
  <div
    role="button"
    tabindex="0"
    aria-pressed={active}
    aria-label="{m.name}. {AREA_LABEL[m.area]}, level {m.level}. Select to see details."
    onclick={() => toggleSelect(m.id)}
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleSelect(m.id);
      }
    }}
    class={cn(
      "bg-card text-card-foreground cursor-pointer rounded-xl border transition-colors",
      "hover:border-primary/60",
      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
      active && "border-primary shadow-sm",
      featured && "sm:col-span-2 xl:col-span-3",
    )}
  >
    <div class="flex flex-col gap-1 p-4">
      <div class="flex items-center justify-between gap-2">
        <p class="font-medium">{m.name}</p>
        {#if m.recommended}
          <Badge>Recommended</Badge>
        {/if}
      </div>
      <p class="text-muted-foreground text-sm">{AREA_LABEL[m.area]} · {m.level}</p>
      <p class="text-muted-foreground text-xs">{m.format}</p>
    </div>
  </div>
{/snippet}

{#snippet detailCard(m: PracticeModule)}
  {@const fav = favorites.includes(m.id)}
  <Card.Root class="border-primary/60">
    <Card.Header>
      <Card.Title id="module-detail-title" tabindex={-1} class="focus-visible:outline-none">
        {m.name}
      </Card.Title>
      <Card.Description>{AREA_LABEL[m.area]} · Level {m.level} · {m.format}</Card.Description>
    </Card.Header>
    <Card.Content>
      <p class="text-sm">{m.description}</p>
    </Card.Content>
    <Card.Footer class="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onclick={() => toggleFavorite(m.id)}
        aria-pressed={fav}
        aria-label={fav ? `Remove ${m.name} from favorites` : `Save ${m.name} to favorites`}
      >
        <StarIcon data-icon="inline-start" class={cn(fav && "fill-primary text-primary")} />
        {fav ? "Saved" : "Save"}
      </Button>
      <Button variant="secondary" onclick={() => navigate(m.area)}>
        Open {AREA_LABEL[m.area]}
      </Button>
    </Card.Footer>
  </Card.Root>
{/snippet}
