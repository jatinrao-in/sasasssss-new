# Saya Industrial PWA — Design System

> Base reference: Profile page (round avatar + yellow ring, centered identity block, soft card sections, sage-green accent). Yeh document poore app ka single source of truth hai. Har page isi system follow kare — Home, Tasks, Enquiries, RGP, Profile, Login/Welcome.

---

## 1. Color Palette

```css
:root {
  /* Brand / Primary */
  --color-primary: #5C6B4D;        /* sage green - header banners, active nav, primary buttons */
  --color-primary-dark: #4A5740;
  --color-primary-light: #EEF1E9;  /* light sage tint for backgrounds/badges */

  /* Accent */
  --color-accent: #E8804A;         /* orange FAB / CTA */
  --color-accent-light: #FDEDE3;

  /* Avatar ring accent */
  --color-ring: #F2C744;           /* yellow ring around profile avatar */

  /* Neutrals */
  --color-bg: #F4F5F3;             /* page background, slightly warm grey */
  --color-surface: #FFFFFF;        /* cards */
  --color-surface-muted: #F7F8F6;  /* nested/inner panels */
  --color-border: #E7E9E4;

  /* Text */
  --color-text-primary: #1F2A1E;   /* near-black, warm */
  --color-text-secondary: #6B7268;
  --color-text-muted: #9AA098;

  /* Status colors */
  --color-success: #4F8A5B;
  --color-success-bg: #E7F3E9;
  --color-warning: #D9A53C;
  --color-warning-bg: #FBF1DD;
  --color-danger: #D9534F;
  --color-danger-bg: #FBEAE9;
  --color-info: #4A7DBD;
  --color-info-bg: #E9F1FB;
}
```

**Rule:** Sirf yeh palette use karna hai. No random blues/purples/pinks jo current Home/Tasks pages mein hain (vo galat hai). Sab kuch sage-green + warm-cream + orange-accent ke around revolve karega.

---

## 2. Typography

- **Headings (page titles, names):** Serif font — `'Playfair Display', 'Georgia', serif`
  - Used for: "rao jatin" name, "My Tasks", "Enquiries", section titles
  - Weight: 600–700
- **Body / UI text:** Sans-serif — `'Inter', 'Segoe UI', sans-serif`
  - Used for: labels, descriptions, buttons, stats, nav

```css
--font-heading: 'Playfair Display', Georgia, serif;
--font-body: 'Inter', 'Segoe UI', sans-serif;

--text-h1: 28px / 700 / var(--font-heading);   /* Name on profile */
--text-h2: 22px / 600 / var(--font-heading);   /* Page titles */
--text-h3: 17px / 600 / var(--font-heading);   /* Card section titles */
--text-body: 14px / 400 / var(--font-body);
--text-label: 12px / 500 / var(--font-body) / uppercase / letter-spacing 0.06em;
--text-small: 12px / 400 / var(--font-body);
```

---

## 3. Layout & Spacing

- Page padding: `16px` horizontal
- Section gap (vertical between cards): `16px`
- Card internal padding: `20px`
- Card border-radius: `20px` (large, soft — matches profile page rounded corners)
- Small element radius (badges, inputs, buttons): `12px`
- Pill/badge radius: `999px` (fully rounded — "Team Member" badge style)

---

## 4. Components

### 4.1 Top App Bar
- White background, bottom border `1px solid var(--color-border)`
- Left: logo icon + "Saya Industrial" in `--font-heading`, 18px, weight 600
- Right: bell icon (notification) + circular avatar (32px) with thin border

### 4.2 Header / Identity Card (Hero Block)
Reference: Profile page avatar block + Home greeting banner — unify into ONE pattern:
- Background: `var(--color-primary)`, radius `24px`, padding `24px`
- Avatar: centered, 80px circle, `3px solid var(--color-ring)` border, soft shadow
- Below avatar: Name in `--font-heading`, white/cream text, centered
- Below name: role/subtitle in small caps, muted cream `rgba(255,255,255,0.7)`
- Status pill below (e.g. "Active Member", "On Track"): white text on `rgba(255,255,255,0.15)` pill background, small green dot indicator

