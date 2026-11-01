# Academy Desk — Test Infrastructure Specification (`TEST_INFRA.md`)

## 1. Overview & Testing Philosophy

Academy Desk (Dumka Sports Academy) employs an **opaque-box end-to-end (E2E) testing architecture** designed to validate functional requirements, interface contracts, boundary limits, and user workflows.

### Core Testing Tenets:
1. **Opaque-Box Verification**: Tests interact strictly through public interfaces—HTTP route handlers (`NextRequest` / `NextResponse`), database fixtures, and component prop/rendering contracts—without relying on internal private implementation details.
2. **Progressive Testability**: Verification suites evaluate functionality progressively across implementation milestones, establishing verifiable baseline contracts and escalating defects without breaking build pipelines.
3. **Deterministic & Isolated**: Each test suite manages its own state, utilizes isolated test keys/dates, cleans up temporary fixtures, and restores standard seed data upon completion.
4. **Authoritative Output Derivation**: Every test assertion is derived explicitly from mathematical definitions and system specifications documented in `PROJECT.md` and `ORIGINAL_REQUEST.md` (e.g., Check 3: `attendancePct >= 75 && matchCount >= 2`).
5. **Swiss Design Verification**: Structural inspection verifies adherence to the monochromatic Swiss design system (zero color hues, solid white for met/ready, mid-grey for pending, hollow indicators for absent).

---

## 2. Infrastructure Architecture & Technology Stack

The test infrastructure integrates natively into the Next.js App Router and TypeScript environment:

- **Execution Engine**: `tsx` (TypeScript Execute) via Node.js runtime.
- **Request Simulator**: Next.js native `NextRequest` and `NextResponse` abstractions, invoking App Router route handlers directly.
- **Persistence Layer**: MongoDB driver with automatic local disk JSON fallback (`LocalDb` in `src/lib/local-db.ts` persisting to `.data/academy-desk.json`).
- **Static & Structural Analysis**: TypeScript AST and regex validation to enforce route handler signatures, dynamic export configurations, and monochromatic CSS token hygiene.
- **Runner Entry Point**: `src/scripts/e2e-test-runner.ts`, executed via `npx tsx src/scripts/e2e-test-runner.ts`.

---

## 3. Four-Tier Test Case Design Methodology

