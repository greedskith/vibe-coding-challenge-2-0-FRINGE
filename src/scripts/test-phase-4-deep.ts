import { getDb } from "../lib/db";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { POST as postSession, GET as getSessions } from "../app/api/sessions/route";
import { PATCH as patchSession } from "../app/api/sessions/[id]/route";
import { POST as postMatch, GET as getMatches } from "../app/api/matches/route";
import { GET as getReady } from "../app/api/ready/route";

async function runPhase4DeepVerification() {
  console.log("=================================================");
  console.log("   RUNNING DEEP PHASE 4 MATCH RECORDING SUITE    ");
  console.log("=================================================\n");

  const db = await getDb();

  // Clean test matches & sessions created for this test date range
  const testDates = ["2026-11-20", "2026-11-21", "2026-11-22"];
  await db.collection("matches").deleteMany({ date: { $in: testDates } });
  await db.collection("sessions").deleteMany({ date: { $in: testDates } });

  const players = await db.collection("players").find().toArray();
  if (players.length < 3) {
    throw new Error(`Expected at least 3 players, found ${players.length}`);
  }

  const [p1, p2, p3] = players;
  const p1Id = p1._id.toString();
  const p2Id = p2._id.toString();
  const p3Id = p3._id.toString();
  console.log(`Athletes loaded for verification:`);
  console.log(`  P1: ${p1.name} (${p1Id})`);
  console.log(`  P2: ${p2.name} (${p2Id})`);
  console.log(`  P3: ${p3.name} (${p3Id})\n`);

  // -------------------------------------------------------------
  // TEST 1: Input Validation & Missing Fields (HTTP 400)
  // -------------------------------------------------------------
  console.log("▶ [TEST 1] Missing & Invalid Fields Validation (HTTP 400)...");

  // 1a. Missing date
  const missingDateReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sport: "Football",
      opponent: "Test FC",
      scores: [{ playerId: p1Id, score: 1 }],
    }),
  });
  const resMissingDate = await postMatch(missingDateReq);
  if (resMissingDate.status !== 400) {
    throw new Error(`Expected 400 for missing date, got ${resMissingDate.status}`);
  }
  console.log("  ✓ Missing date refused with HTTP 400");

  // 1b. Missing scores
  const missingScoresReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-20",
      sport: "Football",
      opponent: "Test FC",
      scores: [],
    }),
  });
  const resMissingScores = await postMatch(missingScoresReq);
  if (resMissingScores.status !== 400) {
    throw new Error(`Expected 400 for empty scores array, got ${resMissingScores.status}`);
  }
  console.log("  ✓ Empty scores array refused with HTTP 400");

  // 1c. Invalid playerId
  const invalidIdReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-20",
      sport: "Football",
      opponent: "Test FC",
      scores: [{ playerId: "not-an-objectid", score: 1 }],
    }),
  });
  const resInvalidId = await postMatch(invalidIdReq);
  if (resInvalidId.status !== 400) {
    throw new Error(`Expected 400 for invalid playerId, got ${resInvalidId.status}`);
  }
  console.log("  ✓ Invalid playerId format refused with HTTP 400\n");

  // -------------------------------------------------------------
  // TEST 2: CHECK 2 Strict Absent Refusal & Valid Recording
  // -------------------------------------------------------------
  console.log("▶ [TEST 2] Strict CHECK 2 Server Enforcement (Absent Refusal)...");

  // 2a. Setup session on 2026-11-20: P1 present, P2 absent, P3 absent
  const s20Req = new NextRequest("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-11-20", sport: "Football" }),
  });
  const s20Res = await postSession(s20Req);
  const s20 = await s20Res.json();
  const s20Id = s20._id.toString();

  // Mark P1 present, lock session
  await patchSession(
    new NextRequest(`http://localhost:3000/api/sessions/${s20Id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: p1Id, status: "present" }),
    }),
    { params: Promise.resolve({ id: s20Id }) }
  );

  await patchSession(
    new NextRequest(`http://localhost:3000/api/sessions/${s20Id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    }),
    { params: Promise.resolve({ id: s20Id }) }
  );
  console.log(`  ✓ Closed Football session for 2026-11-20 (P1 present, P2/P3 absent)`);

  // 2b. Attempt to score absent player P2
  const scoreAbsentReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-20",
      sport: "Football",
      opponent: "Tata FA",
      scores: [{ playerId: p2Id, score: 2 }],
    }),
  });
  const scoreAbsentRes = await postMatch(scoreAbsentReq);
  if (scoreAbsentRes.status !== 400) {
    throw new Error(`Expected 400 when scoring absent player, got ${scoreAbsentRes.status}`);
  }
  const absentData = await scoreAbsentRes.json();
  if (!absentData.error || !absentData.error.includes("absent")) {
    throw new Error(`Error message must include 'absent', got: ${JSON.stringify(absentData)}`);
  }
  console.log(`  ✓ Refusal confirmed: "${absentData.error}"`);

  // 2c. Attempt to score mixture of present P1 and absent P3
  const mixedReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-20",
      sport: "Football",
      opponent: "Tata FA",
      scores: [
        { playerId: p1Id, score: 1 },
        { playerId: p3Id, score: 0 },
      ],
    }),
  });
  const mixedRes = await postMatch(mixedReq);
  if (mixedRes.status !== 400) {
    throw new Error(`Expected 400 for mixed present/absent score, got ${mixedRes.status}`);
  }
  console.log("  ✓ Mixed present/absent squad strictly refused with HTTP 400");

  // 2d. Record valid match with only present player P1
  const validReq = new NextRequest("http://localhost:3000/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: "2026-11-20",
      sport: "Football",
      opponent: "Tata FA",
      outcome: "win",
      scores: [{ playerId: p1Id, score: 3 }],
    }),
  });
  const validRes = await postMatch(validReq);
  if (validRes.status !== 201) {
    throw new Error(`Expected 201 for valid match, got ${validRes.status}`);
  }
  const validData = await validRes.json();
  if (validData.outcome !== "win" || validData.scores[0].score !== 3) {
    throw new Error(`Match document attributes mismatch: ${JSON.stringify(validData)}`);
  }
  console.log("  ✓ Valid match accepted with HTTP 201 and outcome 'win'\n");

  // -------------------------------------------------------------
  // TEST 3: Multi-Sport Concurrency on the Same Date
  // -------------------------------------------------------------
  console.log("▶ [TEST 3] Multi-Sport Concurrency on Same Date (2026-11-21)...");

  // Football session on 2026-11-21: P1 present, P2 absent
  const fbReq = new NextRequest("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-11-21", sport: "Football" }),
  });
  const fbRes = await postSession(fbReq);
  const fbSession = await fbRes.json();
  await patchSession(
    new NextRequest(`http://localhost:3000/api/sessions/${fbSession._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: p1Id, status: "present" }),
    }),
    { params: Promise.resolve({ id: fbSession._id.toString() }) }
  );

  // Cricket session on 2026-11-21: P2 present, P1 absent
  const crReq = new NextRequest("http://localhost:3000/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-11-21", sport: "Cricket" }),
  });
  const crRes = await postSession(crReq);
  const crSession = await crRes.json();
  await patchSession(
    new NextRequest(`http://localhost:3000/api/sessions/${crSession._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: p2Id, status: "present" }),
    }),
    { params: Promise.resolve({ id: crSession._id.toString() }) }
  );

  // Cross-sport check 1: Cricket match scoring P1 (absent in Cricket) -> MUST be 400
  const crossCrFail = await postMatch(
    new NextRequest("http://localhost:3000/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-11-21",
        sport: "Cricket",
        opponent: "Dumka XI",
        scores: [{ playerId: p1Id, score: 50 }],
      }),
    })
  );
  if (crossCrFail.status !== 400) {
    throw new Error(`Expected 400 when scoring P1 in Cricket, got ${crossCrFail.status}`);
  }
  console.log("  ✓ P1 refused in Cricket match (absent in Cricket session)");

  // Cross-sport check 2: Cricket match scoring P2 (present in Cricket) -> MUST be 201
  const crossCrSuccess = await postMatch(
    new NextRequest("http://localhost:3000/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-11-21",
        sport: "Cricket",
        opponent: "Dumka XI",
        outcome: "draw",
        scores: [{ playerId: p2Id, score: 45 }],
      }),
    })
  );
  if (crossCrSuccess.status !== 201) {
    throw new Error(`Expected 201 for P2 in Cricket match, got ${crossCrSuccess.status}`);
  }
  console.log("  ✓ P2 accepted in Cricket match (present in Cricket session)");

  // Cross-sport check 3: Football match scoring P1 (present in Football) -> MUST be 201
  const crossFbSuccess = await postMatch(
    new NextRequest("http://localhost:3000/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2026-11-21",
        sport: "Football",
        opponent: "Ranchi FC",
        outcome: "loss",
        scores: [{ playerId: p1Id, score: 1 }],
      }),
    })
  );
  if (crossFbSuccess.status !== 201) {
    throw new Error(`Expected 201 for P1 in Football match, got ${crossFbSuccess.status}`);
  }
  console.log("  ✓ P1 accepted in Football match (present in Football session)\n");

  // -------------------------------------------------------------
  // TEST 4: GET /api/matches (Sort & Player Name Population)
  // -------------------------------------------------------------
  console.log("▶ [TEST 4] GET /api/matches Populated Names & Query Filtering...");

  const allMatchesReq = new NextRequest("http://localhost:3000/api/matches");
  const allMatchesRes = await getMatches(allMatchesReq);
  const allMatches = await allMatchesRes.json();

  if (!Array.isArray(allMatches) || allMatches.length < 3) {
    throw new Error(`Expected at least 3 matches in GET /api/matches, got ${allMatches?.length}`);
  }

  // Verify descending sort by date
  for (let i = 0; i < allMatches.length - 1; i++) {
    if ((allMatches[i].date || "") < (allMatches[i + 1].date || "")) {
      throw new Error(`Matches not sorted descending: ${allMatches[i].date} before ${allMatches[i + 1].date}`);
    }
  }
  console.log(`  ✓ Verified descending date sort across ${allMatches.length} matches`);

  // Verify populated player names
  const matchWithP1 = allMatches.find((m: any) =>
    (m.scores || []).some((s: any) => s.playerId?.toString() === p1Id)
  );
  const scoreEntryP1 = matchWithP1?.scores.find((s: any) => s.playerId?.toString() === p1Id);
  if (!scoreEntryP1?.playerName || scoreEntryP1.playerName !== p1.name) {
    throw new Error(`Expected populated playerName '${p1.name}', got '${scoreEntryP1?.playerName}'`);
  }
  console.log(`  ✓ Verified populated playerName: '${scoreEntryP1.playerName}'`);

  // Verify sport query filter (?sport=Cricket)
  const cricketReq = new NextRequest("http://localhost:3000/api/matches?sport=Cricket");
  const cricketRes = await getMatches(cricketReq);
  const cricketMatches = await cricketRes.json();
  const allCricket = cricketMatches.every((m: any) => (m.sport || "").toLowerCase() === "cricket");
  if (!allCricket || cricketMatches.length === 0) {
    throw new Error(`Sport query filter failed: expected all Cricket matches, got ${JSON.stringify(cricketMatches)}`);
  }
  console.log(`  ✓ Query param ?sport=Cricket successfully filtered to ${cricketMatches.length} Cricket fixtures\n`);

  // -------------------------------------------------------------
  // TEST 5: Route Parity & Dynamic Export
  // -------------------------------------------------------------
  console.log("▶ [TEST 5] Verifying src/app/coach/matches/page.tsx parity & dynamic export...");
  const pageModule = await import("../app/coach/matches/page");
  if (pageModule.dynamic !== "force-dynamic") {
    throw new Error(`Expected export const dynamic = 'force-dynamic', got '${pageModule.dynamic}'`);
  }
  if (typeof pageModule.default !== "function") {
    throw new Error("CoachMatchesPage default export must be a function component");
  }
  console.log("  ✓ src/app/coach/matches/page.tsx has export const dynamic = 'force-dynamic'\n");

  // -------------------------------------------------------------
  // TEST 6: Ready Board Match Count Integration
  // -------------------------------------------------------------
  console.log("▶ [TEST 6] Ready Board Match Count Integration...");
  const readyReq = new NextRequest("http://localhost:3000/api/ready");
  const readyRes = await getReady(readyReq);
  const readyData = await readyRes.json();

  const rP1 = readyData.find((r: any) => r.player._id?.toString() === p1Id);
  if (!rP1 || rP1.matchCount < 2) {
    throw new Error(`Expected P1 matchCount >= 2 after test matches, got ${rP1?.matchCount}`);
  }
  console.log(`  ✓ Ready Board reflects updated matchCount for ${p1.name}: ${rP1.matchCount} matches`);

  console.log("\n=================================================");
  console.log("   ALL DEEP PHASE 4 VERIFICATIONS PASSED!       ");
  console.log("=================================================");
}

runPhase4DeepVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ PHASE 4 VERIFICATION FAILED:", err);
    process.exit(1);
  });
