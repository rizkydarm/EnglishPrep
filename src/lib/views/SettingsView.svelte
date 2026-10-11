<script lang="ts">
  import { setMode } from "mode-watcher";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    openContentFolder,
    settings,
    type Appearance,
    type FontStyle,
    type TimerOption,
  } from "$lib/stores/settings.svelte.js";
  import { progress } from "$lib/stores/progress.svelte.js";
  import { srs } from "$lib/stores/srs.svelte.js";
  import type { Level } from "$lib/types/schema.js";
  import FolderOpenIcon from "@lucide/svelte/icons/folder-open";
  import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";

  const APPEARANCES: { value: Appearance; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  const FONTS: { value: FontStyle; label: string; hint: string }[] = [
    { value: "sans", label: "Sans", hint: "SF Pro / Helvetica" },
    { value: "serif", label: "Serif", hint: "Georgia / Palatino" },
    { value: "mono", label: "Mono", hint: "SF Mono / Menlo" },
  ];

  const FONT_STACK: Record<FontStyle, string> = {
    sans: `-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif`,
    serif: `Georgia, Palatino, "Palatino Linotype", serif`,
    mono: `"SF Mono", Menlo, Consolas, monospace`,
  };

  const DIFFICULTIES: { value: Level; label: string }[] = [
    { value: "b1-core", label: "B1 Core" },
    { value: "b1-plus", label: "B1+" },
    { value: "b2-core", label: "B2 Core" },
    { value: "b2-mastery", label: "B2 Mastery" },
  ];

  const TIMERS: { value: TimerOption; label: string }[] = [
    { value: 0, label: "Off" },
    { value: 15, label: "15s" },
    { value: 30, label: "30s" },
    { value: 60, label: "60s" },
  ];

  function applyFont(font: FontStyle): void {
    try {
      document.documentElement.dataset.font = font;
      document.documentElement.style.fontFamily = FONT_STACK[font];
    } catch {
      // Non-DOM environment (tests): store value still applies on next load.
    }
  }

  // Apply persisted appearance + font instantly on load.
  $effect(() => {
    if (!settings.loaded) return;
    setMode(settings.appearance);
    applyFont(settings.font);
  });

  async function chooseAppearance(value: Appearance): Promise<void> {
    setMode(value);
    await settings.set({ appearance: value });
  }

  async function chooseFont(value: FontStyle): Promise<void> {
    applyFont(value);
    await settings.set({ font: value });
  }

  let folderStatus = $state<string | null>(null);
  let reloadStatus = $state<string | null>(null);
  let resetStatus = $state<string | null>(null);
  let resetStage = $state<"idle" | "armed" | "confirm">("idle");
  let confirmCancelRef = $state<HTMLElement | null>(null);

  $effect(() => {
    if (resetStage === "confirm") confirmCancelRef?.focus();
  });

  async function handleOpenFolder(): Promise<void> {
    folderStatus = "Opening content folder…";
    const ok = await openContentFolder();
    folderStatus = ok
      ? "Content folder opened in Finder."
      : "Could not open the folder (available in the desktop app only).";
  }

  async function handleReload(): Promise<void> {
    reloadStatus = "Reloading content…";
    try {
      const result = await settings.reloadContent();
      if (result.skipped.length > 0) {
        reloadStatus = `Reloaded, but ${result.skipped.length} file(s) were skipped: ${result.skipped
          .map((s) => s.file)
          .join(", ")}.`;
      } else if (result.source === "folder") {
        reloadStatus = "Content reloaded from the content folder.";
      } else {
        reloadStatus = "Content reloaded (using bundled seed).";
      }
    } catch {
      reloadStatus = "Reload failed. Content files may be malformed.";
    }
  }

  function cancelReset(): void {
    resetStage = "idle";
  }

  function handleWindowKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape" && resetStage !== "idle") cancelReset();
  }

  async function confirmReset(): Promise<void> {
    resetStatus = "Resetting progress…";
    try {
      await progress.resetAll();
      await srs.reset();
      resetStage = "idle";
      resetStatus = "All progress and history cleared.";
    } catch {
      resetStage = "idle";
      resetStatus = "Reset failed. Please try again.";
    }
  }

  function chipSelected(selected: boolean): string {
    return selected ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground";
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="flex flex-col gap-4">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
    <p class="text-muted-foreground mt-1 text-sm">Applies instantly on this device.</p>
  </div>

  <!-- Appearance -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Appearance</Card.Title>
      <Card.Description>Light, dark, or follow the system.</Card.Description>
    </Card.Header>
    <Card.Content>
      <div role="group" aria-label="Appearance" class="flex flex-wrap gap-2">
        {#each APPEARANCES as option (option.value)}
          <Button
            variant={settings.appearance === option.value ? "default" : "outline"}
            class="min-h-11"
            aria-pressed={settings.appearance === option.value}
            onclick={() => chooseAppearance(option.value)}
          >
            {option.label}
          </Button>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Font -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Font style</Card.Title>
      <Card.Description>System font stacks, applied immediately.</Card.Description>
    </Card.Header>
    <Card.Content>
      <div role="group" aria-label="Font style" class="flex flex-wrap gap-2">
        {#each FONTS as option (option.value)}
          <Button
            variant={settings.font === option.value ? "default" : "outline"}
            class="min-h-11"
            aria-pressed={settings.font === option.value}
            onclick={() => chooseFont(option.value)}
          >
            {option.label}
            <span class="text-muted-foreground text-xs">· {option.hint}</span>
          </Button>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Sound -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Sound effects</Card.Title>
      <Card.Description>Feedback sounds during quizzes.</Card.Description>
    </Card.Header>
    <Card.Content>
      <button
        type="button"
        role="switch"
        aria-checked={settings.sound}
        aria-label="Sound effects"
        onclick={() => settings.set({ sound: !settings.sound })}
        class="focus-visible:ring-ring inline-flex min-h-11 min-w-11 items-center rounded-full border-2 px-1 focus-visible:ring-2 focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          class="bg-primary inline-block size-6 rounded-full transition-transform"
          style={settings.sound ? "transform: translateX(1.25rem)" : "transform: translateX(0)"}
        ></span>
        <span class="sr-only">{settings.sound ? "On" : "Off"}</span>
      </button>
      <span class="ml-3 text-sm">{settings.sound ? "On" : "Off"}</span>
    </Card.Content>
  </Card.Root>

  <!-- Defaults -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Quiz defaults</Card.Title>
      <Card.Description>Pre-selected in Pre-Quiz Setup.</Card.Description>
    </Card.Header>
    <Card.Content>
      <Field.Group>
        <Field.Field>
          <Field.Label id="default-difficulty-label">Default difficulty</Field.Label>
          <div role="group" aria-labelledby="default-difficulty-label" class="flex flex-wrap gap-2">
            {#each DIFFICULTIES as option (option.value)}
              <button
                type="button"
                aria-pressed={settings.defaultDifficulty === option.value}
                onclick={() => settings.set({ defaultDifficulty: option.value })}
                class={`focus-visible:ring-ring min-h-11 rounded-xl border-2 px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none ${chipSelected(settings.defaultDifficulty === option.value)}`}
              >
                {option.label}
              </button>
            {/each}
          </div>
        </Field.Field>
        <Field.Field>
          <Field.Label id="default-timer-label">Default timer</Field.Label>
          <div role="group" aria-labelledby="default-timer-label" class="flex flex-wrap gap-2">
            {#each TIMERS as option (option.value)}
              <button
                type="button"
                aria-pressed={settings.defaultTimer === option.value}
                onclick={() => settings.set({ defaultTimer: option.value })}
                class={`focus-visible:ring-ring min-h-11 rounded-xl border-2 px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none ${chipSelected(settings.defaultTimer === option.value)}`}
              >
                {option.label}
              </button>
            {/each}
          </div>
          <Field.Description>Timer per question; expiry auto-submits as incorrect.</Field.Description>
        </Field.Field>
      </Field.Group>
    </Card.Content>
  </Card.Root>

  <!-- Content -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-base">Content folder</Card.Title>
      <Card.Description>Edit vocab, reading, and writing files directly.</Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" class="min-h-11" onclick={handleOpenFolder}>
          <FolderOpenIcon data-icon="inline-start" /> Open Content Folder
        </Button>
        <Button variant="outline" class="min-h-11" onclick={handleReload}>
          <RefreshCwIcon data-icon="inline-start" /> Reload Content
        </Button>
      </div>
      {#if folderStatus}
        <p class="text-muted-foreground mt-2 text-sm" role="status">{folderStatus}</p>
      {/if}
      {#if reloadStatus}
        <p class="text-muted-foreground mt-2 text-sm" role="status">{reloadStatus}</p>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Danger zone -->
  <Card.Root class="border-destructive/40">
    <Card.Header>
      <Card.Title class="text-base">Reset all progress</Card.Title>
      <Card.Description>Clears SRS boxes, daily activity, and quiz history. Cannot be undone.</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if resetStage === "idle"}
        <Button variant="destructive" class="min-h-11" onclick={() => (resetStage = "armed")}>
          <TriangleAlertIcon data-icon="inline-start" /> Reset All Progress
        </Button>
      {:else}
        <div
          role="alert"
          class="border-destructive/40 bg-destructive/5 flex flex-wrap items-center gap-2 rounded-xl border p-3"
        >
          <p class="w-full text-sm font-medium">
            {resetStage === "armed"
              ? "Are you sure? This clears all mastery and history."
              : "Final confirmation: wipe everything?"}
          </p>
          {#if resetStage === "armed"}
            <Button variant="destructive" class="min-h-11" onclick={() => (resetStage = "confirm")}>
              Yes, continue
            </Button>
            <Button variant="outline" class="min-h-11" onclick={cancelReset}>Cancel</Button>
          {/if}
        </div>
      {/if}
      {#if resetStatus}
        <p class="text-muted-foreground mt-2 text-sm" role="status">{resetStatus}</p>
      {/if}
    </Card.Content>
  </Card.Root>
</div>

{#if resetStage === "confirm"}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reset-confirm-title"
      aria-describedby="reset-confirm-desc"
      class="bg-card w-full max-w-sm rounded-2xl border p-5"
    >
      <h2 id="reset-confirm-title" class="text-lg font-semibold">Reset everything?</h2>
      <p id="reset-confirm-desc" class="text-muted-foreground mt-1 text-sm">
        SRS boxes, daily activity, mastered words, and quiz history will be permanently deleted.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          class="min-h-11"
          onclick={cancelReset}
          bind:ref={confirmCancelRef}
        >
          Cancel
        </Button>
        <Button variant="destructive" class="min-h-11" onclick={confirmReset}>
          Reset everything
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