This same hero pattern is reused on Home (greeting) and Profile (identity) — currently they look like two different apps; unify them.

### 4.3 Cards (general content card)
```css
.card {
  background: var(--color-surface);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}
```
- Section title: `--font-heading`, 17px, with optional small icon (outline style, `--color-text-secondary`) on the left
- "View All" link (if present): `--color-accent`, 13px, weight 600, with chevron icon

### 4.4 Stat Tiles (e.g. My Tasks / Projects / Tools / Inbox, or Completed/On-Time/Overdue)
```css
.stat-tile {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  border: 1px solid var(--color-border);
}
.stat-tile .value { font-family: var(--font-heading); font-size: 24px; font-weight: 700; color: var(--color-text-primary); }
.stat-tile .label { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; }
.stat-tile .sublabel { font-size: 10px; color: var(--color-success); } /* e.g. "0 Overdue", "Active" */
```
- Icon above value, in a soft circular tint background matching status:
  - success icon: `--color-success-bg` circle, `--color-success` icon
  - warning: `--color-warning-bg` / `--color-warning`
  - danger: `--color-danger-bg` / `--color-danger`

### 4.5 Shortcut / Quick-Action Tiles (Workspace Shortcuts)
```css
.shortcut-tile {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  border: 1px solid var(--color-border);
}
.shortcut-tile .icon-wrap {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 8px;
}
```
Icon background tints — rotate through these (NOT random colors, pick from this set only):
- `--color-primary-light` + `--color-primary` icon
- `--color-accent-light` + `--color-accent` icon
- `#F0EAF5` + `#8B6FB3` icon (muted lavender — ok as 4th tile only)
- `--color-warning-bg` + `--color-warning` icon

### 4.6 List Item / Task Card
```css
.task-card {
  background: var(--color-surface);
  border-radius: 20px;
  padding: 18px;
  border: 1.5px solid var(--color-border);
}
.task-card.active { border-color: var(--color-primary); }
```
- Title: `--font-heading`, 16px, 600
- Meta row (Start/Due/Assigned): `--text-small`, `--color-text-muted`, separated by `·` or line breaks
- Progress bar:
```css
.progress-track { height: 6px; border-radius: 999px; background: var(--color-border); }
.progress-fill { height: 100%; border-radius: 999px; background: var(--color-warning); } /* or primary if >50% */
```
- Status badge (e.g. "On Track", "in_progress"): pill, `--color-success-bg`/`--color-success` text for on-track, `--color-warning-bg`/`--color-warning` for in-progress

### 4.7 Buttons
```css
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 14px;
}
.btn-secondary {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  color: var(--color-text-primary);
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 14px;
}
.btn-secondary .icon { color: var(--color-text-secondary); }
```
- Buttons with icon: icon left-aligned, 16px, gap 6px

### 4.8 Stats Row (Total/Open/Closed cards — Enquiries, RGP pages)
3-column grid, gap 10px:
```css
.summary-tile {
  border-radius: 16px;
  padding: 16px;
}
.summary-tile.dark { background: var(--color-text-primary); color: #fff; } /* "Open" tile */
.summary-tile.primary { background: var(--color-primary); color: #fff; } /* "Total" tile */
.summary-tile.light { background: var(--color-surface); border: 1px solid var(--color-border); } /* "Closed" tile */
```
- Label: `--text-label`, uppercase, opacity 0.7
- Value: `--font-heading`, 28px, 700

### 4.9 Filter Tabs (All / Open / Done / Overdue)
```css
.filter-tabs {
  background: var(--color-surface-muted);
  border-radius: 999px;
  padding: 4px;
  display: flex;
}
.filter-tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.filter-tab.active {
  background: var(--color-primary);
  color: #fff;
}
```