The E2E test suite is organized into four distinct tiers:

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 4: Real-World Application Scenarios (5 Journeys)        │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Cross-Feature Interactions & Combinations (12 Tests) │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary & Corner Cases (45 Tests, >=5 per feature) │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Feature Coverage (45 Tests, >=5 per feature F1-F9)  │
└─────────────────────────────────────────────────────────────┘
```

### Tier 1 — Feature Coverage (F1 to F9)
Ensures direct, baseline verification for each feature in the Feature Inventory:
- **F1: Route Handler Type Conformance**: `sessions/route.ts` signature compatibility (`ParamCheck<NextRequest | Request>`), default parameter handling, response typing.
- **F2: Ready Evaluation Logic**: Check 3 formula benchmarking (`attendancePct >= 75 && matchCount >= 2`).
- **F3: Ready API Filtering**: Parameter parsing for `?readyOnly=true` and `?filter=readyOnly`.
- **F4: Player Self-Isolation**: Single athlete data scoping via `?playerId=xxx` with enriched attendance and match history.
- **F5: Monochromatic Swiss Badge**: `CossBadge16` contract, label rendering, and absence of forbidden color tokens.
- **F6: Player Dashboard Contracts**: Personal metric isolation, attendance gauge, and contribution breakdowns on `/player`.
- **F7: Scout Dashboard Contracts**: Qualified athlete roster display and role-based filtering on `/scout`.
- **F8: Coach Ready Board**: Verification of `/coach/ready` with `defaultTab="ready"` and `dynamic = "force-dynamic"`.
- **F9: Automated Verification Scripts**: Verification script contracts, exit codes, and integration matrix.

### Tier 2 — Boundary & Corner Cases
Tests limits, edge conditions, invalid inputs, and boundary transitions:
- **Attendance Boundaries**: 74% vs 75% cutoff; 0 sessions held (division-by-zero protection); 100% attendance.
- **Match Count Boundaries**: 1 match vs 2 matches at 100% attendance; 0 matches with high attendance; excessive match counts.
- **Query Parameter Edge Cases**: Case sensitivity, empty parameters, unexpected query keys, whitespace trimming.
- **Input Sanitization & Injection**: Malformed ObjectIds, SQL/NoSQL injection attempts in query strings.
- **Zero-State Handling**: New academy registrations with no historical sessions or matches.

### Tier 3 — Cross-Feature Interactions & Combinations
Validates state transitions and multi-subsystem contracts:
- Attendance Marking → Match Creation → Dynamic Ready State Transition.
- Session Locking (`closed`) → Immutability Enforcement against modification.
- Disciplinary Absence Refusal → Match Scoring Rejection with HTTP 400.
- Dynamic Scout Roster Synchronization (athletes appear upon qualifying, disappear upon attendance degradation).
- Multi-Sport Concurrency (Football vs. Cricket session attendance isolation on identical dates).
- Role-Based Edge Route Protection (`middleware.ts` enforcement for Coach, Scout, and Player routes).

### Tier 4 — Real-World Application Scenarios
Simulates complete multi-step end-user journeys:
1. **Athlete Lifecycle**: Registration → Session Attendance → Session Locking → Match Recording → Trial Qualification → Scout Selection.
2. **The 74% vs 75% Attendance Crucible**: Athlete hovering near the threshold crosses into ready status and subsequently drops below.
3. **Disciplinary Incident**: Absent athlete refused during match scoring; coach corrects roster; stats reflect proper accountability.
4. **Multi-Sport Academy Operations**: Simultaneous Football and Cricket sessions; sport-specific attendance checks.
5. **Scout Talent Search Zero-False-Positive Guarantee**: Mixed academy roster filtered with 100% precision for qualified candidates.

---

## 4. Test Directory Layout & File Organization

```
/Users/sagarranjan/Developer/Exclers/
├── TEST_INFRA.md                   # Test infrastructure documentation (this file)
├── TEST_READY.md                   # Test readiness verification report & execution summary
├── package.json                    # Verification commands & dependencies
├── src/
│   ├── scripts/
│   │   ├── e2e-test-runner.ts      # Authoritative 4-Tier Opaque-Box E2E Test Suite
│   │   ├── verify-checks.ts        # Hackathon core checks (Checks 1-4 + Concurrency)
│   │   ├── test-phase-2.ts         # Phase 2 Player Auth & CRUD suite
│   │   ├── test-phase-3-deep.ts    # Phase 3 Session Lifecycle & Deep Attendance suite
│   │   ├── test-phase-4-deep.ts    # Phase 4 Match Recording & Refusal suite
│   │   └── seed.ts                 # Database restoration script
│   ├── app/
│   │   ├── api/
│   │   │   ├── ready/route.ts      # Ready aggregation endpoint
│   │   │   ├── sessions/route.ts   # Session management endpoint
│   │   │   ├── matches/route.ts    # Match recording endpoint
│   │   │   └── players/route.ts    # Player management endpoint
│   │   ├── coach/ready/page.tsx    # Coach Ready Board
│   │   ├── player/page.tsx         # Player Dashboard
│   │   └── scout/page.tsx          # Scout Dashboard
│   └── components/
│       ├── p-badge-16.tsx          # Ready status badge
│       └── coach-mobile-shell.tsx  # Coach unified mobile shell
```

---

## 5. Execution Commands & CLI Options

### Primary E2E Test Runner Command:
```bash
npx tsx src/scripts/e2e-test-runner.ts
```

### Verification Matrix Commands:
```bash
# Core 4-check hackathon verification
npm run verify

# Phase 2: Player & account management
npm run verify:phase2

# Phase 3: Session lifecycle & attendance
npm run verify:phase3

# Phase 4: Match recording & absent refusal
npm run verify:phase4

# TypeScript compiler conformance
npx tsc --noEmit

# Production Next.js build
npm run build
```

---

## 6. Test Data Isolation & Cleanup Protocol

1. **Namespace Isolation**: Test sessions and matches use distinct date identifiers (e.g. `2026-11-20` to `2026-11-29`) or unique suffixes.
2. **Deterministic Pre-conditions**: Suites establish baseline athlete fixtures (`Rohit Kumar`, `Priya Murmu`, `Amit Soren`).
3. **Automated Teardown**: Upon suite completion, transient test records are purged and initial academy seed data is re-synchronized via `seed.ts`.
4. **Offline Resilience**: When MongoDB Atlas connection is unavailable, `LocalDb` safely mirrors all collections to `.data/academy-desk.json` without failing tests.
