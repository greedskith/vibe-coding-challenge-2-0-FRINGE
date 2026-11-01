import { NextRequest } from "next/server";
import { getDb } from "../lib/db";
import { GET as getPlayers, POST as postPlayer } from "../app/api/players/route";
import { GET as getPlayer, PUT as putPlayer, DELETE as deletePlayer } from "../app/api/players/[id]/route";
import { authOptions } from "../lib/auth";
import bcrypt from "bcryptjs";

async function runPhase2Verification() {
  console.log("=================================================");
  console.log("   RUNNING PHASE 2 PLAYER CRUD & AUTH VERIFICATION");
  console.log("=================================================\n");

  const db = await getDb();

  // Pre-test cleanup: ensure clean slate for test names
  const testNames = ["Ravi", "Priya", "Amit", "Temporary Player", "Coach Test", "Ravi Second"];
  for (const name of testNames) {
    const existing = await db.collection("players").find({ name }).toArray();
    for (const p of existing) {
      await db.collection("players").deleteOne({ _id: p._id });
      await db.collection("users").deleteMany({ $or: [{ playerId: p._id }, { playerId: p._id.toString() }] });
    }
  }
  // Remove any leftover test usernames
  await db.collection("users").deleteMany({
    username: { $in: ["ravi", "priya", "amit", "temporary-player", "coach-test", "coach2", "ravi2"] },
  });

  // Ensure coach account exists and is untouched
  const coachBefore = await db.collection("users").findOne({ username: "coach" });
  if (!coachBefore || coachBefore.role !== "coach") {
    await db.collection("users").updateOne(
      { username: "coach" },
      {
        $set: {
          username: "coach",
          password: await bcrypt.hash("coach123", 10),
          role: "coach",
          name: "Coach",
        },
      },
      { upsert: true }
    );
  }

  const cleanupIds: string[] = [];

  try {
    // Test 1: Add 3 players as described in phase-2.md
    console.log("▶ [TEST 1] Creating 3 players via POST /api/players...");
    const playersToCreate = [
      { name: "Ravi", age: 18, sport: "cricket", password: "ravi123" },
      { name: "Priya", age: 17, sport: "cricket", password: "priya123" },
      { name: "Amit", age: 19, sport: "cricket", password: "amit123" },
    ];

    const createdIds: string[] = [];

    for (const p of playersToCreate) {
      const req = new NextRequest("http://localhost:3000/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const res = await postPlayer(req);
      if (res.status !== 201) {
        const err = await res.json();
        throw new Error(`Failed to create player ${p.name}: ${JSON.stringify(err)}`);
      }
      const data = await res.json();
      const id = data._id?.toString() || data.player?._id?.toString();
      createdIds.push(id);
      cleanupIds.push(id);
      console.log(`  ✓ Created ${p.name} (id: ${id}, username: ${data.username || data.player?.username})`);
    }

    // Test 2: GET /api/players
    console.log("\n▶ [TEST 2] Verifying GET /api/players...");
    const getRes = await getPlayers(new NextRequest("http://localhost:3000/api/players"));
    const allPlayers = await getRes.json();
    console.log(`  Total players returned: ${allPlayers.length}`);

    for (const name of ["Ravi", "Priya", "Amit"]) {
      const found = allPlayers.find((p: any) => p.name === name);
      if (!found) {
        throw new Error(`Expected player ${name} to be in GET /api/players response`);
      }
      const expectedUsername = name.toLowerCase().replace(/\s+/g, "-");
      if (found.username !== expectedUsername) {
        throw new Error(`Expected username for ${name} to be ${expectedUsername}, got ${found.username}`);
      }
      console.log(`  ✓ Found ${name} with username: ${found.username}`);
    }

    // Test 3: Linked user accounts in database & bcrypt check
    console.log("\n▶ [TEST 3] Verifying linked user accounts in DB & bcrypt password hash...");
    for (let i = 0; i < playersToCreate.length; i++) {
      const p = playersToCreate[i];
      const expectedUsername = p.name.toLowerCase().replace(/\s+/g, "-");
      const user = await db.collection("users").findOne({ username: expectedUsername });

      if (!user) {
        throw new Error(`User account for ${expectedUsername} not found in DB`);
      }
      if (user.role !== "player") {
        throw new Error(`Expected user ${expectedUsername} to have role 'player', got '${user.role}'`);
      }
      if (user.playerId?.toString() !== createdIds[i]) {
        throw new Error(`Expected user.playerId to match ${createdIds[i]}, got ${user.playerId?.toString()}`);
      }

      const passwordMatch = await bcrypt.compare(p.password, user.password);
      if (!passwordMatch) {
        throw new Error(`Password hash mismatch for user ${expectedUsername}`);
      }
      console.log(`  ✓ User '${user.username}' verified (role: ${user.role}, playerId matched, password hash valid)`);
    }

    // Test 4: Open new browser -> login as ravi / ravi123 via NextAuth authorize
    console.log("\n▶ [TEST 4] Testing NextAuth credentials authorize for 'ravi' / 'ravi123'...");
    const credProvider = authOptions.providers.find((p: any) => p.id === "credentials") as any;
    if (!credProvider) {
      throw new Error("Credentials provider not configured in authOptions");
    }

    const authorizeFn = credProvider.options?.authorize || credProvider.authorize;
    const authUser = await authorizeFn({
      username: "ravi",
      password: "ravi123",
    });

    if (!authUser) {
      throw new Error("Authorize failed for ravi / ravi123");
    }
    if (authUser.role !== "player") {
      throw new Error(`Expected role 'player', got ${authUser.role}`);
    }
    if (authUser.playerId !== createdIds[0]) {
      throw new Error(`Expected playerId ${createdIds[0]}, got ${authUser.playerId}`);
    }
    console.log(`  ✓ Successfully authorized user 'ravi' -> lands on /player (role: ${authUser.role})`);

    // Test 5: PUT /api/players/[id] - Edit Ravi's age to 19
    console.log("\n▶ [TEST 5] Testing PUT /api/players/[id] (Edit Ravi's age)...");
    const raviId = createdIds[0];
    const putReq = new NextRequest(`http://localhost:3000/api/players/${raviId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ age: 19, sport: "cricket" }),
    });
    const putRes = await putPlayer(putReq, { params: Promise.resolve({ id: raviId }) });
    if (putRes.status !== 200) {
      const err = await putRes.json();
      throw new Error(`Failed to update Ravi: ${JSON.stringify(err)}`);
    }
    const updatedRavi = await putRes.json();
    if (updatedRavi.age !== 19) {
      throw new Error(`Expected age 19, got ${updatedRavi.age}`);
    }
    if (updatedRavi.username !== "ravi") {
      throw new Error(`Expected username 'ravi' in PUT response, got ${updatedRavi.username}`);
    }
    console.log(`  ✓ Successfully updated Ravi's age to ${updatedRavi.age} (username: ${updatedRavi.username})`);

    // Test 6: GET /api/players/[id]
    console.log("\n▶ [TEST 6] Testing GET /api/players/[id]...");
    const singleReq = new NextRequest(`http://localhost:3000/api/players/${raviId}`);
    const singleRes = await getPlayer(singleReq, { params: Promise.resolve({ id: raviId }) });
    const singlePlayer = await singleRes.json();
    if (singlePlayer.name !== "Ravi" || singlePlayer.age !== 19) {
      throw new Error(`Single player fetch mismatch: ${JSON.stringify(singlePlayer)}`);
    }
    console.log(`  ✓ GET /api/players/${raviId} confirmed: ${singlePlayer.name}, Age ${singlePlayer.age}`);

    // Test 7: DELETE /api/players/[id] cascade check
    console.log("\n▶ [TEST 7] Testing DELETE /api/players/[id] cascade (removes player + user)...");
    const tempReq = new NextRequest("http://localhost:3000/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Temporary Player", age: 20, sport: "kabaddi", password: "temp123" }),
    });
    const tempRes = await postPlayer(tempReq);
    const tempData = await tempRes.json();
    const tempId = tempData._id.toString();

    // Verify created
    const tempDocBefore = await db.collection("players").findOne({ _id: tempData._id });
    const tempUserBefore = await db.collection("users").findOne({ username: "temporary-player" });
    if (!tempDocBefore || !tempUserBefore) {
      throw new Error("Temporary player creation failed before delete test");
    }

    // Now delete
    const delReq = new NextRequest(`http://localhost:3000/api/players/${tempId}`, { method: "DELETE" });
    const delRes = await deletePlayer(delReq, { params: Promise.resolve({ id: tempId }) });
    if (delRes.status !== 200) {
      throw new Error(`Delete failed: ${JSON.stringify(await delRes.json())}`);
    }

    // Verify both player and user are deleted
    const tempDocAfter = await db.collection("players").findOne({ _id: tempData._id });
    const tempUserAfter = await db.collection("users").findOne({ username: "temporary-player" });
    if (tempDocAfter !== null) {
      throw new Error("Player document still exists after DELETE!");
    }
    if (tempUserAfter !== null) {
      throw new Error("User document still exists after DELETE! Orphaned account detected.");
    }
    console.log("  ✓ DELETE verified: Both players doc and linked users doc cleanly deleted.");

    // Test 8: Username collision disambiguation
    console.log("\n▶ [TEST 8] Testing duplicate username collision disambiguation...");
    const dupReq = new NextRequest("http://localhost:3000/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ravi", age: 22, sport: "football", password: "ravi2password" }),
    });
    const dupRes = await postPlayer(dupReq);
    if (dupRes.status !== 201) {
      throw new Error(`Duplicate player registration failed: ${JSON.stringify(await dupRes.json())}`);
    }
    const dupData = await dupRes.json();
    cleanupIds.push(dupData._id.toString());

    if (dupData.username !== "ravi2") {
      throw new Error(`Expected disambiguated username 'ravi2', got '${dupData.username}'`);
    }

    // Verify original Ravi user account was NOT mutated
    const origRaviUser = await db.collection("users").findOne({ username: "ravi" });
    if (!origRaviUser || origRaviUser.playerId?.toString() !== createdIds[0]) {
      throw new Error("Original Ravi user account was overwritten by duplicate registration!");
    }
    const origPasswordValid = await bcrypt.compare("ravi123", origRaviUser.password);
    if (!origPasswordValid) {
      throw new Error("Original Ravi user password was corrupted by duplicate registration!");
    }
    console.log("  ✓ Username collision handled: Generated 'ravi2' without altering original 'ravi' account.");

    // Test 9: Reserved / Privileged account protection
    console.log("\n▶ [TEST 9] Testing reserved role account protection (Coach / Scout)...");
    const coachReq = new NextRequest("http://localhost:3000/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Coach", age: 25, sport: "football", password: "playercoach123" }),
    });
    const coachRes = await postPlayer(coachReq);
    if (coachRes.status !== 201) {
      throw new Error(`Player with name 'Coach' failed to register: ${JSON.stringify(await coachRes.json())}`);
    }
    const coachData = await coachRes.json();
    cleanupIds.push(coachData._id.toString());

    if (coachData.username !== "coach2") {
      throw new Error(`Expected disambiguated username 'coach2', got '${coachData.username}'`);
    }

    // Verify actual Head Coach account is completely intact
    const headCoachUser = await db.collection("users").findOne({ username: "coach" });
    if (!headCoachUser || headCoachUser.role !== "coach") {
      throw new Error("CRITICAL BUG: Head coach account role was overwritten or demoted to player!");
    }
    const headCoachPasswordValid = await bcrypt.compare("coach123", headCoachUser.password);
    if (!headCoachPasswordValid) {
      throw new Error("CRITICAL BUG: Head coach password was overwritten!");
    }
    console.log("  ✓ Privileged account safe: Player got 'coach2', Head Coach account remains role: 'coach'.");

    console.log("\n=================================================");
    console.log("   ALL PHASE 2 VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("=================================================");
  } finally {
    // Clean up test player documents and linked users created during tests
    for (const id of cleanupIds) {
      const delReq = new NextRequest(`http://localhost:3000/api/players/${id}`, { method: "DELETE" });
      await deletePlayer(delReq, { params: Promise.resolve({ id }) });
    }
  }
}

runPhase2Verification().catch((err) => {
  console.error("❌ Phase 2 verification failed:", err);
  process.exit(1);
});
