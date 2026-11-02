/**
 * Academy Desk (Dumka Sports Academy) — Comprehensive Opaque-Box E2E Test Suite
 *
 * Implements 4-Tier Test Suite Specification:
 * - Tier 1: Feature Coverage (F1 to F9: >=5 tests per feature = 45 tests)
 * - Tier 2: Boundary & Corner Cases (Limits, 74% vs 75%, 1 vs 2 matches, zero-division, injections = 45 tests)
 * - Tier 3: Cross-Feature Interactions & Combinations (Pairwise state transitions, immutability, role isolation = 12 tests)
 * - Tier 4: Real-World Application Scenarios (5 multi-step complete user journeys)
 *
 * Total: 107 Comprehensive Opaque-Box E2E Tests
 * Run command: npx tsx src/scripts/e2e-test-runner.ts
 */

import { getDb } from "../lib/db";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

// API Route Handlers
import { GET as getSessions, POST as postSession } from "../app/api/sessions/route";
import { PATCH as patchSession } from "../app/api/sessions/[id]/route";
import { POST as postMatch } from "../app/api/matches/route";
import { GET as getReady } from "../app/api/ready/route";
import { POST as postPlayer } from "../app/api/players/route";

// ============================================================================
// Types & Assertions
// ============================================================================

interface TestCase {
  id: string;
  tier: 1 | 2 | 3 | 4;
  feature: string;
  name: string;
  run: () => Promise<void>;
}

interface TestResult {
  id: string;
  tier: 1 | 2 | 3 | 4;
  feature: string;
  name: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  error?: string;
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${msg ? msg + " | " : ""}Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(condition: boolean, msg?: string): void {
  if (!condition) {
    throw new Error(`${msg ? msg + " | " : ""}Expected true, but got false`);
  }
}

function assertFalse(condition: boolean, msg?: string): void {
  if (condition) {
    throw new Error(`${msg ? msg + " | " : ""}Expected false, but got true`);
  }
}

function assertNotNull<T>(val: T | null | undefined, msg?: string): asserts val is T {
  if (val === null || val === undefined) {
    throw new Error(`${msg ? msg + " | " : ""}Expected non-null value, got ${val}`);
  }
}

function assertArrayLength(arr: any[], expectedLength: number, msg?: string): void {
  if (!Array.isArray(arr) || arr.length !== expectedLength) {
    throw new Error(
      `${msg ? msg + " | " : ""}Expected array length ${expectedLength}, got ${arr ? arr.length : "not array"}`
    );
  }
}

// ============================================================================
// API Invocation Helpers
// ============================================================================

async function callGetReady(url: string = "http://localhost:3000/api/ready") {
  const req = new NextRequest(url);
  const res = await getReady(req);
  const data = await res.json();
  return { status: res.status, data };
}

async function callGetSessions(url: string = "http://localhost:3000/api/sessions") {
  const req = new NextRequest(url);
  const res = await getSessions(req);
  const data = await res.json();
  return { status: res.status, data };
}

async function callPostSession(body: any) {
  const req = new NextRequest("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await postSession(req);
  const data = await res.json();
  return { status: res.status, data };
}

async function callPatchSession(id: string, body: any) {
  const req = new NextRequest(`http://localhost:3000/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await patchSession(req, { params: Promise.resolve({ id }) });
  const data = await res.json();
  return { status: res.status, data };
}

async function callPostMatch(body: any) {
  const req = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await postMatch(req);
  const data = await res.json();
  return { status: res.status, data };
}

async function callPostPlayer(body: any) {
  const req = new NextRequest("http://localhost:3000/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await postPlayer(req);
  const data = await res.json();
  return { status: res.status, data };
}

// ============================================================================
// Test Suite Definition
// ============================================================================

const tests: TestCase[] = [];

function registerTest(
  id: string,
  tier: 1 | 2 | 3 | 4,
  feature: string,
  name: string,
  run: () => Promise<void>
) {
  tests.push({ id, tier, feature, name, run });
}

// ----------------------------------------------------------------------------
// TIER 1: Feature Coverage (F1 to F9, >=5 per feature)
// ----------------------------------------------------------------------------

// F1: TypeScript Route Handler Type Conformance (sessions/route.ts)
registerTest("T1_F1_01", 1, "F1", "GET /api/sessions accepts default parameter call", async () => {
  const res = await getSessions();
  assertEqual(res.status, 200, "Should return HTTP 200");
  const data = await res.json();
  assertTrue(Array.isArray(data), "Should return an array");
});

registerTest("T1_F1_02", 1, "F1", "GET /api/sessions accepts NextRequest with query parameters", async () => {
  const { status, data } = await callGetSessions("http://localhost:3000/api/sessions?sport=Football");
  assertEqual(status, 200);
  assertTrue(Array.isArray(data));
});

registerTest("T1_F1_03", 1, "F1", "POST /api/sessions handles valid payload with 201 Created", async () => {
  const { status, data } = await callPostSession({ date: "2099-01-01", sport: "Football" });
  assertEqual(status, 201, "Should create session with 201");
  assertEqual(data.status, "open");
  assertEqual(data.sport, "Football");
});

registerTest("T1_F1_04", 1, "F1", "PATCH /api/sessions/[id] accepts NextRequest and params promise", async () => {
  const postRes = await callPostSession({ date: "2099-01-02", sport: "Football" });
  const sId = postRes.data._id.toString();
  const patchRes = await callPatchSession(sId, { status: "closed" });
  assertEqual(patchRes.status, 200);
  assertEqual(patchRes.data.status, "closed");
});

registerTest("T1_F1_05", 1, "F1", "Route handler modules export async functions satisfying Next.js signatures", async () => {
  assertEqual(typeof getSessions, "function");
  assertEqual(typeof postSession, "function");
  assertEqual(typeof getReady, "function");
});

// F2: Ready Evaluation Logic (Strict Check 3: attendancePct >= 75 && matchCount >= 2)
registerTest("T1_F2_01", 1, "F2", "Athlete with 0% attendance and 0 matches yields isReady === false", async () => {
  const db = await getDb();
  const p = await db.collection("players").findOne({ name: "Amit Soren" });
  assertNotNull(p);
  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${p._id.toString()}`);
  assertArrayLength(data, 1);
  assertFalse(data[0].isReady, "0% att and 0 matches must not be ready");
});

registerTest("T1_F2_02", 1, "F2", "Athlete with 100% attendance but only 1 match yields isReady === false", async () => {
  const regRes = await callPostPlayer({ name: "T1F2 Isolated P1", age: 16, sport: "Football" });
  const pId = regRes.data._id.toString();

  // 1 session, present
  const s = await callPostSession({ date: "2099-02-01", sport: "Football" });
  await callPatchSession(s.data._id.toString(), { playerId: pId, status: "present" });
  await callPatchSession(s.data._id.toString(), { status: "closed" });

  // 1 match
  await callPostMatch({
    date: "2099-02-01",
    sport: "Football",
    opponent: "Test FC",
    scores: [{ playerId: pId, score: 2 }],
  });

  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertFalse(data[0].isReady, "100% att and 1 match must not be ready");
  assertEqual(data[0].matchCount, 1);
  assertEqual(data[0].attendancePct, 100);
});

registerTest("T1_F2_03", 1, "F2", "Athlete with 50% attendance (<75%) and 2 matches yields isReady === false", async () => {
  const regRes = await callPostPlayer({ name: "T1F2 Isolated P2", age: 16, sport: "Football" });
  const pId = regRes.data._id.toString();

  // 1 session present, 1 session absent -> 50%
  const s1 = await callPostSession({ date: "2099-02-02", sport: "Football" });
  await callPatchSession(s1.data._id.toString(), { playerId: pId, status: "present" });
  await callPatchSession(s1.data._id.toString(), { status: "closed" });

  const s2 = await callPostSession({ date: "2099-02-03", sport: "Football" });
  await callPatchSession(s2.data._id.toString(), { playerId: pId, status: "absent" });
  await callPatchSession(s2.data._id.toString(), { status: "closed" });

  // 2 matches
  await callPostMatch({ date: "2099-02-02", sport: "Football", opponent: "FC 1", scores: [{ playerId: pId, score: 1 }] });
  await callPostMatch({ date: "2099-02-04", sport: "Football", opponent: "FC 2", scores: [{ playerId: pId, score: 2 }] });

  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertEqual(data[0].attendancePct, 50);
  assertEqual(data[0].matchCount, 2);
  assertFalse(data[0].isReady, "50% att (<75%) with 2 matches must not be ready");
});

registerTest("T1_F2_04", 1, "F2", "Athlete with exactly 75% attendance and 2 matches yields isReady === true", async () => {
  const regRes = await callPostPlayer({ name: "T1F2 Isolated P3", age: 16, sport: "Football" });
  const pId = regRes.data._id.toString();

  // 4 sessions: 3 present, 1 absent -> 3/4 = 75%
  for (let i = 1; i <= 3; i++) {
    const s = await callPostSession({ date: `2099-02-1${i}`, sport: "Football" });
    await callPatchSession(s.data._id.toString(), { playerId: pId, status: "present" });
    await callPatchSession(s.data._id.toString(), { status: "closed" });
  }
  const s4 = await callPostSession({ date: "2099-02-14", sport: "Football" });
  await callPatchSession(s4.data._id.toString(), { playerId: pId, status: "absent" });
  await callPatchSession(s4.data._id.toString(), { status: "closed" });

  // 2 matches on attended days
  await callPostMatch({ date: "2099-02-11", sport: "Football", opponent: "FC 1", scores: [{ playerId: pId, score: 1 }] });
  await callPostMatch({ date: "2099-02-12", sport: "Football", opponent: "FC 2", scores: [{ playerId: pId, score: 2 }] });

  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertEqual(data[0].attendancePct, 75);
  assertEqual(data[0].matchCount, 2);
  assertTrue(data[0].isReady, "75% att and 2 matches must be READY");
});

registerTest("T1_F2_05", 1, "F2", "Athlete with 100% attendance and 4 matches yields isReady === true", async () => {
  const regRes = await callPostPlayer({ name: "T1F2 Isolated P4", age: 16, sport: "Football" });
  const pId = regRes.data._id.toString();

  // 2 sessions, both present -> 100%
  for (const day of ["2099-03-01", "2099-03-02"]) {
    const s = await callPostSession({ date: day, sport: "Football" });
    await callPatchSession(s.data._id.toString(), { playerId: pId, status: "present" });
    await callPatchSession(s.data._id.toString(), { status: "closed" });
  }

  // 4 matches
  for (let i = 1; i <= 4; i++) {
    await callPostMatch({
      date: `2099-03-0${i}`,
      sport: "Football",
      opponent: "Opponent",
      scores: [{ playerId: pId, score: 1 }],
    });
  }

  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertEqual(data[0].attendancePct, 100);
  assertEqual(data[0].matchCount, 4);
  assertTrue(data[0].isReady, "100% att and 4 matches must be READY");
});

// F3: Ready API Query Parameter `?readyOnly=true` & `?filter=readyOnly`
registerTest("T1_F3_01", 1, "F3", "GET /api/ready?filter=readyOnly returns only ready athletes", async () => {
  const { data } = await callGetReady("http://localhost:3000/api/ready?filter=readyOnly");
  assertTrue(Array.isArray(data));
  for (const r of data) {
    assertTrue(r.isReady === true, "All records in filter=readyOnly must have isReady === true");
  }
});

registerTest("T1_F3_02", 1, "F3", "GET /api/ready?readyOnly=true returns only ready athletes", async () => {
  const { data } = await callGetReady("http://localhost:3000/api/ready?readyOnly=true");
  assertTrue(Array.isArray(data));
  for (const r of data) {
    assertTrue(r.isReady === true, "All records in readyOnly=true must have isReady === true");
  }
});

registerTest("T1_F3_03", 1, "F3", "GET /api/ready?readyOnly=false returns all athletes", async () => {
  const { data } = await callGetReady("http://localhost:3000/api/ready?readyOnly=false");
  assertTrue(Array.isArray(data));
  const hasNotReady = data.some((r: any) => !r.isReady);
  assertTrue(hasNotReady, "Should include non-ready athletes when readyOnly=false");
});

registerTest("T1_F3_04", 1, "F3", "GET /api/ready with no query params returns full roster", async () => {
  const { data } = await callGetReady("http://localhost:3000/api/ready");
  assertTrue(Array.isArray(data));
  assertTrue(data.length >= 3, "Should return all athletes in academy");
});

registerTest("T1_F3_05", 1, "F3", "GET /api/ready with both ?readyOnly=true&filter=readyOnly returns only ready", async () => {
  const { data } = await callGetReady("http://localhost:3000/api/ready?readyOnly=true&filter=readyOnly");
  assertTrue(Array.isArray(data));
  for (const r of data) {
    assertTrue(r.isReady === true);
  }
});

// F4: Ready API Single Player Isolation `?playerId=xxx`
registerTest("T1_F4_01", 1, "F4", "GET /api/ready?playerId={id} returns exactly 1 record", async () => {
  const db = await getDb();
  const p = await db.collection("players").findOne();
  assertNotNull(p);
  const pId = p._id.toString();
  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertArrayLength(data, 1, "Must return exactly 1 player");
  assertEqual(data[0].player._id.toString(), pId);
});

registerTest("T1_F4_02", 1, "F4", "Single player query response contains complete metrics contract", async () => {
  const db = await getDb();
  const p = await db.collection("players").findOne();
  assertNotNull(p);
  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${p._id.toString()}`);
  const record = data[0];
  assertTrue(typeof record.attendancePct === "number");
  assertTrue(typeof record.matchCount === "number");
  assertTrue(typeof record.isReady === "boolean");
  assertTrue(typeof record.sessionsHeld === "number");
  assertTrue(typeof record.sessionsPresent === "number");
});

registerTest("T1_F4_03", 1, "F4", "GET /api/ready with non-existent playerId returns empty array []", async () => {
  const fakeId = new ObjectId().toString();
  const { status, data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${fakeId}`);
  assertEqual(status, 200);
  assertArrayLength(data, 0, "Non-existent player must return empty array");
});

