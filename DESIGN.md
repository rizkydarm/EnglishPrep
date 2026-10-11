# DESIGN.md — moved

The canonical UI specification now lives at **[`design/DESIGN.md`](design/DESIGN.md)** — the
blue/yellow "Duolingo + Quizlet + Kahoot" hybrid (blue `#2373F4`, cyan `#65D0F4`, yellow
`#F2F7A0`, ink `#0F172A`, background `#F8FAFF`).

Reference mockups (read-only, not shipped):

- [`design/Template-Homepage.html`](design/Template-Homepage.html)
- [`design/Template-Dashboard.html`](design/Template-Dashboard.html)
- [`design/Template-Quiz.html`](design/Template-Quiz.html)
- [`design/System-Ielts-Toeic-Preps.html`](design/System-Ielts-Toeic-Preps.html)

This file is a pointer only, so there is a single source of truth. Tokens, palette, type, and
motion are mirrored in **`PRD.md` §10** (which wins on any conflict).

**Offline rule:** the mockups load webfonts from a CDN and use emoji icons. The app uses
**system font stacks only** (Sans / Serif / Mono) and **lucide-svelte icons** — never a CDN
webfont, never emoji as UI icons. The app makes zero network requests.
