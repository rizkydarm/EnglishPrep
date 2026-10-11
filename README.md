# LMS

Desktop app built with **Rust Tauri v2**, **Svelte 5**, **shadcn-svelte**, **TailwindCSS v4**, and **Vite** (plain Svelte, no SvelteKit).

## Stack & versions

| Tool | Version |
|---|---|
| Tauri (Rust + JS API/CLI) | 2.12.x |
| Svelte | 5.57.x |
| Vite | 8.3.x |
| `@sveltejs/vite-plugin-svelte` | 7.3.x |
| TailwindCSS + `@tailwindcss/vite` | 4.3.x |
| shadcn-svelte deps (`bits-ui`, `tailwind-variants`, `clsx`, `tailwind-merge`, `lucide-svelte`, `tw-animate-css`, `mode-watcher`) | latest |
| TypeScript | 6.0.x (see note) |
| Package manager | bun |

> **TypeScript note:** `typescript@7` (native port) is the newest release, but `svelte-check@4` does not support it standalone yet (it requires a TS6+TS7 dual setup with `--tsgo`). This project pins the latest TS 6 (`6.0.3`) so `bun run check` works out of the box.

## Prerequisites

- [Bun](https://bun.sh) 1.x
- Rust stable toolchain (`rustup`, `cargo`) — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- macOS: Xcode Command Line Tools (`xcode-select --install`). Full Xcode only needed for iOS builds.

## Getting started

```bash
bun install
bun run tauri dev     # desktop dev window (Vite on http://localhost:1420)
```

Other commands:

```bash
bun run dev           # frontend only (browser)
bun run build         # frontend production build → dist/
bun run check         # svelte-check typecheck
bun run tauri build   # full desktop bundle
```

## shadcn-svelte

`components.json` is pre-configured for plain Vite (`$lib` alias → `src/lib`, global CSS `src/app.css`, base color `neutral`).
A sample `Button` lives at `src/lib/components/ui/button/`.

Add more components with the CLI:

```bash
bun x shadcn-svelte@latest add button card input dialog
```

Import them via `$lib`:

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
</script>
```

## Project layout

```
index.html                 # Vite entry
vite.config.ts             # svelte + tailwindcss plugins, Tauri dev-server config, $lib alias
svelte.config.js           # vitePreprocess
src/
  main.ts / App.svelte     # Svelte entry + demo (calls Rust `greet` command)
  app.css                  # Tailwind v4 + shadcn theme tokens
  lib/
    utils.ts               # cn() helper
    components/ui/button/  # sample shadcn Button (bits-ui based)
src-tauri/
  Cargo.toml               # tauri v2, tauri-plugin-opener
  tauri.conf.json          # frontendDist ../dist, devUrl localhost:1420
  capabilities/default.json
  src/{main,lib}.rs        # `greet` command
  icons/
```

## Tauri backend

Rust commands live in `src-tauri/src/lib.rs` (example: `greet`). Call them from Svelte with:

```ts
import { invoke } from "@tauri-apps/api/core";
await invoke("greet", { name: "World" });
```
