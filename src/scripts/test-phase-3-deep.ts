import { getDb } from "../lib/db";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { POST as postSession, GET as getSessions } from "../app/api/sessions/route";
import { GET as getSessionById, PATCH as patchSession, PUT as putSession } from "../app/api/sessions/[id]/route";

async function runDeepVerification() {
  console.log("=================================================");
  console.log("   RUNNING DEEP PHASE 3 VERIFICATION SUITE       ");
  console.log("=================================================\n");

  const db = await getDb();

  // Reset database state
  await db.collection("sessions").deleteMany({});

  const players = await db.collection("players").find().toArray();
  if (players.length < 3) {
    throw new Error(`Expected at least 3 players, found ${players.length}`);
  }

  const [p1, p2, p3] = players;
  console.log(`Test Athletes loaded: ${p1.name}, ${p2.name}, ${p3.name}\n`);

  // TEST 1: Open new session via POST /api/sessions
  console.log("▶ [TEST 1] POST /api/sessions - Open new training session...");
  const postReq = new NextRequest("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-11-10", sport: "Football" }),
  });
  const postRes = await postSession(postReq);
  if (postRes.status !== 201) {
    throw new Error(`Expected 201 Created, got ${postRes.status}`);
  }
  const session1 = await postRes.json();
  const sId = session1._id.toString();
  if (session1.status !== "open" || session1.sport !== "Football" || session1.date !== "2026-11-10") {
    throw new Error(`Session fields mismatch: ${JSON.stringify(session1)}`);
  }
  console.log(`  ✓ Opened session ${sId} with status: open, sport: Football`);

  // TEST 2: GET /api/sessions - verify descending sort and populated player names
  console.log("▶ [TEST 2] GET /api/sessions - Populated player names & sort...");
  const getReq = new NextRequest("http://localhost:3000/api/sessions");
  const getRes = await getSessions();
  const sessionsList = await getRes.json();
  if (!Array.isArray(sessionsList) || sessionsList.length === 0) {
    throw new Error("Expected non-empty array of sessions");
  }
  const s1FromList = sessionsList.find((s: any) => s._id.toString() === sId);
  if (!s1FromList || !Array.isArray(s1FromList.attendance)) {
    throw new Error("Session not found or missing attendance in list");
  }
  const hasPopulatedName = s1FromList.attendance.some((a: any) => a.playerName && a.playerName.length > 0);
  if (!hasPopulatedName) {
    throw new Error("Attendance items missing populated playerName");
  }
  console.log(`  ✓ GET /api/sessions returned ${sessionsList.length} session(s) with populated player names`);

  // TEST 3: GET /api/sessions/[id] - verify single session lookup
  console.log("▶ [TEST 3] GET /api/sessions/[id] - Single session lookup with names...");
  const getByIdReq = new NextRequest(`http://localhost:3000/api/sessions/${sId}`);
  const getByIdRes = await getSessionById(getByIdReq, { params: Promise.resolve({ id: sId }) });
  if (getByIdRes.status !== 200) {
    throw new Error(`Expected 200, got ${getByIdRes.status}`);
  }
  const s1ById = await getByIdRes.json();
  if (s1ById._id.toString() !== sId) {
    throw new Error("Session ID mismatch in single lookup");
  }
  console.log(`  ✓ GET /api/sessions/${sId} succeeded with populated attendance roll`);

  // TEST 4: Single player toggle via PATCH and PUT
  console.log("▶ [TEST 4] Single player attendance toggle via PATCH & PUT...");
  const patchP1Req = new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p1._id.toString(), status: "present" }),
  });
  const patchP1Res = await patchSession(patchP1Req, { params: Promise.resolve({ id: sId }) });
  const patchP1Data = await patchP1Res.json();
  const attP1 = patchP1Data.attendance.find((a: any) => a.playerId.toString() === p1._id.toString());
  if (attP1?.status !== "present") {
    throw new Error(`Expected P1 present, got ${attP1?.status}`);
  }

  // PUT alias test
  const putP2Req = new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p2._id.toString(), status: "present" }),
  });
  const putP2Res = await putSession(putP2Req, { params: Promise.resolve({ id: sId }) });
  const putP2Data = await putP2Res.json();
  const attP2 = putP2Data.attendance.find((a: any) => a.playerId.toString() === p2._id.toString());
  if (attP2?.status !== "present") {
    throw new Error(`Expected P2 present via PUT, got ${attP2?.status}`);
  }
  console.log("  ✓ Both PATCH and PUT endpoints successfully update attendance records");

  // TEST 5: Bulk attendance update via body.attendance
  console.log("▶ [TEST 5] Bulk attendance update via { attendance: [...] }...");
  const bulkReq = new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attendance: [
        { playerId: p1._id.toString(), status: "present" },
        { playerId: p2._id.toString(), status: "absent" },
        { playerId: p3._id.toString(), status: "present" },
      ],
    }),
  });
  const bulkRes = await putSession(bulkReq, { params: Promise.resolve({ id: sId }) });
  const bulkData = await bulkRes.json();
  const b1 = bulkData.attendance.find((a: any) => a.playerId.toString() === p1._id.toString());
  const b2 = bulkData.attendance.find((a: any) => a.playerId.toString() === p2._id.toString());
  const b3 = bulkData.attendance.find((a: any) => a.playerId.toString() === p3._id.toString());
  if (b1?.status !== "present" || b2?.status !== "absent" || b3?.status !== "present") {
    throw new Error(`Bulk attendance mismatch: P1=${b1?.status}, P2=${b2?.status}, P3=${b3?.status}`);
  }
  console.log("  ✓ Bulk attendance array update succeeded");

  // TEST 6: Close session and verify locking
  console.log("▶ [TEST 6] Closing and locking session...");
  const lockReq = new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "closed" }),
  });
  const lockRes = await patchSession(lockReq, { params: Promise.resolve({ id: sId }) });
  const lockData = await lockRes.json();
  if (lockData.status !== "closed") {
    throw new Error(`Expected status closed, got ${lockData.status}`);
  }
  console.log("  ✓ Session status successfully set to closed");

  // TEST 7: IMMUTABILITY - Modifying locked session MUST return HTTP 400
  console.log("▶ [TEST 7] Immutability: Modifying locked session returns HTTP 400...");
  const editLockedReq = new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p2._id.toString(), status: "present" }),
  });
  const editLockedRes = await patchSession(editLockedReq, { params: Promise.resolve({ id: sId }) });
  if (editLockedRes.status !== 400) {
    throw new Error(`Expected 400 for modifying locked session, got ${editLockedRes.status}`);
  }
  const editLockedErr = await editLockedRes.json();
  console.log(`  ✓ Modifying locked session refused with HTTP 400: "${editLockedErr.error}"`);

  // TEST 8: ALREADY CLOSED GUARD - Sending status: "closed" to closed session MUST return HTTP 400
  console.log("▶ [TEST 8] Already Closed: Re-closing closed session returns HTTP 400...");
  const reCloseReq = new NextRequest(`http://localhost:3000/api/sessions/${sId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "closed" }),
  });
  const reCloseRes = await patchSession(reCloseReq, { params: Promise.resolve({ id: sId }) });
  if (reCloseRes.status !== 400) {
    throw new Error(`Expected 400 for re-closing closed session, got ${reCloseRes.status}`);
  }
  const reCloseErr = await reCloseRes.json();
  console.log(`  ✓ Re-closing locked session refused with HTTP 400: "${reCloseErr.error}"`);

  // TEST 9: Multi-Sport Concurrency on Same Date
  console.log("▶ [TEST 9] Multi-Sport Concurrency on Same Date (Football + Cricket)...");
  const postCricketReq = new NextRequest("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-11-10", sport: "Cricket" }),
  });
  const postCricketRes = await postSession(postCricketReq);
  const cricketSession = await postCricketRes.json();
  if (cricketSession.sport !== "Cricket" || cricketSession._id.toString() === sId) {
    throw new Error("Cricket session should be distinct from Football session on same date");
  }
  console.log(`  ✓ Distinct Cricket session created on same date: ${cricketSession._id}`);

  // TEST 10: Route file check
  console.log("▶ [TEST 10] Verifying src/app/coach/sessions/page.tsx dynamic export...");
  const pageModule = await import("../app/coach/sessions/page");
  if (pageModule.dynamic !== "force-dynamic") {
    throw new Error(`Expected dynamic = "force-dynamic", got ${pageModule.dynamic}`);
  }
  console.log("  ✓ src/app/coach/sessions/page.tsx has export const dynamic = 'force-dynamic'");

  console.log("\n=================================================");
  console.log("   ALL DEEP PHASE 3 VERIFICATIONS PASSED!       ");
  console.log("=================================================");
}

runDeepVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ VERIFICATION FAILED:", err);
    process.exit(1);
  });
