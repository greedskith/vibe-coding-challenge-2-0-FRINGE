# Academy Desk — Dumka Sports Academy

> **Vibe Coding Challenge 2.0 (Nov 1–7, 2026)**  
> **Team**: FRINGE (`greedskith`)  
> **Repository**: [github.com/greedskith/vibe-coding-challenge-2-0-FRINGE](https://github.com/greedskith/vibe-coding-challenge-2-0-FRINGE)

Academy Desk is a sports academy tracking and trial readiness benchmarking system built for grassroots coaching and scouting at Dumka Sports Academy. It provides automated attendance recording, session locking immutability, match participation with strict attendance eligibility gating, trial readiness benchmarking, and role-isolated portals for Coaches, Scouts, and Athletes.

---

## 1. Hackathon Checkpoint Proof & Enforcement

| Checkpoint | Specification | Server Enforcement | Verification Suite |
|---|---|---|---|
| **Check 1** | Session Lifecycle & Attendance | Daily attendance roster defaults to absent until marked present. Closing/locking a session makes attendance records immutable on the server (HTTP 400 rejection on modification). | `npm run verify` (Check 1)<br>`npm run verify:phase3` |
| **Check 2** | Absent Player Match Refusal | Server API validates match date and sport against session records. If an athlete was absent on the match date, the submission is rejected with **HTTP 400** and an explicit refusal message. | `npm run verify` (Check 2)<br>`npm run verify:phase4` |
| **Check 3** | Trial Readiness Benchmarking | Qualification strictly requires: **$\ge 75\%$ Attendance** AND **$\ge 2$ Matches**. Computed dynamically across recorded sessions and match appearances. | `npm run verify` (Check 3)<br>`npm run verify:phase4` |
| **Check 4** | Role-Based Visibility Filters | **Scout (`/scout`)**: Exclusively views athletes who have met both trial readiness benchmarks (`isReady: true`).<br>**Player (`/player`)**: Strictly scoped to their own profile, attendance rate, and match history. | `npm run verify` (Check 4)<br>`npm run verify:phase2` |
| **Edge Case** | Multi-Sport Concurrency | Football and Cricket sessions can occur on the same calendar date without cross-discipline state leakage. An athlete present in Football but absent in Cricket is refused in Cricket matches. | `npm run verify` (Edge Case) |

---

## 2. Design Philosophy: Monochromatic Swiss Greyscale

Academy Desk enforces a rigorous, distraction-free monochromatic Swiss aesthetic:
* **Zero Rainbow Badges**: Meaning is encoded strictly through **fill, brightness, geometry, and position** rather than hue.
* **Solid Pure White (`#FFF` / `bg-zinc-100`)**: Reserved exclusively for "Met / Present / Trial Ready".
* **Visual Status Hierarchy**:
  * **Inverted White Circle Avatar**: Trial-ready athletes.
  * **Mid-Grey Fill (`bg-zinc-500`)**: In-progress metrics.
  * **Hollow Ring / Dim**: Absent / Unmet benchmarks.
* **Unified Shell**: Desktop sidebar and mobile bottom navigation unify all 4 coach workflows (`Attendance`, `Matches`, `Roster`, `Ready Board`) with 0 layout clipping.

---

## 3. Quick Role Logins

For evaluation and testing, seed credentials with 1-tap quick pills on `/login`:

| Role | Username | Password | Default Portal | Capabilities |
|---|---|---|---|---|
| **Coach** | `coach` | `coach123` | `/coach` | Full desk: mark attendance, record matches, manage roster, lock sessions |
| **Scout** | `scout` | `scout123` | `/scout` | Read-only discovery: displays exclusively trial-ready athletes |
| **Athlete** | `rohit` | `rohit123` | `/player` | Self-service athlete dossier: view personal attendance %, match count, readiness status |

*(New athletes created by the coach auto-generate unique login credentials with collision disambiguation, e.g. `ravi`, `ravi2`)*

---

## 4. Automated Verification Commands

All test suites run non-destructively against the local fallback or Atlas database:

```bash
# 1. Run all 4 Core Hackathon Checks + Concurrency Edge Cases
npm run verify

# 2. Run Phase 2 Player CRUD, Auth, Cascade Deletion & Collision Suite
npm run verify:phase2

# 3. Run Phase 3 Deep Session Lifecycle & Immutability Suite
npm run verify:phase3

# 4. Run Phase 4 Deep Match Scoring & Absent Refusal Suite
npm run verify:phase4

# 5. Run Phase 5 Ready Logic, Scout Exclusivity & Monochromatic Design Audit
npm run verify:phase5

# 6. Run Live Production Smoke Test against any live URL (or localhost)
BASE_URL=https://<your-deployment-url>.vercel.app npm run verify:live

# 7. Type check & production build
npx tsc --noEmit
npm run build
```

---

## 5. Technology Stack

* **Framework**: Next.js 16.4.3 (App Router, Webpack)
* **Language**: TypeScript (Strict Mode)
* **Styling**: Tailwind CSS, Lucide Icons, Shadcn UI
* **Database**: MongoDB with automatic resilient local disk fallback (`.data/academy-desk.json`)
* **Authentication**: NextAuth.js (JWT session strategy, bcrypt hashing)
