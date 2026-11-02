# Project: Academy Desk - Mobile & Android Bug Remediation

## Architecture
- **Framework**: Next.js 16.4.3 (App Router with Webpack bundler), React 19.3.0, Tailwind CSS 4.
- **Viewport & Touch**: Resizes-content interactive widget, pinch-to-zoom allowed (WCAG 2.1 1.4.4), transparent tap highlights, and tactile `:active` touch feedback.
- **Coach Mobile Experience**: Adaptive full-height bottom sheet with pinned sticky action buttons (`Cancel` and `Record Match`), safe FAB positioning clearing bottom navigation tabs, `pb-32` bottom content clearance, non-player filtering for clean athlete rolls, and pointer-based 500ms long-press attendance toggling.
- **Touch Target & Form Hygiene**: Minimum 44px hitbox via pseudo-element expansion on steppers, 16px minimum font size on mobile inputs to eliminate camera auto-zoom, and safe margins on modal/sheet close triggers.
- **Design System**: Monochromatic Swiss UI strictness (exclusively `zinc-*` palette, pure black/white, zero colored hues, zero colored emojis).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F15 | Viewport Scaling & Resizes-Content | Remove `userScalable: false` & `maximumScale: 1`, add `interactiveWidget: "resizes-content"` in `layout.tsx` | M-MOB1 | R1 |
| F16 | Tap Highlight & Tactile Touch Feedback | Add `-webkit-tap-highlight-color: transparent` and `:active` styling in `globals.css` | M-MOB1 | R1 |
| F17 | Root Select-None Removal | Remove root `select-none` from `coach-mobile-shell.tsx` while retaining card-level protection | M-MOB1 | R2 |
| F18 | Record Match Adaptive Mobile Bottom Sheet | Make dialog adaptive full-height bottom sheet with scrollable form and pinned sticky footer action buttons | M-MOB1 | R2 |
| F19 | FAB Deconfliction & Duplicate Add Removal | Move FAB to `bottom-24` / safe-area padding and hide duplicate in-page mobile Add button (`hidden lg:flex`) | M-MOB1 | R2 |
| F20 | Main Content Bottom Padding Expansion | Increase main content bottom padding to `pb-32` to avoid card truncation behind bottom nav | M-MOB1 | R2 |
| F21 | Client-Side Non-Player Account Filtering | Exclude "Coach" and non-player accounts from athlete rolls, attendance, match squad, and ready board | M-MOB1 | R2 |
| F22 | Attendance Card Long-Press Gesture | Implement 500ms pointer-based hold for absent + subtle vibration (`vibrate(50)`), tap for present, with scroll cancellation | M-MOB1 | R2 |
| F23 | Ready Board Match Pips Text Labels | Add explicit text label (e.g. "2 matches") beside match pips while preserving `bg-zinc-100` tokens | M-MOB1 | R2 |
| F24 | Adaptive Attendance Progress Bar | Render continuous bar for >12 athletes to eliminate micro-dot collapse and preserve segmented pills for <=12 | M-MOB1 | R2 |
| F25 | Stepper Touch Target 44px Hitbox | Expand `CossNumberField11` stepper buttons to 44px hitbox via `after:absolute after:-inset-2` without visual disruption | M-MOB2 | R3 |
| F26 | Mobile Login Auto-Capitalization & 16px Font | Add `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`, and `text-base sm:text-sm` (>=16px) | M-MOB2 | R3 |
| F27 | Sheet Close Button Safe Margins | Ensure `Sheet` close button has safe margin (`top-4 right-4 z-20`) from camera cutouts and corners | M-MOB2 | R3 |
| F28 | Player Dashboard 75% Target Visible Label | Add visible label (`Target: 75% Ready Threshold` and anchored `▲ 75% Target`) and responsive match padding | M-MOB2 | R4 |
| F29 | Scout Dashboard Badge Collision Prevention | Add responsive flex wrap, `truncate` subtitle, and `shrink-0` to `CossBadge16` on small viewports | M-MOB2 | R4 |
| F30 | Verification Matrix Execution | Pass `tsc --noEmit`, `npm run lint`, `verify`, `verify:phase2`, `verify:phase3`, `verify:phase4`, `verify:phase5`, `e2e-test-runner.ts`, and `build` | M-MOB3 | R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-MOB1 | Viewport, Global Touch & Coach Shell | `layout.tsx`, `globals.css`, `coach-mobile-shell.tsx` (F15–F24) | Survey | DONE |
| M-MOB2 | Form Controls, Touch Targets & Dashboards | `p-number-field-11.tsx`, `login-form.tsx`, `sheet.tsx`, `player/page.tsx`, `scout/page.tsx` (F25–F29) | M-MOB1 | DONE |
| M-MOB3 | Verification Matrix & Forensic Audit | Full 10-suite verification matrix execution and forensic integrity audit (F30) | M-MOB1, M-MOB2 | DONE |

## Interface Contracts & Invariant Rules
### Non-Player Filtering Invariant
- **Rule**: Client-side filtering ONLY in `coach-mobile-shell.tsx`. NEVER reject or alter "Coach" player registration in `/api/players` (required by `test-phase-2.ts` Test 9).

### Monochromatic Swiss Tokens Invariant
- **Rule**: ZERO occurrences of `(emerald|green)-\d+` and ZERO colored emojis anywhere in `src/`. Exclusively `zinc-*` scale, white, black, and Lucide icons.

### Verbatim Expression Invariants
- `src/app/player/page.tsx`: Keep `style={{ left: "75%" }}`, `Math.min(100, attendancePct)`, and `fetch('/api/ready?playerId=${playerId}')`.
- `src/app/scout/page.tsx`: Keep `style={{ left: "75%" }}`, `Math.min(100, item.attendancePct)`, `grid-cols-1`, and `"75% Target"`.
- `src/components/coach-mobile-shell.tsx`: Keep `bg-zinc-100` and `border border-zinc-600 bg-transparent` tokens on match pips.

## Code Layout
- `src/app/layout.tsx`: Owned by M-MOB1 Worker (DONE)
- `src/app/globals.css`: Owned by M-MOB1 Worker (DONE)
- `src/components/coach-mobile-shell.tsx`: Owned by M-MOB1 Worker (DONE)
- `src/components/p-number-field-11.tsx`: Owned by M-MOB2 Worker
- `src/components/login-form.tsx`: Owned by M-MOB2 Worker
- `src/components/ui/sheet.tsx`: Owned by M-MOB2 Worker
- `src/app/player/page.tsx`: Owned by M-MOB2 Worker
- `src/app/scout/page.tsx`: Owned by M-MOB2 Worker
