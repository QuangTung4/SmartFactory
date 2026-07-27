---
version: alpha
name: SmartFactory Control Room
description: Industrial control-room visual identity for the SmartFactory Web Manager — DailyCheck compliance, TaskIncident command, and shop-floor chat.
colors:
  background: "#F4F7F9"
  foreground: "#1F2A37"
  card: "#FFFFFF"
  card-foreground: "#1F2A37"
  primary: "#1E6091"
  on-primary: "#FFFFFF"
  primary-glow: "#2B7AB3"
  secondary: "#E8EEF2"
  on-secondary: "#1F2A37"
  muted: "#E8EEF2"
  muted-foreground: "#64748B"
  accent: "#E8F1F8"
  on-accent: "#1E6091"
  success: "#28A745"
  on-success: "#FFFFFF"
  success-soft: "#E8F6EC"
  destructive: "#DC3545"
  on-destructive: "#FFFFFF"
  destructive-soft: "#FCEBEC"
  warning: "#FFC107"
  on-warning: "#3D2E0A"
  warning-soft: "#FFF8E1"
  border: "#D5DEE7"
  ring: "#1E6091"
  status-todo: "#FFFFFF"
  status-draft: "#FFF8E1"
  status-done: "#E8F6EC"
  chart-ok: "#28A745"
  chart-ng: "#DC3545"
  chart-missing: "#8B95A5"
  sidebar: "#F7FAFC"
  sidebar-foreground: "#1F2A37"
  sidebar-primary: "#1E6091"
  on-sidebar-primary: "#FFFFFF"
  sidebar-accent: "#E8F1F8"
  on-sidebar-accent: "#1E6091"
  sidebar-border: "#D5DEE7"
  sidebar-ring: "#1E6091"
typography:
  headline-lg:
    fontFamily: Roboto
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
  headline-md:
    fontFamily: Roboto
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.3
  body-md:
    fontFamily: Roboto
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Roboto
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.45
  label-caps:
    fontFamily: Roboto
    fontSize: 0.625rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.06em
  kpi-value:
    fontFamily: Roboto
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1
rounded:
  sm: 6px
  md: 10px
  lg: 12px
  xl: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  header: 64px
  footer: 72px
  touch: 56px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary-glow}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.md}"
    height: 36px
  input-field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 48px
  login-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  kpi-card-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.lg}"
    padding: 16px
  kpi-card-danger:
    backgroundColor: "{colors.destructive-soft}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.lg}"
    padding: 16px
  kpi-card-muted:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 16px
  kpi-card-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 16px
  status-card-todo:
    backgroundColor: "{colors.status-todo}"
    rounded: "{rounded.lg}"
  status-card-draft:
    backgroundColor: "{colors.status-draft}"
    rounded: "{rounded.lg}"
  status-card-done:
    backgroundColor: "{colors.status-done}"
    rounded: "{rounded.lg}"
  sidebar-nav-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.on-sidebar-accent}"
    rounded: "{rounded.md}"
  chat-fab:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    size: 56px
---

## Overview

SmartFactory Control Room is the visual identity for the **Web Manager** console used by Admin accounts. The product is a factory pre-shift inspection and incident command system: DailyCheck compliance, TaskIncident lifecycle, and Conversation chat with the shop floor.

The UI should feel like a **shift control desk** — dense, legible, and operational. It is proudly utilitarian: information first, decoration never. Think SCADA overview wall meets a well-printed work order, not a SaaS marketing landing page.

Audience: plant managers and admins on a PC browser during a live shift. Emotional response: calm confidence under time pressure. The brand name **SmartFactory** and the control-room role should read clearly in the chrome; no hero marketing moment.

## Colors

Palette is cool industrial neutrals with a single operational blue for chrome and primary actions. Semantic greens/reds/ambers carry OK / NG / draft meaning and must stay scarce and consistent.

