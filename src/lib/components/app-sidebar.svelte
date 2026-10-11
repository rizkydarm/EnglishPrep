<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { TACTILE_ON, toggleVariants } from "$lib/components/ui/toggle/index.js";
  import { cn } from "$lib/utils.js";
  import { mode, setMode } from "mode-watcher";
  import HouseIcon from "@lucide/svelte/icons/house";
  import ChartLineIcon from "@lucide/svelte/icons/chart-line";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import PanelLeftIcon from "@lucide/svelte/icons/panel-left";
  import type { View } from "$lib/data/modules.js";

  interface NavItem {
    view: View;
    label: string;
    icon: typeof HouseIcon;
  }

  // Only the destinations the app actually has. The three practice modes are
  // chosen on Home, so they are not repeated here (no dead/duplicate nav).
  const NAV: NavItem[] = [
    { view: "dashboard", label: "Home", icon: HouseIcon },
    { view: "progress", label: "Progress", icon: ChartLineIcon },
    { view: "settings", label: "Settings", icon: SettingsIcon },
  ];

  let {
    view,
    onNavigate,
    onPrefetch = () => {},
  }: {
    view: View;
    onNavigate: (view: View) => void;
    onPrefetch?: (view: View) => void;
  } = $props();

  const sidebar = Sidebar.useSidebar();

  function navigate(next: View) {
    onNavigate(next);
    sidebar.setOpenMobile(false);
  }

  function toggleTheme() {
    setMode(mode.current === "dark" ? "light" : "dark");
  }
</script>

<Sidebar.Root>
  <Sidebar.Header class="px-4 py-4 border-b-2 border-border-strong/15">
    <div class="flex items-center gap-3">
      <span
        class="bg-primary-strong text-primary-foreground border-2 border-border-strong shadow-[0_3px_0_0_var(--border-strong)] flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black"
        aria-hidden="true">EP</span
      >
      <div class="min-w-0">
        <p class="truncate text-sm font-black tracking-tight">English Proficiency</p>
        <p class="text-muted-foreground truncate text-xs font-medium">B1–B2 Offline Practice</p>
      </div>
    </div>
  </Sidebar.Header>
  <Sidebar.Content class="p-2">
    <Sidebar.Group>
      <Sidebar.GroupLabel class="text-xs font-bold text-muted-foreground">Navigation</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu class="space-y-2">
          {#each NAV as item (item.view)}
            {@const active = view === item.view}
            <Sidebar.MenuItem>
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onclick={() => navigate(item.view)}
                onpointerenter={() => onPrefetch(item.view)}
                onfocus={() => onPrefetch(item.view)}
                class={cn("h-11", toggleVariants({ variant: "nav" }), active && TACTILE_ON)}
              >
                <item.icon class="size-5" />
                <span class="text-sm font-bold">{item.label}</span>
              </button>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Footer class="p-3 border-t-2 border-border-strong/15">
    <!-- Bottom-left control row: theme toggle sits beside the sidebar toggle. Both
         reuse the shared tactile chip style (toggleVariants). -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={toggleTheme}
        aria-label={mode.current === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        class={cn(toggleVariants({ variant: "nav" }), "h-11 flex-1")}
      >
        {#if mode.current === "dark"}
          <SunIcon class="size-4" />
          <span>Light theme</span>
        {:else}
          <MoonIcon class="size-4" />
          <span>Dark theme</span>
        {/if}
      </button>
      <button
        type="button"
        onclick={() => sidebar.toggle()}
        aria-label="Toggle sidebar"
        class={cn(toggleVariants(), "size-11 shrink-0 p-0")}
      >
        <PanelLeftIcon class="size-5" />
      </button>
    </div>
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>

<!-- When the sidebar is collapsed off-canvas it is fully hidden, so keep a
     visible bottom-left toggle on desktop to bring it back. -->
{#if sidebar.state === "collapsed"}
  <button
    type="button"
    onclick={() => sidebar.toggle()}
    aria-label="Toggle sidebar"
    class={cn(
      toggleVariants(),
      "fixed bottom-4 left-4 z-30 hidden size-11 shrink-0 p-0 shadow-[0_3px_0_0_var(--border-strong)] md:inline-flex",
    )}
  >
    <PanelLeftIcon class="size-5" />
  </button>
{/if}
