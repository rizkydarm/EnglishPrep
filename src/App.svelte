<script lang="ts">
  import { tick } from "svelte";
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

  $effect(() => {
    setMode(themeChoice);
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
      <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {#if view === "dashboard"}
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
          <div>
            <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Your saved modules</h1>
            <p class="text-muted-foreground mt-1 text-sm">
              Modules you starred, kept on this device.
            </p>
          </div>
          {#if favoriteModules.length === 0}
            <Empty.Root>
              <Empty.Header>
                <Empty.Media variant="icon"><BookmarkIcon /></Empty.Media>
                <Empty.Title>No favorites yet</Empty.Title>
                <Empty.Description>
                  Tap the star on any module to keep it here for quick access.
                </Empty.Description>
              </Empty.Header>
              <Empty.Content>
                <Button variant="outline" onclick={() => navigate("dashboard")}>
                  Browse modules
                </Button>
              </Empty.Content>
            </Empty.Root>
          {:else}
            <div class="flex flex-col gap-3">
              {#each favoriteModules as m (m.id)}
                <Card.Root size="sm">
                  <Card.Content>
                    <div class="flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate font-medium">{m.name}</p>
                        <p class="text-muted-foreground text-sm">
                          {AREA_LABEL[m.area]} · {m.level}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="min-h-11 shrink-0"
                        onclick={() => toggleFavorite(m.id)}
                        aria-label="Remove {m.name} from favorites"
                      >
                        Remove
                      </Button>
                    </div>
                  </Card.Content>
                </Card.Root>
              {/each}
            </div>
          {/if}
        {:else if view === "settings"}
          <div>
            <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>
            <p class="text-muted-foreground mt-1 text-sm">Applies to this app on this device.</p>
          </div>
          <Card.Root>
            <Card.Header>
              <Card.Title>Appearance</Card.Title>
              <Card.Description>Applies to the whole app immediately.</Card.Description>
            </Card.Header>
            <Card.Content>
              <ToggleGroup.Root
                type="single"
                bind:value={themeChoice}
                variant="outline"
                aria-label="Appearance"
              >
                <ToggleGroup.Item value="light" aria-label="Light theme">
                  <SunIcon data-icon="inline-start" /> Light
                </ToggleGroup.Item>
                <ToggleGroup.Item value="dark" aria-label="Dark theme">
                  <MoonIcon data-icon="inline-start" /> Dark
                </ToggleGroup.Item>
                <ToggleGroup.Item value="system" aria-label="System theme">
                  <MonitorIcon data-icon="inline-start" /> System
                </ToggleGroup.Item>
              </ToggleGroup.Root>
            </Card.Content>
          </Card.Root>
          <Card.Root>
            <Card.Header>
              <Card.Title>Saved modules</Card.Title>
              <Card.Description>
                {favorites.length === 0
                  ? "Nothing saved yet."
                  : `${favorites.length} saved by you on this device.`}
              </Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button
                variant="outline"
                disabled={favorites.length === 0}
                onclick={() => (favorites = [])}
              >
                Clear saved modules
              </Button>
            </Card.Footer>
          </Card.Root>
        {/if}
      </div>
    </main>
  </Sidebar.Inset>
</Sidebar.Provider>

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
