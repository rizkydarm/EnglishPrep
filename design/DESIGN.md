# DESIGN.md — IELTS & TOEIC Preps
### Design System Reference: Duolingo + Quizlet + Kahoot Hybrid

**Palette Given:** `#2373F4` (Primary), `#578EF5` (Secondary), `#65D0F4` (Cyan), `#F2F7A0` (Highlight Yellow)  
**Target:** macOS Desktop Tauri, Svelte 5, shadcn-svelte  
**Vibe:** Trustworthy Blue (IELTS/TOEIC) + Playful Yellow + Clean Quizlet Minimalism + Duolingo Motion

---

## 1. Brand Philosophy

Duolingo = Playful, thick borders, 3D buttons, mascot.  
Quizlet = Minimal, card-focused, typography first, calm.  
Kahoot = Energy, high contrast, big type.

**Our Hybrid:** Use Quizlet layout (clean, spacious) + Duolingo interaction (bouncy, thick border, bottom 4px press) + Kahoot energy (yellow accent for streak/score). Professional for B2, not childish.

> **Rule:** Never use childish rounded mascot, but keep the *feel* of pressable, tactile UI.

---

## 2. Color System

### Core Palette (Given)
```css
:root {
  --primary: #2373F4; /* Main action, progress, active */
  --primary-hover: #1A5FD1;
  --secondary: #578EF5; /* Secondary button, border, hover card */
  --accent-cyan: #65D0F4; /* Highlight passage, info, matching */
  --accent-yellow: #F2F7A0; /* Correct, streak, highlight, CTA pop */
  --accent-yellow-strong: #E9ED6F;
}
```

### Neutral + Semantic (Derived)
```css
:root {
  --bg: #F8FAFF; /* Bluish paper, not pure white */
  --card: #FFFFFF;
  --card-hover: #F2F6FF;
  --ink: #0F172A; /* Slate 900 - for reading */
  --muted: #64748B;
  --border: #E2E8F0;
  --border-strong: #0F172A; /* For Duolingo thick border style */
  --success: #10B981;
  --success-bg: #D1FAE5;
  --error: #EF4444;
  --error-bg: #FEE2E2;
  --shadow: 0 4px 0 0 #0F172A; /* Duolingo 3D shadow */
  --shadow-soft: 0 8px 24px rgba(35,115,244,0.12);
}
```

### Usage Map
| Token | Where |
|---|---|
| `--primary` | Primary CTA, progress bar fill, selected choice border, focus ring |
| `--secondary` | Card hover border, secondary button, icon bg |
| `--accent-cyan` | Reading passage highlight, Matching pill, info badge |
| `--accent-yellow` | Correct state bg, dashboard highlight number, "Mastered" badge, tooltip |
| `--ink` + 2px border | All quiz choice cards (Duolingo style) |
| `--bg` #F8FAFF | Page background - reduces eye strain for long reading |

### Dark Mode Adaptation
```css
.dark {
  --bg: #0B1220;
  --card: #141E33;
  --card-hover: #1B2A4A;
  --ink: #F1F5F9;
  --border: #1E2D50;
  --border-strong: #2A3A5C;
  --primary: #578EF5; /* lighter in dark for contrast */
  --accent-yellow: #F2F7A0;
  --shadow: 0 4px 0 0 #000;
}
```
Yellow stays same but use as text on dark, not bg.

---

## 3. Typography

**System Font Stack - Hardcoded per PRD:**

- **Sans (Default):** `Inter, SF Pro Display, -apple-system, sans-serif` - UI, buttons, dashboard
- **Serif (Reading):** `Newsreader, Georgia, serif` - Reading passages only (B2 long text)
- **Mono (Code/Phonetic):** `JetBrains Mono, SF Mono, monospace` - Word phonetic, code

**Scale:**
```
Display (Homepage title): 36px / 700 / -0.02em
H2 (Card title): 20px / 650
Body (Reading): Serif 18px / 1.7 line-height / #0F172A
Body UI: Sans 15px / 1.5
Caption: 13px / 500 / muted
Quiz Question: Sans 18px / 600
```

**Reading Optimization:** Max 65ch, 1.7 line-height, letter-spacing 0.01em.

---

## 4. Spacing, Radius, Borders, Shadows

Duolingo uses thick, tactile borders.

```css
--radius-sm: 12px;
--radius-md: 16px;
--radius-lg: 20px;
--radius-xl: 24px;
--radius-full: 9999px;

--border-thin: 1.5px solid var(--border);
--border-thick: 2px solid var(--border-strong); /* For choice cards */
--border-3d: 2px solid var(--border-strong) + bottom 4px solid var(--border-strong);

--space: 4px base (4,8,12,16,24,32)
```

**Shadow:**
- Card: `0 4px 0 var(--border-strong)` for 3D pressable feel + `0 8px 24px rgba(35,115,244,0.08)` soft
- Button Primary 3D: `box-shadow: 0 4px 0 #1A5FD1` + active: `translateY(4px) + shadow 0 0 0`