- **Primary (#1E6091):** Industrial blue for headers, primary CTAs, active nav, and focus rings. One strong chrome color — not sprinkled as decoration.
- **Background (#F4F7F9):** Cool paper surface behind content; softer than pure white so cards lift without heavy shadows.
- **Card / foreground:** Pure white cards on cool paper; ink (#1F2A37) for all primary reading text — never pure black.
- **Success (#28A745) / soft:** DailyCheck OK and positive KPIs only.
- **Destructive (#DC3545) / soft:** NG, fail counts, unresolved incident urgency.
- **Warning (#FFC107) / soft:** Draft / in-progress inspection states — never as the sole text color on large areas.
- **Chart OK / NG / MISSING:** Always `{colors.chart-ok}`, `{colors.chart-ng}`, `{colors.chart-missing}` — never ad-hoc hex in components.
- **Sidebar:** Cool off-white aligned to primary accents (`sidebar-accent`, `sidebar-primary`) — not generic slate defaults that drift from brand.

## Typography

Single family: **Roboto** at practical weights (400 / 500 / 700). No display serifs, no second brand face.

- **Headlines:** Semi-bold/bold Roboto for page titles and control-room branding in the header.
- **Body:** 16px base for manager forms and panels; 14px for dense tables and metadata.
- **Labels:** Uppercase micro-labels on KPI cards (`label-caps`) with modest tracking.
- **KPI values:** Large tabular-nums figures; hierarchy comes from size and weight, not color gradients.

## Layout

8px spacing scale. Manager surfaces are denser than tablet touch UIs but still use clear grouping.

- Header chrome height: `{spacing.header}` (64px).
- Tablet-adjacent touch targets remain `{spacing.touch}` (56px) where shop-floor patterns are reused.
- Content pads with `{spacing.md}` / `{spacing.lg}`; avoid large empty hero margins on login — the form is the page.
- Sidebar collapses to icon rail; active item uses accent fill, not a thick left bar gimmick.

## Elevation & Depth

Depth is **tonal and border-based**, not theatrical.

- Cards: light `shadow-card` plus 1px border.
- Elevated dialogs / login card: `shadow-elevated`.
- Chat FAB: `shadow-fab` using primary tint — the only intentional “lifted” control.
- No glassmorphism, backdrop blur stacks, or neon glows.

## Shapes

Architectural softness: default radius `{rounded.lg}` (12px). Prefer `rounded-xl` / `rounded-lg` consistently; avoid mixing `rounded-2xl` marketing cards with sharp chips on the same screen.

Interactive controls (buttons, inputs, nav items) use `{rounded.md}` (10px).

## Components

### Chrome

Primary-filled header with white type. Brand line: product name + control-room role; secondary line for username. Language switcher and logout sit as secondary controls — logout uses secondary/outline, not competing primary blocks.

### Login

Flat cool background (no multi-stop gradient hero). Brand mark as simple icon tile in success or primary soft — not a pill badge cluster. Single elevated card with bordered inputs and one full-width primary submit.

### KPI & status

KPI cards use soft semantic fills (`kpi-card-*`). Status cards for todo/draft/done map to `{colors.status-*}`. Borders stay 1–2px at semantic tint; never rainbow borders.

### Sidebar nav

Inactive: muted foreground. Active: `{components.sidebar-nav-active}` (accent fill + primary text). Hover: muted wash.

### Chat dock

FAB and open panel use primary + elevated shadow. Incident urgency inside the panel uses destructive/success tokens for status chips only.

## Do's and Don'ts

- **Do** treat the screen as a control desk: information density over whitespace theater.
- **Do** route every OK / NG / MISSING / draft color through the named tokens above.
- **Do** keep primary blue for chrome and the single most important action per view.
- **Do** keep Roboto only; prefer tabular numbers for counts and rates.
- **Don't** add glass, glow, neon, or multi-color gradient heroes on login or dashboards.
- **Don't** hard-code chart hexes (`#22a06b`, `#e5484d`, etc.) — use `chart-ok` / `chart-ng` / `chart-missing`.
- **Don't** leave sidebar tokens on generic slate that fights industrial blue.
- **Don't** mix `rounded-2xl` marketing cards with inconsistent chip radii on the same page.
- **Do** keep dark mode on the existing token path (`.dark` / Android `DarkSfColors`) — cool industrial ink, same primary blue; no separate “OLED neon” theme.
- **Don't** use primary blue as large decorative washes behind entire content areas.
- **Don't** let external design skills replace this document’s palette, type, or anti-patterns.