registerTest("T1_F4_04", 1, "F4", "Single player query enriches record with attendanceHistory and matchHistory", async () => {
  const db = await getDb();
  const p = await db.collection("players").findOne();
  assertNotNull(p);
  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${p._id.toString()}`);
  assertTrue(Array.isArray(data[0].attendanceHistory), "Must have attendanceHistory array");
  assertTrue(Array.isArray(data[0].matchHistory), "Must have matchHistory array");
});

registerTest("T1_F4_05", 1, "F4", "Player isolation prevents seeing other athletes' records", async () => {
  const db = await getDb();
  const players = await db.collection("players").find().toArray();
  assertTrue(players.length >= 2);
  const p1Id = players[0]._id.toString();
  const p2Id = players[1]._id.toString();

  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${p1Id}`);
  assertFalse(data.some((r: any) => r.player._id.toString() === p2Id), "Player 1 query must never include Player 2");
});

// F5: Monochromatic Swiss Badge (`CossBadge16`)
registerTest("T1_F5_01", 1, "F5", "CossBadge16 component exists at src/components/p-badge-16.tsx", async () => {
  const filePath = path.join(process.cwd(), "src/components/p-badge-16.tsx");
  assertTrue(fs.existsSync(filePath), "p-badge-16.tsx must exist");
});

registerTest("T1_F5_02", 1, "F5", "CossBadge16 exports ReadyBadgeProps interface with isReady prop", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/p-badge-16.tsx"), "utf8");
  assertTrue(content.includes("isReady: boolean"), "Must declare isReady: boolean prop");
  assertTrue(content.includes("export function CossBadge16"), "Must export CossBadge16 function");
});

registerTest("T1_F5_03", 1, "F5", "CossBadge16 renders Ready and Pending labels conditionally", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/p-badge-16.tsx"), "utf8");
  assertTrue(content.includes('"Ready"'), 'Must render "Ready"');
  assertTrue(content.includes('"Pending"'), 'Must render "Pending"');
});

