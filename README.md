# Academy Desk

> Sports academy tracking & trial readiness benchmarking system for Dumka Sports Academy.  
> **Vibe Coding Challenge 2.0** · Team **FRINGE** · [`greedskith/vibe-coding-challenge-2-0-fringe`](https://github.com/greedskith/vibe-coding-challenge-2-0-fringe)

---

### Core Checks & Server Enforcement

| Check | Requirement | Enforcement | Verify Command |
|---|---|---|---|
| **Check 1** | Session Immutability | Daily roll defaults absent until marked. Locked sessions reject edits with **HTTP 400**. | `npm run verify` |
| **Check 2** | Absent Match Refusal | Match API validates attendance on match date. Absent players rejected with **HTTP 400**. | `npm run verify` |
| **Check 3** | Trial Readiness | Qualification requires **$\ge 75\%$ attendance** AND **$\ge 2$ matches played**. | `npm run verify` |
| **Check 4** | Role Isolation | **Scout (`/scout`)**: view exclusively ready athletes.<br>**Player (`/player`)**: view own dossier only. | `npm run verify` |
| **Edge Case** | Multi-Sport Concurrency | Football and Cricket on same date remain strictly isolated with 0 cross-leakage. | `npm run verify` |

---

### Demo Accounts

| Role | Username | Password | Route | Scope |
|---|---|---|---|---|
| **Coach** | `coach` | `coach123` | `/coach` | Full operations: roster, sessions, attendance, matches |
| **Scout** | `scout` | `scout123` | `/scout` | Talent discovery: qualified trial-ready athletes only |
| **Player** | `rohit` | `rohit123` | `/player` | Athlete dossier: personal attendance %, matches, benchmark gauge |

---

### Verification Matrix

All suites run non-destructively against MongoDB or local disk fallback (`.data/academy-desk.json`):

```bash
# Core 4-check verification & multi-sport concurrency
npm run verify

# Deep phase verification suites
npm run verify:phase2   # Player CRUD, bcrypt auth, cascade delete, username collisions
npm run verify:phase3   # Session lifecycle, attendance mutations, locked immutability
npm run verify:phase4   # Match validation, absent refusal, date & sport filtering
npm run verify:phase5   # 75% boundary arithmetic, scout filtering, Swiss token audit

# Full opaque-box E2E test suite (107/107 passed)
npx tsx src/scripts/e2e-test-runner.ts

# Type check, linting & production build
npm run lint            # 0 errors, 0 warnings
npx tsc --noEmit        # Strict TypeScript check
npm run build           # Next.js webpack production build
```

---

### Architecture & Design

- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, NextAuth.js, MongoDB / LocalDb.
- **Aesthetic**: Monochromatic Swiss greyscale (pure white `#FFF` for qualified/ready, `zinc-*` scale, zero colored hues, zero emojis).
- **Mobile Ergonomics**: Adaptive bottom sheet dialogs, 500ms haptic long-press attendance, safe-area navigation clearance, $\ge 44\text{px}$ touch targets, and zoom-safe inputs.
