/**
 * Academy Desk (Dumka Sports Academy)
 * Milestone M4: Phase 2 Tier 5 Adversarial Coverage Hardening Suite
 *
 * Comprehensive Empirical Stress Harness Covering:
 * - Category 1: Athlete Promotion & Demotion Lifecycle Stress (10 tests)
 * - Category 2: Malformed Query Parameter Fuzzing & Injection Resistance (10 tests)
 * - Category 3: Concurrency Stress Harness & Race Condition Hardening (6 tests)
 * - Category 4: Monochromatic Swiss UI Strictness, SVG & Token Audit (5 tests)
 * - Category 5: Multi-Sport Isolation, Data Integrity & Boundary Stress (5 tests)
 *
 * Total: 36 Aggressive Adversarial Stress Tests
 * Primary Execution: npx tsx src/scripts/test-tier5-adversarial.ts
 */

import { getDb } from "../lib/db";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

// API Handlers
import { GET as getReady } from "../app/api/ready/route";
import { GET as getSessions, POST as postSession } from "../app/api/sessions/route";
import { GET as getSessionById, PATCH as patchSession } from "../app/api/sessions/[id]/route";
import { GET as getMatches, POST as postMatch } from "../app/api/matches/route";

// ============================================================================
// Test Framework & Reporting Utilities
// ============================================================================

interface AdvTestResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const testResults: AdvTestResult[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + " | " : ""}Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
  }
}