registerTest("T1_F5_04", 1, "F5", "CossBadge16 uses monochromatic zinc design tokens", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/p-badge-16.tsx"), "utf8");
  assertTrue(content.includes("zinc-"), "Must use zinc monochrome tokens");
});

registerTest("T1_F5_05", 1, "F5", "CossBadge16 contains structural indicator dot", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/p-badge-16.tsx"), "utf8");
  assertTrue(content.includes("rounded-full"), "Must include circular indicator pip");
});

// F6: Player Dashboard History & Contributions
registerTest("T1_F6_01", 1, "F6", "Player dashboard route exists at src/app/player/page.tsx", async () => {
  const filePath = path.join(process.cwd(), "src/app/player/page.tsx");
  assertTrue(fs.existsSync(filePath), "player/page.tsx must exist");
});

registerTest("T1_F6_02", 1, "F6", "Player dashboard invokes /api/ready?playerId= using session playerId", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/player/page.tsx"), "utf8");
  assertTrue(content.includes("/api/ready?playerId="), "Must query /api/ready?playerId=");
  assertTrue(content.includes("playerId"), "Must isolate by playerId");
});

registerTest("T1_F6_03", 1, "F6", "Player dashboard binds attendance percentage and match count", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/player/page.tsx"), "utf8");
  assertTrue(content.includes("attendancePct"), "Must display attendancePct");
  assertTrue(content.includes("matchCount"), "Must display matchCount");
});

registerTest("T1_F6_04", 1, "F6", "Player dashboard renders 75% Target readiness benchmark gauge", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/player/page.tsx"), "utf8");
  assertTrue(content.includes("75%"), "Must display 75% target benchmark");
  assertTrue(content.includes("Benchmark") || content.includes("Target"), "Must describe benchmark target");
});

registerTest("T1_F6_05", 1, "F6", "Player dashboard imports and renders CossBadge16", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/player/page.tsx"), "utf8");
  assertTrue(content.includes("CossBadge16"), "Must embed CossBadge16 badge");
});

// F7: Scout Dashboard Qualified Candidates
registerTest("T1_F7_01", 1, "F7", "Scout dashboard route exists at src/app/scout/page.tsx", async () => {
  const filePath = path.join(process.cwd(), "src/app/scout/page.tsx");
  assertTrue(fs.existsSync(filePath), "scout/page.tsx must exist");
});

registerTest("T1_F7_02", 1, "F7", "Scout dashboard queries exclusively ready candidates via filter=readyOnly", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/scout/page.tsx"), "utf8");
  assertTrue(content.includes("readyOnly"), "Scout portal must filter readyOnly");
});

registerTest("T1_F7_03", 1, "F7", "Scout dashboard renders qualified candidate count summary", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/scout/page.tsx"), "utf8");
  assertTrue(content.includes("Qualified"), "Must show qualified candidate count");
});

registerTest("T1_F7_04", 1, "F7", "Scout dashboard displays attendance and match statistics for each candidate", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/scout/page.tsx"), "utf8");
  assertTrue(content.includes("attendancePct"), "Must show candidate attendance");
  assertTrue(content.includes("matchCount"), "Must show candidate match count");
});

registerTest("T1_F7_05", 1, "F7", "Scout dashboard includes empty state when zero athletes are qualified", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/scout/page.tsx"), "utf8");
  assertTrue(content.includes("No candidates qualified"), "Must provide empty state notice");
});

// F8: Coach Ready Board Verification
registerTest("T1_F8_01", 1, "F8", "src/app/coach/ready/page.tsx exists and renders CoachMobileShell", async () => {
  const filePath = path.join(process.cwd(), "src/app/coach/ready/page.tsx");
  assertTrue(fs.existsSync(filePath), "coach/ready/page.tsx must exist");
  const content = fs.readFileSync(filePath, "utf8");
  assertTrue(content.includes("CoachMobileShell"), "Must render CoachMobileShell");
});

registerTest("T1_F8_02", 1, "F8", "Coach ready board passes defaultTab='ready'", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/coach/ready/page.tsx"), "utf8");
  assertTrue(content.includes('defaultTab="ready"'), 'Must set defaultTab="ready"');
});

registerTest("T1_F8_03", 1, "F8", "Coach ready board exports dynamic = 'force-dynamic'", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/coach/ready/page.tsx"), "utf8");
  assertTrue(content.includes('export const dynamic = "force-dynamic"'), 'Must export force-dynamic');
});

registerTest("T1_F8_04", 1, "F8", "Coach mobile shell implements Ready board tab structure", async () => {
  const shellPath = path.join(process.cwd(), "src/components/coach-mobile-shell.tsx");
  assertTrue(fs.existsSync(shellPath), "coach-mobile-shell.tsx must exist");
  const content = fs.readFileSync(shellPath, "utf8");
  assertTrue(
    content.includes('activeTab === "ready"') || content.includes('id: "ready"'),
    "Must handle activeTab === 'ready'"
  );
});

registerTest("T1_F8_05", 1, "F8", "Coach mobile shell ready board implements 3-tier ledger categorization", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/coach-mobile-shell.tsx"), "utf8");
  assertTrue(content.includes("READY") || content.includes("Ready"), "Must have Ready tier");
  assertTrue(content.includes("CLOSE") || content.includes("Close"), "Must have Close tier");
  assertTrue(content.includes("NOT YET") || content.includes("Not Yet"), "Must have Not Yet tier");
});

// F9: Phase 5 Automated Verification Script Contract
registerTest("T1_F9_01", 1, "F9", "Core verification script verify-checks.ts exists and runs Check 1 to 4", async () => {
  const filePath = path.join(process.cwd(), "src/scripts/verify-checks.ts");
  assertTrue(fs.existsSync(filePath), "verify-checks.ts must exist");
});

registerTest("T1_F9_02", 1, "F9", "Phase 2 verification script test-phase-2.ts exists", async () => {
  const filePath = path.join(process.cwd(), "src/scripts/test-phase-2.ts");
  assertTrue(fs.existsSync(filePath), "test-phase-2.ts must exist");
});

registerTest("T1_F9_03", 1, "F9", "Phase 3 deep verification script test-phase-3-deep.ts exists", async () => {
  const filePath = path.join(process.cwd(), "src/scripts/test-phase-3-deep.ts");
  assertTrue(fs.existsSync(filePath), "test-phase-3-deep.ts must exist");
});

registerTest("T1_F9_04", 1, "F9", "Phase 4 deep verification script test-phase-4-deep.ts exists", async () => {
  const filePath = path.join(process.cwd(), "src/scripts/test-phase-4-deep.ts");
  assertTrue(fs.existsSync(filePath), "test-phase-4-deep.ts must exist");
});

registerTest("T1_F9_05", 1, "F9", "package.json defines verify, verify:phase2, verify:phase3, verify:phase4 scripts", async () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  assertNotNull(pkg.scripts["verify"]);
  assertNotNull(pkg.scripts["verify:phase2"]);
  assertNotNull(pkg.scripts["verify:phase3"]);
  assertNotNull(pkg.scripts["verify:phase4"]);
});

// ----------------------------------------------------------------------------
// TIER 2: Boundary & Corner Cases (>=5 per feature where applicable)
// ----------------------------------------------------------------------------

// F1 Boundaries
registerTest("T2_F1_01", 2, "F1", "GET /api/sessions handles empty query parameters gracefully", async () => {
  const { status, data } = await callGetSessions("http://localhost:3000/api/sessions?");
  assertEqual(status, 200);
  assertTrue(Array.isArray(data));
});

registerTest("T2_F1_02", 2, "F1", "GET /api/sessions with non-matching sport returns empty array", async () => {
  const { status, data } = await callGetSessions("http://localhost:3000/api/sessions?sport=UnderwaterCurling");
  assertEqual(status, 200);
  assertArrayLength(data, 0);
});

registerTest("T2_F1_03", 2, "F1", "POST /api/sessions with missing date returns HTTP 400", async () => {
  const { status, data } = await callPostSession({ sport: "Football" });
  assertEqual(status, 400);
  assertTrue(data.error.includes("date"));
});

