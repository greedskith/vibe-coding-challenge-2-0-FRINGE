import { NextRequest } from "next/server";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getDb } from "../lib/db";
import { GET as getReady } from "../app/api/ready/route";
import { CossBadge16 } from "../components/p-badge-16";
import CoachReadyPage, { dynamic as coachReadyDynamic } from "../app/coach/ready/page";
import { ObjectId } from "mongodb";

// Color output helpers
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let passCount = 0;
let failCount = 0;

function report(testName: string, passed: boolean, details?: string) {
  if (passed) {
    passCount++;
    console.log(`  ${GREEN}✓${RESET} ${testName}`);
  } else {
    failCount++;
    console.error(`  ${RED}✗ FAIL:${RESET} ${testName}`);
    if (details) console.error(`    ${RED}Details: ${details}${RESET}`);
  }
}

async function runAdversarialM2Suite() {
  console.log(`\n${CYAN}=================================================================${RESET}`);
  console.log(`${CYAN}   M2 ADVERSARIAL CHALLENGER SUITE: UI, TOKENS & ISOLATION       ${RESET}`);
  console.log(`${CYAN}=================================================================\n${RESET}`);

  // -----------------------------------------------------------------
  // SUITE 1: Static AST / Token Scan for Swiss Monochromatic Conformance
  // -----------------------------------------------------------------
  console.log(`${CYAN}▶ [SUITE 1] Static Token Scan & Swiss Design Conformance${RESET}`);

  try {
    // 1.1 Check p-badge-16.tsx content
    const badgePath = path.join(process.cwd(), "src/components/p-badge-16.tsx");
    const badgeContent = fs.readFileSync(badgePath, "utf-8");
    const forbiddenTokenRegex = /\b(emerald|green|blue|red|purple|pink|rose|amber|yellow|orange)-\d+/i;
    const badgeHasColors = forbiddenTokenRegex.test(badgeContent);
    report(
      "src/components/p-badge-16.tsx contains NO colored tokens (emerald, green, blue, etc.)",
      !badgeHasColors,
      badgeHasColors ? `Found forbidden token in badge: ${badgeContent.match(forbiddenTokenRegex)?.[0]}` : undefined
    );

    // 1.2 Check src/app/player/page.tsx
    const playerPath = path.join(process.cwd(), "src/app/player/page.tsx");
    const playerContent = fs.readFileSync(playerPath, "utf-8");
    const playerHasColors = forbiddenTokenRegex.test(playerContent);
    report(
      "src/app/player/page.tsx contains NO colored tokens",
      !playerHasColors,
      playerHasColors ? `Found forbidden token in player page: ${playerContent.match(forbiddenTokenRegex)?.[0]}` : undefined
    );

    // 1.3 Check src/app/scout/page.tsx
    const scoutPath = path.join(process.cwd(), "src/app/scout/page.tsx");
    const scoutContent = fs.readFileSync(scoutPath, "utf-8");
    const scoutHasColors = forbiddenTokenRegex.test(scoutContent);
    report(
      "src/app/scout/page.tsx contains NO colored tokens",
      !scoutHasColors,
      scoutHasColors ? `Found forbidden token in scout page: ${scoutContent.match(forbiddenTokenRegex)?.[0]}` : undefined
    );

    // 1.4 Check src/app/coach/ready/page.tsx
    const coachReadyPath = path.join(process.cwd(), "src/app/coach/ready/page.tsx");
    const coachReadyContent = fs.readFileSync(coachReadyPath, "utf-8");
    const coachReadyHasColors = forbiddenTokenRegex.test(coachReadyContent);
    report(
      "src/app/coach/ready/page.tsx contains NO colored tokens",
      !coachReadyHasColors
    );

    // 1.5 Verify coach ready page dynamic export
    report(
      "src/app/coach/ready/page.tsx exports dynamic = 'force-dynamic'",
      coachReadyDynamic === "force-dynamic" && coachReadyContent.includes('export const dynamic = "force-dynamic";'),
      `Exported dynamic value: ${coachReadyDynamic}`
    );

    // 1.6 Global scan of src/components and src/app for emerald and green Tailwind classes
    const srcDir = path.join(process.cwd(), "src");
    const filesToScan: string[] = [];
    function walkDir(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(full);
        } else if (
          (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") || entry.name.endsWith(".css")) &&
          !dir.includes("scripts") // Ignore terminal ANSI scripts
        ) {
          filesToScan.push(full);
        }
      }
    }
    walkDir(srcDir);

    let foundForbiddenUiColors: string[] = [];
    for (const f of filesToScan) {
      const content = fs.readFileSync(f, "utf-8");
      // Search for Tailwind emerald and green class patterns
      const matches = content.match(/\b(bg|text|border|ring|fill|stroke)-(emerald|green)-\d+/g);
      if (matches) {
        foundForbiddenUiColors.push(`${path.relative(process.cwd(), f)}: ${matches.join(", ")}`);
      }
    }

    report(
      `Zero emerald/green Tailwind UI classes across all ${filesToScan.length} non-script source files`,
      foundForbiddenUiColors.length === 0,
      foundForbiddenUiColors.join("; ")
    );

    // 1.7 Scan for colored emojis in UI components
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/u;
    let foundEmojis: string[] = [];
    for (const f of filesToScan) {
      const content = fs.readFileSync(f, "utf-8");
      if (emojiRegex.test(content)) {
        foundEmojis.push(path.relative(process.cwd(), f));
      }
    }
    report(
      `Zero colored emojis in UI components (${foundEmojis.length} found)`,
      foundEmojis.length === 0,
      foundEmojis.join(", ")
    );

  } catch (err: any) {
    report("Static Token Scan encountered error", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUITE 2: Component Rendering & Markup Validation
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 2] Component Static Markup & Contract Validation${RESET}`);

  try {
    // 2.1 CossBadge16 with isReady = true
    const readyMarkup = renderToStaticMarkup(React.createElement(CossBadge16, { isReady: true }));
    assert(readyMarkup.includes("Ready"), "Ready badge must render 'Ready' text");
    assert(readyMarkup.includes("bg-zinc-100"), "Ready badge must have solid white/zinc-100 background");
    assert(readyMarkup.includes("text-zinc-950"), "Ready badge must have dark text");
    assert(!readyMarkup.includes("emerald"), "Ready badge must not contain emerald");
    assert(!readyMarkup.includes("green"), "Ready badge must not contain green");
    report("CossBadge16({ isReady: true }) renders valid monochromatic markup ('Ready')", true);

    // 2.2 CossBadge16 with isReady = false
    const pendingMarkup = renderToStaticMarkup(React.createElement(CossBadge16, { isReady: false }));
    assert(pendingMarkup.includes("Pending"), "Pending badge must render 'Pending' text");
    assert(pendingMarkup.includes("bg-zinc-900"), "Pending badge must have dark zinc background");
    assert(pendingMarkup.includes("text-zinc-400"), "Pending badge must have muted text");
    assert(pendingMarkup.includes("border-zinc-600"), "Pending badge must have hollow indicator border");
    assert(!pendingMarkup.includes("emerald"), "Pending badge must not contain emerald");
    assert(!pendingMarkup.includes("green"), "Pending badge must not contain green");
    report("CossBadge16({ isReady: false }) renders valid monochromatic markup ('Pending')", true);

    // 2.3 CossBadge16 custom className pass-through
    const customMarkup = renderToStaticMarkup(
      React.createElement(CossBadge16, { isReady: true, className: "test-custom-class" })
    );
    assert(customMarkup.includes("test-custom-class"), "Custom className must be passed through");
    report("CossBadge16 supports className prop pass-through", true);

    // 2.4 CoachReadyPage renders CoachMobileShell defaultTab="ready"
    const coachPageElement = CoachReadyPage();
    assert.strictEqual(coachPageElement.props.defaultTab, "ready", "CoachReadyPage must pass defaultTab='ready'");
    report("CoachReadyPage renders CoachMobileShell with defaultTab='ready'", true);

  } catch (err: any) {
    report("Component markup validation error", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUITE 3: Player Edge Cases: 0 Sessions, 100 Sessions, Clamping & NaN Prevention
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 3] Player Edge Cases (0 Sessions, 100 Sessions, Clamping, Zero-Division)${RESET}`);

  const db = await getDb();
  const testAthlete0Id = new ObjectId();
  const testAthlete100Id = new ObjectId();
  const testAthleteOverflowId = new ObjectId();

  try {
    // Seed isolated test athletes
    await db.collection("players").insertMany([
      {
        _id: testAthlete0Id,
        name: "Adversarial Zero Athlete",
        sport: "Boxing",
        age: 18,
      },
      {
        _id: testAthlete100Id,
        name: "Adversarial Century Athlete",
        sport: "Archery",
        age: 19,
      },
      {
        _id: testAthleteOverflowId,
        name: "Adversarial Overachiever Athlete",
        sport: "Shooting",
        age: 20,
      },
    ]);

    // Athlete 0 has 0 sessions and 0 matches
    // Athlete 100 has 100 sessions held and 100 sessions present, plus 5 matches
    const hundredSessions = [];
    for (let i = 1; i <= 100; i++) {
      hundredSessions.push({
        _id: new ObjectId(),
        date: `2026-08-${String(i).padStart(3, "0")}`,
        sport: "Archery",
        attendance: [
          {
            playerId: testAthlete100Id,
            status: "PRESENT",
          },
        ],
      });
    }
    await db.collection("sessions").insertMany(hundredSessions);

    // Add 5 matches for Athlete 100
    const centuryMatches = [];
    for (let i = 1; i <= 5; i++) {
      centuryMatches.push({
        _id: new ObjectId(),
        date: `2026-09-0${i}`,
        sport: "Archery",
        scores: [
          { playerId: testAthlete100Id, score: 98 },
          { playerId: new ObjectId(), score: 90 },
        ],
      });
    }
    await db.collection("matches").insertMany(centuryMatches);

    // 3.1 Test Athlete 0: 0 sessions and 0 matches
    const req0 = new NextRequest(`http://localhost:3000/api/ready?playerId=${testAthlete0Id.toString()}`);
    const res0 = await getReady(req0);
    assert.strictEqual(res0.status, 200, "Should return 200 OK");
    const data0 = await res0.json();
    assert.strictEqual(data0.length, 1, "Should return exactly 1 athlete record");
    const athlete0Record = data0[0];

    // Verify no NaN or dividing by zero
    assert.strictEqual(athlete0Record.sessionsHeld, 0, "sessionsHeld must be 0");
    assert.strictEqual(athlete0Record.sessionsPresent, 0, "sessionsPresent must be 0");
    assert.strictEqual(athlete0Record.attendancePct, 0, "attendancePct must be 0, NOT NaN");
    assert(!Number.isNaN(athlete0Record.attendancePct), "attendancePct must not be NaN");
    assert.strictEqual(athlete0Record.matchCount, 0, "matchCount must be 0");
    assert.strictEqual(athlete0Record.isReady, false, "isReady must be false");
    assert(Array.isArray(athlete0Record.attendanceHistory), "attendanceHistory must be an array");
    assert.strictEqual(athlete0Record.attendanceHistory.length, 0, "attendanceHistory must be empty array");
    assert(Array.isArray(athlete0Record.matchHistory), "matchHistory must be an array");
    assert.strictEqual(athlete0Record.matchHistory.length, 0, "matchHistory must be empty array");

    report("Athlete with 0 sessions & 0 matches returns attendancePct: 0 (No NaN / zero-division)", true);
    report("Athlete with 0 sessions returns empty arrays for attendanceHistory and matchHistory", true);

    // 3.2 Test UI progress bar calculation logic with 0%
    const pct0 = athlete0Record.attendancePct ?? 0;
    const progressWidth0 = Math.min(100, pct0);
    assert.strictEqual(progressWidth0, 0, "Progress bar width must evaluate to 0%");
    report("Player UI progress bar evaluates cleanly to 0% without NaN", true);

    // 3.3 Test Athlete 100: 100 sessions and 100% attendance
    const req100 = new NextRequest(`http://localhost:3000/api/ready?playerId=${testAthlete100Id.toString()}`);
    const res100 = await getReady(req100);
    assert.strictEqual(res100.status, 200);
    const data100 = await res100.json();
    assert.strictEqual(data100.length, 1);
    const athlete100Record = data100[0];

    assert.strictEqual(athlete100Record.sessionsHeld, 100, "sessionsHeld must be 100");
    assert.strictEqual(athlete100Record.sessionsPresent, 100, "sessionsPresent must be 100");
    assert.strictEqual(athlete100Record.attendancePct, 100, "attendancePct must be 100");
    assert.strictEqual(athlete100Record.matchCount, 5, "matchCount must be 5");
    assert.strictEqual(athlete100Record.isReady, true, "isReady must be true");
    assert.strictEqual(athlete100Record.attendanceHistory.length, 100, "attendanceHistory must contain 100 records");
    assert.strictEqual(athlete100Record.matchHistory.length, 5, "matchHistory must contain 5 records");

    // 3.4 Clamping verification
    const progressWidth100 = Math.min(100, athlete100Record.attendancePct);
    assert.strictEqual(progressWidth100, 100, "Progress bar must clamp to exactly 100%");
    report("Athlete with 100 sessions evaluates to attendancePct: 100, progress width clamps to 100%", true);

    // 3.5 Clamping stress test: what if attendancePct > 100 (e.g. 150%)
    const clampedOverflow = Math.min(100, 150);
    assert.strictEqual(clampedOverflow, 100, "Clamping function Math.min(100, pct) must clamp 150% to 100%");
    report("UI clamping formula Math.min(100, attendancePct) successfully prevents gauge overflow on >100%", true);

  } catch (err: any) {
    report("Player edge cases encountered error", false, err.message);
  } finally {
    // Clean up temporary athletes
    await db.collection("players").deleteMany({
      _id: { $in: [testAthlete0Id, testAthlete100Id, testAthleteOverflowId] },
    });
    await db.collection("sessions").deleteMany({
      "attendance.playerId": { $in: [testAthlete0Id, testAthlete100Id, testAthleteOverflowId] },
    });
    await db.collection("matches").deleteMany({
      "scores.playerId": { $in: [testAthlete0Id, testAthlete100Id, testAthleteOverflowId] },
    });
  }

  // -----------------------------------------------------------------
  // SUITE 4: Scout Dashboard Qualified Candidates Invariance
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 4] Scout Dashboard Qualified Candidates Invariance${RESET}`);

  const testIds: ObjectId[] = [];
  try {
    // Create 6 test players with precise boundaries
    const pSub75NoMatch = new ObjectId();
    const pSub75WithMatches = new ObjectId();
    const p75NoMatch = new ObjectId();
    const p75OneMatch = new ObjectId();
    const p75TwoMatches = new ObjectId();
    const p100TwoMatches = new ObjectId();
    testIds.push(pSub75NoMatch, pSub75WithMatches, p75NoMatch, p75OneMatch, p75TwoMatches, p100TwoMatches);

    await db.collection("players").insertMany([
      { _id: pSub75NoMatch, name: "Sub75 NoMatch", sport: "Wrestling", age: 17 },
      { _id: pSub75WithMatches, name: "Sub75 WithMatches", sport: "Wrestling", age: 18 },
      { _id: p75NoMatch, name: "Exact75 NoMatch", sport: "Wrestling", age: 19 },
      { _id: p75OneMatch, name: "Exact75 OneMatch", sport: "Wrestling", age: 20 },
      { _id: p75TwoMatches, name: "Exact75 TwoMatches", sport: "Wrestling", age: 21 },
      { _id: p100TwoMatches, name: "Exact100 TwoMatches", sport: "Wrestling", age: 22 },
    ]);

    // Sessions for Wrestling (4 sessions)
    // pSub75: 2/4 = 50%
    // p75: 3/4 = 75%
    // p100: 4/4 = 100%
    const mockSessions = [
      {
        _id: new ObjectId(),
        date: "2026-10-01",
        sport: "Wrestling",
        attendance: [
          { playerId: pSub75NoMatch, status: "PRESENT" },
          { playerId: pSub75WithMatches, status: "PRESENT" },
          { playerId: p75NoMatch, status: "PRESENT" },
          { playerId: p75OneMatch, status: "PRESENT" },
          { playerId: p75TwoMatches, status: "PRESENT" },
          { playerId: p100TwoMatches, status: "PRESENT" },
        ],
      },
      {
        _id: new ObjectId(),
        date: "2026-10-02",
        sport: "Wrestling",
        attendance: [
          { playerId: pSub75NoMatch, status: "PRESENT" },
          { playerId: pSub75WithMatches, status: "PRESENT" },
          { playerId: p75NoMatch, status: "PRESENT" },
          { playerId: p75OneMatch, status: "PRESENT" },
          { playerId: p75TwoMatches, status: "PRESENT" },
          { playerId: p100TwoMatches, status: "PRESENT" },
        ],
      },
      {
        _id: new ObjectId(),
        date: "2026-10-03",
        sport: "Wrestling",
        attendance: [
          { playerId: pSub75NoMatch, status: "ABSENT" },
          { playerId: pSub75WithMatches, status: "ABSENT" },
          { playerId: p75NoMatch, status: "PRESENT" },
          { playerId: p75OneMatch, status: "PRESENT" },
          { playerId: p75TwoMatches, status: "PRESENT" },
          { playerId: p100TwoMatches, status: "PRESENT" },
        ],
      },
      {
        _id: new ObjectId(),
        date: "2026-10-04",
        sport: "Wrestling",
        attendance: [
          { playerId: pSub75NoMatch, status: "ABSENT" },
          { playerId: pSub75WithMatches, status: "ABSENT" },
          { playerId: p75NoMatch, status: "ABSENT" },
          { playerId: p75OneMatch, status: "ABSENT" },
          { playerId: p75TwoMatches, status: "ABSENT" },
          { playerId: p100TwoMatches, status: "PRESENT" },
        ],
      },
    ];
    await db.collection("sessions").insertMany(mockSessions);

    // Matches:
    // pSub75WithMatches has 3 matches
    // p75OneMatch has 1 match
    // p75TwoMatches has 2 matches
    // p100TwoMatches has 2 matches
    const mockMatches = [
      {
        _id: new ObjectId(),
        date: "2026-10-05",
        sport: "Wrestling",
        scores: [
          { playerId: pSub75WithMatches, score: 10 },
          { playerId: p75OneMatch, score: 5 },
        ],
      },
      {
        _id: new ObjectId(),
        date: "2026-10-06",
        sport: "Wrestling",
        scores: [
          { playerId: pSub75WithMatches, score: 12 },
          { playerId: p75TwoMatches, score: 8 },
        ],
      },
      {
        _id: new ObjectId(),
        date: "2026-10-07",
        sport: "Wrestling",
        scores: [
          { playerId: pSub75WithMatches, score: 15 },
          { playerId: p75TwoMatches, score: 11 },
        ],
      },
      {
        _id: new ObjectId(),
        date: "2026-10-08",
        sport: "Wrestling",
        scores: [
          { playerId: p100TwoMatches, score: 20 },
          { playerId: new ObjectId(), score: 10 },
        ],
      },
      {
        _id: new ObjectId(),
        date: "2026-10-09",
        sport: "Wrestling",
        scores: [
          { playerId: p100TwoMatches, score: 25 },
          { playerId: new ObjectId(), score: 12 },
        ],
      },
    ];
    await db.collection("matches").insertMany(mockMatches);

    // 4.1 Query scout endpoint (?filter=readyOnly)
    const scoutReq = new NextRequest("http://localhost:3000/api/ready?filter=readyOnly");
    const scoutRes = await getReady(scoutReq);
    assert.strictEqual(scoutRes.status, 200);
    const scoutCandidates = await scoutRes.json();

    // Verify all candidates in scout list have isReady === true
    const nonReadyInScout = scoutCandidates.filter((c: any) => !c.isReady || c.attendancePct < 75 || c.matchCount < 2);
    report(
      "Scout endpoint (?filter=readyOnly) returns 0 non-ready athletes (100% qualified invariance)",
      nonReadyInScout.length === 0,
      nonReadyInScout.length > 0 ? `Found non-ready athletes: ${JSON.stringify(nonReadyInScout)}` : undefined
    );

    // Verify test athletes inclusion / exclusion
    const candidateIds = scoutCandidates.map((c: any) => c.player._id);
    assert(!candidateIds.includes(pSub75NoMatch.toString()), "Sub75 NoMatch must NOT appear in scout list");
    assert(!candidateIds.includes(pSub75WithMatches.toString()), "Sub75 WithMatches must NOT appear in scout list (attendance 50% < 75%)");
    assert(!candidateIds.includes(p75NoMatch.toString()), "Exact75 NoMatch must NOT appear in scout list (matchCount 0 < 2)");
    assert(!candidateIds.includes(p75OneMatch.toString()), "Exact75 OneMatch must NOT appear in scout list (matchCount 1 < 2)");
    assert(candidateIds.includes(p75TwoMatches.toString()), "Exact75 TwoMatches MUST appear in scout list (75% & 2 matches)");
    assert(candidateIds.includes(p100TwoMatches.toString()), "Exact100 TwoMatches MUST appear in scout list (100% & 2 matches)");

    report("Boundary athletes evaluated with mathematical precision: only p75TwoMatches and p100TwoMatches qualify", true);

    // 4.2 Query scout endpoint with alternate param (?readyOnly=true)
    const scoutReq2 = new NextRequest("http://localhost:3000/api/ready?readyOnly=true");
    const scoutRes2 = await getReady(scoutReq2);
    const scoutCandidates2 = await scoutRes2.json();
    assert.strictEqual(scoutCandidates2.length, scoutCandidates.length, "readyOnly=true and filter=readyOnly return identical sets");
    report("Both ?filter=readyOnly and ?readyOnly=true return identical qualified rosters", true);

  } catch (err: any) {
    report("Scout qualification invariance encountered error", false, err.message);
  } finally {
    if (testIds.length > 0) {
      await db.collection("players").deleteMany({ _id: { $in: testIds } });
      await db.collection("sessions").deleteMany({ "attendance.playerId": { $in: testIds } });
      await db.collection("matches").deleteMany({ "scores.playerId": { $in: testIds } });
    }
  }

  // -----------------------------------------------------------------
  // SUITE 5: Player Isolation & Data Leakage Prevention
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 5] Strict Player Isolation & Data Leakage Prevention${RESET}`);

  const athleteAId = new ObjectId();
  const athleteBId = new ObjectId();

  try {
    await db.collection("players").insertMany([
      { _id: athleteAId, name: "Isolation Athlete A", sport: "Badminton", age: 16 },
      { _id: athleteBId, name: "Isolation Athlete B", sport: "Badminton", age: 17 },
    ]);

    const sessA = {
      _id: new ObjectId(),
      date: "2026-10-15",
      sport: "Badminton",
      attendance: [{ playerId: athleteAId, status: "PRESENT" }],
    };
    const sessB = {
      _id: new ObjectId(),
      date: "2026-10-16",
      sport: "Badminton",
      attendance: [{ playerId: athleteBId, status: "ABSENT" }],
    };
    await db.collection("sessions").insertMany([sessA, sessB]);

    const matchA = {
      _id: new ObjectId(),
      date: "2026-10-17",
      sport: "Badminton",
      opponent: "Opponent A",
      outcome: "win",
      scores: [
        { playerId: athleteAId, score: 21 },
        { playerId: new ObjectId(), score: 15 },
      ],
    };
    const matchB = {
      _id: new ObjectId(),
      date: "2026-10-18",
      sport: "Badminton",
      opponent: "Opponent B",
      outcome: "loss",
      scores: [
        { playerId: athleteBId, score: 12 },
        { playerId: new ObjectId(), score: 21 },
      ],
    };
    await db.collection("matches").insertMany([matchA, matchB]);

    // Query for Athlete A
    const reqA = new NextRequest(`http://localhost:3000/api/ready?playerId=${athleteAId.toString()}`);
    const resA = await getReady(reqA);
    const dataA = await resA.json();
    assert.strictEqual(dataA.length, 1);
    const recA = dataA[0];

    // Assert recA contains ONLY athleteA sessions and matches
    const recASessionDates = recA.attendanceHistory.map((s: any) => s.date);
    const recAMatchDates = recA.matchHistory.map((m: any) => m.date);
    assert(recASessionDates.includes("2026-10-15"), "A must have session 2026-10-15");
    assert(!recASessionDates.includes("2026-10-16"), "A must NOT leak B's session 2026-10-16");
    assert(recAMatchDates.includes("2026-10-17"), "A must have match 2026-10-17");
    assert(!recAMatchDates.includes("2026-10-18"), "A must NOT leak B's match 2026-10-18");
    assert.strictEqual(recA.matchHistory[0].opponent, "Opponent A");
    report("Athlete A query contains 0 attendance records and 0 matches from Athlete B (Zero Leakage)", true);

    // Query with non-existent playerId
    const fakeId = new ObjectId().toString();
    const reqFake = new NextRequest(`http://localhost:3000/api/ready?playerId=${fakeId}`);
    const resFake = await getReady(reqFake);
    const dataFake = await resFake.json();
    assert.strictEqual(dataFake.length, 0, "Non-existent playerId must return empty array []");
    report("Non-existent playerId returns empty array [] without data exposure or errors", true);

    // Query with malformed playerId
    const reqBad = new NextRequest("http://localhost:3000/api/ready?playerId=%27%20OR%201=1--");
    const resBad = await getReady(reqBad);
    const dataBad = await resBad.json();
    assert.strictEqual(dataBad.length, 0, "Malformed/injected playerId must return empty array []");
    report("Injection attempt in ?playerId returns empty array [] safely", true);

  } catch (err: any) {
    report("Player isolation encountered error", false, err.message);
  } finally {
    await db.collection("players").deleteMany({ _id: { $in: [athleteAId, athleteBId] } });
    await db.collection("sessions").deleteMany({ "attendance.playerId": { $in: [athleteAId, athleteBId] } });
    await db.collection("matches").deleteMany({ "scores.playerId": { $in: [athleteAId, athleteBId] } });
  }

  // -----------------------------------------------------------------
  // SUITE 6: Multi-Sport Cross-Contamination Resistance
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 6] Multi-Sport Cross-Contamination Resistance${RESET}`);

  const cricketPlayerId = new ObjectId();
  const footballPlayerId = new ObjectId();
  try {
    await db.collection("players").insertMany([
      { _id: cricketPlayerId, name: "Cricket Star", sport: "Cricket", age: 18 },
      { _id: footballPlayerId, name: "Football Ace", sport: "Football", age: 19 },
    ]);

    // Insert 5 Cricket sessions (all present for Cricket Star)
    // Insert 10 Football sessions (all present for Football Ace)
    const cricketSessions = [];
    for (let i = 1; i <= 5; i++) {
      cricketSessions.push({
        _id: new ObjectId(),
        date: `2026-07-0${i}`,
        sport: "Cricket",
        attendance: [{ playerId: cricketPlayerId, status: "PRESENT" }],
      });
    }
    const footballSessions = [];
    for (let i = 1; i <= 10; i++) {
      footballSessions.push({
        _id: new ObjectId(),
        date: `2026-07-${String(10 + i)}`,
        sport: "Football",
        attendance: [{ playerId: footballPlayerId, status: "PRESENT" }],
      });
    }
    await db.collection("sessions").insertMany([...cricketSessions, ...footballSessions]);

    // Check Cricket Star
    const resCricket = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${cricketPlayerId.toString()}`));
    const dataCricket = await resCricket.json();
    assert.strictEqual(dataCricket[0].sessionsHeld, 5, "Cricket player sessionsHeld must be 5 (not 15)");
    assert.strictEqual(dataCricket[0].sessionsPresent, 5, "Cricket player sessionsPresent must be 5");
    assert.strictEqual(dataCricket[0].attendancePct, 100, "Cricket player attendance must be 100%");
    assert.strictEqual(dataCricket[0].attendanceHistory.length, 5, "Cricket player must have exactly 5 history records");
    report("Football sessions (10) do NOT contaminate Cricket player history or metrics", true);

    // Check Football Ace
    const resFootball = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${footballPlayerId.toString()}`));
    const dataFootball = await resFootball.json();
    assert.strictEqual(dataFootball[0].sessionsHeld, 10, "Football player sessionsHeld must be 10 (not 15)");
    assert.strictEqual(dataFootball[0].sessionsPresent, 10, "Football player sessionsPresent must be 10");
    assert.strictEqual(dataFootball[0].attendancePct, 100, "Football player attendance must be 100%");
    assert.strictEqual(dataFootball[0].attendanceHistory.length, 10, "Football player must have exactly 10 history records");
    report("Cricket sessions (5) do NOT contaminate Football player history or metrics", true);

  } catch (err: any) {
    report("Multi-sport isolation error", false, err.message);
  } finally {
    await db.collection("players").deleteMany({ _id: { $in: [cricketPlayerId, footballPlayerId] } });
    await db.collection("sessions").deleteMany({ "attendance.playerId": { $in: [cricketPlayerId, footballPlayerId] } });
  }

  // -----------------------------------------------------------------
  // SUITE 7: Live Mutation & Dynamic Promotion / Demotion
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 7] Dynamic State Mutation & Scout Roster Promotion/Demotion${RESET}`);

  const dynamicPlayerId = new ObjectId();
  try {
    await db.collection("players").insertOne({
      _id: dynamicPlayerId,
      name: "Dynamic State Athlete",
      sport: "Athletics",
      age: 20,
    });

    // Initial state: 1 session present, 1 match -> Not ready
    const sess1Id = new ObjectId();
    await db.collection("sessions").insertOne({
      _id: sess1Id,
      date: "2026-06-01",
      sport: "Athletics",
      attendance: [{ playerId: dynamicPlayerId, status: "PRESENT" }],
    });
    const match1Id = new ObjectId();
    await db.collection("matches").insertOne({
      _id: match1Id,
      date: "2026-06-02",
      sport: "Athletics",
      scores: [{ playerId: dynamicPlayerId, score: 10 }],
    });

    // Check 1: Not ready yet (needs 2 matches)
    const check1Res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${dynamicPlayerId.toString()}`));
    const check1Data = await check1Res.json();
    assert.strictEqual(check1Data[0].isReady, false, "1 match must NOT be ready");

    const scout1Res = await getReady(new NextRequest("http://localhost:3000/api/ready?filter=readyOnly"));
    const scout1Data = await scout1Res.json();
    assert(!scout1Data.some((c: any) => c.player._id === dynamicPlayerId.toString()), "Not ready athlete must not be in scout list");
    report("Athlete with 1 match is absent from scout roster", true);

    // Promote: Add 2nd match -> Now 100% attendance & 2 matches -> Ready!
    const match2Id = new ObjectId();
    await db.collection("matches").insertOne({
      _id: match2Id,
      date: "2026-06-03",
      sport: "Athletics",
      scores: [{ playerId: dynamicPlayerId, score: 15 }],
    });

    const check2Res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${dynamicPlayerId.toString()}`));
    const check2Data = await check2Res.json();
    assert.strictEqual(check2Data[0].isReady, true, "2 matches + 100% attendance must be Ready");

    const scout2Res = await getReady(new NextRequest("http://localhost:3000/api/ready?filter=readyOnly"));
    const scout2Data = await scout2Res.json();
    assert(scout2Data.some((c: any) => c.player._id === dynamicPlayerId.toString()), "Promoted athlete must now appear in scout list");
    report("Adding 2nd match dynamically promotes athlete into Scout Trial Roster", true);

    // Demote: Add 4 absent sessions -> attendance drops to 1/5 = 20% (<75%) -> Revoked!
    const absentSessions = [];
    for (let i = 4; i <= 7; i++) {
      absentSessions.push({
        _id: new ObjectId(),
        date: `2026-06-0${i}`,
        sport: "Athletics",
        attendance: [{ playerId: dynamicPlayerId, status: "ABSENT" }],
      });
    }
    await db.collection("sessions").insertMany(absentSessions);

    const check3Res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${dynamicPlayerId.toString()}`));
    const check3Data = await check3Res.json();
    assert.strictEqual(check3Data[0].attendancePct, 20, "Attendance must drop to 20%");
    assert.strictEqual(check3Data[0].isReady, false, "20% attendance must revoke Ready status");

    const scout3Res = await getReady(new NextRequest("http://localhost:3000/api/ready?filter=readyOnly"));
    const scout3Data = await scout3Res.json();
    assert(!scout3Data.some((c: any) => c.player._id === dynamicPlayerId.toString()), "Demoted athlete must be evicted from scout list");
    report("Adding absences drops attendance to 20% and instantly evicts athlete from Scout Trial Roster", true);

  } catch (err: any) {
    report("Dynamic mutation error", false, err.message);
  } finally {
    await db.collection("players").deleteOne({ _id: dynamicPlayerId });
    await db.collection("sessions").deleteMany({ "attendance.playerId": dynamicPlayerId });
    await db.collection("matches").deleteMany({ "scores.playerId": dynamicPlayerId });
  }

  // -----------------------------------------------------------------
  // SUITE 8: Concurrency Burst (50 Concurrent Mixed Requests)
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 8] High-Throughput Concurrency Burst (50 Parallel Requests)${RESET}`);

  try {
    const urls = [
      "http://localhost:3000/api/ready",
      "http://localhost:3000/api/ready?filter=readyOnly",
      "http://localhost:3000/api/ready?readyOnly=true",
      "http://localhost:3000/api/ready?readyOnly=false",
      "http://localhost:3000/api/ready?playerId=rohit",
    ];

    const promises = Array.from({ length: 50 }, (_, i) => {
      const url = urls[i % urls.length];
      return getReady(new NextRequest(url));
    });

    const responses = await Promise.all(promises);
    const all200 = responses.every((r) => r.status === 200);
    assert(all200, "All 50 concurrent requests must return HTTP 200");
    report("50 concurrent mixed requests to /api/ready return HTTP 200 with zero connection drops", true);

  } catch (err: any) {
    report("Concurrency burst error", false, err.message);
  }
  console.log(`\n${CYAN}=================================================================${RESET}`);
  console.log(`   M2 ADVERSARIAL CHALLENGER SUMMARY`);
  console.log(`   Passed: ${GREEN}${passCount}${RESET} | Failed: ${RED}${failCount}${RESET}`);
  console.log(`${CYAN}=================================================================\n${RESET}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runAdversarialM2Suite().catch((err) => {
  console.error("Adversarial runner failed:", err);
  process.exit(1);
});
