import { getDb } from "../lib/db";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { GET as getReady } from "../app/api/ready/route";
import { POST as postSessions } from "../app/api/sessions/route";
import { PATCH as patchSessionById } from "../app/api/sessions/[id]/route";
import { POST as postMatches } from "../app/api/matches/route";
import { POST as postPlayers } from "../app/api/players/route";
import middleware from "../middleware";
import assert from "node:assert";

// Ensure auth environment
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "fringe-academy-desk-secret-2026";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// Terminal colors
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let passCount = 0;
let failCount = 0;
const failures: Array<{ suite: string; name: string; error: string }> = [];

function report(suite: string, name: string, passed: boolean, details?: string) {
  if (passed) {
    passCount++;
    console.log(`  ${GREEN}✓ [PASS]${RESET} [${suite}] ${name}`);
  } else {
    failCount++;
    failures.push({ suite, name, error: details || "Assertion failed" });
    console.error(`  ${RED}✗ [FAIL]${RESET} [${suite}] ${name}`);
    if (details) console.error(`    ${RED}Details: ${details}${RESET}`);
  }
}

async function runAdversarialCoverageSuite() {
  console.log(`\n${CYAN}========================================================================${RESET}`);
  console.log(`${CYAN}   TIER 5 ADVERSARIAL WHITE-BOX COVERAGE HARDENER (M4 CHALLENGER 2)     ${RESET}`);
  console.log(`${CYAN}========================================================================\n${RESET}`);

  const db = await getDb();

  // Snapshot database to guarantee 100% clean teardown
  const snapPlayers = await db.collection("players").find().toArray();
  const snapSessions = await db.collection("sessions").find().toArray();
  const snapMatches = await db.collection("matches").find().toArray();
  const snapUsers = await db.collection("users").find().toArray();

  try {
    // ══════════════════════════════════════════════════════════════════════
    // SUITE 1: Route Handler Error Branches & DB Exception Resilience
    // ══════════════════════════════════════════════════════════════════════
    console.log(`\n${YELLOW}▶ [SUITE 1] Route Handler Error Branches & Exception Handling${RESET}`);

    // 1.1 Malformed JSON body handling in POST /api/sessions
    {
      const req = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "NOT_VALID_JSON{",
      });
      const res = await postSessions(req);
      const data = await res.json();
      report("SUITE 1", "POST /api/sessions handles malformed JSON without crash", res.status >= 400 && !!data.error);
    }

    // 1.2 Malformed JSON in POST /api/matches
    {
      const req = new NextRequest("http://localhost:3000/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "INVALID_JSON_BODY",
      });
      const res = await postMatches(req);
      const data = await res.json();
      report("SUITE 1", "POST /api/matches handles malformed JSON with HTTP 500/400", res.status >= 400 && !!data.error);
    }

    // 1.3 Malformed JSON in POST /api/players
    {
      const req = new NextRequest("http://localhost:3000/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json",
      });
      const res = await postPlayers(req);
      const data = await res.json();
      report("SUITE 1", "POST /api/players handles malformed JSON gracefully", res.status >= 400 && !!data.error);
    }

    // 1.4 Malformed JSON in PATCH /api/sessions/[id]
    {
      const validId = new ObjectId().toString();
      const req = new NextRequest(`http://localhost:3000/api/sessions/${validId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{{{malformed",
      });
      const res = await patchSessionById(req, { params: Promise.resolve({ id: validId }) });
      const data = await res.json();
      report("SUITE 1", "PATCH /api/sessions/[id] handles malformed JSON gracefully", res.status >= 400 && !!data.error);
    }

    // 1.5 Corrupted DB document resilience: session with null attendance
    {
      const corruptSessionId = new ObjectId();
      await db.collection("sessions").insertOne({
        _id: corruptSessionId,
        date: "2026-11-01",
        sport: "Football",
        status: "open",
        attendance: null, // intentionally null instead of array
      });

      const readyRes = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const readyData = await readyRes.json();
      report("SUITE 1", "GET /api/ready survives corrupted session with null attendance", readyRes.status === 200 && Array.isArray(readyData));

      await db.collection("sessions").deleteOne({ _id: corruptSessionId });
    }

    // 1.6 Corrupted DB document resilience: match with null scores
    {
      const corruptMatchId = new ObjectId();
      await db.collection("matches").insertOne({
        _id: corruptMatchId,
        date: "2026-11-01",
        sport: "Football",
        scores: null, // intentionally null
      });

      const readyRes = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const readyData = await readyRes.json();
      report("SUITE 1", "GET /api/ready survives corrupted match with null scores", readyRes.status === 200 && Array.isArray(readyData));

      await db.collection("matches").deleteOne({ _id: corruptMatchId });
    }

    // 1.7 Corrupted attendance item missing playerId
    {
      const corruptSessionId2 = new ObjectId();
      await db.collection("sessions").insertOne({
        _id: corruptSessionId2,
        date: "2026-11-01",
        sport: "Football",
        status: "open",
        attendance: [{ status: "present" }], // missing playerId
      });

      const readyRes = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const readyData = await readyRes.json();
      report("SUITE 1", "GET /api/ready survives attendance record missing playerId", readyRes.status === 200 && Array.isArray(readyData));

      await db.collection("sessions").deleteOne({ _id: corruptSessionId2 });
    }

    // 1.8 Corrupted match scores item missing playerId
    {
      const corruptMatchId2 = new ObjectId();
      await db.collection("matches").insertOne({
        _id: corruptMatchId2,
        date: "2026-11-01",
        sport: "Football",
        scores: [{ score: 5 }], // missing playerId
      });

      const readyRes = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const readyData = await readyRes.json();
      report("SUITE 1", "GET /api/ready survives match score item missing playerId", readyRes.status === 200 && Array.isArray(readyData));

      await db.collection("matches").deleteOne({ _id: corruptMatchId2 });
    }

    // ══════════════════════════════════════════════════════════════════════
    // SUITE 2: Date Parsing, Leap Years & Boundary Stress
    // ══════════════════════════════════════════════════════════════════════
    console.log(`\n${YELLOW}▶ [SUITE 2] Date Parsing, Leap Years & Boundary Edge Cases${RESET}`);

    // Create a dedicated test player for leap year testing
    const leapPlayerId = new ObjectId("6ae79b000000000000000001");
    await db.collection("players").insertOne({
      _id: leapPlayerId,
      name: "Leap Year Athlete",
      age: 18,
      sport: "Football",
    });

    // 2.1 Leap Year Date: 2024-02-29
    {
      // Open session on leap day 2024-02-29
      const sessReq = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2024-02-29", sport: "Football" }),
      });
      const sessRes = await postSessions(sessReq);
      const sessData = await sessRes.json();
      report("SUITE 2", "POST /api/sessions accepts leap day date '2024-02-29'", sessRes.status === 201 || sessRes.status === 200);

      const sessId = sessData._id;

      // Mark present
      const patchReq = new NextRequest(`http://localhost:3000/api/sessions/${sessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: leapPlayerId.toString(), status: "present" }),
      });
      await patchSessionById(patchReq, { params: Promise.resolve({ id: sessId }) });

      // Lock session
      const lockReq = new NextRequest(`http://localhost:3000/api/sessions/${sessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      await patchSessionById(lockReq, { params: Promise.resolve({ id: sessId }) });

      // Post match on leap day 2024-02-29 - should succeed because player was present
      const matchReq = new NextRequest("http://localhost:3000/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2024-02-29",
          sport: "Football",
          opponent: "Leap FC",
          scores: [{ playerId: leapPlayerId.toString(), score: 2 }],
        }),
      });
      const matchRes = await postMatches(matchReq);
      report("SUITE 2", "POST /api/matches succeeds on leap day '2024-02-29' when present", matchRes.status === 201);
    }

    // 2.2 Boundary Leap Year 2000-02-29 (Century Leap Year)
    {
      const sessReq = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2000-02-29", sport: "Football" }),
      });
      const sessRes = await postSessions(sessReq);
      report("SUITE 2", "POST /api/sessions handles century leap day '2000-02-29'", sessRes.status === 201 || sessRes.status === 200);
    }

    // 2.3 Year Rollover: 2025-12-31 to 2026-01-01
    {
      const s1 = await postSessions(new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2025-12-31", sport: "Football" }),
      }));
      const s2 = await postSessions(new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-01-01", sport: "Football" }),
      }));
      report("SUITE 2", "POST /api/sessions handles year-end boundary '2025-12-31' & '2026-01-01'", s1.status <= 201 && s2.status <= 201);
    }

    // 2.4 Far Future & Far Past Dates
    {
      const futureReq = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "9999-12-31", sport: "Football" }),
      });
      const futureRes = await postSessions(futureReq);
      report("SUITE 2", "POST /api/sessions handles far future date '9999-12-31'", futureRes.status === 201 || futureRes.status === 200);

      const pastReq = new NextRequest("http://localhost:3000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "1970-01-01", sport: "Football" }),
      });
      const pastRes = await postSessions(pastReq);
      report("SUITE 2", "POST /api/sessions handles epoch date '1970-01-01'", pastRes.status === 201 || pastRes.status === 200);
    }

    // 2.5 Descending Chronological Sort Integrity for Enriched Histories
    {
      const readyRes = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${leapPlayerId.toString()}`));
      const data = await readyRes.json();
      assert(Array.isArray(data) && data.length === 1, "Expected single athlete result");
      const athlete = data[0];

      const attDates = (athlete.attendanceHistory || []).map((h: any) => h.date);
      let attSorted = true;
      for (let i = 0; i < attDates.length - 1; i++) {
        if (attDates[i].localeCompare(attDates[i + 1]) < 0) {
          attSorted = false;
          break;
        }
      }
      report("SUITE 2", "Enriched attendance history is strictly in descending chronological order", attSorted);
    }

    // 2.6 CHECK 2 Refusal with Invalid Date Match
    {
      const invalidDateReq = new NextRequest("http://localhost:3000/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "   ",
          sport: "Football",
          scores: [{ playerId: leapPlayerId.toString(), score: 1 }],
        }),
      });
      const invalidDateRes = await postMatches(invalidDateReq);
      report("SUITE 2", "POST /api/matches rejects empty/whitespace date with HTTP 400", invalidDateRes.status === 400);
    }

    // ══════════════════════════════════════════════════════════════════════
    // SUITE 3: Athlete Self-Isolation & ID Type Flexibility
    // ══════════════════════════════════════════════════════════════════════
    console.log(`\n${YELLOW}▶ [SUITE 3] Athlete Self-Isolation & ID Type Flexibility${RESET}`);

    // Create two isolated players
    const isoP1Id = new ObjectId("6ae79b000000000000000011");
    const isoP2Id = new ObjectId("6ae79b000000000000000012");

    await db.collection("players").insertOne({
      _id: isoP1Id,
      name: "Isolated Player One",
      age: 17,
      sport: "Cricket",
    });
    await db.collection("players").insertOne({
      _id: isoP2Id,
      name: "Isolated Player Two",
      age: 17,
      sport: "Cricket",
    });

    // Create session where P1 is present, P2 is absent
    const isoSessId = new ObjectId();
    await db.collection("sessions").insertOne({
      _id: isoSessId,
      date: "2026-11-15",
      sport: "Cricket",
      status: "closed",
      attendance: [
        { playerId: isoP1Id, status: "present" },
        { playerId: isoP2Id.toString(), status: "absent" }, // Stored as STRING in DB
      ],
    });

    // Create match where P1 played, P2 did not
    const isoMatchId = new ObjectId();
    await db.collection("matches").insertOne({
      _id: isoMatchId,
      date: "2026-11-15",
      sport: "Cricket",
      opponent: "Rival XI",
      scores: [{ playerId: isoP1Id, score: 50 }],
    });

    // 3.1 P1 Query Returns Only P1
    {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${isoP1Id.toString()}`));
      const data = await res.json();
      report(
        "SUITE 3",
        "Single player query ?playerId=isoP1 returns exclusively P1",
        Array.isArray(data) && data.length === 1 && data[0].player._id.toString() === isoP1Id.toString()
      );
      report(
        "SUITE 3",
        "P1 enriched record contains P1's match and attendance",
        data[0].sessionsPresent === 1 && data[0].matchCount === 1 && data[0].attendanceHistory?.length > 0
      );
    }

    // 3.2 P2 Query Returns Only P2 with String playerId Matching
    {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${isoP2Id.toString()}`));
      const data = await res.json();
      report(
        "SUITE 3",
        "Single player query ?playerId=isoP2 returns exclusively P2",
        Array.isArray(data) && data.length === 1 && data[0].player._id.toString() === isoP2Id.toString()
      );
      report(
        "SUITE 3",
        "P2 matches string playerId from attendance records correctly (absent)",
        data[0].sessionsHeld === 1 && data[0].sessionsPresent === 0 && data[0].matchCount === 0
      );
    }

    // 3.3 Zero Data Leakage Between P1 and P2
    {
      const resP1 = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${isoP1Id.toString()}`));
      const dataP1 = await resP1.json();
      const resP2 = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${isoP2Id.toString()}`));
      const dataP2 = await resP2.json();

      const p1MatchIds = (dataP1[0].matchHistory || []).map((m: any) => m.matchId);
      const p2MatchIds = (dataP2[0].matchHistory || []).map((m: any) => m.matchId);

      const intersection = p1MatchIds.filter((id: string) => p2MatchIds.includes(id));
      report("SUITE 3", "Zero match leakage between P1 and P2", intersection.length === 0);
    }

    // 3.4 Global Query Privacy: Never Return Enriched Details for Bulk Query
    {
      const resGlobal = await getReady(new NextRequest("http://localhost:3000/api/ready"));
      const dataGlobal = await resGlobal.json();
      assert(Array.isArray(dataGlobal), "Expected array of records");
      const hasLeakage = dataGlobal.some((r: any) => r.attendanceHistory !== undefined || r.matchHistory !== undefined);
      report("SUITE 3", "Global /api/ready omits attendanceHistory & matchHistory (privacy protected)", !hasLeakage);
    }

    // 3.5 Whitespace Padding in playerId
    {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=%20%20${isoP1Id.toString()}%20%20`));
      const data = await res.json();
      report("SUITE 3", "Whitespaces in ?playerId= are trimmed cleanly", Array.isArray(data) && data.length === 1);
    }

    // 3.6 Non-Existent playerId Returns Clean Empty Array
    {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=ffffffffffffffffffffffff"));
      const data = await res.json();
      report("SUITE 3", "Non-existent ?playerId= returns HTTP 200 with []", res.status === 200 && Array.isArray(data) && data.length === 0);
    }

    // 3.7 NoSQL Injection in ?playerId
    {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId=%7B%22%24ne%22%3A%22null%22%7D"));
      const data = await res.json();
      report("SUITE 3", "NoSQL injection attempt in ?playerId= handled safely without leak", res.status === 200 && Array.isArray(data) && data.length === 0);
    }

    // 3.8 Empty ?playerId= Parameter
    {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?playerId="));
      const data = await res.json();
      report("SUITE 3", "Empty ?playerId= returns full roster without error", res.status === 200 && Array.isArray(data) && data.length > 1);
    }

    // ══════════════════════════════════════════════════════════════════════
    // SUITE 4: Middleware Role Protection & Route Authorization
    // ══════════════════════════════════════════════════════════════════════
    console.log(`\n${YELLOW}▶ [SUITE 4] Middleware Role Protection & Route Authorization${RESET}`);

    const secret = process.env.NEXTAUTH_SECRET!;

    // Helper to generate real signed NextAuth session cookies
    async function makeAuthHeaders(tokenPayload: any): Promise<Record<string, string>> {
      if (!tokenPayload) return {};
      const token = await encode({ token: tokenPayload, secret });
      return { cookie: `next-auth.session-token=${token}` };
    }

    async function callMiddlewareWithRole(pathname: string, tokenPayload: any) {
      const headers = await makeAuthHeaders(tokenPayload);
      const req = new NextRequest(`http://localhost:3000${pathname}`, { headers });
      return (middleware as any)(req);
    }

    // 4.1 Unauthenticated Access Protection
    {
      const unauthCoach = await callMiddlewareWithRole("/coach/ready", null);
      const isRedirectLoginCoach = unauthCoach?.headers?.get("location")?.includes("/api/auth/signin") || unauthCoach?.headers?.get("location")?.includes("/login") || unauthCoach?.status === 307;
      report("SUITE 4", "Unauthenticated request to /coach/ready redirects to signin/login", isRedirectLoginCoach);

      const unauthPlayer = await callMiddlewareWithRole("/player", null);
      const isRedirectLoginPlayer = unauthPlayer?.headers?.get("location")?.includes("/api/auth/signin") || unauthPlayer?.headers?.get("location")?.includes("/login") || unauthPlayer?.status === 307;
      report("SUITE 4", "Unauthenticated request to /player redirects to signin/login", isRedirectLoginPlayer);

      const unauthScout = await callMiddlewareWithRole("/scout", null);
      const isRedirectLoginScout = unauthScout?.headers?.get("location")?.includes("/api/auth/signin") || unauthScout?.headers?.get("location")?.includes("/login") || unauthScout?.status === 307;
      report("SUITE 4", "Unauthenticated request to /scout redirects to signin/login", isRedirectLoginScout);
    }

    // 4.2 Coach Role Isolation
    {
      const coachToken = { role: "coach", sub: "coach-id" };
      const coachAccessCoach = await callMiddlewareWithRole("/coach/ready", coachToken);
      report("SUITE 4", "Coach role can access /coach/ready", !coachAccessCoach?.headers?.get("location") || coachAccessCoach?.status === 200);

      const coachAccessPlayer = await callMiddlewareWithRole("/player", coachToken);
      report("SUITE 4", "Coach role blocked from /player (redirected to /login)", coachAccessPlayer?.headers?.get("location")?.includes("/login"));

      const coachAccessScout = await callMiddlewareWithRole("/scout", coachToken);
      report("SUITE 4", "Coach role blocked from /scout (redirected to /login)", coachAccessScout?.headers?.get("location")?.includes("/login"));
    }

    // 4.3 Player Role Isolation
    {
      const playerToken = { role: "player", sub: "player-id", playerId: isoP1Id.toString() };
      const playerAccessPlayer = await callMiddlewareWithRole("/player", playerToken);
      report("SUITE 4", "Player role can access /player", !playerAccessPlayer?.headers?.get("location") || playerAccessPlayer?.status === 200);

      const playerAccessCoach = await callMiddlewareWithRole("/coach/ready", playerToken);
      report("SUITE 4", "Player role blocked from /coach/ready (redirected to /login)", playerAccessCoach?.headers?.get("location")?.includes("/login"));

      const playerAccessScout = await callMiddlewareWithRole("/scout", playerToken);
      report("SUITE 4", "Player role blocked from /scout (redirected to /login)", playerAccessScout?.headers?.get("location")?.includes("/login"));
    }

    // 4.4 Scout Role Isolation
    {
      const scoutToken = { role: "scout", sub: "scout-id" };
      const scoutAccessScout = await callMiddlewareWithRole("/scout", scoutToken);
      report("SUITE 4", "Scout role can access /scout", !scoutAccessScout?.headers?.get("location") || scoutAccessScout?.status === 200);

      const scoutAccessCoach = await callMiddlewareWithRole("/coach/ready", scoutToken);
      report("SUITE 4", "Scout role blocked from /coach/ready (redirected to /login)", scoutAccessCoach?.headers?.get("location")?.includes("/login"));

      const scoutAccessPlayer = await callMiddlewareWithRole("/player", scoutToken);
      report("SUITE 4", "Scout role blocked from /player (redirected to /login)", scoutAccessPlayer?.headers?.get("location")?.includes("/login"));
    }

    // 4.5 Malicious / Unknown Role
    {
      const hackerToken = { role: "admin", sub: "hacker" };
      const resCoach = await callMiddlewareWithRole("/coach", hackerToken);
      const resPlayer = await callMiddlewareWithRole("/player", hackerToken);
      const resScout = await callMiddlewareWithRole("/scout", hackerToken);
      report("SUITE 4", "Unknown role 'admin' blocked from /coach, /player, /scout",
        resCoach?.headers?.get("location")?.includes("/login") &&
        resPlayer?.headers?.get("location")?.includes("/login") &&
        resScout?.headers?.get("location")?.includes("/login")
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // SUITE 5: Readiness Aggregation Formula & Concurrency Stress
    // ══════════════════════════════════════════════════════════════════════
    console.log(`\n${YELLOW}▶ [SUITE 5] Readiness Aggregation Formula & Concurrency Stress${RESET}`);

    // Create 4 test players for boundary metrics:
    const p74Id = new ObjectId("6ae79b000000000000000021");
    const p75Id = new ObjectId("6ae79b000000000000000022");
    const p100Id = new ObjectId("6ae79b000000000000000023");
    const p0Id = new ObjectId("6ae79b000000000000000024");

    const newPlayers = [
      { _id: p74Id, name: "Boundary 74", age: 17, sport: "Football" },
      { _id: p75Id, name: "Boundary 75", age: 17, sport: "Football" },
      { _id: p100Id, name: "High Att Low Match", age: 17, sport: "Football" },
      { _id: p0Id, name: "Zero Metric Athlete", age: 17, sport: "Football" },
    ];
    for (const np of newPlayers) {
      await db.collection("players").insertOne(np);
    }

    // Setup 100 sessions to get exact 74% and 75%
    const bulkSessions: any[] = [];
    for (let i = 1; i <= 100; i++) {
      const day = i < 10 ? `0${i}` : `${i}`;
      bulkSessions.push({
        _id: new ObjectId(),
        date: `2026-05-${day}`,
        sport: "Football",
        status: "closed",
        attendance: [
          { playerId: p74Id, status: i <= 74 ? "present" : "absent" },
          { playerId: p75Id, status: i <= 75 ? "present" : "absent" },
          { playerId: p100Id, status: "present" },
          { playerId: p0Id, status: "absent" },
        ],
      });
    }
    await db.collection("sessions").insertMany(bulkSessions);

    // Setup matches:
    await db.collection("matches").insertOne({
      _id: new ObjectId(),
      date: "2026-05-01",
      sport: "Football",
      scores: [
        { playerId: p74Id, score: 1 },
        { playerId: p75Id, score: 2 },
        { playerId: p100Id, score: 3 },
      ],
    });
    await db.collection("matches").insertOne({
      _id: new ObjectId(),
      date: "2026-05-02",
      sport: "Football",
      scores: [
        { playerId: p74Id, score: 2 },
        { playerId: p75Id, score: 1 },
      ],
    });

    // 5.1 Check Exact 74% attendance with 2 matches yields isReady === false
    {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p74Id.toString()}`));
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 1);
      const rec = data[0];
      report(
        "SUITE 5",
        "74% attendance with 2 matches strictly yields isReady === false",
        rec.attendancePct === 74 && rec.matchCount === 2 && rec.isReady === false
      );
    }

    // 5.2 Check Exact 75% attendance with 2 matches yields isReady === true
    {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p75Id.toString()}`));
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 1);
      const rec = data[0];
      report(
        "SUITE 5",
        "75% attendance with 2 matches strictly yields isReady === true",
        rec.attendancePct === 75 && rec.matchCount === 2 && rec.isReady === true
      );
    }

    // 5.3 Check 100% attendance with 1 match yields isReady === false
    {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p100Id.toString()}`));
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 1);
      const rec = data[0];
      report(
        "SUITE 5",
        "100% attendance with only 1 match yields isReady === false",
        rec.attendancePct === 100 && rec.matchCount === 1 && rec.isReady === false
      );
    }

    // 5.4 Check 0% attendance with 0 matches yields isReady === false (no division by zero)
    {
      const res = await getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p0Id.toString()}`));
      const data = await res.json();
      assert(Array.isArray(data) && data.length === 1);
      const rec = data[0];
      report(
        "SUITE 5",
        "0% attendance with 0 matches yields isReady === false without NaN",
        rec.attendancePct === 0 && rec.matchCount === 0 && rec.isReady === false && !isNaN(rec.attendancePct)
      );
    }

    // 5.5 High Concurrency Stress: 20 simultaneous mixed requests to /api/ready
    {
      const tasks = [
        getReady(new NextRequest("http://localhost:3000/api/ready")),
        getReady(new NextRequest("http://localhost:3000/api/ready?filter=readyOnly")),
        getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=true")),
        getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p75Id.toString()}`)),
        getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p74Id.toString()}`)),
        getReady(new NextRequest("http://localhost:3000/api/ready?readyOnly=false")),
        getReady(new NextRequest("http://localhost:3000/api/ready?filter=readyOnly&readyOnly=true")),
        getReady(new NextRequest(`http://localhost:3000/api/ready?playerId=${p100Id.toString()}`)),
        getReady(new NextRequest("http://localhost:3000/api/ready?filter=nonexistent")),
        getReady(new NextRequest("http://localhost:3000/api/ready?playerId=000000000000000000000000")),
      ];
      const results = await Promise.all([...tasks, ...tasks]);
      const allSuccess = results.every((r) => r.status === 200);
      report("SUITE 5", "20 concurrent requests to /api/ready all return HTTP 200 without deadlock", allSuccess);
    }

    // 5.6 Scout Filter Guarantee under Concurrency
    {
      const res = await getReady(new NextRequest("http://localhost:3000/api/ready?filter=readyOnly"));
      const data = await res.json();
      assert(Array.isArray(data));
      const allAreReady = data.every((r: any) => r.isReady === true);
      const includesP75 = data.some((r: any) => r.player._id.toString() === p75Id.toString());
      const excludesP74 = !data.some((r: any) => r.player._id.toString() === p74Id.toString());
      const excludesP100 = !data.some((r: any) => r.player._id.toString() === p100Id.toString());
      report(
        "SUITE 5",
        "Scout filter ?filter=readyOnly strictly contains P75 and excludes P74 & P100",
        allAreReady && includesP75 && excludesP74 && excludesP100
      );
    }

  } finally {
    // ══════════════════════════════════════════════════════════════════════
    // TEARDOWN & RESTORE
    // ══════════════════════════════════════════════════════════════════════
    console.log(`\n${CYAN}▶ [TEARDOWN] Restoring pristine database snapshot...${RESET}`);
    await db.collection("players").deleteMany({});
    await db.collection("sessions").deleteMany({});
    await db.collection("matches").deleteMany({});
    await db.collection("users").deleteMany({});

    if (snapPlayers.length > 0) await db.collection("players").insertMany(snapPlayers);
    if (snapSessions.length > 0) await db.collection("sessions").insertMany(snapSessions);
    if (snapMatches.length > 0) await db.collection("matches").insertMany(snapMatches);
    if (snapUsers.length > 0) await db.collection("users").insertMany(snapUsers);
    console.log(`  ${GREEN}✓ Restored ${snapPlayers.length} players, ${snapSessions.length} sessions, ${snapMatches.length} matches, ${snapUsers.length} users${RESET}`);
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUMMARY REPORT
  // ══════════════════════════════════════════════════════════════════════
  console.log(`\n${CYAN}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${CYAN}   TIER 5 ADVERSARIAL WHITE-BOX HARDENING RESULTS                     ${RESET}`);
  console.log(`${CYAN}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(` Total Checks: ${passCount + failCount}`);
  console.log(` ${GREEN}Passed:       ${passCount}${RESET}`);
  console.log(` ${RED}Failed:       ${failCount}${RESET}`);

  if (failCount > 0) {
    console.log(`\n${RED}Failures Summary:${RESET}`);
    for (const f of failures) {
      console.log(` - [${f.suite}] ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${GREEN}ALL TIER 5 ADVERSARIAL STRESS TESTS PASSED WITH ZERO GAPS!${RESET}\n`);
    process.exit(0);
  }
}

runAdversarialCoverageSuite().catch((err) => {
  console.error("Unhandled harness crash:", err);
  process.exit(1);
});