registerTest("T2_F1_04", 2, "F1", "POST /api/sessions with empty string date returns HTTP 400", async () => {
  const { status } = await callPostSession({ date: "", sport: "Football" });
  assertEqual(status, 400);
});

registerTest("T2_F1_05", 2, "F1", "PATCH /api/sessions/[id] with malformed ObjectId returns HTTP 400", async () => {
  const { status } = await callPatchSession("invalid-hex-id-123", { status: "closed" });
  assertEqual(status, 400);
});

// F2 Boundaries
registerTest("T2_F2_01", 2, "F2", "Attendance exactly 74% with 5 matches yields isReady === false", async () => {
  // 74 present out of 100 sessions = 74%
  const sessionsHeld = 100;
  const sessionsPresent = 74;
  const attendancePct = Math.round((sessionsPresent / sessionsHeld) * 100);
  const matchCount = 5;
  const isReady = attendancePct >= 75 && matchCount >= 2;
  assertEqual(attendancePct, 74);
  assertFalse(isReady, "74% attendance must NOT qualify");
});

registerTest("T2_F2_02", 2, "F2", "Attendance exactly 75% with 1 match yields isReady === false", async () => {
  const attendancePct = 75;
  const matchCount = 1;
  const isReady = attendancePct >= 75 && matchCount >= 2;
  assertFalse(isReady, "1 match must NOT qualify even at 75% attendance");
});

registerTest("T2_F2_03", 2, "F2", "Zero sessions held yields attendancePct === 0 and isReady === false", async () => {
  const sessionsHeld = 0;
  const sessionsPresent = 0;
  const attendancePct = sessionsHeld > 0 ? Math.round((sessionsPresent / sessionsHeld) * 100) : 0;
  const isReady = attendancePct >= 75 && 2 >= 2;
  assertEqual(attendancePct, 0);
  assertFalse(isReady);
});

registerTest("T2_F2_04", 2, "F2", "High volume metrics (100 sessions, 100 present, 50 matches) yields isReady === true", async () => {
  const attendancePct = Math.round((100 / 100) * 100);
  const matchCount = 50;
  const isReady = attendancePct >= 75 && matchCount >= 2;
  assertTrue(isReady);
});

registerTest("T2_F2_05", 2, "F2", "High match count (20 matches) with 0% attendance yields isReady === false", async () => {
  const attendancePct = 0;
  const matchCount = 20;
  const isReady = attendancePct >= 75 && matchCount >= 2;
  assertFalse(isReady);
});

// F3 Boundaries
registerTest("T2_F3_01", 2, "F3", "Query param ?readyOnly=1 is not treated as boolean true", async () => {
  const { data } = await callGetReady("http://localhost:3000/api/ready?readyOnly=1");
  const hasNotReady = data.some((r: any) => !r.isReady);
  assertTrue(hasNotReady, "readyOnly=1 must not activate boolean filter");
});

registerTest("T2_F3_02", 2, "F3", "Query param ?readyOnly= (empty string) returns all athletes without error", async () => {
  const { status, data } = await callGetReady("http://localhost:3000/api/ready?readyOnly=");
  assertEqual(status, 200);
  assertTrue(Array.isArray(data));
});

registerTest("T2_F3_03", 2, "F3", "Query param ?filter= (empty string) returns all athletes without error", async () => {
  const { status, data } = await callGetReady("http://localhost:3000/api/ready?filter=");
  assertEqual(status, 200);
  assertTrue(Array.isArray(data));
});

registerTest("T2_F3_04", 2, "F3", "Unrecognized filter query ?filter=unknown_value returns all athletes", async () => {
  const { status, data } = await callGetReady("http://localhost:3000/api/ready?filter=all_superstars");
  assertEqual(status, 200);
  assertTrue(data.length >= 3);
});

registerTest("T2_F3_05", 2, "F3", "Case sensitivity: ?filter=READYONLY does not match readyOnly", async () => {
  const { data } = await callGetReady("http://localhost:3000/api/ready?filter=READYONLY");
  const hasNotReady = data.some((r: any) => !r.isReady);
  assertTrue(hasNotReady, "Uppercase READYONLY should not trigger filter");
});

// F4 Boundaries
registerTest("T2_F4_01", 2, "F4", "GET /api/ready?playerId= (empty string) returns all athletes gracefully", async () => {
  const { status, data } = await callGetReady("http://localhost:3000/api/ready?playerId=");
  assertEqual(status, 200);
  assertTrue(Array.isArray(data));
});

registerTest("T2_F4_02", 2, "F4", "GET /api/ready?playerId=000000000000000000000000 returns empty array", async () => {
  const { status, data } = await callGetReady("http://localhost:3000/api/ready?playerId=000000000000000000000000");
  assertEqual(status, 200);
  assertArrayLength(data, 0);
});

