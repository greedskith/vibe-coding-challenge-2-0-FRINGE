import { getDb } from "../lib/db";
import { NextRequest } from "next/server";
import { POST as postSession } from "../app/api/sessions/route";
import { PATCH as patchSession } from "../app/api/sessions/[id]/route";
import { POST as postMatch } from "../app/api/matches/route";
import { GET as getReady } from "../app/api/ready/route";

async function runVerification() {
  console.log("=================================================");
  console.log("   RUNNING ACADEMY DESK 4-CHECK VERIFICATION     ");
  console.log("=================================================\n");

  const db = await getDb();

  // Reset database state
  await db.collection("sessions").deleteMany({});
  await db.collection("matches").deleteMany({});

  const players = await db.collection("players").find().toArray();
  if (players.length < 3) {
    throw new Error(`Expected at least 3 players, found ${players.length}`);
  }

  const [p1, p2, p3] = players; // p1: Rohit, p2: Priya, p3: Amit
  console.log(`Players Loaded:`);
  console.log(`  P1: ${p1.name} (${p1._id})`);
  console.log(`  P2: ${p2.name} (${p2._id})`);
  console.log(`  P3: ${p3.name} (${p3._id})\n`);

  // -------------------------------------------------------------
  // CHECK 1: Three players. One session. Two present, one absent.
  // Absent player shows absent on their row.
  // -------------------------------------------------------------
  console.log("▶ [CHECK 1] Testing Session Lifecycle & Attendance Marking...");

  // 1. Open session on 2026-11-02
  const sessionReq = new NextRequest("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-11-02", sport: "Football" }),
  });
  const sessionRes = await postSession(sessionReq);
  const sessionData = await sessionRes.json();
  const sessionId = sessionData._id.toString();
  console.log(`  ✓ Opened session ${sessionId} for 2026-11-02`);

  // 2. Mark P1 present, P2 present (P3 stays absent)
  const patchP1Req = new NextRequest(`http://localhost:3000/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p1._id.toString(), status: "present" }),
  });
  await patchSession(patchP1Req, { params: Promise.resolve({ id: sessionId }) });

  const patchP2Req = new NextRequest(`http://localhost:3000/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p2._id.toString(), status: "present" }),
  });
  await patchSession(patchP2Req, { params: Promise.resolve({ id: sessionId }) });

  // 3. Lock session
  const lockReq = new NextRequest(`http://localhost:3000/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "closed" }),
  });
  const lockedRes = await patchSession(lockReq, { params: Promise.resolve({ id: sessionId }) });
  const lockedData = await lockedRes.json();

  if (lockedData.status !== "closed") {
    throw new Error(`Expected session status to be closed, got ${lockedData.status}`);
  }

  // Verify attendance records in session
  const attP1 = lockedData.attendance.find((a: any) => a.playerId.toString() === p1._id.toString());
  const attP2 = lockedData.attendance.find((a: any) => a.playerId.toString() === p2._id.toString());
  const attP3 = lockedData.attendance.find((a: any) => a.playerId.toString() === p3._id.toString());

  if (attP1?.status !== "present" || attP2?.status !== "present" || attP3?.status !== "absent") {
    throw new Error(`CHECK 1 failed! P1: ${attP1?.status}, P2: ${attP2?.status}, P3: ${attP3?.status}`);
  }

  // Verify that modifying locked session is rejected with HTTP 400
  const modifyLockedReq = new NextRequest(`http://localhost:3000/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p3._id.toString(), status: "present" }),
  });
  const modifyLockedRes = await patchSession(modifyLockedReq, { params: Promise.resolve({ id: sessionId }) });
  if (modifyLockedRes.status !== 400) {
    throw new Error(`Expected 400 for modifying locked session, got ${modifyLockedRes.status}`);
  }

  console.log("  ✓ CHECK 1 PASSED: 2 Present, 1 Absent (P3 correctly absent, session locked).\n");

  // -------------------------------------------------------------
  // CHECK 2: Match same day scores only the two present.
  // Absent player is refused with 400 from POST /api/matches.
  // -------------------------------------------------------------
  console.log("▶ [CHECK 2] Testing Match Scoring Refusal for Absent Player...");

  // Attempt 1: Submit match on 2026-11-02 including absent player P3
  const invalidMatchReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-02",
      sport: "Football",
      opponent: "Ranchi FC",
      scores: [
        { playerId: p1._id.toString(), score: 2 },
        { playerId: p3._id.toString(), score: 1 }, // P3 was ABSENT!
      ],
    }),
  });
  const invalidMatchRes = await postMatch(invalidMatchReq);
  const invalidMatchData = await invalidMatchRes.json();

  if (invalidMatchRes.status !== 400) {
    throw new Error(`Expected 400 status for scoring absent player, got ${invalidMatchRes.status}`);
  }
  if (!invalidMatchData.error || !invalidMatchData.error.includes("absent")) {
    throw new Error(`Expected refusal error message, got: ${JSON.stringify(invalidMatchData)}`);
  }
  console.log(`  ✓ Refusal confirmed: "${invalidMatchData.error}"`);

  // Attempt 2: Submit valid match with only present players P1 and P2
  const validMatchReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-02",
      sport: "Football",
      opponent: "Ranchi FC",
      scores: [
        { playerId: p1._id.toString(), score: 2 },
        { playerId: p2._id.toString(), score: 1 },
      ],
    }),
  });
  const validMatchRes = await postMatch(validMatchReq);
  if (validMatchRes.status !== 201) {
    throw new Error(`Expected 201 for valid match, got ${validMatchRes.status}`);
  }
  console.log("  ✓ CHECK 2 PASSED: Absent player refused with HTTP 400, valid match accepted.\n");

  // -------------------------------------------------------------
  // CHECK 3: Attendance < 75% is not ready. Attendance >= 75% AND >= 2 matches is Ready.
  // -------------------------------------------------------------
  console.log("▶ [CHECK 3] Testing Trial Readiness Benchmarking (>=75% AND >=2 matches)...");

  // Query readiness before match 2
  const readyReq1 = new NextRequest("http://localhost:3000/api/ready");
  const readyRes1 = await getReady(readyReq1);
  const readyData1 = await readyRes1.json();

  const rP1Before = readyData1.find((r: any) => r.player._id.toString() === p1._id.toString());
  const rP3Before = readyData1.find((r: any) => r.player._id.toString() === p3._id.toString());

  console.log(`  P1 state before 2nd match: Att=${rP1Before.attendancePct}%, Matches=${rP1Before.matchCount}, isReady=${rP1Before.isReady}`);
  console.log(`  P3 state: Att=${rP3Before.attendancePct}%, Matches=${rP3Before.matchCount}, isReady=${rP3Before.isReady}`);

  if (rP1Before.isReady !== false) {
    throw new Error("Expected P1 to NOT be ready with only 1 match played");
  }
  if (rP3Before.isReady !== false) {
    throw new Error("Expected P3 to NOT be ready with 0% attendance");
  }

  // Now record 2nd match for P1 on 2026-11-04 (where no absence exists)
  const match2Req = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-04",
      sport: "Football",
      opponent: "Tata FA",
      scores: [{ playerId: p1._id.toString(), score: 3 }],
    }),
  });
  const match2Res = await postMatch(match2Req);
  if (match2Res.status !== 201) {
    throw new Error(`Expected 201 for match 2, got ${match2Res.status}`);
  }

  // Re-query readiness
  const readyReq2 = new NextRequest("http://localhost:3000/api/ready");
  const readyRes2 = await getReady(readyReq2);
  const readyData2 = await readyRes2.json();

  const rP1After = readyData2.find((r: any) => r.player._id.toString() === p1._id.toString());
  const rP2After = readyData2.find((r: any) => r.player._id.toString() === p2._id.toString());
  const rP3After = readyData2.find((r: any) => r.player._id.toString() === p3._id.toString());

  console.log(`  P1 state after 2nd match: Att=${rP1After.attendancePct}%, Matches=${rP1After.matchCount}, isReady=${rP1After.isReady}`);
  console.log(`  P2 state: Att=${rP2After.attendancePct}%, Matches=${rP2After.matchCount}, isReady=${rP2After.isReady}`);
  console.log(`  P3 state: Att=${rP3After.attendancePct}%, Matches=${rP3After.matchCount}, isReady=${rP3After.isReady}`);

  if (rP1After.isReady !== true) {
    throw new Error("Expected P1 to BE READY (100% attendance, 2 matches)");
  }
  if (rP2After.isReady !== false) {
    throw new Error("Expected P2 to NOT be ready (100% attendance, only 1 match)");
  }
  if (rP3After.isReady !== false) {
    throw new Error("Expected P3 to NOT be ready (0% attendance, 0 matches)");
  }
  console.log("  ✓ CHECK 3 PASSED: Exact readiness qualification verified.\n");

  // -------------------------------------------------------------
  // CHECK 4: Scout sees only Ready players (/scout). Player sees only their own row (/player).
  // -------------------------------------------------------------
  console.log("▶ [CHECK 4] Testing Role-Based Visibility Filters...");

  // Scout query: filter=readyOnly
  const scoutReq = new NextRequest("http://localhost:3000/api/ready?filter=readyOnly");
  const scoutRes = await getReady(scoutReq);
  const scoutData = await scoutRes.json();

  console.log(`  Scout view count: ${scoutData.length}`);
  if (scoutData.length !== 1 || scoutData[0].player._id.toString() !== p1._id.toString()) {
    throw new Error(`Scout view must only contain P1 (Ready), got: ${JSON.stringify(scoutData.map((s: any) => s.player.name))}`);
  }
  console.log(`  ✓ Scout view contains exclusively: ${scoutData[0].player.name} (Ready)`);

  // Player query: playerId=p3._id (Amit Soren)
  const playerReq = new NextRequest(`http://localhost:3000/api/ready?playerId=${p3._id.toString()}`);
  const playerRes = await getReady(playerReq);
  const playerData = await playerRes.json();

  console.log(`  Player Amit view count: ${playerData.length}`);
  if (playerData.length !== 1 || playerData[0].player._id.toString() !== p3._id.toString()) {
    throw new Error(`Player view must only contain P3's row, got: ${JSON.stringify(playerData.map((s: any) => s.player.name))}`);
  }
  console.log(`  ✓ Player view contains exclusively: ${playerData[0].player.name}`);

  console.log("  ✓ CHECK 4 PASSED: Scout sees only Ready players, Player sees only their own row.\n");

  // -------------------------------------------------------------
  // EDGE CASE: Multi-sport sessions on the exact same date
  // Verify that an athlete absent in Cricket but present in Football
  // is accepted for Football match but refused for Cricket match.
  // -------------------------------------------------------------
  console.log("▶ [EDGE CASE] Testing Multi-Sport Concurrency on Same Date (2026-11-05)...");

  // Football session on 2026-11-05: P1 present, P2 absent
  const fbSessionReq = new NextRequest("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-11-05", sport: "Football" }),
  });
  const fbSessionRes = await postSession(fbSessionReq);
  const fbSession = await fbSessionRes.json();
  await patchSession(
    new NextRequest(`http://localhost:3000/api/sessions/${fbSession._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: p1._id.toString(), status: "present" }),
    }),
    { params: Promise.resolve({ id: fbSession._id.toString() }) }
  );

  // Cricket session on 2026-11-05: P2 present, P1 absent
  const crSessionReq = new NextRequest("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-11-05", sport: "Cricket" }),
  });
  const crSessionRes = await postSession(crSessionReq);
  const crSession = await crSessionRes.json();
  await patchSession(
    new NextRequest(`http://localhost:3000/api/sessions/${crSession._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: p2._id.toString(), status: "present" }),
    }),
    { params: Promise.resolve({ id: crSession._id.toString() }) }
  );

  // Cricket match attempting to score P1 (absent in Cricket session) -> must be 400 refused
  const crMatchFailReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-05",
      sport: "Cricket",
      opponent: "Ranchi CC",
      scores: [{ playerId: p1._id.toString(), score: 50 }],
    }),
  });
  const crMatchFailRes = await postMatch(crMatchFailReq);
  if (crMatchFailRes.status !== 400) {
    throw new Error(`Expected 400 when scoring P1 in Cricket on 2026-11-05, got ${crMatchFailRes.status}`);
  }
  console.log("  ✓ Confirmed: P1 refused in Cricket match because P1 was absent in Cricket session.");

  // Cricket match scoring P2 (present in Cricket session) -> must succeed with 201
  const crMatchSuccessReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-05",
      sport: "Cricket",
      opponent: "Ranchi CC",
      scores: [{ playerId: p2._id.toString(), score: 45 }],
    }),
  });
  const crMatchSuccessRes = await postMatch(crMatchSuccessReq);
  if (crMatchSuccessRes.status !== 201) {
    throw new Error(`Expected 201 when scoring P2 in Cricket on 2026-11-05, got ${crMatchSuccessRes.status}`);
  }
  console.log("  ✓ Confirmed: P2 accepted in Cricket match because P2 was present in Cricket session.");

  // Football match scoring P1 (present in Football session) -> must succeed with 201
  const fbMatchSuccessReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-05",
      sport: "Football",
      opponent: "Bokaro FC",
      scores: [{ playerId: p1._id.toString(), score: 1 }],
    }),
  });
  const fbMatchSuccessRes = await postMatch(fbMatchSuccessReq);
  if (fbMatchSuccessRes.status !== 201) {
    throw new Error(`Expected 201 when scoring P1 in Football on 2026-11-05, got ${fbMatchSuccessRes.status}`);
  }
  console.log("  ✓ Confirmed: P1 accepted in Football match because P1 was present in Football session.\n");

  console.log("=================================================");
  console.log("   ALL 4 HACKATHON CHECKS + EDGE CASES VERIFIED! ");
  console.log("=================================================");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