---

## 5. Component Styles (shadcn-svelte + Custom)

### Button Primary (Duolingo 3D)
- Height 48px, radius 16px
- Bg var(--primary), text white, border 2px solid #0F172A
- Box-shadow 0 4px 0 #0F172A, hover translateY -1px, active translateY 4px shadow 0
- Font 16px / 700
- Yellow variant: bg var(--accent-yellow), text var(--ink), shadow 0 4px 0 var(--ink)

### Choice Card (4 opsi)
- Height auto min 56px, padding 16px
- Bg white, border 2px solid var(--border-strong), radius 16px
- Shadow 0 3px 0 var(--border-strong)
- Hover: bg var(--card-hover), border-color var(--secondary)
- Selected: border-color var(--primary), bg #EFF6FF, shadow 0 3px 0 var(--primary)
- Correct: border-color var(--success), bg var(--success-bg), icon check + yellow confetti dot
- Wrong: border-color var(--error), bg var(--error-bg), shake animation

### Progress Bar
- Height 12px, radius full, bg #E2E8F0, fill var(--primary) with striped yellow highlight at tip
- Duolingo style: thick border 2px

### Matching Pill (Click, not drag)
- Pill: 48px height, radius full, border 2px solid ink
- Unselected: white
- Selected left: bg var(--accent-cyan) + border ink
- Matched: bg var(--accent-yellow) + line-through
- Correct pair: pop animation scale 1.05

### Reading Passage Highlight
- Passage card bg #FFFFFF, border 1.5px
- Highlighted by user: bg rgba(101,208,244,0.35) + underline cyan 2px
- Correct answer highlight: bg rgba(242,247,160,0.8) + border 2px dashed ink

### Card (Homepage Mode)
- Large: 240px height, radius 24px, border 2.5px solid ink, shadow 0 6px 0 ink
- Icon circle 48px with bg palette color
- Hover: translateY -4px, shadow 0 10px 0 ink
- Yellow accent card gets rotated 1deg for playful

---

## 6. Layouts

### Homepage Layout
- Max width 1024px centered
- Top bar 64px: Logo left, Settings + Theme right
- Hero: 2-col (text + illustration placeholder)
- Mode grid: 3 columns (Vocab, Reading, Writing) gap 24px, each card 3D
- Bottom: Dashboard mini 2-col

### Quiz Layout
- Split: Left 35% passage (reading) or question meta, Right 65% options. On < 800px stack vertical
- Top sticky: Progress bar + timer + close
- Bottom sticky on mobile: CTA Next
- Question card centered max 640px

### Dashboard Layout
- Header stats: 3 cards (Mastered, Today Score, SRS Due) - yellow highlight for numbers
- Chart: Bar chart 7 days, primary color bars
- Table: History with border row, hover cyan tint

---

## 7. Animation & Motion (Duolingo-like)

- **Spring:** `type: spring, stiffness: 400, damping: 25` for card enter
- **Press:** scale 0.98 on active
- **Correct:** Confetti 12 dots (yellow + blue + cyan) burst from center, 600ms
- **Wrong:** Shake keyframes: translateX(-4,4,-4,4,0) 300ms
- **Progress:** width ease-out 400ms
- **Matching:** Pair pop scale 1.05 150ms

**Duration Rule:** Micro <200ms, Transition 300ms, Celebration 600ms. No long fades.

---

## 8. Iconography

Use lucide-svelte, stroke width 2.2, size 20-24. Fill icon bg circle with palette color for mode cards.

---

## 9. Dos and Don'ts

**Do:**
- Use thick 2px ink border for all interactive cards
- Use yellow #F2F7A0 only for success/highlight, not as primary bg
- Keep reading passage serif, everything else sans
- Keep 3D shadow for primary actions

**Don't:**
- Don't use gradient heavy - keep flat + shadow
- Don't use pure black #000, use #0F172A
- Don't use thin 1px border for quiz options (feels cheap)
- Don't use more than 4 colors in one screen

---

## 10. Implementation for AI Agent

All templates use CSS variables + Tailwind CDN. To replicate in Svelte:

1. Copy CSS variables from this file to `app.css`
2. Copy component classes: `.btn-3d`, `.choice-card`, `.mode-card`
3. Use shadcn-svelte Button with custom variant `variant="blue-3d"`
4. For Tauri, use `border-2 border-slate-900 shadow-[0_4px_0_0_#0F172A]`

Palette note: `#2373F4` on white is **4.35:1** (fails AA for normal text) — keep it for non-text
accents (borders, rings, progress fill) and use a darker blue (`#1A5FD1`, 5.83:1 with white) for
filled buttons and primary text. Yellow `#F2F7A0` / cyan `#65D0F4` must carry ink text, not white.

---

**End of DESIGN.md**
