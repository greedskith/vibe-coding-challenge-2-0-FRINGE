import { getDb } from "../lib/db";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { GET as getReady } from "../app/api/ready/route";
import assert from "node:assert";

interface TestReport {
  name: string;
  category: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const reports: TestReport[] = [];

function recordTest(category: string, name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      reports.push({ category, name, passed: true });
      console.log(`  ✓ [PASS] [${category}] ${name}`);
    } catch (err: any) {
      reports.push({ category, name, passed: false, error: err.message, details: err.stack });
      console.error(`  ✗ [FAIL] [${category}] ${name}: ${err.message}`);
    }
  };
}

async function runAdversarialSuite() {
  console.log("=================================================");
  console.log("   ADVERSARIAL STRESS TEST SUITE: /api/ready     ");
  console.log("=================================================\n");

  const db = await getDb();

  // Backup current state of sessions, matches, players
  const origPlayers = await db.collection("players").find().toArray();
  const origSessions = await db.collection("sessions").find().toArray();
  const origMatches = await db.collection("matches").find().toArray();

  try {
    // -------------------------------------------------------------
    // SETUP TEST ISOLATION
    // -------------------------------------------------------------
    await db.collection("sessions").deleteMany({});
    await db.collection("matches").deleteMany({});
    await db.collection("players").deleteMany({});

    // Create 3 test players:
    // P1: Football
    // P2: Football
    // P3: Cricket
    const p1Id = new ObjectId("660000000000000000000001");
    const p2Id = new ObjectId("660000000000000000000002");
    const p3Id = new ObjectId("660000000000000000000003");

    await db.collection("players").insertMany([
      { _id: p1Id, name: "Test Rohit", age: 17, sport: "Football" },
      { _id: p2Id, name: "Test Priya", age: 16, sport: "Football" },
      { _id: p3Id, name: "Test Amit", age: 18, sport: "Cricket" },
    ]);

    // =============================================================
    // CATEGORY 1: Mathematical Boundaries (Attendance %)
    // =============================================================
    console.log("▶ [CATEGORY 1] Mathematical Attendance % Boundaries...");

    // Test 1.1: 0 held sessions -> attendancePct: 0, isReady: false
    await recordTest("Boundary - Attendance", "0 sessions held -> 0% attendance, isReady: false", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.sessionsHeld, 0);
      assert.strictEqual(p1.sessionsPresent, 0);
      assert.strictEqual(p1.attendancePct, 0);
      assert.strictEqual(p1.isReady, false);
    })();

    // Helper to generate N sessions with K present for a player
    async function setAttendanceSessions(sport: string, total: number, presentCount: number, targetPlayerId: ObjectId) {
      await db.collection("sessions").deleteMany({});
      const sessionDocs = [];
      for (let i = 0; i < total; i++) {
        const isPresent = i < presentCount;
        sessionDocs.push({
          date: `2026-01-${String(i + 1).padStart(2, "0")}`,
          sport,
          status: "closed",
          attendance: [
            {
              playerId: targetPlayerId,
              status: isPresent ? "present" : "absent",
            },
          ],
        });
      }
      if (sessionDocs.length > 0) {
        await db.collection("sessions").insertMany(sessionDocs);
      }
    }

    // Helper to set matches count
    async function setPlayerMatches(targetPlayerId: ObjectId, count: number, sport = "Football") {
      await db.collection("matches").deleteMany({});
      const matchDocs = [];
      for (let i = 0; i < count; i++) {
        matchDocs.push({
          date: `2026-02-${String(i + 1).padStart(2, "0")}`,
          sport,
          opponent: `Opponent ${i + 1}`,
          outcome: "win",
          scores: [
            { playerId: targetPlayerId, score: 2 + i },
            { playerId: new ObjectId(), score: 1 },
          ],
        });
      }
      if (matchDocs.length > 0) {
        await db.collection("matches").insertMany(matchDocs);
      }
    }

    // Give P1 2 matches so readiness is solely controlled by attendancePct
    await setPlayerMatches(p1Id, 2);

    // Test 1.2: Exactly 74% attendance (74/100) -> isReady: false
    await recordTest("Boundary - Attendance", "Exactly 74% attendance (74/100) with 2 matches -> isReady: false", async () => {
      await setAttendanceSessions("Football", 100, 74, p1Id);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.sessionsHeld, 100);
      assert.strictEqual(p1.sessionsPresent, 74);
      assert.strictEqual(p1.attendancePct, 74);
      assert.strictEqual(p1.isReady, false);
    })();

    // Test 1.3: Exactly 75% attendance (75/100) -> isReady: true
    await recordTest("Boundary - Attendance", "Exactly 75% attendance (75/100) with 2 matches -> isReady: true", async () => {
      await setAttendanceSessions("Football", 100, 75, p1Id);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.sessionsHeld, 100);
      assert.strictEqual(p1.sessionsPresent, 75);
      assert.strictEqual(p1.attendancePct, 75);
      assert.strictEqual(p1.isReady, true);
    })();

    // Test 1.4: 3 out of 4 sessions = 75.0% -> isReady: true
    await recordTest("Boundary - Attendance", "3 of 4 sessions (75%) with 2 matches -> isReady: true", async () => {
      await setAttendanceSessions("Football", 4, 3, p1Id);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.sessionsHeld, 4);
      assert.strictEqual(p1.sessionsPresent, 3);
      assert.strictEqual(p1.attendancePct, 75);
      assert.strictEqual(p1.isReady, true);
    })();

    // Test 1.5: 74.4% (372 / 500) -> rounds down to 74% -> isReady: false
    await recordTest("Boundary - Attendance", "74.4% (372/500) rounds to 74 -> isReady: false", async () => {
      await setAttendanceSessions("Football", 500, 372, p1Id);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.attendancePct, 74);
      assert.strictEqual(p1.isReady, false);
    })();

    // Test 1.6: 74.5% (149 / 200) -> rounds up to 75% -> isReady: true
    await recordTest("Boundary - Attendance", "74.5% (149/200) rounds to 75 -> isReady: true", async () => {
      await setAttendanceSessions("Football", 200, 149, p1Id);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.attendancePct, 75);
      assert.strictEqual(p1.isReady, true);
    })();

    // Test 1.7: 74.9% (749 / 1000) -> rounds to 75% -> isReady: true
    await recordTest("Boundary - Attendance", "74.9% (749/1000) rounds to 75 -> isReady: true", async () => {
      await setAttendanceSessions("Football", 1000, 749, p1Id);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.attendancePct, 75);
      assert.strictEqual(p1.isReady, true);
    })();

    // Test 1.8: 75.1% (751 / 1000) -> rounds to 75% -> isReady: true
    await recordTest("Boundary - Attendance", "75.1% (751/1000) rounds to 75 -> isReady: true", async () => {
      await setAttendanceSessions("Football", 1000, 751, p1Id);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.attendancePct, 75);
      assert.strictEqual(p1.isReady, true);
    })();

    // =============================================================
    // CATEGORY 2: Boundary Tests on Match Count
    // =============================================================
    console.log("\n▶ [CATEGORY 2] Match Count Boundaries (0, 1, 2, 3, 10)...");

    // Set 100% attendance (4 of 4)
    await setAttendanceSessions("Football", 4, 4, p1Id);

    // Test 2.1: 0 matches at 100% attendance -> isReady: false
    await recordTest("Boundary - Matches", "0 matches with 100% attendance -> isReady: false", async () => {
      await setPlayerMatches(p1Id, 0);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.matchCount, 0);
      assert.strictEqual(p1.isReady, false);
    })();

    // Test 2.2: 1 match at 100% attendance -> isReady: false
    await recordTest("Boundary - Matches", "1 match with 100% attendance -> isReady: false", async () => {
      await setPlayerMatches(p1Id, 1);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.matchCount, 1);
      assert.strictEqual(p1.isReady, false);
    })();

    // Test 2.3: 2 matches at 100% attendance -> isReady: true
    await recordTest("Boundary - Matches", "2 matches with 100% attendance -> isReady: true", async () => {
      await setPlayerMatches(p1Id, 2);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.matchCount, 2);
      assert.strictEqual(p1.isReady, true);
    })();

    // Test 2.4: 3 matches at 100% attendance -> isReady: true
    await recordTest("Boundary - Matches", "3 matches with 100% attendance -> isReady: true", async () => {
      await setPlayerMatches(p1Id, 3);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.matchCount, 3);
      assert.strictEqual(p1.isReady, true);
    })();

    // Test 2.5: 10 matches at 74% attendance -> isReady: false
    await recordTest("Boundary - Matches", "10 matches with 74% attendance -> isReady: false", async () => {
      await setAttendanceSessions("Football", 100, 74, p1Id);
      await setPlayerMatches(p1Id, 10);
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      const p1 = data.find((r: any) => r.player._id === p1Id.toString());
      assert.strictEqual(p1.matchCount, 10);
      assert.strictEqual(p1.attendancePct, 74);
      assert.strictEqual(p1.isReady, false);
    })();

    // =============================================================
    // CATEGORY 3: Query Parameter Filtering Matrix
    // =============================================================
    console.log("\n▶ [CATEGORY 3] Query Parameter Combinations & Flags...");

    // Setup:
    // P1: Ready (100% att, 2 matches)
    // P2: Not Ready (50% att, 2 matches)
    // P3: Not Ready (100% att, 0 matches)
    await db.collection("sessions").deleteMany({});
    await db.collection("matches").deleteMany({});

    await db.collection("sessions").insertMany([
      {
        date: "2026-03-01",
        sport: "Football",
        status: "closed",
        attendance: [
          { playerId: p1Id, status: "present" },
          { playerId: p2Id, status: "present" },
        ],
      },
      {
        date: "2026-03-02",
        sport: "Football",
        status: "closed",
        attendance: [
          { playerId: p1Id, status: "present" },
          { playerId: p2Id, status: "absent" },
        ],
      },
      {
        date: "2026-03-01",
        sport: "Cricket",
        status: "closed",
        attendance: [
          { playerId: p3Id, status: "present" },
        ],
      },
    ]);

    await db.collection("matches").insertMany([
      {
        date: "2026-03-03",
        sport: "Football",
        opponent: "FC A",
        outcome: "win",
        scores: [
          { playerId: p1Id, score: 2 },
          { playerId: p2Id, score: 1 },
        ],
      },
      {
        date: "2026-03-04",
        sport: "Football",
        opponent: "FC B",
        outcome: "win",
        scores: [
          { playerId: p1Id, score: 3 },
          { playerId: p2Id, score: 0 },
        ],
      },
    ]);

    // Test 3.1: No query params returns all 3 players
    await recordTest("Query Filtering", "No params returns all players, no history", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const data = await res.json();
      assert.strictEqual(data.length, 3);
      assert.strictEqual(data[0].attendanceHistory, undefined);
      assert.strictEqual(data[0].matchHistory, undefined);
    })();

    // Test 3.2: ?readyOnly=true returns only P1
    await recordTest("Query Filtering", "?readyOnly=true returns only ready players", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=true"));
      const data = await res.json();
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].player._id, p1Id.toString());
      assert.strictEqual(data[0].isReady, true);
    })();

    // Test 3.3: ?filter=readyOnly returns only P1
    await recordTest("Query Filtering", "?filter=readyOnly returns only ready players", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?filter=readyOnly"));
      const data = await res.json();
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].player._id, p1Id.toString());
      assert.strictEqual(data[0].isReady, true);
    })();

    // Test 3.4: ?readyOnly=true&filter=readyOnly combined returns only P1
    await recordTest("Query Filtering", "?readyOnly=true&filter=readyOnly combined", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=true&filter=readyOnly"));
      const data = await res.json();
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].player._id, p1Id.toString());
    })();

    // Test 3.5: ?readyOnly=false returns all players
    await recordTest("Query Filtering", "?readyOnly=false returns all players", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=false"));
      const data = await res.json();
      assert.strictEqual(data.length, 3);
    })();

    // Test 3.6: ?readyOnly=randomString returns all players
    await recordTest("Query Filtering", "?readyOnly=randomString returns all players", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=foobar"));
      const data = await res.json();
      assert.strictEqual(data.length, 3);
    })();

    // Test 3.7: ?readyOnly=TRUE (case-sensitivity) returns all players
    await recordTest("Query Filtering", "?readyOnly=TRUE (case-sensitive) does not filter", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=TRUE"));
      const data = await res.json();
      assert.strictEqual(data.length, 3);
    })();

    // Test 3.8: ?readyOnly=false&filter=readyOnly filters to ready (filter overrides)
    await recordTest("Query Filtering", "?readyOnly=false&filter=readyOnly filters to ready", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=false&filter=readyOnly"));
      const data = await res.json();
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].player._id, p1Id.toString());
    })();

    // =============================================================
    // CATEGORY 4: Player Isolation (?playerId=...)
    // =============================================================
    console.log("\n▶ [CATEGORY 4] Player Isolation...");

    // Test 4.1: Valid playerId returns single enriched record
    await recordTest("Player Isolation", "Valid ?playerId= returns single enriched record", async () => {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p1Id.toString()}`));
      const data = await res.json();
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].player._id, p1Id.toString());
      assert(Array.isArray(data[0].attendanceHistory), "attendanceHistory must be an array");
      assert(Array.isArray(data[0].matchHistory), "matchHistory must be an array");
      assert.strictEqual(data[0].attendanceHistory.length, 2);
      assert.strictEqual(data[0].matchHistory.length, 2);
    })();

    // Test 4.2: Non-existent valid ObjectId returns []
    await recordTest("Player Isolation", "Non-existent playerId returns []", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=660000000000000000000999"));
      const data = await res.json();
      assert.strictEqual(data.length, 0);
    })();

    // Test 4.3: Malformed playerId string returns [] without crash
    await recordTest("Player Isolation", "Malformed playerId string returns [] safely", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=invalid-id-xyz-123"));
      const data = await res.json();
      assert.strictEqual(data.length, 0);
    })();

    // Test 4.4: Empty ?playerId= returns all players
    await recordTest("Player Isolation", "Empty ?playerId= returns all players", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId="));
      const data = await res.json();
      assert.strictEqual(data.length, 3);
    })();

    // Test 4.5: Whitespace ?playerId=    returns []
    await recordTest("Player Isolation", "Whitespace ?playerId=%20%20%20 returns []", async () => {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=%20%20%20"));
      const data = await res.json();
      assert.strictEqual(data.length, 0);
    })();

    // Test 4.6: Single player + readyOnly=true for ready player -> returns [player]
    await recordTest("Player Isolation", "Ready player + ?readyOnly=true returns [player]", async () => {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p1Id.toString()}&readyOnly=true`));
      const data = await res.json();
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].player._id, p1Id.toString());
      assert.strictEqual(data[0].isReady, true);
    })();

    // Test 4.7: Single player + readyOnly=true for non-ready player -> returns []
    await recordTest("Player Isolation", "Non-ready player + ?readyOnly=true returns []", async () => {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p2Id.toString()}&readyOnly=true`));
      const data = await res.json();
      assert.strictEqual(data.length, 0);
    })();

    // Test 4.8: Single player + filter=readyOnly for non-ready player -> returns []
    await recordTest("Player Isolation", "Non-ready player + ?filter=readyOnly returns []", async () => {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p2Id.toString()}&filter=readyOnly`));
      const data = await res.json();
      assert.strictEqual(data.length, 0);
    })();

    // =============================================================
    // CATEGORY 5: History Enrichment & Ordering
    // =============================================================
    console.log("\n▶ [CATEGORY 5] History Enrichment & Descending Date Sorting...");

    await db.collection("sessions").deleteMany({});
    await db.collection("matches").deleteMany({});

    // Create sessions with non-chronological insertion
    await db.collection("sessions").insertMany([
      {
        date: "2026-04-10",
        sport: "Football",
        status: "closed",
        attendance: [{ playerId: p1Id, status: "present" }],
      },
      {
        date: "2026-04-25",
        sport: "Football",
        status: "closed",
        attendance: [{ playerId: p1Id, status: "absent" }],
      },
      {
        date: "2026-04-18",
        sport: "Football",
        status: "closed",
        attendance: [{ playerId: p1Id, status: "present" }],
      },
    ]);

    // Create matches with non-chronological insertion
    await db.collection("matches").insertMany([
      {
        date: "2026-04-12",
        sport: "Football",
        opponent: "FC Mid",
        outcome: "draw",
        scores: [
          { playerId: p1Id, score: 1 },
          { playerId: p2Id, score: 1 },
        ],
      },
      {
        date: "2026-04-28",
        sport: "Football",
        opponent: "FC Late",
        outcome: "win",
        scores: [
          { playerId: p1Id, score: 4 },
          { playerId: p2Id, score: 0 },
        ],
      },
      {
        date: "2026-04-05",
        sport: "Football",
        opponent: "FC Early",
        outcome: "loss",
        scores: [
          { playerId: p1Id, score: 0 },
          { playerId: p2Id, score: 2 },
        ],
      },
    ]);

    // Test 5.1: Verify attendanceHistory chronological ordering (descending) & format
    await recordTest("History Enrichment", "attendanceHistory is sorted descending by date with normalized status", async () => {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p1Id.toString()}`));
      const data = await res.json();
      const p = data[0];
      assert.strictEqual(p.attendanceHistory.length, 3);
      assert.strictEqual(p.attendanceHistory[0].date, "2026-04-25");
      assert.strictEqual(p.attendanceHistory[0].status, "ABSENT");
      assert.strictEqual(p.attendanceHistory[1].date, "2026-04-18");
      assert.strictEqual(p.attendanceHistory[1].status, "PRESENT");
      assert.strictEqual(p.attendanceHistory[2].date, "2026-04-10");
      assert.strictEqual(p.attendanceHistory[2].status, "PRESENT");

      // Verify shape
      for (const item of p.attendanceHistory) {
        assert(typeof item.sessionId === "string", "sessionId must be string");
        assert(typeof item.date === "string", "date must be string");
        assert(typeof item.sport === "string", "sport must be string");
        assert(item.status === "PRESENT" || item.status === "ABSENT", "status must be PRESENT or ABSENT");
      }
    })();

    // Test 5.2: Verify matchHistory chronological ordering (descending) & player score isolation
    await recordTest("History Enrichment", "matchHistory is sorted descending by date with accurate score extraction", async () => {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p1Id.toString()}`));
      const data = await res.json();
      const p = data[0];
      assert.strictEqual(p.matchHistory.length, 3);
      assert.strictEqual(p.matchHistory[0].date, "2026-04-28");
      assert.strictEqual(p.matchHistory[0].opponent, "FC Late");
      assert.strictEqual(p.matchHistory[0].score, 4);
      assert.strictEqual(p.matchHistory[0].player1Score, 4);
      assert.strictEqual(p.matchHistory[0].player2Score, 0);

      assert.strictEqual(p.matchHistory[1].date, "2026-04-12");
      assert.strictEqual(p.matchHistory[1].opponent, "FC Mid");
      assert.strictEqual(p.matchHistory[1].score, 1);

      assert.strictEqual(p.matchHistory[2].date, "2026-04-05");
      assert.strictEqual(p.matchHistory[2].opponent, "FC Early");
      assert.strictEqual(p.matchHistory[2].score, 0);

      // Verify shape
      for (const item of p.matchHistory) {
        assert(typeof item.matchId === "string", "matchId must be string");
        assert(typeof item.date === "string", "date must be string");
        assert(typeof item.sport === "string", "sport must be string");
        assert(typeof item.score === "number", "score must be number");
        assert(typeof item.player1Score === "number", "player1Score must be number");
        assert(typeof item.player2Score === "number", "player2Score must be number");
      }
    })();

    // =============================================================
    // CATEGORY 6: Live Data Mutation & Reactive Enrichment
    // =============================================================
    console.log("\n▶ [CATEGORY 6] Data Mutations & Reactive Recalculation...");

    // Test 6.1: Transition from Not Ready -> Ready upon 2nd match
    await recordTest("Data Mutation", "Adding 2nd match immediately promotes athlete to Ready", async () => {
      // 100% att (1 session), 1 match -> Not Ready
      await db.collection("sessions").deleteMany({});
      await db.collection("matches").deleteMany({});
      await db.collection("sessions").insertOne({
        date: "2026-05-01",
        sport: "Football",
        status: "closed",
        attendance: [{ playerId: p1Id, status: "present" }],
      });
      await db.collection("matches").insertOne({
        date: "2026-05-02",
        sport: "Football",
        opponent: "FC Opp 1",
        scores: [{ playerId: p1Id, score: 1 }],
      });

      const beforeRes = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p1Id.toString()}`));
      const beforeData = await beforeRes.json();
      assert.strictEqual(beforeData[0].isReady, false);
      assert.strictEqual(beforeData[0].matchCount, 1);

      // Add 2nd match
      await db.collection("matches").insertOne({
        date: "2026-05-03",
        sport: "Football",
        opponent: "FC Opp 2",
        scores: [{ playerId: p1Id, score: 2 }],
      });

      const afterRes = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p1Id.toString()}`));
      const afterData = await afterRes.json();
      assert.strictEqual(afterData[0].matchCount, 2);
      assert.strictEqual(afterData[0].isReady, true);
      assert.strictEqual(afterData[0].matchHistory.length, 2);
    })();

    // Test 6.2: Transition from Ready -> Not Ready upon absences dropping attendance below 75%
    await recordTest("Data Mutation", "Adding absences drops attendance below 75% and revokes Ready status", async () => {
      // Currently: 1 held, 1 present = 100%, 2 matches -> Ready
      // Add 3 absent sessions -> 1 present / 4 held = 25% -> Not Ready!
      await db.collection("sessions").insertMany([
        { date: "2026-05-04", sport: "Football", attendance: [{ playerId: p1Id, status: "absent" }] },
        { date: "2026-05-05", sport: "Football", attendance: [{ playerId: p1Id, status: "absent" }] },
        { date: "2026-05-06", sport: "Football", attendance: [{ playerId: p1Id, status: "absent" }] },
      ]);

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p1Id.toString()}`));
      const data = await res.json();
      assert.strictEqual(data[0].sessionsHeld, 4);
      assert.strictEqual(data[0].sessionsPresent, 1);
      assert.strictEqual(data[0].attendancePct, 25);
      assert.strictEqual(data[0].matchCount, 2);
      assert.strictEqual(data[0].isReady, false);
      assert.strictEqual(data[0].attendanceHistory.length, 4);
    })();

    // =============================================================
    // CATEGORY 7: Sport Scoping Edge Cases
    // =============================================================
    console.log("\n▶ [CATEGORY 7] Multi-Sport Scoping & Isolation...");

    // Test 7.1: Sessions from another sport (Cricket) do not affect Football player
    await recordTest("Sport Scoping", "Cricket sessions do not count against Football player", async () => {
      // Reset
      await db.collection("sessions").deleteMany({});
      await db.collection("matches").deleteMany({});

      // 1 Football session: P1 present
      await db.collection("sessions").insertOne({
        date: "2026-06-01",
        sport: "Football",
        attendance: [{ playerId: p1Id, status: "present" }],
      });

      // 5 Cricket sessions: P1 not in attendance, P3 present
      for (let i = 0; i < 5; i++) {
        await db.collection("sessions").insertOne({
          date: `2026-06-0${i + 2}`,
          sport: "Cricket",
          attendance: [{ playerId: p3Id, status: "present" }],
        });
      }

      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p1Id.toString()}`));
      const data = await res.json();
      // P1 should only have 1 session held, 1 present -> 100%
      assert.strictEqual(data[0].sessionsHeld, 1);
      assert.strictEqual(data[0].sessionsPresent, 1);
      assert.strictEqual(data[0].attendancePct, 100);
      assert.strictEqual(data[0].attendanceHistory.length, 1);
    })();

    // =============================================================
    // CATEGORY 8: Corrupt / Malformed DB Document Resilience
    // =============================================================
    console.log("\n▶ [CATEGORY 8] Document Malformation Resilience...");

    // Test 8.1: Session with null attendance and Match with null scores do not cause 500 error
    await recordTest("Fault Tolerance", "Null attendance and null scores handled gracefully without 500", async () => {
      await db.collection("sessions").insertOne({
        date: "2026-07-01",
        sport: "Football",
        attendance: null,
      });
      await db.collection("matches").insertOne({
        date: "2026-07-02",
        sport: "Football",
        scores: null,
      });

      const res = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(Array.isArray(data));
      assert(data.length >= 3);
    })();

    // =============================================================
    // CATEGORY 9: Zero-Argument Signature Invocation
    // =============================================================
    console.log("\n▶ [CATEGORY 9] Zero-Argument Signature Invocation...");

    // Test 9.1: Direct invocation GET() without arguments
    await recordTest("API Signature", "GET() callable with zero arguments", async () => {
      const res = await getReady();
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(Array.isArray(data));
      assert(data.length >= 3);
    })();

  } finally {
    // Restore original DB state
    console.log("\nCleaning up and restoring database state...");
    await db.collection("players").deleteMany({});
    await db.collection("sessions").deleteMany({});
    await db.collection("matches").deleteMany({});

    if (origPlayers.length > 0) await db.collection("players").insertMany(origPlayers);
    if (origSessions.length > 0) await db.collection("sessions").insertMany(origSessions);
    if (origMatches.length > 0) await db.collection("matches").insertMany(origMatches);
  }

  // Summary
  console.log("\n=================================================");
  console.log("   ADVERSARIAL STRESS TEST SUMMARY               ");
  console.log("=================================================");
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;

  console.log(`Total Scenarios Tested : ${total}`);
  console.log(`Passed                 : ${passed}`);
  console.log(`Failed                 : ${failed}`);

  if (failed > 0) {
    console.error("\nFAILED SCENARIOS:");
    for (const f of reports.filter((r) => !r.passed)) {
      console.error(`- [${f.category}] ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log("\nALL ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS!");
  }
}

runAdversarialSuite().catch((err) => {
  console.error("Fatal error during adversarial suite execution:", err);
  process.exit(1);
});
