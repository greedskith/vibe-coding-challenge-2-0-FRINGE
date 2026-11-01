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
    console.log(`  ✓ Created ${p.name} (id: ${id}, username: ${data.username || data.player?.username})`);
  }

  // Test 2: GET /api/players
  console.log("\n▶ [TEST 2] Verifying GET /api/players...");
  const getReq = new NextRequest("http://localhost:3000/api/players");
  const getRes = await getPlayers();
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
  console.log(`  ✓ Successfully updated Ravi's age to ${updatedRavi.age}`);

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
  // Create a temporary player to test delete
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

  console.log("\n=================================================");
  console.log("   ALL PHASE 2 VERIFICATIONS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runPhase2Verification().catch((err) => {
  console.error("❌ Phase 2 verification failed:", err);
  process.exit(1);
});