### 4.10 Empty States
```css
.empty-state {
  border: 1.5px dashed var(--color-border);
  border-radius: 20px;
  padding: 40px 20px;
  text-align: center;
}
.empty-state .icon-circle {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--color-surface-muted);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
  color: var(--color-text-muted);
}
.empty-state h4 { font-family: var(--font-heading); font-size: 16px; margin-bottom: 6px; }
.empty-state p { font-size: 13px; color: var(--color-text-muted); }
```

### 4.11 Bottom Navigation
```css
.bottom-nav {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-around;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom));
}
.nav-item { color: var(--color-text-muted); font-size: 11px; text-align: center; }
.nav-item.active { color: var(--color-primary); font-weight: 600; }
.nav-item.active .icon-wrap {
  background: var(--color-primary);
  color: #fff;
  border-radius: 999px;
  padding: 6px 16px;
}
```
- Center FAB (+ icon): 52px circle, `--color-accent` background, white icon, raised with shadow, slightly overlapping nav bar

### 4.12 Login / Welcome Screens
Apply same system to onboarding (reference Image 6 layout, but recolor):
- Top ~55% — illustration area with `--color-primary` background + subtle topographic line pattern in `rgba(255,255,255,0.08)`
- Bottom ~45% — white card, radius `28px 28px 0 0`, padding `24px`
- Title in `--font-heading`, 26px
- Inputs:
```css
.input-field {
  border: none;
  border-bottom: 1.5px solid var(--color-border);
  padding: 10px 0;
  font-size: 14px;
  background: transparent;
}
.input-field:focus { border-bottom-color: var(--color-primary); }
```
- Primary CTA button: full width, `--color-primary` background (not pink/red), radius 14px, 14px vertical padding, white text, weight 600
- "Continue" arrow circle on Welcome screen: `--color-accent` background

---

## 5. Icons
- Use **outline-style** icons only (Lucide/Feather style), 1.5px stroke
- No filled/emoji icons except the 💰 money bag on salary empty state (keep as-is, it's charming) — but everything else should be line icons
- Icon color always matches its container's tint color (see 4.5)

---

## 6. What's WRONG in current screens (fix list)

1. **Home page**: green header is good (keep, refine radius to 24px) but the "Workspace Shortcuts" icon tints are random pastel colors (orange, purple, blue, peach) with no system — replace with the 4-tile rotation in 4.5.
2. **Tasks page**: filter tabs okay structurally, but "Test task" card border is too thick/dark — use `task-card.active` style (1.5px sage border). Date row should use `--color-text-muted`, smaller font.
3. **Enquiries / RGP pages**: summary tiles (Total/Open/Closed) currently use navy + sage + white — keep this 3-tile dark/primary/light pattern (4.8), it's actually correct, just standardize radius to 16px and ensure consistent padding. Empty state icons should be outline style in muted circle (4.10), not solid red/orange circle.
4. **Profile page** (the GOOD one — 90%): minor fix — toggle switch color should be `--color-primary` not olive-grey; "My Salary" dropdown border should match `--color-border`; everything else stays as reference.
5. **Global**: Unify font — currently headings use a generic serif but body mixes system fonts inconsistently. Apply `--font-body` (Inter) everywhere for body text, `--font-heading` (Playfair Display) only for titles/names/section headers.
6. **Bottom nav**: active state pill (green rounded background behind icon+label) — keep this pattern, it's good, just ensure inactive icons use `--color-text-muted` not pure grey.
7. **Login/Welcome (reference image)**: recolor from pink/red to `--color-primary` (sage) for backgrounds and buttons; keep the wave-shape layout and topographic pattern texture.

---

## 7. Do NOT
- Don't introduce new colors outside section 1 palette
- Don't mix multiple heading fonts
- Don't use heavy/dark borders (max 1.5px, always `--color-border` or `--color-primary` for active states)
- Don't use sharp corners anywhere — minimum radius 12px, cards 20px
