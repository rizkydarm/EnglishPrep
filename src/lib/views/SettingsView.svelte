<script lang="ts">
  import { toggleVariants } from "$lib/components/ui/toggle/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { openContentFolder, settings, type TimerOption } from "$lib/stores/settings.svelte.js";
  import { progress } from "$lib/stores/progress.svelte.js";
  import { srs } from "$lib/stores/srs.svelte.js";
  import type { Level } from "$lib/types/schema.js";
  import FolderOpenIcon from "@lucide/svelte/icons/folder-open";
  import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";

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

  // Chip + switch styling now lives in one place: ui/toggle (toggleVariants)
  // and ui/switch. No local chip classes here.
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="flex flex-col gap-6 pb-10">
  <header>
    <h1 class="text-3xl font-black tracking-tight md:text-4xl">Settings</h1>
    <p class="text-muted-foreground font-serif italic text-base mt-1">
      Tune how practice feels. Applies instantly on this device.
    </p>
  </header>

  <!-- Sound -->
  <section class="card-3d p-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-base font-extrabold tracking-tight">Sound effects</h2>
        <p class="text-muted-foreground mt-0.5 text-sm">Feedback sounds during quizzes.</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm font-bold" aria-hidden="true">{settings.sound ? "On" : "Off"}</span>
        <Switch
          checked={settings.sound}
          onCheckedChange={(value) => void settings.set({ sound: value })}
          aria-label="Sound effects"
        />
      </div>
    </div>
  </section>

  <!-- Defaults -->
  <section class="card-3d flex flex-col gap-5 p-5">
    <div>
      <h2 class="text-base font-extrabold tracking-tight">Quiz defaults</h2>
      <p class="text-muted-foreground mt-0.5 text-sm">Pre-selected when you open Pre-Quiz Setup.</p>
    </div>

    <div>
      <p id="default-difficulty-label" class="text-muted-foreground text-[11px] font-black uppercase tracking-wider">
        Default difficulty
      </p>
      <div role="group" aria-labelledby="default-difficulty-label" class="mt-2.5 flex flex-wrap gap-2">
        {#each DIFFICULTIES as option (option.value)}
          <button
            type="button"
            aria-pressed={settings.defaultDifficulty === option.value}
            onclick={() => void settings.set({ defaultDifficulty: option.value })}
            class={toggleVariants()}
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>

    <div>
      <p id="default-timer-label" class="text-muted-foreground text-[11px] font-black uppercase tracking-wider">
        Default timer
      </p>
      <div role="group" aria-labelledby="default-timer-label" class="mt-2.5 flex flex-wrap gap-2">
        {#each TIMERS as option (option.value)}
          <button
            type="button"
            aria-pressed={settings.defaultTimer === option.value}
            onclick={() => void settings.set({ defaultTimer: option.value })}
            class={toggleVariants()}
          >
            {option.label}
          </button>
        {/each}
      </div>
      <p class="text-muted-foreground mt-2 text-xs">Timer per question; expiry auto-submits as incorrect.</p>
    </div>
  </section>

  <!-- Content -->
  <section class="card-3d flex flex-col gap-4 p-5">
    <div>
      <h2 class="text-base font-extrabold tracking-tight">Content folder</h2>
      <p class="text-muted-foreground mt-0.5 text-sm">Edit vocab, reading, and writing files directly.</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <button type="button" class="btn-3d btn-3d-white text-sm" onclick={handleOpenFolder}>
        <FolderOpenIcon class="size-4" /> Open Content Folder
      </button>
      <button type="button" class="btn-3d btn-3d-white text-sm" onclick={handleReload}>
        <RefreshCwIcon class="size-4" /> Reload Content
      </button>
    </div>
    {#if folderStatus}
      <p class="text-muted-foreground text-sm" role="status">{folderStatus}</p>
    {/if}
    {#if reloadStatus}
      <p class="text-muted-foreground text-sm" role="status">{reloadStatus}</p>
    {/if}
  </section>

  <!-- Danger zone -->
  <section class="card-3d border-destructive/50 flex flex-col gap-4 p-5">
    <div>
      <h2 class="text-base font-extrabold tracking-tight">Reset all progress</h2>
      <p class="text-muted-foreground mt-0.5 text-sm">
        Clears SRS boxes, daily activity, and quiz history. Cannot be undone.
      </p>
    </div>
    {#if resetStage === "idle"}
      <div>
        <button
          type="button"
          class="btn-3d text-sm"
          style="background: var(--destructive); color: var(--accent-ink);"
          onclick={() => (resetStage = "armed")}
        >
          <TriangleAlertIcon class="size-4" /> Reset All Progress
        </button>
      </div>
    {:else}
      <div
        role="alert"
        class="border-destructive/40 bg-destructive/5 flex flex-wrap items-center gap-3 rounded-xl border-2 p-3.5"
      >
        <p class="w-full text-sm font-bold">
          {resetStage === "armed"
            ? "Are you sure? This clears all mastery and history."
            : "Final confirmation: wipe everything?"}
        </p>
        {#if resetStage === "armed"}
          <button
            type="button"
            class="btn-3d text-sm"
            style="background: var(--destructive); color: var(--accent-ink);"
            onclick={() => (resetStage = "confirm")}
          >
            Yes, continue
          </button>
          <button type="button" class="btn-3d btn-3d-white text-sm" onclick={cancelReset}>Cancel</button>
        {/if}
      </div>
    {/if}
    {#if resetStatus}
      <p class="text-muted-foreground text-sm" role="status">{resetStatus}</p>
    {/if}
  </section>
</div>

{#if resetStage === "confirm"}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reset-confirm-title"
      aria-describedby="reset-confirm-desc"
      class="card-3d w-full max-w-sm p-5"
    >
      <h2 id="reset-confirm-title" class="text-lg font-extrabold tracking-tight">Reset everything?</h2>
      <p id="reset-confirm-desc" class="text-muted-foreground mt-1.5 text-sm">
        SRS boxes, daily activity, mastered words, and quiz history will be permanently deleted.
      </p>
      <div class="mt-5 flex justify-end gap-2.5">
        <button
          type="button"
          class="btn-3d btn-3d-white text-sm"
          onclick={cancelReset}
          bind:this={confirmCancelRef}
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-3d text-sm"
          style="background: var(--destructive); color: var(--accent-ink);"
          onclick={confirmReset}
        >
          Reset everything
        </button>
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
