<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { mode, setMode } from "mode-watcher";
  import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import NewspaperIcon from "@lucide/svelte/icons/newspaper";
  import PenLineIcon from "@lucide/svelte/icons/pen-line";
  import BookmarkIcon from "@lucide/svelte/icons/bookmark";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import type { View } from "$lib/data/modules.js";

  interface NavItem {
    view: View;
    label: string;
    icon: typeof LayoutDashboardIcon;
  }

  const practiceNav: NavItem[] = [
    { view: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { view: "vocabulary", label: "Vocabulary", icon: BookOpenIcon },
    { view: "reading", label: "Reading", icon: NewspaperIcon },
    { view: "writing", label: "Writing", icon: PenLineIcon },
  ];

  const personalNav: NavItem[] = [
    { view: "progress", label: "Progress", icon: BookmarkIcon },
    { view: "settings", label: "Settings", icon: SettingsIcon },
  ];

  let {
    view,
    favoriteCount = 0,
    onNavigate,
  }: { view: View; favoriteCount?: number; onNavigate: (view: View) => void } =
    $props();

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
  <Sidebar.Header class="px-4 py-3">
    <p class="text-sm font-semibold tracking-tight">English Proficiency Lab</p>
    <p class="text-muted-foreground text-xs">CEFR B1 to B2 practice</p>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Practice</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each practiceNav as item (item.view)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={view === item.view}
                tooltipContent={item.label}
                size="lg"
                onclick={() => navigate(item.view)}
              >
                {#snippet child({ props })}
                  <button {...props}>
                    <item.icon />
                    <span>{item.label}</span>
                  </button>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
    <Sidebar.Separator />
    <Sidebar.Group>
      <Sidebar.GroupLabel>You</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each personalNav as item (item.view)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={view === item.view}
                tooltipContent={item.label}
                size="lg"
                onclick={() => navigate(item.view)}
              >
                {#snippet child({ props })}
                  <button {...props}>
                    <item.icon />
                    <span>{item.label}</span>
                    {#if item.view === "progress" && favoriteCount > 0}
                      <Sidebar.MenuBadge>{favoriteCount}</Sidebar.MenuBadge>
                    {/if}
                  </button>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Footer>
    <Button
      variant="ghost"
      class="min-h-11 w-full justify-start gap-2"
      onclick={toggleTheme}
      aria-label={mode.current === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {#if mode.current === "dark"}
        <SunIcon />
        <span>Light theme</span>
      {:else}
        <MoonIcon />
        <span>Dark theme</span>
      {/if}
    </Button>
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