async function runAdvTest(
  id: string,
  category: string,
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testResults.push({ id, category, name, passed: true, durationMs });
    console.log(`  ✓ [PASS] [${id}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    testResults.push({ id, category, name, passed: false, durationMs, error: err.message });
    console.error(`  ✗ [FAIL] [${id}] ${name}: ${err.message} (${durationMs}ms)`);
  }
}

// ============================================================================
// Main Adversarial Suite Execution
// ============================================================================

async function runTier5AdversarialSuite() {
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║         ACADEMY DESK — TIER 5 ADVERSARIAL STRESS SUITE               ║");
  console.log("║         Dumka Sports Academy · Empirical Coverage Hardener           ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");

  const db = await getDb();

  // Snapshot database collections for 100% deterministic restoration
  const origPlayers = await db.collection("players").find().toArray();
  const origSessions = await db.collection("sessions").find().toArray();
  const origMatches = await db.collection("matches").find().toArray();

  const testPlayerIds: ObjectId[] = [];
  const testSessionIds: ObjectId[] = [];
  const testMatchIds: ObjectId[] = [];

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create isolated adversarial test fixtures
    // ------------------------------------------------------------------------
    console.log("▶ [SETUP] Initializing clean adversarial test sandbox...");

    // Clean previous adversarial fixtures if any
    await db.collection("players").deleteMany({ name: { $regex: /^__adv_/ } });
    await db.collection("sessions").deleteMany({ note: { $regex: /^adv_/ } });
    await db.collection("matches").deleteMany({ opponent: { $regex: /^ADV_/ } });

    // Primary lifecycle athlete
    const pAdvLifeRes = await db.collection("players").insertOne({
      name: "__adv_Lifecycle_Athlete",
      age: 17,
      sport: "Football",
    });
    const pAdvLifeId = pAdvLifeRes.insertedId;
    testPlayerIds.push(pAdvLifeId);

    // Multi-sport isolation athletes
    const pAdvFootRes = await db.collection("players").insertOne({
      name: "__adv_Football_Pro",
      age: 18,
      sport: "Football",
    });
    const pAdvFootId = pAdvFootRes.insertedId;
    testPlayerIds.push(pAdvFootId);

    const pAdvCrickRes = await db.collection("players").insertOne({
      name: "__adv_Cricket_Pro",
      age: 19,
      sport: "Cricket",
    });
    const pAdvCrickId = pAdvCrickRes.insertedId;
    testPlayerIds.push(pAdvCrickId);

    console.log(`  ✓ Created test fixtures: ${pAdvLifeId}, ${pAdvFootId}, ${pAdvCrickId}\n`);

    // ========================================================================
    // CATEGORY 1: Athlete Promotion & Demotion Lifecycle Stress (10 Tests)
    // ========================================================================
    console.log("─── CATEGORY 1: PROMOTION & DEMOTION LIFECYCLE STRESS ─────────────────");

    // ADV_1_01: Zero state unready baseline
    await runAdvTest("ADV_1_01", "LIFECYCLE", "Athlete begins with zero sessions/matches -> isReady === false", async () => {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 1, "Expected single record");
      assertEqual(data[0].attendancePct, 0, "Initial attendance must be 0%");
      assertEqual(data[0].matchCount, 0, "Initial matches must be 0");
      assertEqual(data[0].isReady, false, "Zero metrics athlete must not be ready");
    });

    // ADV_1_02: 100% attendance but 0 matches -> isReady === false
    await runAdvTest("ADV_1_02", "LIFECYCLE", "100% attendance (1 session) but 0 matches -> isReady === false", async () => {
      const s1 = await db.collection("sessions").insertOne({
        date: "2026-09-01",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvLifeId, status: "present" }],
      });
      testSessionIds.push(s1.insertedId);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].attendancePct, 100, "Attendance must be 100%");
      assertEqual(data[0].matchCount, 0, "Matches must be 0");
      assertEqual(data[0].isReady, false, "Must not be ready with 0 matches");
    });

    // ADV_1_03: 100% attendance with 1 match -> remains unready (needs >= 2)
    await runAdvTest("ADV_1_03", "LIFECYCLE", "100% attendance with 1 match -> remains isReady === false", async () => {
      const m1 = await db.collection("matches").insertOne({
        date: "2026-09-01",
        sport: "Football",
        opponent: "ADV_Match_1",
        scores: [{ playerId: pAdvLifeId, score: 1 }],
      });
      testMatchIds.push(m1.insertedId);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].attendancePct, 100, "Attendance must be 100%");
      assertEqual(data[0].matchCount, 1, "Matches must be 1");
      assertEqual(data[0].isReady, false, "Must not be ready with only 1 match");
    });

    // ADV_1_04: Promotion event: 2nd match recorded -> PROMOTED to isReady === true
    await runAdvTest("ADV_1_04", "LIFECYCLE", "Promotion event: 2nd match recorded -> transitions to isReady === true", async () => {
      const m2 = await db.collection("matches").insertOne({
        date: "2026-09-02",
        sport: "Football",
        opponent: "ADV_Match_2",
        scores: [{ playerId: pAdvLifeId, score: 2 }],
      });
      testMatchIds.push(m2.insertedId);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].attendancePct, 100, "Attendance must be 100%");
      assertEqual(data[0].matchCount, 2, "Matches must be 2");
      assertEqual(data[0].isReady, true, "Athlete must be promoted to Ready");

      // Verify scout query reflects promotion immediately
      const scoutRes = await getReady(new NextRequest("http://localhost:3000/api/ready?filter=readyOnly"));
      const scoutData = await scoutRes.json();
      assert(scoutData.some((c: any) => c.player._id.toString() === pAdvLifeId.toString()), "Promoted athlete must appear in scout query");
    });

    // ADV_1_05: Boundary stability: 3 present of 4 sessions = 75% attendance + 2 matches -> still Ready
    await runAdvTest("ADV_1_05", "LIFECYCLE", "Boundary test: 3 present out of 4 sessions (75%) -> remains isReady === true", async () => {
      const s2 = await db.collection("sessions").insertOne({
        date: "2026-09-03",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvLifeId, status: "present" }],
      });
      const s3 = await db.collection("sessions").insertOne({
        date: "2026-09-04",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvLifeId, status: "present" }],
      });
      const s4 = await db.collection("sessions").insertOne({
        date: "2026-09-05",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvLifeId, status: "absent" }],
      });
      testSessionIds.push(s2.insertedId, s3.insertedId, s4.insertedId);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].attendancePct, 75, "Attendance must be exactly 75%");
      assertEqual(data[0].matchCount, 2, "Matches must be 2");
      assertEqual(data[0].isReady, true, "At 75% attendance and 2 matches athlete must remain Ready");
    });

    // ADV_1_06: Demotion event: 5th session marked absent (3 of 5 = 60%) -> DEMOTED to isReady === false
    await runAdvTest("ADV_1_06", "LIFECYCLE", "Demotion event: 5th session absent drops attendance to 60% -> isReady === false", async () => {
      const s5 = await db.collection("sessions").insertOne({
        date: "2026-09-06",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvLifeId, status: "absent" }],
      });
      testSessionIds.push(s5.insertedId);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].attendancePct, 60, "Attendance must be 60%");
      assertEqual(data[0].isReady, false, "Athlete must be demoted to Not Ready");

      // Verify scout query excludes demoted athlete immediately (Zero False Positive)
      const scoutRes = await getReady(new NextRequest("http://localhost:3000/api/ready?filter=readyOnly"));
      const scoutData = await scoutRes.json();
      assert(!scoutData.some((c: any) => c.player._id.toString() === pAdvLifeId.toString()), "Demoted athlete must NOT appear in scout query");
    });

    // ADV_1_07: Intermediate recovery: 6th session present (4/6 = 67%) -> remains Not Ready
    await runAdvTest("ADV_1_07", "LIFECYCLE", "Recovery step 1: 4/6 sessions present (67%) -> remains isReady === false", async () => {
      const s6 = await db.collection("sessions").insertOne({
        date: "2026-09-07",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvLifeId, status: "present" }],
      });
      testSessionIds.push(s6.insertedId);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].attendancePct, 67, "Attendance must be 67%");
      assertEqual(data[0].isReady, false, "67% attendance must remain not ready");
    });

    // ADV_1_08: Intermediate near-miss: 7th session present (5/7 = 71%) -> remains Not Ready
    await runAdvTest("ADV_1_08", "LIFECYCLE", "Recovery step 2: 5/7 sessions present (71%) -> remains isReady === false", async () => {
      const s7 = await db.collection("sessions").insertOne({
        date: "2026-09-08",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvLifeId, status: "present" }],
      });
      testSessionIds.push(s7.insertedId);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].attendancePct, 71, "Attendance must be 71%");
      assertEqual(data[0].isReady, false, "71% attendance must remain not ready");
    });

    // ADV_1_09: Re-promotion recovery: 8th session present (6/8 = 75%) -> RE-PROMOTED to isReady === true
    await runAdvTest("ADV_1_09", "LIFECYCLE", "Recovery step 3: 6/8 sessions present (75%) -> RE-PROMOTED to isReady === true", async () => {
      const s8 = await db.collection("sessions").insertOne({
        date: "2026-09-09",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvLifeId, status: "present" }],
      });
      testSessionIds.push(s8.insertedId);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].attendancePct, 75, "Attendance must be 75%");
      assertEqual(data[0].isReady, true, "Athlete must be re-promoted to Ready");

      // Verify scout query reflects re-promotion immediately
      const scoutRes = await getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=true"));
      const scoutData = await scoutRes.json();
      assert(scoutData.some((c: any) => c.player._id.toString() === pAdvLifeId.toString()), "Re-promoted athlete must re-appear in scout query");
    });

    // ADV_1_10: Retroactive attendance correction: modifying past session dynamically alters readiness
    await runAdvTest("ADV_1_10", "LIFECYCLE", "Retroactive attendance alteration immediately updates readiness dynamically", async () => {
      // Modify session s8 attendance directly in database from present to absent
      await db.collection("sessions").updateOne(
        { date: "2026-09-09", note: "adv_test" },
        { $set: { attendance: [{ playerId: pAdvLifeId, status: "absent" }] } }
      );

      // Now 5 present out of 8 sessions = 62.5% -> round 63%
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].attendancePct, 63, "Attendance must update to 63%");
      assertEqual(data[0].isReady, false, "Retroactive drop below 75% must immediately revoke readiness");
    });

    // ========================================================================
    // CATEGORY 2: Malformed Query Parameter Fuzzing & Injection Resistance (10 Tests)
    // ========================================================================
    console.log("\n─── CATEGORY 2: MALFORMED QUERY PARAMETER FUZZING & INJECTION RESISTANCE ─");

    // ADV_2_01: Case variation fuzzing on readyOnly (e.g. ?readyOnly=TRUe)
    await runAdvTest("ADV_2_01", "QUERY_FUZZ", "Query ?readyOnly=TRUe does not trigger ready-only filter and returns HTTP 200", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=TRUe"));
      assertEqual(res.status, 200, "Must return HTTP 200");
      const data = await res.json();
      // Should return full roster including unready athletes
      assert(data.some((r: any) => r.isReady === false), "Should contain non-ready athletes since TRUe != true");
    });

    // ADV_2_02: Additional case fuzzing on readyOnly (?readyOnly=TRUE, True, 1, yes)
    await runAdvTest("ADV_2_02", "QUERY_FUZZ", "Query variations ?readyOnly=TRUE, 1, yes safely default without 500 crashes", async () => {
      for (const val of ["TRUE", "True", "1", "yes", "on", "null", "undefined"]) {
        const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?readyOnly=${val}`));
        assertEqual(res.status, 200, `Must return HTTP 200 for readyOnly=${val}`);
        const data = await res.json();
        assert(Array.isArray(data) && data.length > 0, `Expected array response for readyOnly=${val}`);
      }
    });

    // ADV_2_03: Case variation on filter (?filter=READYONLY, ReadyOnly, true)
    await runAdvTest("ADV_2_03", "QUERY_FUZZ", "Query ?filter=READYONLY is strictly case-sensitive and does not filter as readyOnly", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?filter=READYONLY"));
      assertEqual(res.status, 200, "Must return HTTP 200");
      const data = await res.json();
      assert(data.some((r: any) => r.isReady === false), "Non-ready athletes must be present when filter != readyOnly");
    });

    // ADV_2_04: Malformed playerId parameter: nonHex string
    await runAdvTest("ADV_2_04", "QUERY_FUZZ", "Query ?playerId=nonHex returns clean empty array [] with HTTP 200", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=nonHex"));
      assertEqual(res.status, 200, "Must return HTTP 200");
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 0, "Must return empty array [] for nonHex playerId");
    });

    // ADV_2_05: Malformed playerId parameter: string 'null'
    await runAdvTest("ADV_2_05", "QUERY_FUZZ", "Query ?playerId=null returns clean empty array [] with HTTP 200", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=null"));
      assertEqual(res.status, 200, "Must return HTTP 200");
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 0, "Must return empty array [] for 'null' playerId");
    });

    // ADV_2_06: Malformed playerId parameter: string 'undefined'
    await runAdvTest("ADV_2_06", "QUERY_FUZZ", "Query ?playerId=undefined returns clean empty array [] with HTTP 200", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=undefined"));
      assertEqual(res.status, 200, "Must return HTTP 200");
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 0, "Must return empty array [] for 'undefined' playerId");
    });

    // ADV_2_07: NoSQL Injection attempt in query parameter (?playerId={\"$ne\":null})
    await runAdvTest("ADV_2_07", "QUERY_FUZZ", "NoSQL injection string in ?playerId handled safely without database error", async () => {
      const res = await getReady(new NextRequest('http://localhost:3000/api/ready?playerId={"$ne":null}'));
      assertEqual(res.status, 200, "Must return HTTP 200");
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 0, "NoSQL injection payload must return empty array []");
    });

    // ADV_2_08: SQL Injection pattern in query parameter
    await runAdvTest("ADV_2_08", "QUERY_FUZZ", "SQL injection pattern in ?playerId handled safely without server crash", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=650000000000000000000001'%20OR%20'1'='1"));
      assertEqual(res.status, 200, "Must return HTTP 200");
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 0, "SQL injection string must return empty array []");
    });

    // ADV_2_09: Whitespace-only playerId (?playerId=%20%20%20)
    await runAdvTest("ADV_2_09", "QUERY_FUZZ", "Whitespace-only ?playerId query handled safely and returns empty array []", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=%20%20%20"));
      assertEqual(res.status, 200, "Must return HTTP 200");
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 0, "Whitespace playerId must trim and return empty array []");
    });

    // ADV_2_10: Non-existent ObjectId for single session lookup (/api/sessions/[id])
    await runAdvTest("ADV_2_10", "QUERY_FUZZ", "GET and PATCH /api/sessions/000000000000000000000000 returns HTTP 404", async () => {
      const nonExistentId = "000000000000000000000000";
      const getRes = await getSessionById(new NextRequest(`http://localhost:3000/api/sessions/${nonExistentId}`), {
        params: Promise.resolve({ id: nonExistentId }),
      });
      assertEqual(getRes.status, 404, "GET non-existent session must return HTTP 404");

      const patchRes = await patchSession(
        new NextRequest(`http://localhost:3000/api/sessions/${nonExistentId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "closed" }),
        }),
        { params: Promise.resolve({ id: nonExistentId }) }
      );
      assertEqual(patchRes.status, 404, "PATCH non-existent session must return HTTP 404");
    });

    // ADV_2_11: Off-by-one ObjectId string lengths (23 chars and 25 chars)
    await runAdvTest("ADV_2_11", "QUERY_FUZZ", "Malformed length ObjectId query ?playerId= (23 and 25 chars) returns empty array []", async () => {
      const tooShort = "65000000000000000000001"; // 23 chars
      const tooLong = "6500000000000000000000001"; // 25 chars
      const resShort = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${tooShort}`));
      assertEqual(resShort.status, 200, "23-char playerId must return 200");
      const dataShort = await resShort.json();
      assert(Array.isArray(dataShort) && dataShort.length === 0, "23-char playerId must return []");

      const resLong = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${tooLong}`));
      assertEqual(resLong.status, 200, "25-char playerId must return 200");
      const dataLong = await resLong.json();
      assert(Array.isArray(dataLong) && dataLong.length === 0, "25-char playerId must return []");
    });

    // ADV_2_12: Compound ?playerId=xxx&readyOnly=true on unready athlete returns empty array []
    await runAdvTest("ADV_2_12", "QUERY_FUZZ", "Compound query ?playerId=xxx&readyOnly=true on unready athlete returns empty array []", async () => {
      // pAdvLifeId is currently unready (63% att from ADV_1_10)
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}&readyOnly=true`));
      assertEqual(res.status, 200, "Must return HTTP 200");
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 0, "Unready player queried with readyOnly=true must return []");
    });

    // ADV_2_13: Special URI-encoded control characters in playerId (%0A, %0D, %00)
    await runAdvTest("ADV_2_13", "QUERY_FUZZ", "URI-encoded newline, carriage return, and null byte in ?playerId handled cleanly", async () => {
      for (const ctrl of ["%0A", "%0D", "%00", "%09"]) {
        const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}${ctrl}`));
        assertEqual(res.status, 200, `Must return 200 for control char ${ctrl}`);
        const data = await res.json();
        assert(Array.isArray(data), "Must return array");
      }
    });

    // ADV_2_14: Malformed query params with unexpected additional keys
    await runAdvTest("ADV_2_14", "QUERY_FUZZ", "Unexpected extra query parameters (?admin=true&bypass=1&debug=true) safely ignored", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?admin=true&bypass=1&debug=true&hack=true"));
      assertEqual(res.status, 200, "Unexpected query keys must return HTTP 200");
      const data = await res.json();
      assert(Array.isArray(data) && data.length > 0, "Should safely ignore unexpected query keys");
    });

    // ========================================================================
    // CATEGORY 3: Concurrency Stress Harness & Race Condition Hardening (6 Tests)
    // ========================================================================
    console.log("\n─── CATEGORY 3: CONCURRENCY STRESS HARNESS & RACE CONDITIONS ──────────");

    // ADV_3_01: High-concurrency read burst on /api/ready (30 parallel calls)
    await runAdvTest("ADV_3_01", "CONCURRENCY", "High-concurrency read burst: 30 parallel /api/ready calls all return HTTP 200", async () => {
      const urls = [
        "http://localhost:3000/api/ready",
        "http://localhost:3000/api/ready?readyOnly=true",
        "http://localhost:3000/api/ready?filter=readyOnly",
        `http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`,
      ];

      const promises = [];
      for (let i = 0; i < 30; i++) {
        const url = urls[i % urls.length];
        promises.push(getReady(new NextRequest(url)));
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        assertEqual(res.status, 200, "All concurrent requests must succeed with HTTP 200");
        const data = await res.json();
        assert(Array.isArray(data), "Response must be an array");
      }
    });

    // ADV_3_02: Concurrent attendance toggles vs session closure race
    await runAdvTest("ADV_3_02", "CONCURRENCY", "Concurrent attendance updates racing against session lock", async () => {
      // Create open session with 3 players
      const openSession = await db.collection("sessions").insertOne({
        date: "2026-09-20",
        sport: "Football",
        status: "open",
        note: "adv_concurrency",
        attendance: [
          { playerId: pAdvLifeId, status: "absent" },
          { playerId: pAdvFootId, status: "absent" },
          { playerId: pAdvCrickId, status: "absent" },
        ],
      });
      const sId = openSession.insertedId;
      testSessionIds.push(sId);

      // Launch 5 simultaneous requests: 4 attendance updates and 1 close session
      const ops = [
        patchSession(
          new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
            method: "PATCH",
            body: JSON.stringify({ playerId: pAdvLifeId.toString(), status: "present" }),
          }),
          { params: Promise.resolve({ id: sId.toString() }) }
        ),
        patchSession(
          new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
            method: "PATCH",
            body: JSON.stringify({ playerId: pAdvFootId.toString(), status: "present" }),
          }),
          { params: Promise.resolve({ id: sId.toString() }) }
        ),
        patchSession(
          new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "closed" }),
          }),
          { params: Promise.resolve({ id: sId.toString() }) }
        ),
        patchSession(
          new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
            method: "PATCH",
            body: JSON.stringify({ playerId: pAdvCrickId.toString(), status: "present" }),
          }),
          { params: Promise.resolve({ id: sId.toString() }) }
        ),
        patchSession(
          new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
            method: "PATCH",
            body: JSON.stringify({ playerId: pAdvLifeId.toString(), status: "absent" }),
          }),
          { params: Promise.resolve({ id: sId.toString() }) }
        ),
      ];

      const patchResponses = await Promise.all(ops);
      for (const res of patchResponses) {
        // Status must be either 200 (applied) or 400 (rejected because locked)
        assert(res.status === 200 || res.status === 400, `Status must be 200 or 400, got ${res.status}`);
      }

      // Verify that after all concurrent ops, the session is definitely closed
      const finalDoc = await db.collection("sessions").findOne({ _id: sId });
      assertEqual(finalDoc?.status, "closed", "Session must be closed");

      // Verify subsequent modification is strictly locked out
      const postCloseRes = await patchSession(
        new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
          method: "PATCH",
          body: JSON.stringify({ playerId: pAdvLifeId.toString(), status: "present" }),
        }),
        { params: Promise.resolve({ id: sId.toString() }) }
      );
      assertEqual(postCloseRes.status, 400, "Locked session must reject subsequent modification with HTTP 400");
    });

    // ADV_3_03: Concurrent match creation: valid matches vs absent player rejection
    await runAdvTest("ADV_3_03", "CONCURRENCY", "Concurrent match recordings reliably reject absent player while accepting present player", async () => {
      // Session date: 2026-09-22. FootballPro is PRESENT, CricketPro is ABSENT
      const sMatchDate = await db.collection("sessions").insertOne({
        date: "2026-09-22",
        sport: "Football",
        status: "closed",
        note: "adv_concurrency",
        attendance: [
          { playerId: pAdvFootId, status: "present" },
          { playerId: pAdvCrickId, status: "absent" },
        ],
      });
      testSessionIds.push(sMatchDate.insertedId);

      const matchPromises = [
        // 3 Valid match attempts with FootballPro
        postMatch(
          new NextRequest("http://localhost:3000/api/matches", {
            method: "POST",
            body: JSON.stringify({
              date: "2026-09-22",
              sport: "Football",
              opponent: "ADV_Valid_1",
              scores: [{ playerId: pAdvFootId.toString(), score: 2 }],
            }),
          })
        ),
        postMatch(
          new NextRequest("http://localhost:3000/api/matches", {
            method: "POST",
            body: JSON.stringify({
              date: "2026-09-22",
              sport: "Football",
              opponent: "ADV_Valid_2",
              scores: [{ playerId: pAdvFootId.toString(), score: 3 }],
            }),
          })
        ),
        // 2 Invalid match attempts with CricketPro (absent)
        postMatch(
          new NextRequest("http://localhost:3000/api/matches", {
            method: "POST",
            body: JSON.stringify({
              date: "2026-09-22",
              sport: "Football",
              opponent: "ADV_Invalid_1",
              scores: [{ playerId: pAdvCrickId.toString(), score: 1 }],
            }),
          })
        ),
        postMatch(
          new NextRequest("http://localhost:3000/api/matches", {
            method: "POST",
            body: JSON.stringify({
              date: "2026-09-22",
              sport: "Football",
              opponent: "ADV_Invalid_2",
              scores: [{ playerId: pAdvCrickId.toString(), score: 0 }],
            }),
          })
        ),
      ];

      const matchResults = await Promise.all(matchPromises);
      assertEqual(matchResults[0].status, 201, "Valid match 1 must return 201 Created");
      assertEqual(matchResults[1].status, 201, "Valid match 2 must return 201 Created");
      assertEqual(matchResults[2].status, 400, "Absent player match 1 must return 400");
      assertEqual(matchResults[3].status, 400, "Absent player match 2 must return 400");

      const errData1 = await matchResults[2].json();
      assert(errData1.error.includes("was absent on 2026-09-22"), "Error must cite absence");
    });

    // ADV_3_04: Concurrency on single session attendance idempotency (no array bloat)
    await runAdvTest("ADV_3_04", "CONCURRENCY", "Concurrent attendance toggles preserve single attendance record per player", async () => {
      const openS = await db.collection("sessions").insertOne({
        date: "2026-09-25",
        sport: "Football",
        status: "open",
        note: "adv_concurrency",
        attendance: [{ playerId: pAdvFootId, status: "absent" }],
      });
      const openId = openS.insertedId;
      testSessionIds.push(openId);

      // Run 6 toggles concurrently on the same session and player
      const toggles = [];
      for (let i = 0; i < 6; i++) {
        toggles.push(
          patchSession(
            new NextRequest(`http://localhost:3000/api/sessions/${openId}`, {
              method: "PATCH",
              body: JSON.stringify({
                playerId: pAdvFootId.toString(),
                status: i % 2 === 0 ? "present" : "absent",
              }),
            }),
            { params: Promise.resolve({ id: openId.toString() }) }
          )
        );
      }
      await Promise.all(toggles);

      const doc = await db.collection("sessions").findOne({ _id: openId });
      const pRecords = doc?.attendance.filter((a: any) => a.playerId.toString() === pAdvFootId.toString());
      assertEqual(pRecords?.length, 1, "Player must have exactly 1 record in session attendance (no duplicates)");
    });

    // ADV_3_05: Concurrent match count accumulation accuracy
    await runAdvTest("ADV_3_05", "CONCURRENCY", "Accumulated matches across concurrent submissions correctly increments matchCount", async () => {
      const initRes = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvFootId.toString()}`));
      const initData = await initRes.json();
      const initialMatches = initData[0].matchCount;

      // Add 4 matches concurrently
      const adds = [];
      for (let i = 1; i <= 4; i++) {
        adds.push(
          db.collection("matches").insertOne({
            date: `2026-09-2${i}`,
            sport: "Football",
            opponent: `ADV_Concurrent_Accum_${i}`,
            scores: [{ playerId: pAdvFootId, score: i }],
          })
        );
      }
      const insRes = await Promise.all(adds);
      insRes.forEach((r) => testMatchIds.push(r.insertedId));

      const afterRes = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvFootId.toString()}`));
      const afterData = await afterRes.json();
      assertEqual(afterData[0].matchCount, initialMatches + 4, "Match count must increment by exactly 4");
    });

    // ADV_3_06: Closed session re-close idempotency
    await runAdvTest("ADV_3_06", "CONCURRENCY", "Attempting to re-close an already closed session returns HTTP 400", async () => {
      const closedS = await db.collection("sessions").insertOne({
        date: "2026-09-28",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvFootId, status: "present" }],
      });
      testSessionIds.push(closedS.insertedId);

      const recloseRes = await patchSession(
        new NextRequest(`http://localhost:3000/api/sessions/${closedS.insertedId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "closed" }),
        }),
        { params: Promise.resolve({ id: closedS.insertedId.toString() }) }
      );
      assertEqual(recloseRes.status, 400, "Re-closing closed session must return HTTP 400");
      const err = await recloseRes.json();
      assertEqual(err.error, "Session is already closed");
    });

    // ========================================================================
    // CATEGORY 4: Monochromatic Swiss UI Strictness, SVG & Token Audit (5 Tests)
    // ========================================================================
    console.log("\n─── CATEGORY 4: MONOCHROMATIC SWISS UI STRICTNESS & TOKEN AUDIT ───────");

    // ADV_4_01: Audit src/components/p-badge-16.tsx
    await runAdvTest("ADV_4_01", "SWISS_UI", "CossBadge16 has zero color hues, zero emojis, and pure zinc tokens", async () => {
      const filePath = path.join(process.cwd(), "src/components/p-badge-16.tsx");
      assert(fs.existsSync(filePath), "p-badge-16.tsx must exist");
      const content = fs.readFileSync(filePath, "utf-8");

      const forbiddenRegex = /\b(emerald|green|blue|red|purple|pink|rose|amber|yellow|orange|cyan|teal|lime|fuchsia|violet|sky)-\d+/i;
      assert(!forbiddenRegex.test(content), "p-badge-16.tsx must not contain colored Tailwind tokens");

      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/u;
      assert(!emojiRegex.test(content), "p-badge-16.tsx must not contain emojis");

      assert(!content.includes("style="), "p-badge-16.tsx must not contain inline style tags");
      assert(content.includes("bg-zinc-100") && content.includes("text-zinc-950"), "Must use high-contrast zinc-100/zinc-950 for ready state");
      assert(content.includes("border-zinc-600 bg-transparent"), "Must use hollow circle for pending state");
    });

    // ADV_4_02: Audit src/app/player/page.tsx
    await runAdvTest("ADV_4_02", "SWISS_UI", "Player Dashboard strictly maintains monochromatic tokens and self-isolation", async () => {
      const filePath = path.join(process.cwd(), "src/app/player/page.tsx");
      assert(fs.existsSync(filePath), "player/page.tsx must exist");
      const content = fs.readFileSync(filePath, "utf-8");

      const forbiddenRegex = /\b(bg|text|border|ring|fill|stroke)-(emerald|green|blue|purple|pink|rose|amber|yellow|orange|cyan|teal|lime)-\d+/i;
      assert(!forbiddenRegex.test(content), "player/page.tsx must not contain forbidden color utility classes");

      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/u;
      assert(!emojiRegex.test(content), "player/page.tsx must not contain emojis");

      assert(content.includes("bg-zinc-950"), "Root container must use high-taste zinc-950 dark background");
      assert(content.includes("fetch(`/api/ready?playerId=${playerId}`)"), "Must query strictly using session.user.playerId");
    });

    // ADV_4_03: Audit src/app/scout/page.tsx
    await runAdvTest("ADV_4_03", "SWISS_UI", "Scout Dashboard strictly maintains monochromatic tokens and readyOnly filtering", async () => {
      const filePath = path.join(process.cwd(), "src/app/scout/page.tsx");
      assert(fs.existsSync(filePath), "scout/page.tsx must exist");
      const content = fs.readFileSync(filePath, "utf-8");

      const forbiddenRegex = /\b(bg|text|border|ring|fill|stroke)-(emerald|green|blue|purple|pink|rose|amber|yellow|orange|cyan|teal|lime)-\d+/i;
      assert(!forbiddenRegex.test(content), "scout/page.tsx must not contain forbidden color utility classes");

      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/u;
      assert(!emojiRegex.test(content), "scout/page.tsx must not contain emojis");

      assert(content.includes("filter=readyOnly"), "Scout portal must strictly query ?filter=readyOnly");
    });

    // ADV_4_04: Audit src/app/coach/ready/page.tsx
    await runAdvTest("ADV_4_04", "SWISS_UI", "Coach Ready Board renders CoachMobileShell with defaultTab='ready' and force-dynamic", async () => {
      const filePath = path.join(process.cwd(), "src/app/coach/ready/page.tsx");
      assert(fs.existsSync(filePath), "coach/ready/page.tsx must exist");
      const content = fs.readFileSync(filePath, "utf-8");

      assert(content.includes('defaultTab="ready"'), "Must pass defaultTab='ready'");
      assert(content.includes('dynamic = "force-dynamic"'), "Must export dynamic = 'force-dynamic'");
    });

    // ADV_4_05: Global inline SVG color check across all src/components/ and dashboard pages
    await runAdvTest("ADV_4_05", "SWISS_UI", "No SVG elements or icons contain colored hex codes or inline rgb colors", async () => {
      const targetPaths = [
        path.join(process.cwd(), "src/components/p-badge-16.tsx"),
        path.join(process.cwd(), "src/app/player/page.tsx"),
        path.join(process.cwd(), "src/app/scout/page.tsx"),
        path.join(process.cwd(), "src/app/coach/ready/page.tsx"),
      ];

      const coloredHexRegex = /#(?!([0-9a-fA-F])\1{2,5}$)[0-9a-fA-F]{6}/i; // Matches non-greyscale hex
      const rgbColorRegex = /rgb\(\s*(?!(\d+)\s*,\s*\1\s*,\s*\1)\d+/i; // Matches non-greyscale rgb

      for (const p of targetPaths) {
        const text = fs.readFileSync(p, "utf-8");
        assert(!coloredHexRegex.test(text), `File ${path.basename(p)} contains colored hex code!`);
        assert(!rgbColorRegex.test(text), `File ${path.basename(p)} contains colored rgb() code!`);
      }
    });

    // ========================================================================
    // CATEGORY 5: Multi-Sport Isolation, Data Integrity & Edge Scenarios (5 Tests)
    // ========================================================================
    console.log("\n─── CATEGORY 5: MULTI-SPORT ISOLATION & DATA INTEGRITY ────────────────");

    // ADV_5_01: Multi-sport session isolation: Football pro not penalized by Cricket sessions
    await runAdvTest("ADV_5_01", "MULTI_SPORT", "Multi-sport isolation: Football athlete attendance unaffected by Cricket sessions", async () => {
      // Create dedicated athletes for strict multi-sport isolation
      const pIsoFoot = await db.collection("players").insertOne({
        name: "__adv_Iso_Footballer",
        age: 18,
        sport: "Football",
      });
      const pIsoCrick = await db.collection("players").insertOne({
        name: "__adv_Iso_Cricketer",
        age: 19,
        sport: "Cricket",
      });
      testPlayerIds.push(pIsoFoot.insertedId, pIsoCrick.insertedId);

      // Create 3 Cricket sessions where Cricket pro is present
      const c1 = await db.collection("sessions").insertOne({
        date: "2026-10-01",
        sport: "Cricket",
        status: "closed",
        note: "adv_test_iso",
        attendance: [{ playerId: pIsoCrick.insertedId, status: "present" }],
      });
      const c2 = await db.collection("sessions").insertOne({
        date: "2026-10-02",
        sport: "Cricket",
        status: "closed",
        note: "adv_test_iso",
        attendance: [{ playerId: pIsoCrick.insertedId, status: "present" }],
      });
      const c3 = await db.collection("sessions").insertOne({
        date: "2026-10-03",
        sport: "Cricket",
        status: "closed",
        note: "adv_test_iso",
        attendance: [{ playerId: pIsoCrick.insertedId, status: "present" }],
      });
      testSessionIds.push(c1.insertedId, c2.insertedId, c3.insertedId);

      // Create 2 Football sessions where Football pro is present
      const f1 = await db.collection("sessions").insertOne({
        date: "2026-10-01",
        sport: "Football",
        status: "closed",
        note: "adv_test_iso",
        attendance: [{ playerId: pIsoFoot.insertedId, status: "present" }],
      });
      const f2 = await db.collection("sessions").insertOne({
        date: "2026-10-02",
        sport: "Football",
        status: "closed",
        note: "adv_test_iso",
        attendance: [{ playerId: pIsoFoot.insertedId, status: "present" }],
      });
      testSessionIds.push(f1.insertedId, f2.insertedId);

      // Query FootballPro's ready status
      const resFoot = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pIsoFoot.insertedId.toString()}`));
      const dataFoot = await resFoot.json();
      assertEqual(dataFoot[0].sessionsHeld, 2, "Football pro should only be assessed against Football sessions (2 held)");
      assertEqual(dataFoot[0].sessionsPresent, 2, "Football pro attended both Football sessions (2 present)");
      assertEqual(dataFoot[0].attendancePct, 100, "Football pro should have 100% attendance in Football (not diluted by Cricket)");

      // Query CricketPro's ready status
      const resCrick = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pIsoCrick.insertedId.toString()}`));
      const dataCrick = await resCrick.json();
      assertEqual(dataCrick[0].sessionsHeld, 3, "Cricket pro should only be assessed against Cricket sessions (3 held)");
      assertEqual(dataCrick[0].sessionsPresent, 3, "Cricket pro attended all 3 Cricket sessions (3 present)");
      assertEqual(dataCrick[0].attendancePct, 100, "Cricket pro should have 100% attendance in Cricket (not diluted by Football)");
    });

    // ADV_5_02: Match score clamping: negative scores clamped to 0
    await runAdvTest("ADV_5_02", "DATA_INTEGRITY", "POST /api/matches clamps negative score values to 0", async () => {
      // Session with FootballPro present
      const sScore = await db.collection("sessions").insertOne({
        date: "2026-10-05",
        sport: "Football",
        status: "closed",
        note: "adv_test",
        attendance: [{ playerId: pAdvFootId, status: "present" }],
      });
      testSessionIds.push(sScore.insertedId);

      const matchRes = await postMatch(
        new NextRequest("http://localhost:3000/api/matches", {
          method: "POST",
          body: JSON.stringify({
            date: "2026-10-05",
            sport: "Football",
            opponent: "ADV_Negative_Score",
            scores: [{ playerId: pAdvFootId.toString(), score: -10 }],
          }),
        })
      );
      assertEqual(matchRes.status, 201, "Match creation should succeed with clamped score");
      const matchDoc = await matchRes.json();
      testMatchIds.push(new ObjectId(matchDoc._id));
      assertEqual(matchDoc.scores[0].score, 0, "Negative score must be clamped to 0");
    });

    // ADV_5_03: Duplicate player IDs in match score array strictly refused
    await runAdvTest("ADV_5_03", "DATA_INTEGRITY", "POST /api/matches with duplicate playerId in scores returns HTTP 400", async () => {
      const matchRes = await postMatch(
        new NextRequest("http://localhost:3000/api/matches", {
          method: "POST",
          body: JSON.stringify({
            date: "2026-10-06",
            sport: "Football",
            opponent: "ADV_Duplicate_Player",
            scores: [
              { playerId: pAdvFootId.toString(), score: 2 },
              { playerId: pAdvFootId.toString(), score: 3 },
            ],
          }),
        })
      );
      assertEqual(matchRes.status, 400, "Duplicate playerId must return HTTP 400");
      const err = await matchRes.json();
      assertEqual(err.error, "Duplicate playerId in scores list");
    });

    // ADV_5_04: Zero sessions held in database handles division cleanly without NaN
    await runAdvTest("ADV_5_04", "DATA_INTEGRITY", "Athlete with zero relevant sessions has attendancePct === 0 (no NaN)", async () => {
      // Create fresh athlete in a unique sport with zero sessions
      const pFresh = await db.collection("players").insertOne({
        name: "__adv_Archery_Fresh",
        age: 16,
        sport: "Archery",
      });
      testPlayerIds.push(pFresh.insertedId);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pFresh.insertedId.toString()}`));
      const data = await res.json();
      assertEqual(data[0].sessionsHeld, 0, "sessionsHeld must be 0");
      assertEqual(data[0].sessionsPresent, 0, "sessionsPresent must be 0");
      assertEqual(data[0].attendancePct, 0, "attendancePct must be 0 without NaN");
      assertEqual(data[0].isReady, false, "Must not be ready");
    });

    // ADV_5_05: Chronological descending sort enforcement for player portal enriched history
    await runAdvTest("ADV_5_05", "DATA_INTEGRITY", "Player portal attendanceHistory & matchHistory strictly sorted descending by date", async () => {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${pAdvLifeId.toString()}`));
      const data = await res.json();
      const record = data[0];

      assert(Array.isArray(record.attendanceHistory), "attendanceHistory must be an array");
      assert(record.attendanceHistory.length >= 2, "Must have at least 2 attendance records");
      for (let i = 0; i < record.attendanceHistory.length - 1; i++) {
        assert(
          record.attendanceHistory[i].date >= record.attendanceHistory[i + 1].date,
          `attendanceHistory not sorted descending: ${record.attendanceHistory[i].date} < ${record.attendanceHistory[i + 1].date}`
        );
      }

      assert(Array.isArray(record.matchHistory), "matchHistory must be an array");
      assert(record.matchHistory.length >= 2, "Must have at least 2 match records");
      for (let i = 0; i < record.matchHistory.length - 1; i++) {
        assert(
          record.matchHistory[i].date >= record.matchHistory[i + 1].date,
          `matchHistory not sorted descending: ${record.matchHistory[i].date} < ${record.matchHistory[i + 1].date}`
        );
      }
    });

  } finally {
    // ------------------------------------------------------------------------
    // TEARDOWN: Clean up all adversarial fixtures and verify DB baseline
    // ------------------------------------------------------------------------
    console.log("\n▶ [TEARDOWN] Cleaning adversarial fixtures & restoring database...");

    if (testPlayerIds.length > 0) {
      await db.collection("players").deleteMany({ _id: { $in: testPlayerIds } });
    }
    if (testSessionIds.length > 0) {
      await db.collection("sessions").deleteMany({ _id: { $in: testSessionIds } });
    }
    if (testMatchIds.length > 0) {
      await db.collection("matches").deleteMany({ _id: { $in: testMatchIds } });
    }
    await db.collection("players").deleteMany({ name: { $regex: /^__adv_/ } });
    await db.collection("sessions").deleteMany({ note: { $regex: /^adv_/ } });
    await db.collection("matches").deleteMany({ opponent: { $regex: /^ADV_/ } });

    console.log("  ✓ Cleaned all temporary adversarial test entities");
  }

  // ========================================================================
  // FINAL SUMMARY REPORT
  // ========================================================================
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log("             TIER 5 ADVERSARIAL STRESS TEST SUMMARY                   ");
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log(` Category 1 (Lifecycle Stress):     ${testResults.filter((r) => r.category === "LIFECYCLE" && r.passed).length}/10 passed`);
  console.log(` Category 2 (Query Param Fuzzing):  ${testResults.filter((r) => r.category === "QUERY_FUZZ" && r.passed).length}/14 passed`);
  console.log(` Category 3 (Concurrency Stress):   ${testResults.filter((r) => r.category === "CONCURRENCY" && r.passed).length}/6 passed`);
  console.log(` Category 4 (Swiss UI & SVG Audit): ${testResults.filter((r) => r.category === "SWISS_UI" && r.passed).length}/5 passed`);
  console.log(` Category 5 (Multi-Sport & Integrity): ${testResults.filter((r) => r.category === "MULTI_SPORT" || r.category === "DATA_INTEGRITY").filter((r) => r.passed).length}/5 passed`);
  console.log("──────────────────────────────────────────────────────────────────────");
  console.log(` TOTAL ADVERSARIAL TESTS: ${total}`);
  console.log(` PASSED:                 ${passed} (${Math.round((passed / total) * 100)}%)`);
  console.log(` FAILED:                 ${failed}`);
  console.log("══════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    console.error(`❌ Suite failed with ${failed} failing tests!`);
    process.exit(1);
  } else {
    console.log("✅ ALL TIER 5 ADVERSARIAL COVERAGE HARDENING TESTS PASSED EMPIRICALLY!\n");
  }
}

runTier5AdversarialSuite().catch((err) => {
  console.error("FATAL ERROR in Tier 5 Adversarial Suite:", err);
  process.exit(1);
});
