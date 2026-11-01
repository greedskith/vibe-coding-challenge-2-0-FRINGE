# Project: Academy Desk (Phase 5 & Phase 6)

## Architecture
- **Framework**: Next.js 16.4.3 (App Router with Webpack bundler), React 19.3.0, Tailwind CSS 4.
- **Data Layer**: Direct MongoDB driver with automatic local disk JSON fallback (`.data/academy-desk.json` via `LocalDb` in `src/lib/local-db.ts`).
- **Auth Layer**: NextAuth v4 JWT session strategy with `session.user.role` and `session.user.playerId`. Edge route protection in `src/middleware.ts`.
- **UI Architecture**: Monochromatic Swiss design system (fill, brightness, geometry, position; solid white for met/ready, mid-grey for in-progress, hollow circle for absent; Lucide monochrome icons; zero color hues).
- **Dual Track Orchestration**: Implementation Track operates in parallel with E2E Testing Track. Test suite culminates in `TEST_READY.md`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | TypeScript Route Handler Type Conformance | Fix `req?: NextRequest` in `src/app/api/sessions/route.ts` to unblock `npx tsc --noEmit` and `npm run build` | M1 | Survey |
| F2 | Ready Evaluation Logic | Strict Check 3 formula: `attendancePct >= 75 && matchCount >= 2` | M1 | R1 |
| F3 | Ready API Query Parameter `?readyOnly=true` & `?filter=readyOnly` | Exclusively return athletes with `isReady === true` when queried with either flag | M1 | R1 |
| F4 | Ready API Single Player Isolation `?playerId=xxx` | Return exclusively the record for that player, with attendance & match details | M1 | R1, R2 |
| F5 | Monochromatic Swiss Badge (`CossBadge16`) | Refactor `src/components/p-badge-16.tsx` to eliminate all emerald/green classes in favor of pure white and zinc monochrome | M2 | R2 |
| F6 | Player Dashboard History & Contributions | Render personal attendance history and match contribution breakdowns on `/player` | M2 | R2 |
| F7 | Scout Dashboard Qualified Candidates | Render exclusively qualified athletes meeting ready criteria on `/scout` with strict scout role isolation | M2 | R2 |
| F8 | Coach Ready Board Verification | Ensure `/coach/ready` renders `CoachMobileShell` with `defaultTab="ready"` and `dynamic = "force-dynamic"` | M2 | R2 |
| F9 | Phase 5 Automated Verification Script | Implement `src/scripts/test-phase-5.ts` and add `"verify:phase5"` script to `package.json` | M3 | R3 |
| F10 | Comprehensive Opaque-Box E2E Test Suite | Build Tier 1-4 test cases across all features, publish `TEST_INFRA.md` and `TEST_READY.md` | E2E-Track | Dual Track |
| F11 | Final Milestone E2E & Adversarial Hardening | Pass 100% E2E tests + Tier 5 Adversarial Coverage Hardening | M4 | Dual Track |
| F12 | Complete Verification Matrix Execution | Pass `verify`, `verify:phase2`, `verify:phase3`, `verify:phase5`, `tsc --noEmit`, and `npm run build` | M5 | R4 |
| F13 | Git Synchronization & Remote Push | Commit all changes cleanly and push to `origin/main` on `github.com/greedskith/vibe-coding-challenge-2-0-FRINGE` | M5 | R4 |
| F14 | Vercel Deployment Readiness | Verify build output, env requirements, and deployment configurations | M5 | R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Design test runner, Tiers 1-4 test cases, publish `TEST_READY.md` | Survey | DONE |
| M1 | Ready API & Build Unblocker | Fix `sessions/route.ts` type, enhance `/api/ready` for `?readyOnly=true`, `?filter=readyOnly`, `?playerId=xxx` | Survey | DONE |
| M2 | Swiss UI & Dashboards | Refactor `p-badge-16.tsx` to monochromatic, enhance `/player` with history/matches, verify `/scout` & `/coach/ready` | M1 | DONE |
| M3 | Phase 5 Test Suite Integration | Implement `src/scripts/test-phase-5.ts` and `"verify:phase5"` in `package.json` | M1, M2 | DONE |
| M4 | Final Milestone (E2E Pass & Adversarial Hardening) | Pass 100% E2E tests (Phase 1) + Tier 5 Adversarial Coverage Hardening (Phase 2) | E2E, M3 | DONE |
| M5 | Matrix Verification, Git Sync & Deploy | Run full verification matrix, clean Git commit & push to `origin/main`, Vercel deploy check | M4 | IN_PROGRESS |

## Interface Contracts
### Client ↔ `/api/ready`
- **GET** `/api/ready`
  - Query params:
    - `playerId?: string` (filters response to matching athlete only; when provided, includes `attendanceHistory` and `matchHistory`)
    - `readyOnly?: "true" | "false"` (when `"true"`, filters response to athletes where `isReady === true`)
    - `filter?: string` (when `"readyOnly"`, filters response to athletes where `isReady === true`)
  - Response: `ReadyResult[]` where each object contains:
    ```typescript
    interface ReadyResult {
      player: Player;
      sessionsHeld: number;
      sessionsPresent: number;
      attendancePct: number; // 0 - 100
      matchCount: number;
      isReady: boolean; // attendancePct >= 75 && matchCount >= 2
      attendanceHistory?: Array<{ sessionId: string; date: string; sport: string; status: "PRESENT" | "ABSENT" }>;
      matchHistory?: Array<{ matchId: string; date: string; sport: string; player1Score: number; player2Score: number }>;
    }
    ```

### Next.js App Router ↔ `/api/sessions`
- **GET** `/api/sessions`
  - Signature: `export async function GET(req: NextRequest = new NextRequest("http://localhost:3000/api/sessions"))`
  - Satisfies Next.js `ParamCheck<NextRequest | Request>` while maintaining zero-parameter callability for test scripts.

### Design System ↔ UI Components
- **Ready / Met State**: Solid white (`#FFFFFF`, `bg-zinc-100`, `text-zinc-950`).
- **In-Progress / Close State**: Mid-grey (`bg-zinc-500`, `text-zinc-400`).
- **Absent / Unmet State**: Hollow circle (`border border-zinc-600 bg-transparent`, `text-zinc-500`).
- **Color Hues**: STRICTLY FORBIDDEN. No `emerald`, `green`, `red`, `blue`, or colored emojis.

## Code Layout
- `src/app/api/sessions/route.ts`: Owned by M1 Worker.
- `src/app/api/ready/route.ts`: Owned by M1 Worker.
- `src/components/p-badge-16.tsx`: Owned by M2 Worker.
- `src/app/player/page.tsx`: Owned by M2 Worker.
- `src/app/scout/page.tsx`: Owned by M2 Worker.
- `src/app/coach/ready/page.tsx`: Owned by M2 Worker.
- `src/scripts/test-phase-5.ts`: Owned by M3 Worker.
- `package.json`: Owned by M3 Worker.
- `tests/e2e/*` and `src/scripts/e2e-test-runner.ts`: Owned by E2E Testing Track.
