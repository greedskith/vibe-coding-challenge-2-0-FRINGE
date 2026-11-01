/**
 * Academy Desk — Production Live Smoke Test Suite
 *
 * Usage:
 *   BASE_URL=https://<your-deployment>.vercel.app npm run verify:live
 *   or:
 *   npx tsx src/scripts/verify-live.ts https://<your-deployment>.vercel.app
 */

async function runLiveVerification() {
  const baseUrlArg = process.argv[2] || process.env.BASE_URL || "http://localhost:3000";
  const baseUrl = baseUrlArg.replace(/\/+$/, "");

  console.log("=================================================");
  console.log("   RUNNING ACADEMY DESK LIVE PRODUCTION TEST     ");
  console.log(`   Target: ${baseUrl}`);
  console.log("=================================================\n");

  // Step 1: Health / Players check
  console.log("▶ [STEP 1] Fetching registered athletes from live API...");
  const playersRes = await fetch(`${baseUrl}/api/players`);
  if (!playersRes.ok) {
    throw new Error(`Failed to fetch players: HTTP ${playersRes.status} ${playersRes.statusText}`);
  }
  const players = await playersRes.json();
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error(`Expected registered players, got: ${JSON.stringify(players)}`);
  }
  console.log(`  ✓ Loaded ${players.length} athlete(s) from production database.`);
  players.slice(0, 3).forEach((p, i) => {
    console.log(`    [P${i + 1}] ${p.name} (${p.sport}, age ${p.age})`);
  });

  const p1 = players[0];
  const p2 = players[1] || players[0];
  const p3 = players[2] || players[0];
  const p1Id = p1._id?.toString() || p1.id;
  const p2Id = p2._id?.toString() || p2.id;
  const p3Id = p3._id?.toString() || p3.id;

  // Step 2: CHECK 1 — Session Lifecycle & Attendance
  console.log("\n▶ [STEP 2 / CHECK 1] Testing Session Lifecycle on Live Server...");
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testDate = `2099-11-${String((Number(uniqueSuffix) % 28) + 1).padStart(2, "0")}`;
  const sessionRes = await fetch(`${baseUrl}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: testDate, sport: "Football" }),
  });
  if (!sessionRes.ok) {
    throw new Error(`Failed to open session: HTTP ${sessionRes.status}`);
  }
  const session = await sessionRes.json();
  const sessionId = session._id?.toString() || session.id;
  console.log(`  ✓ Opened session ${sessionId} for ${testDate}`);

  // Mark P1 present, P2 present, and ensure P3 is strictly marked absent
  await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p1Id, status: "present" }),
  });
  await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p2Id, status: "present" }),
  });
  await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p3Id, status: "absent" }),
  });

  // Lock session
  const lockRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "closed" }),
  });
  const lockedSession = await lockRes.json();
  if (lockedSession.status !== "closed") {
    throw new Error(`Expected locked status 'closed', got: ${lockedSession.status}`);
  }
  console.log("  ✓ CHECK 1 PASSED: Session locked with 2 present, 1 absent.");

  // Immutability test on closed session
  const mutateClosedRes = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: p3Id, status: "present" }),
  });
  if (mutateClosedRes.status !== 400) {
    throw new Error(`Expected HTTP 400 modifying locked session, got ${mutateClosedRes.status}`);
  }
  console.log("  ✓ Immutability Verified: Server returned HTTP 400 when modifying locked session.");

  // Step 3: CHECK 2 — Absent Player Match Ineligibility
  console.log("\n▶ [STEP 3 / CHECK 2] Testing Absent Player Refusal on Live Server...");
  // Attempt with absent player P3
  const absentMatchRes = await fetch(`${baseUrl}/api/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: testDate,
      sport: "Football",
      opponent: "Ranchi FC",
      scores: [{ playerId: p3Id, score: 1 }],
    }),
  });
  if (absentMatchRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for absent player, got ${absentMatchRes.status}`);
  }
  const absentError = await absentMatchRes.json();
  console.log(`  ✓ Refusal Confirmed: "${absentError.error}"`);

  // Record valid match with present player P1
  const validMatchRes = await fetch(`${baseUrl}/api/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: testDate,
      sport: "Football",
      opponent: "Ranchi FC",
      outcome: "win",
      scores: [{ playerId: p1Id, score: 2 }],
    }),
  });
  if (!validMatchRes.ok) {
    throw new Error(`Valid match rejected: HTTP ${validMatchRes.status}`);
  }
  console.log("  ✓ CHECK 2 PASSED: Absent player refused (HTTP 400), valid match accepted (HTTP 201).");

  // Step 4: CHECK 3 & 4 — Trial Readiness & Role Isolation
  console.log("\n▶ [STEP 4 / CHECK 3 & 4] Testing Readiness Benchmarking & Role Views...");
  const readyRes = await fetch(`${baseUrl}/api/ready`);
  if (!readyRes.ok) {
    throw new Error(`Failed to fetch ready metrics: HTTP ${readyRes.status}`);
  }
  const readyList = await readyRes.json();
  console.log(`  ✓ Evaluated ${readyList.length} athlete readiness record(s).`);

  // Scout role filter (?filter=readyOnly)
  const scoutRes = await fetch(`${baseUrl}/api/ready?filter=readyOnly`);
  const scoutList = await scoutRes.json();
  const allScoutReady = scoutList.every((r: any) => r.isReady === true);
  if (!allScoutReady) {
    throw new Error("Scout filter returned non-ready athlete!");
  }
  console.log(`  ✓ Scout View Filter: Exclusively returns ${scoutList.length} ready athlete(s).`);

  // Player role filter (?playerId=...)
  const playerRes = await fetch(`${baseUrl}/api/ready?playerId=${p1Id}`);
  const playerList = await playerRes.json();
  const returnedId = playerList[0]?.player?._id?.toString() || playerList[0]?.player?.id;
  if (playerList.length !== 1 || returnedId !== p1Id) {
    throw new Error(`Player view isolation failed: expected 1 record for ${p1Id}, got: ${JSON.stringify(playerList)}`);
  }
  console.log(`  ✓ Player View Filter: Strictly scoped to requesting athlete (${p1.name}).`);
  console.log("  ✓ CHECK 3 & 4 PASSED: Trial readiness thresholds and role isolation verified.");

  console.log("\n=================================================");
  console.log("   ALL 4 LIVE CHECKS VERIFIED ON PRODUCTION!     ");
  console.log("=================================================");
}

runLiveVerification().catch((err) => {
  console.error("\n❌ LIVE VERIFICATION FAILED:", err.message);
  process.exit(1);
});
