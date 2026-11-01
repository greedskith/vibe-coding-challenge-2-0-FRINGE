import { NextRequest } from "next/server";
import assert from "node:assert";
import { getDb } from "../lib/db";
import { GET as getSessions } from "../app/api/sessions/route";
import { GET as getReady } from "../app/api/ready/route";
import { ObjectId } from "mongodb";

// Color output helpers
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
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

async function runAdversarialSuite() {
  console.log(`\n${CYAN}=================================================${RESET}`);
  console.log(`${CYAN}   M1 ADVERSARIAL CONCURRENCY & EDGE CASE SUITE  ${RESET}`);
  console.log(`${CYAN}=================================================\n${RESET}`);

  // -----------------------------------------------------------------
  // SUITE 1: Next.js Route Contract & Overload Signatures
  // -----------------------------------------------------------------
  console.log(`${CYAN}▶ [SUITE 1] Next.js Route Type Contract & Handler Overloads${RESET}`);
  try {
    // 1.1 Zero-argument invocations
    const resSessions0 = await getSessions();
    assert.strictEqual(resSessions0.status, 200, "Zero-arg getSessions() must return 200");
    const jsonSessions0 = await resSessions0.json();
    assert(Array.isArray(jsonSessions0), "Zero-arg getSessions() must return array");
    report("getSessions() zero-argument call returns 200 with JSON array", true);

    const resReady0 = await getReady();
    assert.strictEqual(resReady0.status, 200, "Zero-arg getReady() must return 200");
    const jsonReady0 = await resReady0.json();
    assert(Array.isArray(jsonReady0), "Zero-arg getReady() must return array");
    report("getReady() zero-argument call returns 200 with JSON array", true);

    // 1.2 Undefined / null argument invocations
    const resSessionsUndef = await getSessions(undefined as any);
    assert.strictEqual(resSessionsUndef.status, 200);
    report("getSessions(undefined) handles undefined gracefully", true);

    const resReadyUndef = await getReady(undefined as any);
    assert.strictEqual(resReadyUndef.status, 200);
    report("getReady(undefined) handles undefined gracefully", true);

    const resSessionsNull = await getSessions(null as any);
    assert.strictEqual(resSessionsNull.status, 200);
    report("getSessions(null) handles null gracefully without throwing", true);

    const resReadyNull = await getReady(null as any);
    assert.strictEqual(resReadyNull.status, 200);
    report("getReady(null) handles null gracefully without throwing", true);

    // 1.3 Next.js Route Context argument simulation (Next.js passes context as 2nd arg)
    const mockContext = { params: Promise.resolve({ id: "test" }) };
    const resSessionsCtx = await (getSessions as any)(
      new NextRequest("http://localhost:3000/api/sessions"),
      mockContext
    );
    assert.strictEqual(resSessionsCtx.status, 200);
    report("getSessions(req, context) handles Next.js context object without error", true);

    const resReadyCtx = await (getReady as any)(
      new NextRequest("http://localhost:3000/api/ready"),
      mockContext
    );
    assert.strictEqual(resReadyCtx.status, 200);
    report("getReady(req, context) handles Next.js context object without error", true);

    // 1.4 Response Header Content-Type verification
    const ctSessions = resSessions0.headers.get("content-type");
    assert(
      ctSessions && ctSessions.includes("application/json"),
      `Expected application/json, got ${ctSessions}`
    );
    report("getSessions() content-type is application/json", true);

    const ctReady = resReady0.headers.get("content-type");
    assert(
      ctReady && ctReady.includes("application/json"),
      `Expected application/json, got ${ctReady}`
    );
    report("getReady() content-type is application/json", true);
  } catch (err: any) {
    report("Suite 1 Route Contract & Overloads", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUITE 2: High Concurrency & Interleaved Stress Testing
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 2] High Concurrency Stress Testing (300 Parallel Requests)${RESET}`);
  try {
    const sessionUrls = [
      "http://localhost:3000/api/sessions",
      "http://localhost:3000/api/sessions?sport=Football",
      "http://localhost:3000/api/sessions?sport=Cricket",
      "http://localhost:3000/api/sessions?sport=football",
      "http://localhost:3000/api/sessions?status=open",
      "http://localhost:3000/api/sessions?status=closed",
      "http://localhost:3000/api/sessions?date=2026-11-02",
      "http://localhost:3000/api/sessions?date=2099-01-01",
      "http://localhost:3000/api/sessions?sport=Archery",
      "http://localhost:3000/api/sessions?date=2026-11-02&sport=Football",
    ];

    const sessionPromises = Array.from({ length: 100 }, (_, i) => {
      if (i % 10 === 0) return getSessions();
      const url = sessionUrls[i % sessionUrls.length];
      return getSessions(new NextRequest(url));
    });

    const sessionResponses = await Promise.all(sessionPromises);
    assert.strictEqual(sessionResponses.length, 100);
    const sessionBodies = await Promise.all(sessionResponses.map((r) => r.json()));
    assert.strictEqual(sessionBodies.length, 100);
    assert(
      sessionResponses.every((r) => r.status === 200),
      "All 100 concurrent sessions requests must return 200"
    );
    report("100 concurrent requests to /api/sessions succeeded with 100% HTTP 200", true);

    const readyUrls = [
      "http://localhost:3000/api/ready",
      "http://localhost:3000/api/ready?readyOnly=true",
      "http://localhost:3000/api/ready?readyOnly=false",
      "http://localhost:3000/api/ready?filter=readyOnly",
      "http://localhost:3000/api/ready?filter=all",
      "http://localhost:3000/api/ready?playerId=650000000000000000000001",
      "http://localhost:3000/api/ready?playerId=650000000000000000000002",
      "http://localhost:3000/api/ready?playerId=650000000000000000000003",
      "http://localhost:3000/api/ready?playerId=650000000000000000000001&readyOnly=true",
      "http://localhost:3000/api/ready?readyOnly=true&filter=readyOnly",
    ];

    const readyPromises = Array.from({ length: 100 }, (_, i) => {
      if (i % 10 === 0) return getReady();
      const url = readyUrls[i % readyUrls.length];
      return getReady(new NextRequest(url));
    });

    const readyResponses = await Promise.all(readyPromises);
    assert.strictEqual(readyResponses.length, 100);
    const readyBodies = await Promise.all(readyResponses.map((r) => r.json()));
    assert.strictEqual(readyBodies.length, 100);
    assert(
      readyResponses.every((r) => r.status === 200),
      "All 100 concurrent ready requests must return 200"
    );
    report("100 concurrent requests to /api/ready succeeded with 100% HTTP 200", true);

    for (let i = 0; i < 100; i++) {
      const url = i % 10 === 0 ? "zero-arg" : readyUrls[i % readyUrls.length];
      const body = readyBodies[i];

      if (url.includes("readyOnly=true") || url.includes("filter=readyOnly")) {
        const nonReady = body.filter((a: any) => a.isReady !== true);
        assert.strictEqual(
          nonReady.length,
          0,
          `Found non-ready player under readyOnly filter in req ${i}`
        );
      }

      if (url.includes("playerId=650000000000000000000001")) {
        if (!url.includes("readyOnly=true") || body.length > 0) {
          assert(
            body.every((a: any) => a.player._id === "650000000000000000000001"),
            `PlayerId isolation leaked other players in req ${i}`
          );
        }
      }
    }
    report("Data integrity verified across concurrent responses: zero data cross-leakage", true);

    const mixedPromises = Array.from({ length: 100 }, (_, i) => {
      if (i % 2 === 0) {
        return getSessions(new NextRequest(sessionUrls[i % sessionUrls.length]));
      } else {
        return getReady(new NextRequest(readyUrls[i % readyUrls.length]));
      }
    });
    const mixedResponses = await Promise.all(mixedPromises);
    assert(
      mixedResponses.every((r) => r.status === 200),
      "All mixed concurrent requests returned 200"
    );
    report("100 interleaved requests to /api/sessions and /api/ready resolved cleanly", true);
  } catch (err: any) {
    report("Suite 2 High Concurrency Stress Testing", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUITE 3: Query Parameter Combinations & Edge Cases
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 3] Query Parameter Combinations & Edge Cases${RESET}`);
  try {
    const resGhost = await getReady(
      new NextRequest("http://localhost:3000/api/ready?playerId=650000000000000000000999")
    );
    assert.strictEqual(resGhost.status, 200);
    const ghostData = await resGhost.json();
    assert.strictEqual(ghostData.length, 0, "Non-existent playerId must return empty array []");
    report("Non-existent playerId returns empty array [] with 200", true);

    const resWsPlayer = await getReady(
      new NextRequest("http://localhost:3000/api/ready?playerId=%20%20%20")
    );
    assert.strictEqual(resWsPlayer.status, 200);
    const wsData = await resWsPlayer.json();
    assert.strictEqual(wsData.length, 0, "Whitespace playerId returns []");
    report("Whitespace playerId returns [] gracefully", true);

    const resAll = await getReady(new NextRequest("http://localhost:3000/api/ready"));
    const allData = await resAll.json();

    const resReadyFalse = await getReady(
      new NextRequest("http://localhost:3000/api/ready?readyOnly=false")
    );
    const falseData = await resReadyFalse.json();
    assert.strictEqual(
      falseData.length,
      allData.length,
      "readyOnly=false must not filter out players"
    );
    report("readyOnly=false correctly returns all players without filtering", true);

    const resReadyCap = await getReady(
      new NextRequest("http://localhost:3000/api/ready?readyOnly=TRUE")
    );
    const capData = await resReadyCap.json();
    assert.strictEqual(capData.length, allData.length);
    report("readyOnly=TRUE (non-lowercase) behaves strictly per contract", true);

    const resConflict = await getReady(
      new NextRequest("http://localhost:3000/api/ready?filter=readyOnly&readyOnly=false")
    );
    const conflictData = await resConflict.json();
    assert(conflictData.every((a: any) => a.isReady === true));
    report("filter=readyOnly takes effect even when readyOnly=false is passed", true);

    const p1Id = allData[0].player._id;
    const resEnriched = await getReady(
      new NextRequest(`http://localhost:3000/api/ready?playerId=${p1Id}`)
    );
    const enrichedData = await resEnriched.json();
    assert.strictEqual(enrichedData.length, 1);
    const playerRow = enrichedData[0];

    assert(Array.isArray(playerRow.attendanceHistory), "attendanceHistory must be an array");
    assert(Array.isArray(playerRow.matchHistory), "matchHistory must be an array");

    if (playerRow.attendanceHistory.length > 0) {
      const att = playerRow.attendanceHistory[0];
      assert(typeof att.sessionId === "string", "att.sessionId is string");
      assert(typeof att.date === "string", "att.date is string");
      assert(typeof att.sport === "string", "att.sport is string");
      assert(
        att.status === "PRESENT" || att.status === "ABSENT",
        `att.status must be PRESENT|ABSENT, got ${att.status}`
      );

      for (let i = 1; i < playerRow.attendanceHistory.length; i++) {
        assert(
          playerRow.attendanceHistory[i - 1].date >= playerRow.attendanceHistory[i].date,
          "attendanceHistory must be sorted descending by date"
        );
      }
    }
    report("attendanceHistory contract, field types, and descending date sort verified", true);

    if (playerRow.matchHistory.length > 0) {
      const m = playerRow.matchHistory[0];
      assert(typeof m.matchId === "string", "m.matchId is string");
      assert(typeof m.date === "string", "m.date is string");
      assert(typeof m.sport === "string", "m.sport is string");
      assert(typeof m.player1Score === "number", "m.player1Score is number");
      assert(typeof m.player2Score === "number", "m.player2Score is number");

      for (let i = 1; i < playerRow.matchHistory.length; i++) {
        assert(
          playerRow.matchHistory[i - 1].date >= playerRow.matchHistory[i].date,
          "matchHistory must be sorted descending by date"
        );
      }
    }
    report("matchHistory contract, field types, and descending date sort verified", true);
  } catch (err: any) {
    report("Suite 3 Query Parameter Combinations & Edge Cases", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUITE 4: Malformed URLs & Error Paths
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 4] Malformed URLs & Error Paths${RESET}`);
  try {
    const mockBadReq = { url: "not-a-valid-url" } as any;
    const resBadUrlReady = await getReady(mockBadReq);
    assert.strictEqual(resBadUrlReady.status, 200, "getReady must handle malformed URL via fallback");
    const badUrlData = await resBadUrlReady.json();
    assert(Array.isArray(badUrlData), "getReady returned valid data even on malformed URL");
    report("getReady gracefully handles malformed req.url via fallback", true);

    const resBadUrlSessions = await getSessions(mockBadReq);
    assert.strictEqual(
      resBadUrlSessions.status,
      500,
      "getSessions catches bad URL and returns 500 JSON without process crash"
    );
    const badUrlSessionsJson = await resBadUrlSessions.json();
    assert(badUrlSessionsJson.error, "getSessions returns { error } on 500");
    report("getSessions safely catches invalid URL error in try/catch (HTTP 500 JSON, no crash)", true);

    const resRegexParen = await getSessions(
      new NextRequest("http://localhost:3000/api/sessions?sport=%28%2A")
    );
    assert.strictEqual(
      resRegexParen.status,
      500,
      "Regex injection caught safely by try/catch without crashing server"
    );
    const regexErrJson = await resRegexParen.json();
    assert(regexErrJson.error, "Returns JSON error object");
    report("Regex injection ?sport=(* safely trapped with HTTP 500 JSON (no unhandled exception)", true);
  } catch (err: any) {
    report("Suite 4 Malformed URLs & Error Paths", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUITE 5: Strict Ready Formula Invariance Verification
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 5] Strict Ready Formula Invariance (attendancePct >= 75 && matchCount >= 2)${RESET}`);
  try {
    const resReady = await getReady(new NextRequest("http://localhost:3000/api/ready"));
    const athletes = await resReady.json();

    for (const a of athletes) {
      const expectedReady = a.attendancePct >= 75 && a.matchCount >= 2;
      assert.strictEqual(
        a.isReady,
        expectedReady,
        `Readiness invariant violated for ${a.player.name}: attendance=${a.attendancePct}%, matches=${a.matchCount}, isReady=${a.isReady}, expected=${expectedReady}`
      );
    }
    report(`Readiness formula strictly invariant across all ${athletes.length} database athletes`, true);

    for (const a of athletes) {
      assert(
        a.attendancePct >= 0 && a.attendancePct <= 100,
        `attendancePct ${a.attendancePct} out of bounds [0, 100]`
      );
      assert(a.matchCount >= 0, `matchCount ${a.matchCount} negative`);
      assert(a.sessionsHeld >= 0, `sessionsHeld ${a.sessionsHeld} negative`);
      assert(a.sessionsPresent >= 0, `sessionsPresent ${a.sessionsPresent} negative`);
      assert(
        a.sessionsPresent <= a.sessionsHeld,
        `sessionsPresent (${a.sessionsPresent}) > sessionsHeld (${a.sessionsHeld})`
      );
    }
    report("All numerical metrics (attendancePct, matchCount, sessions) strictly within valid mathematical bounds", true);
  } catch (err: any) {
    report("Suite 5 Ready Formula Invariance", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUITE 6: Empty Database & Corrupted Collection Edge Cases
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 6] Empty Database & Corrupted Document Fault Tolerance${RESET}`);
  const db = await getDb();
  const originalCollection = db.collection.bind(db);
  try {
    // 6.1 Completely empty database (0 players, 0 sessions, 0 matches)
    db.collection = (() => ({
      find: () => ({
        sort: () => ({ toArray: async () => [] }),
        toArray: async () => [],
      }),
    })) as any;

    const resEmptySessions = await getSessions(new NextRequest("http://localhost:3000/api/sessions"));
    assert.strictEqual(resEmptySessions.status, 200);
    const sessionsEmptyData = await resEmptySessions.json();
    assert.deepStrictEqual(sessionsEmptyData, []);
    report("Empty database: /api/sessions returns 200 with []", true);

    const resEmptyReady = await getReady(new NextRequest("http://localhost:3000/api/ready"));
    assert.strictEqual(resEmptyReady.status, 200);
    const readyEmptyData = await resEmptyReady.json();
    assert.deepStrictEqual(readyEmptyData, []);
    report("Empty database: /api/ready returns 200 with []", true);

    const resEmptyReadyPlayer = await getReady(
      new NextRequest("http://localhost:3000/api/ready?playerId=650000000000000000000001")
    );
    assert.strictEqual(resEmptyReadyPlayer.status, 200);
    const readyEmptyPlayerData = await resEmptyReadyPlayer.json();
    assert.deepStrictEqual(readyEmptyPlayerData, []);
    report("Empty database: /api/ready?playerId=... returns 200 with []", true);

    // 6.2 Players exist, but 0 sessions and 0 matches (checks division by zero 0/0)
    const mockPlayers = [
      { _id: new ObjectId("650000000000000000000001"), name: "Zero Sessions Player", sport: "Football" },
    ];
    db.collection = ((col: string) => ({
      find: () => ({
        sort: () => ({
          toArray: async () => (col === "players" ? mockPlayers : []),
        }),
        toArray: async () => (col === "players" ? mockPlayers : []),
      }),
    })) as any;

    const resZeroSessions = await getReady(new NextRequest("http://localhost:3000/api/ready"));
    assert.strictEqual(resZeroSessions.status, 200);
    const zeroSessionsData = await resZeroSessions.json();
    assert.strictEqual(zeroSessionsData.length, 1);
    const pRecord = zeroSessionsData[0];
    assert.strictEqual(pRecord.sessionsHeld, 0);
    assert.strictEqual(pRecord.sessionsPresent, 0);
    assert.strictEqual(pRecord.attendancePct, 0, "0/0 sessions must yield attendancePct: 0, not NaN");
    assert.strictEqual(pRecord.matchCount, 0);
    assert.strictEqual(pRecord.isReady, false);
    assert(!Number.isNaN(pRecord.attendancePct), "attendancePct must not be NaN");
    report("Zero sessions: attendancePct evaluates cleanly to 0 (no division by zero / NaN)", true);

    // 6.3 Corrupted database documents (null attendance, non-array scores, missing fields)
    const corruptedSessions = [
      { _id: new ObjectId(), sport: "Football", date: "2026-11-01", attendance: null },
      { _id: new ObjectId(), sport: "Football", date: "2026-11-02", attendance: "invalid-string" },
      {
        _id: new ObjectId(),
        sport: "Football",
        date: "2026-11-03",
        attendance: [{ playerId: null, status: null }],
      },
    ];
    const corruptedMatches = [
      { _id: new ObjectId(), sport: "Football", date: "2026-11-01", scores: null },
      { _id: new ObjectId(), sport: "Football", date: "2026-11-02", scores: "invalid" },
      {
        _id: new ObjectId(),
        sport: "Football",
        date: "2026-11-03",
        scores: [{ playerId: null, score: "not-a-number" }],
      },
    ];

    db.collection = ((col: string) => ({
      find: () => ({
        sort: () => ({
          toArray: async () =>
            col === "players"
              ? mockPlayers
              : col === "sessions"
              ? corruptedSessions
              : corruptedMatches,
        }),
        toArray: async () =>
          col === "players"
            ? mockPlayers
            : col === "sessions"
            ? corruptedSessions
            : corruptedMatches,
      }),
    })) as any;

    const resCorruptedReady = await getReady(new NextRequest("http://localhost:3000/api/ready"));
    assert.strictEqual(resCorruptedReady.status, 200);
    const corruptedReadyData = await resCorruptedReady.json();
    assert.strictEqual(corruptedReadyData.length, 1);
    report("Corrupted documents (null attendance/scores arrays) handled safely without crash", true);

    const resCorruptedPlayer = await getReady(
      new NextRequest("http://localhost:3000/api/ready?playerId=650000000000000000000001")
    );
    assert.strictEqual(resCorruptedPlayer.status, 200);
    const corruptedPlayerData = await resCorruptedPlayer.json();
    assert.strictEqual(corruptedPlayerData.length, 1);
    assert(Array.isArray(corruptedPlayerData[0].attendanceHistory));
    assert(Array.isArray(corruptedPlayerData[0].matchHistory));
    report("Corrupted documents with ?playerId query returns clean arrays without throwing", true);
  } catch (err: any) {
    report("Suite 6 Empty Database & Corrupted Document Fault Tolerance", false, err.message);
  } finally {
    db.collection = originalCollection as any;
  }

  // -----------------------------------------------------------------
  // FINAL SUMMARY
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}=================================================${RESET}`);
  console.log(`   TOTAL TESTS: Passed: ${GREEN}${passCount}${RESET}, Failed: ${RED}${failCount}${RESET}`);
  console.log(`${CYAN}=================================================\n${RESET}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runAdversarialSuite().catch((e) => {
  console.error("Uncaught error in test suite:", e);
  process.exit(1);
});