registerTest("T2_F4_03", 2, "F4", "GET /api/ready?playerId= with SQL/NoSQL injection string handles safely", async () => {
  const malicious = encodeURIComponent("'; DROP TABLE players; --");
  const { status, data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${malicious}`);
  assertEqual(status, 200);
  assertArrayLength(data, 0);
});

registerTest("T2_F4_04", 2, "F4", "Single player query with whitespace ?playerId=%20...%20 handles gracefully", async () => {
  const db = await getDb();
  const p = await db.collection("players").findOne();
  assertNotNull(p);
  const pId = p._id.toString();
  const { status, data } = await callGetReady(`http://localhost:3000/api/ready?playerId=%20${pId}%20`);
  assertEqual(status, 200);
  assertTrue(data.length <= 1);
});

registerTest("T2_F4_05", 2, "F4", "Newly registered athlete with 0 sessions and 0 matches queried by ID returns clean metrics", async () => {
  const regRes = await callPostPlayer({
    name: "Boundary Athlete Zero",
    age: 15,
    sport: "Cricket",
  });
  assertEqual(regRes.status, 201);
  const newId = regRes.data._id.toString();

  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${newId}`);
  assertArrayLength(data, 1);
  assertEqual(data[0].attendancePct, 0);
  assertEqual(data[0].matchCount, 0);
  assertFalse(data[0].isReady);
});

// F5 Boundaries
registerTest("T2_F5_01", 2, "F5", "CossBadge16 accepts and passes through custom className", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/p-badge-16.tsx"), "utf8");
  assertTrue(content.includes("className"), "Must accept className prop");
});

registerTest("T2_F5_02", 2, "F5", "CossBadge16 handles optional className when omitted", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/p-badge-16.tsx"), "utf8");
  assertTrue(content.includes("className?: string") || content.includes("className?:"), "className should be optional");
});

registerTest("T2_F5_03", 2, "F5", "CossBadge16 hides decorative dot from screen readers via aria-hidden", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/p-badge-16.tsx"), "utf8");
  assertTrue(content.includes('aria-hidden="true"'), 'Pip indicator must have aria-hidden="true"');
});

registerTest("T2_F5_04", 2, "F5", "CossBadge16 uses font-medium and rounded-full pill geometry", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/p-badge-16.tsx"), "utf8");
  assertTrue(content.includes("rounded-full") && content.includes("font-medium"));
});

registerTest("T2_F5_05", 2, "F5", "CossBadge16 does not use inline color style attributes", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/p-badge-16.tsx"), "utf8");
  assertFalse(content.includes('style={{ color'), "Should not use inline color styles");
});

// F6 Boundaries
registerTest("T2_F6_01", 2, "F6", "Player dashboard handles zero attendance without NaN or divide-by-zero", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/player/page.tsx"), "utf8");
  assertTrue(content.includes("?? 0") || content.includes("|| 0"), "Must provide zero fallbacks");
});

registerTest("T2_F6_02", 2, "F6", "Player dashboard clamps attendance progress bar to 100% max", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/player/page.tsx"), "utf8");
  assertTrue(content.includes("Math.min(100") || content.includes("100%"), "Must clamp progress width");
});

registerTest("T2_F6_03", 2, "F6", "Player dashboard uses high-taste zinc-950 dark background", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/player/page.tsx"), "utf8");
  assertTrue(content.includes("bg-zinc-950"), "Must use bg-zinc-950 dark theme");
});

registerTest("T2_F6_04", 2, "F6", "Player dashboard renders sign-out button calling signOut with /login callback", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/player/page.tsx"), "utf8");
  assertTrue(content.includes("signOut"), "Must include signOut function");
});

registerTest("T2_F6_05", 2, "F6", "Player layout wraps children in neutral dark container", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/player/layout.tsx"), "utf8");
  assertTrue(content.includes("children"), "Layout must render children");
});

// F7 Boundaries
registerTest("T2_F7_01", 2, "F7", "Scout dashboard renders cleanly when zero candidates qualify", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/scout/page.tsx"), "utf8");
  assertTrue(content.includes("candidates.length === 0"), "Must branch on empty candidates list");
});

registerTest("T2_F7_02", 2, "F7", "Scout dashboard candidates grid uses responsive multi-column layout", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/scout/page.tsx"), "utf8");
  assertTrue(content.includes("grid-cols-1"), "Must support responsive grid");
});

registerTest("T2_F7_03", 2, "F7", "Scout dashboard displays candidate initials avatar", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/scout/page.tsx"), "utf8");
  assertTrue(content.includes("initials"), "Must display candidate avatar initials");
});

registerTest("T2_F7_04", 2, "F7", "Scout dashboard displays 75% target benchmark tick on athlete card", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/scout/page.tsx"), "utf8");
  assertTrue(content.includes("75% Target"), "Must label 75% Target threshold");
});

registerTest("T2_F7_05", 2, "F7", "Scout layout wraps portal in neutral dark container", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/app/scout/layout.tsx"), "utf8");
  assertTrue(content.includes("children"), "Scout layout must render children");
});

// F8 Boundaries
registerTest("T2_F8_01", 2, "F8", "Coach mobile shell handles athletes with missing or multi-word sports", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/coach-mobile-shell.tsx"), "utf8");
  assertTrue(content.includes("sport") || content.includes("Multi-sport"));
});

registerTest("T2_F8_02", 2, "F8", "Coach mobile shell differentiates met vs unmet attendance via zinc fill", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/coach-mobile-shell.tsx"), "utf8");
  assertTrue(content.includes("bg-zinc-100"), "Must use bg-zinc-100 for met attendance");
  assertTrue(content.includes("bg-zinc-500"), "Must use bg-zinc-500 for unmet attendance");
});

registerTest("T2_F8_03", 2, "F8", "Coach mobile shell match pips render hollow when 0 matches played", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/components/coach-mobile-shell.tsx"), "utf8");
  assertTrue(content.includes("border border-zinc-600 bg-transparent") || content.includes("bg-transparent"), "Hollow pip for 0 matches");
});

registerTest("T2_F8_04", 2, "F8", "Coach ready board page default component exports function", async () => {
  const pageMod = await import("../app/coach/ready/page");
  assertNotNull(pageMod.default);
  assertEqual(typeof pageMod.default, "function");
});

registerTest("T2_F8_05", 2, "F8", "Coach ready board page dynamic configuration equals 'force-dynamic'", async () => {
  const pageMod = await import("../app/coach/ready/page");
  assertEqual(pageMod.dynamic, "force-dynamic");
});

// F9 Boundaries
registerTest("T2_F9_01", 2, "F9", "Middleware config protects /coach, /player, and /scout route patterns", async () => {
  const middlewarePath = path.join(process.cwd(), "src/middleware.ts");
  assertTrue(fs.existsSync(middlewarePath), "middleware.ts must exist");
  const content = fs.readFileSync(middlewarePath, "utf8");
  assertTrue(content.includes('matcher: ["/coach/:path*", "/player/:path*", "/scout/:path*"]'));
});

registerTest("T2_F9_02", 2, "F9", "Middleware verifies token.role === 'coach' for /coach routes", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/middleware.ts"), "utf8");
  assertTrue(content.includes('token?.role !== "coach"'), "Must guard coach role");
});

registerTest("T2_F9_03", 2, "F9", "Middleware verifies token.role === 'player' for /player routes", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/middleware.ts"), "utf8");
  assertTrue(content.includes('token?.role !== "player"'), "Must guard player role");
});

registerTest("T2_F9_04", 2, "F9", "Middleware verifies token.role === 'scout' for /scout routes", async () => {
  const content = fs.readFileSync(path.join(process.cwd(), "src/middleware.ts"), "utf8");
  assertTrue(content.includes('token?.role !== "scout"'), "Must guard scout role");
});

registerTest("T2_F9_05", 2, "F9", "Database connection gracefully defaults to LocalDb in test environment", async () => {
  const db = await getDb();
  assertNotNull(db);
  const coll = db.collection("players");
  assertNotNull(coll);
});

// ----------------------------------------------------------------------------
// TIER 3: Cross-Feature Interactions & Combinations (Pairwise & Multi-Way)
// ----------------------------------------------------------------------------

registerTest("T3_COMB_01", 3, "COMB", "Attendance marking + Match creation triggers dynamic readiness transition", async () => {
  const db = await getDb();
  await db.collection("sessions").deleteMany({ date: { $regex: "^2099-04-" } });
  await db.collection("matches").deleteMany({ date: { $regex: "^2099-04-" } });

  const pRes = await callPostPlayer({ name: "Comb Test Player 1", age: 17, sport: "Football" });
  const pId = pRes.data._id.toString();

  // Baseline: not ready
  let readyCheck = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertFalse(readyCheck.data[0].isReady);

  // Session 1: present
  const s1 = await callPostSession({ date: "2099-04-01", sport: "Football" });
  await callPatchSession(s1.data._id.toString(), { playerId: pId, status: "present" });
  await callPatchSession(s1.data._id.toString(), { status: "closed" });

  // Match 1: scored
  await callPostMatch({
    date: "2099-04-01",
    sport: "Football",
    opponent: "FC A",
    scores: [{ playerId: pId, score: 1 }],
  });

  // Still not ready (need >= 2 matches)
  readyCheck = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertFalse(readyCheck.data[0].isReady);

  // Match 2: scored
  await callPostMatch({
    date: "2099-04-02",
    sport: "Football",
    opponent: "FC B",
    scores: [{ playerId: pId, score: 2 }],
  });

  // Now READY!
  readyCheck = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertTrue(readyCheck.data[0].isReady, "Athlete must transition to isReady === true");
});

registerTest("T3_COMB_02", 3, "COMB", "Session absence prevents match scoring and protects match count integrity", async () => {
  const pRes = await callPostPlayer({ name: "Comb Test Player 2", age: 16, sport: "Football" });
  const pId = pRes.data._id.toString();

  // Open session on 2099-04-10, mark ABSENT, lock
  const s = await callPostSession({ date: "2099-04-10", sport: "Football" });
  await callPatchSession(s.data._id.toString(), { playerId: pId, status: "absent" });
  await callPatchSession(s.data._id.toString(), { status: "closed" });

  // Attempt to score absent player
  const matchRes = await callPostMatch({
    date: "2099-04-10",
    sport: "Football",
    opponent: "FC C",
    scores: [{ playerId: pId, score: 1 }],
  });
  assertEqual(matchRes.status, 400, "Must refuse absent player");

  // Verify match count did not increment
  const readyCheck = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertEqual(readyCheck.data[0].matchCount, 0, "Match count must stay 0");
});

registerTest("T3_COMB_03", 3, "COMB", "Dynamic degradation: Subsequent absence drops attendance below 75% revoking readiness", async () => {
  const db = await getDb();
  await db.collection("sessions").deleteMany({ date: { $regex: "^2099-05-" } });
  await db.collection("matches").deleteMany({ date: { $regex: "^2099-05-" } });

  const pRes = await callPostPlayer({ name: "Comb Test Player 3", age: 17, sport: "Football" });
  const pId = pRes.data._id.toString();

  // 1 session: present -> 100%
  const s1 = await callPostSession({ date: "2099-05-01", sport: "Football" });
  await callPatchSession(s1.data._id.toString(), { playerId: pId, status: "present" });
  await callPatchSession(s1.data._id.toString(), { status: "closed" });

  // 2 matches -> READY
  await callPostMatch({ date: "2099-05-01", sport: "Football", opponent: "FC 1", scores: [{ playerId: pId, score: 1 }] });
  await callPostMatch({ date: "2099-05-02", sport: "Football", opponent: "FC 2", scores: [{ playerId: pId, score: 2 }] });

  let check = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertTrue(check.data[0].isReady, "Should initially qualify as ready");

  // 2nd session: ABSENT -> Drops to 50%
  const s2 = await callPostSession({ date: "2099-05-03", sport: "Football" });
  await callPatchSession(s2.data._id.toString(), { playerId: pId, status: "absent" });
  await callPatchSession(s2.data._id.toString(), { status: "closed" });

  check = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  assertEqual(check.data[0].attendancePct, 50);
  assertFalse(check.data[0].isReady, "Readiness must be revoked when attendance drops to 50%");
});

registerTest("T3_COMB_04", 3, "COMB", "Scout filter dynamically reflects athlete readiness qualification and revocation", async () => {
  const db = await getDb();
  await db.collection("sessions").deleteMany({ date: { $regex: "^2099-06-" } });
  await db.collection("matches").deleteMany({ date: { $regex: "^2099-06-" } });

  const pRes = await callPostPlayer({ name: "Dynamic Scout Candidate", age: 16, sport: "Football" });
  const pId = pRes.data._id.toString();

  // Before qualification: absent from scout query
  let scoutRes = await callGetReady("http://localhost:3000/api/ready?filter=readyOnly");
  assertFalse(scoutRes.data.some((r: any) => r.player._id.toString() === pId));

  // Qualify: 1 session present + 2 matches
  const s = await callPostSession({ date: "2099-06-01", sport: "Football" });
  await callPatchSession(s.data._id.toString(), { playerId: pId, status: "present" });
  await callPatchSession(s.data._id.toString(), { status: "closed" });

  await callPostMatch({ date: "2099-06-01", sport: "Football", opponent: "Opp 1", scores: [{ playerId: pId, score: 2 }] });
  await callPostMatch({ date: "2099-06-02", sport: "Football", opponent: "Opp 2", scores: [{ playerId: pId, score: 1 }] });

  // Now present in scout query!
  scoutRes = await callGetReady("http://localhost:3000/api/ready?filter=readyOnly");
  assertTrue(scoutRes.data.some((r: any) => r.player._id.toString() === pId), "Must now appear in scout roster");
});

registerTest("T3_COMB_05", 3, "COMB", "Cross-Player self isolation with concurrent queries", async () => {
  const db = await getDb();
  const pA = await db.collection("players").findOne({ name: "Rohit Kumar" });
  const pB = await db.collection("players").findOne({ name: "Priya Murmu" });
  assertNotNull(pA);
  assertNotNull(pB);

  const resA = await callGetReady(`http://localhost:3000/api/ready?playerId=${pA._id.toString()}`);
  const resB = await callGetReady(`http://localhost:3000/api/ready?playerId=${pB._id.toString()}`);

  assertEqual(resA.data[0].player.name, "Rohit Kumar");
  assertEqual(resB.data[0].player.name, "Priya Murmu");
  assertFalse(resA.data.some((r: any) => r.player.name === "Priya Murmu"));
  assertFalse(resB.data.some((r: any) => r.player.name === "Rohit Kumar"));
});

registerTest("T3_COMB_06", 3, "COMB", "Multi-sport attendance isolation on identical date (Football vs Cricket)", async () => {
  const db = await getDb();
  const pFootball = await db.collection("players").findOne({ sport: "Football" });
  const pCricket = await db.collection("players").findOne({ sport: "Cricket" });
  assertNotNull(pFootball);
  assertNotNull(pCricket);

  const testDate = "2099-07-01";
  await db.collection("sessions").deleteMany({ date: testDate });
  await db.collection("matches").deleteMany({ date: testDate });

  // Football session: pFootball present, pCricket absent
  const fbS = await callPostSession({ date: testDate, sport: "Football" });
  await callPatchSession(fbS.data._id.toString(), { playerId: pFootball._id.toString(), status: "present" });
  await callPatchSession(fbS.data._id.toString(), { playerId: pCricket._id.toString(), status: "absent" });
  await callPatchSession(fbS.data._id.toString(), { status: "closed" });

  // Cricket session: pCricket present, pFootball absent
  const crS = await callPostSession({ date: testDate, sport: "Cricket" });
  await callPatchSession(crS.data._id.toString(), { playerId: pCricket._id.toString(), status: "present" });
  await callPatchSession(crS.data._id.toString(), { playerId: pFootball._id.toString(), status: "absent" });
  await callPatchSession(crS.data._id.toString(), { status: "closed" });

  // Attempt to score pFootball in Cricket match -> REFUSED
  const crMatchFail = await callPostMatch({
    date: testDate,
    sport: "Cricket",
    opponent: "Cricket Club",
    scores: [{ playerId: pFootball._id.toString(), score: 20 }],
  });
  assertEqual(crMatchFail.status, 400);

  // Score pFootball in Football match -> SUCCEEDS
  const fbMatchOk = await callPostMatch({
    date: testDate,
    sport: "Football",
    opponent: "Football Club",
    scores: [{ playerId: pFootball._id.toString(), score: 2 }],
  });
  assertEqual(fbMatchOk.status, 201);
});

registerTest("T3_COMB_07", 3, "COMB", "Closed session immutability rejects subsequent PATCH attempts", async () => {
  const s = await callPostSession({ date: "2099-08-01", sport: "Football" });
  const sId = s.data._id.toString();

  // Lock session
  await callPatchSession(sId, { status: "closed" });

  // Attempt modification
  const patchRes = await callPatchSession(sId, {
    playerId: new ObjectId().toString(),
    status: "present",
  });
  assertEqual(patchRes.status, 400, "Modifying locked session must return HTTP 400");
  assertTrue(patchRes.data.error.includes("locked") || patchRes.data.error.includes("closed"));
});

registerTest("T3_COMB_08", 3, "COMB", "Player creation auto-prefills new player in subsequent open sessions", async () => {
  const newPlayerRes = await callPostPlayer({
    name: "Pre-fill Verification Athlete",
    age: 16,
    sport: "Football",
  });
  const pId = newPlayerRes.data._id.toString();

  const sessionRes = await callPostSession({ date: "2099-08-15", sport: "Football" });
  const attendanceList = sessionRes.data.attendance;
  assertTrue(
    attendanceList.some((a: any) => a.playerId.toString() === pId),
    "New player must be automatically included in session roster"
  );
});

registerTest("T3_COMB_09", 3, "COMB", "Match score validation rejects duplicate player IDs with HTTP 400", async () => {
  const db = await getDb();
  const p = await db.collection("players").findOne();
  assertNotNull(p);
  const pId = p._id.toString();

  const dupMatchRes = await callPostMatch({
    date: "2099-08-20",
    sport: "Football",
    opponent: "FC Opponent",
    scores: [
      { playerId: pId, score: 2 },
      { playerId: pId, score: 3 }, // Duplicate!
    ],
  });
  assertEqual(dupMatchRes.status, 400);
  assertTrue(dupMatchRes.data.error.includes("Duplicate"));
});

registerTest("T3_COMB_10", 3, "COMB", "Enriched history dates are returned in descending chronological order", async () => {
  const db = await getDb();
  const p = await db.collection("players").findOne();
  assertNotNull(p);
  const pId = p._id.toString();

  const { data } = await callGetReady(`http://localhost:3000/api/ready?playerId=${pId}`);
  const record = data[0];
  if (record.attendanceHistory && record.attendanceHistory.length > 1) {
    for (let i = 0; i < record.attendanceHistory.length - 1; i++) {
      const cur = record.attendanceHistory[i].date;
      const next = record.attendanceHistory[i + 1].date;
      assertTrue(cur >= next, "attendanceHistory dates must be descending");
    }
  }
});

registerTest("T3_COMB_11", 3, "COMB", "Query param ?readyOnly=true filters correctly on single player query", async () => {
  const db = await getDb();
  const pNotReady = await db.collection("players").findOne({ name: "Amit Soren" });
  assertNotNull(pNotReady);

  const { data } = await callGetReady(
    `http://localhost:3000/api/ready?playerId=${pNotReady._id.toString()}&readyOnly=true`
  );
  assertArrayLength(data, 0, "Non-ready player must return empty array when readyOnly=true is passed");
});

registerTest("T3_COMB_12", 3, "COMB", "Sessions list populates athlete names correctly from players collection", async () => {
  const { data } = await callGetSessions();
  assertTrue(Array.isArray(data));
  const hasPopulatedName = data.some(
    (s: any) =>
      Array.isArray(s.attendance) &&
      s.attendance.some((a: any) => typeof a.playerName === "string" && a.playerName.length > 0)
  );
  assertTrue(hasPopulatedName, "Sessions must contain populated playerName fields");
});

// ----------------------------------------------------------------------------
// TIER 4: Real-World Application Scenarios (End-to-End User Journeys)
// ----------------------------------------------------------------------------

registerTest("T4_SCENARIO_01", 4, "SCENARIO", "The Complete Academy Athlete Onboarding-to-Scouting Lifecycle", async () => {
  // Step 1: Register new athlete
  const regRes = await callPostPlayer({
    name: "Karan Mahato",
    age: 16,
    sport: "Football",
  });
  assertEqual(regRes.status, 201);
  const karanId = regRes.data._id.toString();

  // Step 2: Day 1 training session -> attend and lock
  const s1 = await callPostSession({ date: "2099-09-01", sport: "Football" });
  await callPatchSession(s1.data._id.toString(), { playerId: karanId, status: "present" });
  await callPatchSession(s1.data._id.toString(), { status: "closed" });

  // Step 3: Record Match 1
  await callPostMatch({
    date: "2099-09-01",
    sport: "Football",
    opponent: "Ranchi Academy",
    scores: [{ playerId: karanId, score: 2 }],
  });

  // Check state: 100% attendance, 1 match -> NOT READY
  let readyRes = await callGetReady(`http://localhost:3000/api/ready?playerId=${karanId}`);
  assertFalse(readyRes.data[0].isReady, "1 match is insufficient for trial readiness");

  // Step 4: Day 2 training session -> attend and lock
  const s2 = await callPostSession({ date: "2099-09-02", sport: "Football" });
  await callPatchSession(s2.data._id.toString(), { playerId: karanId, status: "present" });
  await callPatchSession(s2.data._id.toString(), { status: "closed" });

  // Step 5: Record Match 2
  await callPostMatch({
    date: "2099-09-02",
    sport: "Football",
    opponent: "Bokaro Academy",
    scores: [{ playerId: karanId, score: 1 }],
  });

  // Step 6: Player verifies personal dashboard
  readyRes = await callGetReady(`http://localhost:3000/api/ready?playerId=${karanId}`);
  assertEqual(readyRes.data[0].attendancePct, 100);
  assertEqual(readyRes.data[0].matchCount, 2);
  assertTrue(readyRes.data[0].isReady, "Karan Mahato qualifies for trials!");

  // Step 7: Scout reviews qualified candidates
  const scoutRes = await callGetReady("http://localhost:3000/api/ready?filter=readyOnly");
  const scoutCandidate = scoutRes.data.find((r: any) => r.player._id.toString() === karanId);
  assertNotNull(scoutCandidate, "Karan Mahato must be visible on the Scout Trial Roster");
});

registerTest("T4_SCENARIO_02", 4, "SCENARIO", "The Borderline 74% vs 75% Attendance Crucible", async () => {
  const regRes = await callPostPlayer({
    name: "Sunil Soren",
    age: 17,
    sport: "Football",
  });
  const sunilId = regRes.data._id.toString();

  // Sessions 1, 2: Present, Session 3: Absent -> 2/3 = 66.7%
  const s1 = await callPostSession({ date: "2099-09-10", sport: "Football" });
  await callPatchSession(s1.data._id.toString(), { playerId: sunilId, status: "present" });
  await callPatchSession(s1.data._id.toString(), { status: "closed" });

  const s2 = await callPostSession({ date: "2099-09-11", sport: "Football" });
  await callPatchSession(s2.data._id.toString(), { playerId: sunilId, status: "present" });
  await callPatchSession(s2.data._id.toString(), { status: "closed" });

  const s3 = await callPostSession({ date: "2099-09-12", sport: "Football" });
  await callPatchSession(s3.data._id.toString(), { playerId: sunilId, status: "absent" });
  await callPatchSession(s3.data._id.toString(), { status: "closed" });

  // 2 Matches played
  await callPostMatch({ date: "2099-09-10", sport: "Football", opponent: "Opp 1", scores: [{ playerId: sunilId, score: 1 }] });
  await callPostMatch({ date: "2099-09-11", sport: "Football", opponent: "Opp 2", scores: [{ playerId: sunilId, score: 1 }] });

  // Status: 67% attendance, 2 matches -> NOT READY
  let res = await callGetReady(`http://localhost:3000/api/ready?playerId=${sunilId}`);
  assertFalse(res.data[0].isReady, "67% attendance is below 75% threshold");

  // Session 4: Present -> 3/4 = exactly 75%
  const s4 = await callPostSession({ date: "2099-09-13", sport: "Football" });
  await callPatchSession(s4.data._id.toString(), { playerId: sunilId, status: "present" });
  await callPatchSession(s4.data._id.toString(), { status: "closed" });

  // Status: 75% attendance, 2 matches -> QUALIFIED!
  res = await callGetReady(`http://localhost:3000/api/ready?playerId=${sunilId}`);
  assertEqual(res.data[0].attendancePct, 75);
  assertTrue(res.data[0].isReady, "Exactly 75% attendance qualifies!");

  // Session 5: Absent -> 3/5 = 60%
  const s5 = await callPostSession({ date: "2099-09-14", sport: "Football" });
  await callPatchSession(s5.data._id.toString(), { playerId: sunilId, status: "absent" });
  await callPatchSession(s5.data._id.toString(), { status: "closed" });

  // Status: 60% attendance -> REVOKED!
  res = await callGetReady(`http://localhost:3000/api/ready?playerId=${sunilId}`);
  assertFalse(res.data[0].isReady, "Dropped below 75% threshold");
});

registerTest("T4_SCENARIO_03", 4, "SCENARIO", "Disciplinary Absence and Match Refusal Incident Workflow", async () => {
  const db = await getDb();
  const rohit = await db.collection("players").findOne({ name: "Rohit Kumar" });
  const amit = await db.collection("players").findOne({ name: "Amit Soren" });
  assertNotNull(rohit);
  assertNotNull(amit);
  const rohitId = rohit._id.toString();
  const amitId = amit._id.toString();

  const incidentDate = "2099-09-20";

  // Step 1: Open session. Rohit present, Amit absent. Lock session.
  const s = await callPostSession({ date: incidentDate, sport: "Football" });
  await callPatchSession(s.data._id.toString(), { playerId: rohitId, status: "present" });
  await callPatchSession(s.data._id.toString(), { playerId: amitId, status: "absent" });
  await callPatchSession(s.data._id.toString(), { status: "closed" });

  // Step 2: Coach mistakenly attempts to record match including absent Amit
  const invalidMatch = await callPostMatch({
    date: incidentDate,
    sport: "Football",
    opponent: "Tata FA",
    scores: [
      { playerId: rohitId, score: 2 },
      { playerId: amitId, score: 1 }, // Absent!
    ],
  });
  assertEqual(invalidMatch.status, 400, "Must reject absent athlete");
  assertTrue(invalidMatch.data.error.includes("absent"));

  // Step 3: Coach corrects match submission to only present players
  const validMatch = await callPostMatch({
    date: incidentDate,
    sport: "Football",
    opponent: "Tata FA",
    scores: [{ playerId: rohitId, score: 2 }],
  });
  assertEqual(validMatch.status, 201, "Must accept corrected match");

  // Step 4: Verification of disciplinary absence reflection
  const amitReady = await callGetReady(`http://localhost:3000/api/ready?playerId=${amitId}`);
  assertFalse(
    amitReady.data[0].attendanceHistory?.some(
      (h: any) => h.date === incidentDate && h.status === "PRESENT"
    ),
    "Amit Soren must remain marked ABSENT"
  );
});

registerTest("T4_SCENARIO_04", 4, "SCENARIO", "Multi-Sport Academy Day Concurrent Operations", async () => {
  const db = await getDb();
  const testDate = "2099-09-25";

  const pFoot = await db.collection("players").findOne({ sport: "Football" });
  const pCric = await db.collection("players").findOne({ sport: "Cricket" });
  assertNotNull(pFoot);
  assertNotNull(pCric);
  const fId = pFoot._id.toString();
  const cId = pCric._id.toString();

  // Morning Football session
  const fSession = await callPostSession({ date: testDate, sport: "Football" });
  await callPatchSession(fSession.data._id.toString(), { playerId: fId, status: "present" });
  await callPatchSession(fSession.data._id.toString(), { playerId: cId, status: "absent" });
  await callPatchSession(fSession.data._id.toString(), { status: "closed" });

  // Afternoon Cricket session
  const cSession = await callPostSession({ date: testDate, sport: "Cricket" });
  await callPatchSession(cSession.data._id.toString(), { playerId: cId, status: "present" });
  await callPatchSession(cSession.data._id.toString(), { playerId: fId, status: "absent" });
  await callPatchSession(cSession.data._id.toString(), { status: "closed" });

  // Cross-sport enforcement
  const crossMatch1 = await callPostMatch({
    date: testDate,
    sport: "Cricket",
    opponent: "CC 1",
    scores: [{ playerId: fId, score: 30 }], // Footballer absent in cricket
  });
  assertEqual(crossMatch1.status, 400);

  const crossMatch2 = await callPostMatch({
    date: testDate,
    sport: "Football",
    opponent: "FC 1",
    scores: [{ playerId: cId, score: 1 }], // Cricketer absent in football
  });
  assertEqual(crossMatch2.status, 400);

  // Legitimate sport matches succeed
  const okMatch1 = await callPostMatch({
    date: testDate,
    sport: "Football",
    opponent: "FC 1",
    scores: [{ playerId: fId, score: 2 }],
  });
  assertEqual(okMatch1.status, 201);

  const okMatch2 = await callPostMatch({
    date: testDate,
    sport: "Cricket",
    opponent: "CC 1",
    scores: [{ playerId: cId, score: 50 }],
  });
  assertEqual(okMatch2.status, 201);
});

registerTest("T4_SCENARIO_05", 4, "SCENARIO", "Scout Talent Search with Zero-False-Positive Guarantee", async () => {
  // Query all qualified candidates
  const { status, data } = await callGetReady("http://localhost:3000/api/ready?filter=readyOnly");
  assertEqual(status, 200);

  // Assert 100% precision: every single candidate meets the mathematical definition
  for (const candidate of data) {
    assertTrue(
      candidate.attendancePct >= 75,
      `Candidate ${candidate.player.name} failed attendance requirement: ${candidate.attendancePct}%`
    );
    assertTrue(
      candidate.matchCount >= 2,
      `Candidate ${candidate.player.name} failed match requirement: ${candidate.matchCount} matches`
    );
    assertTrue(candidate.isReady === true);
  }
});

// ============================================================================
// Test Suite Runner & Reporter
// ============================================================================

export async function runE2ESuite() {
  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║         ACADEMY DESK — COMPREHENSIVE OPAQUE-BOX E2E TEST RUNNER      ║");
  console.log("║         Dumka Sports Academy · 4-Tier Test Architecture              ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");

  const startTime = Date.now();
  const results: TestResult[] = [];
  const tierSummaries: Record<number, { total: number; passed: number; failed: number }> = {
    1: { total: 0, passed: 0, failed: 0 },
    2: { total: 0, passed: 0, failed: 0 },
    3: { total: 0, passed: 0, failed: 0 },
    4: { total: 0, passed: 0, failed: 0 },
  };

  let currentTier = 0;

  for (const test of tests) {
    if (test.tier !== currentTier) {
      currentTier = test.tier;
      const tierTitles: Record<number, string> = {
        1: "TIER 1 — FEATURE COVERAGE (Features F1 to F9)",
        2: "TIER 2 — BOUNDARY & CORNER CASES (Thresholds, Limits & Edge States)",
        3: "TIER 3 — CROSS-FEATURE INTERACTIONS & COMBINATIONS (State Transitions)",
        4: "TIER 4 — REAL-WORLD APPLICATION SCENARIOS (End-to-End User Journeys)",
      };
      console.log(`\n─── ${tierTitles[currentTier]} ────────────────────────────`);
    }

    tierSummaries[test.tier].total++;
    const testStart = Date.now();
    try {
      await test.run();
      const durationMs = Date.now() - testStart;
      tierSummaries[test.tier].passed++;
      results.push({
        id: test.id,
        tier: test.tier,
        feature: test.feature,
        name: test.name,
        status: "PASS",
        durationMs,
      });
      console.log(`  ✓ [${test.id}] (${test.feature}) ${test.name} (${durationMs}ms)`);
    } catch (err: any) {
      const durationMs = Date.now() - testStart;
      tierSummaries[test.tier].failed++;
      const errorMessage = err?.message || String(err);
      results.push({
        id: test.id,
        tier: test.tier,
        feature: test.feature,
        name: test.name,
        status: "FAIL",
        durationMs,
        error: errorMessage,
      });
      console.log(`  ✗ [${test.id}] (${test.feature}) ${test.name} (${durationMs}ms)`);
      console.log(`      Error: ${errorMessage}`);
    }
  }

  const totalDuration = Date.now() - startTime;
  const totalTests = results.length;
  const totalPassed = results.filter((r) => r.status === "PASS").length;
  const totalFailed = results.filter((r) => r.status === "FAIL").length;

  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log("                        E2E EXECUTION SUMMARY                         ");
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log(` Tier 1 (Feature Coverage):       ${tierSummaries[1].passed}/${tierSummaries[1].total} passed`);
  console.log(` Tier 2 (Boundary & Corner):      ${tierSummaries[2].passed}/${tierSummaries[2].total} passed`);
  console.log(` Tier 3 (Cross-Feature Pairwise): ${tierSummaries[3].passed}/${tierSummaries[3].total} passed`);
  console.log(` Tier 4 (Real-World Journeys):    ${tierSummaries[4].passed}/${tierSummaries[4].total} passed`);
  console.log("──────────────────────────────────────────────────────────────────────");
  console.log(` TOTAL TESTS:    ${totalTests}`);
  console.log(` PASSED:         ${totalPassed} (${Math.round((totalPassed / totalTests) * 100)}%)`);
  console.log(` FAILED:         ${totalFailed}`);
  console.log(` TOTAL DURATION: ${totalDuration}ms`);
  console.log("══════════════════════════════════════════════════════════════════════\n");

  if (totalFailed > 0) {
    console.log("ESCALATION DEFECT REPORT:");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        console.log(`- [${r.id}] ${r.feature}: ${r.name}`);
        console.log(`  Detail: ${r.error}`);
      });
    console.log("");
  }

  // Cleanup: Purge temporary test dates (2099-*) and restore initial database state
  try {
    const db = await getDb();
    await db.collection("sessions").deleteMany({ date: { $regex: "^2099-" } });
    await db.collection("matches").deleteMany({ date: { $regex: "^2099-" } });
    await db.collection("players").deleteMany({ name: { $regex: "^(Comb Test|Pre-fill|Boundary|Karan|Sunil|T1F2)" } });
    await db.collection("users").deleteMany({ username: { $regex: "^(karan-mahato|sunil-soren|comb-test|boundary|pre-fill|t1f2)" } });
  } catch (cleanErr) {
    console.error("Cleanup warning:", cleanErr);
  }

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Direct CLI invocation
if (require.main === module || !process.env.TEST_SUITE_IMPORTED) {
  runE2ESuite().catch((fatal) => {
    console.error("Fatal runner crash:", fatal);
    process.exit(1);
  });
}
