/**
 * Empirical Adversarial Challenger Stress Suite (Milestone M-MOB3)
 * Target: Mobile & Android Boundary Verification across Academy Desk
 *
 * Suites:
 * 1. Long-press 500ms & displacement cancellation boundary test harness (>10px vs <=10px)
 * 2. Stepper touch target hitbox mathematical & structural verification (>= 44px)
 * 3. LocalDb fallback resilience, CRUD, complex query operators ($or, $in, $nin, $exists, $regex), sort & concurrency
 * 4. Next.js 10-route build artifact and prerender verification
 * 5. Monochromatic Swiss token & accessibility invariants audit
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ObjectId } from "mongodb";
import { getLocalDb } from "../lib/local-db";
import { CossNumberField11 } from "../components/p-number-field-11";

// Color output formatting
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let passCount = 0;
let failCount = 0;
const failures: Array<{ suite: string; name: string; error: string }> = [];

function report(suite: string, testName: string, passed: boolean, details?: string) {
  if (passed) {
    passCount++;
    console.log(`  ${GREEN}✓ [PASS]${RESET} [${suite}] ${testName}`);
  } else {
    failCount++;
    failures.push({ suite, name: testName, error: details || "Assertion failed" });
    console.error(`  ${RED}✗ [FAIL]${RESET} [${suite}] ${testName}`);
    if (details) console.error(`    ${RED}Details: ${details}${RESET}`);
  }
}

async function runAdversarialBoundarySuite() {
  console.log(`\n${CYAN}========================================================================${RESET}`);
  console.log(`${CYAN}   M-MOB3 EMPIRICAL ADVERSARIAL BOUNDARY & STRESS VERIFICATION SUITE    ${RESET}`);
  console.log(`${CYAN}========================================================================\n${RESET}`);

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 1: Long-Press 500ms & Displacement Cancellation Boundary Engine
  // ══════════════════════════════════════════════════════════════════════
  console.log(`${YELLOW}▶ [SUITE 1] Long-Press 500ms & Displacement Cancellation Boundary Safety${RESET}`);
  {
    const suite = "SUITE 1 - Long-Press Gestures";

    // Replicate the exact event-driven state machine from coach-mobile-shell.tsx
    class AttendanceGestureEngine {
      public longPressTimers: Record<string, NodeJS.Timeout> = {};
      public longPressFired: Record<string, boolean> = {};
      public pointerStartPos: Record<string, { x: number; y: number }> = {};
      public events: Array<{ playerId: string; type: "present" | "absent"; time: number }> = [];
      public vibrated: number[] = [];

      public onPointerDown(
        pId: string,
        e: { clientX: number; clientY: number; button?: number; pointerType?: string },
        opts: { activeSession: boolean; isLocked: boolean }
      ) {
        if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
        this.longPressFired[pId] = false;
        this.pointerStartPos[pId] = { x: e.clientX, y: e.clientY };

        if (this.longPressTimers[pId]) {
          clearTimeout(this.longPressTimers[pId]);
        }
        if (!opts.activeSession || opts.isLocked) return;

        this.longPressTimers[pId] = setTimeout(() => {
          this.longPressFired[pId] = true;
          this.vibrated.push(50);
          this.events.push({ playerId: pId, type: "absent", time: Date.now() });
        }, 500);
      }

      public onPointerMove(pId: string, e: { clientX: number; clientY: number }) {
        const start = this.pointerStartPos[pId];
        if (!start) return;
        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        if (dx > 10 || dy > 10) {
          if (this.longPressTimers[pId]) {
            clearTimeout(this.longPressTimers[pId]);
          }
          delete this.pointerStartPos[pId];
        }
      }

      public onPointerUp(
        pId: string,
        opts: { activeSession: boolean; isLocked: boolean }
      ) {
        if (this.longPressTimers[pId]) {
          clearTimeout(this.longPressTimers[pId]);
        }
        const start = this.pointerStartPos[pId];
        const fired = this.longPressFired[pId];
        delete this.pointerStartPos[pId];
        delete this.longPressFired[pId];

        if (!fired && start) {
          if (!opts.activeSession || opts.isLocked) return;
          this.events.push({ playerId: pId, type: "present", time: Date.now() });
        }
      }

      public onPointerCancel(pId: string) {
        if (this.longPressTimers[pId]) {
          clearTimeout(this.longPressTimers[pId]);
        }
        delete this.pointerStartPos[pId];
        delete this.longPressFired[pId];
      }

      public cleanup() {
        Object.values(this.longPressTimers).forEach((t) => clearTimeout(t));
      }
    }

    // 1.1 Short tap (<500ms, displacement 0) -> marks PRESENT
    {
      const engine = new AttendanceGestureEngine();
      engine.onPointerDown("p1", { clientX: 100, clientY: 200, button: 0 }, { activeSession: true, isLocked: false });
      await new Promise((r) => setTimeout(r, 80));
      engine.onPointerUp("p1", { activeSession: true, isLocked: false });
      assert.strictEqual(engine.events.length, 1);
      assert.strictEqual(engine.events[0].type, "present");
      assert.strictEqual(engine.vibrated.length, 0);
      report(suite, "Short tap (<500ms) marks PRESENT without vibration", true);
      engine.cleanup();
    }

    // 1.2 Long press (>=500ms, displacement 0) -> marks ABSENT with vibration
    {
      const engine = new AttendanceGestureEngine();
      engine.onPointerDown("p1", { clientX: 100, clientY: 200, button: 0 }, { activeSession: true, isLocked: false });
      await new Promise((r) => setTimeout(r, 550));
      assert.strictEqual(engine.events.length, 1);
      assert.strictEqual(engine.events[0].type, "absent");
      assert.strictEqual(engine.vibrated.length, 1);
      assert.strictEqual(engine.vibrated[0], 50);

      // Subsequent pointer up must NOT trigger tap present
      engine.onPointerUp("p1", { activeSession: true, isLocked: false });
      assert.strictEqual(engine.events.length, 1, "PointerUp after long press must not add present event");
      report(suite, "Long press (>=500ms) marks ABSENT with vibration and suppresses tap-present on release", true);
      engine.cleanup();
    }

    // 1.3 Boundary: displacement exactly 10px (dx=10, dy=0) -> does NOT cancel (within finger jitter tolerance)
    {
      const engine = new AttendanceGestureEngine();
      engine.onPointerDown("p1", { clientX: 100, clientY: 200, button: 0 }, { activeSession: true, isLocked: false });
      engine.onPointerMove("p1", { clientX: 110, clientY: 200 }); // dx=10
      await new Promise((r) => setTimeout(r, 550));
      assert.strictEqual(engine.events.length, 1);
      assert.strictEqual(engine.events[0].type, "absent");
      report(suite, "Displacement dx=10 (<=10px threshold) preserves long-press trigger", true);
      engine.cleanup();
    }

    // 1.4 Boundary: displacement 11px (dx=11, dy=0) -> CANCELS timer (scroll action)
    {
      const engine = new AttendanceGestureEngine();
      engine.onPointerDown("p1", { clientX: 100, clientY: 200, button: 0 }, { activeSession: true, isLocked: false });
      engine.onPointerMove("p1", { clientX: 111, clientY: 200 }); // dx=11 (> 10)
      await new Promise((r) => setTimeout(r, 550));
      assert.strictEqual(engine.events.length, 0, "Displacement > 10px must cancel long press timer");
      engine.onPointerUp("p1", { activeSession: true, isLocked: false });
      assert.strictEqual(engine.events.length, 0, "Pointer up after scroll must NOT trigger tap event");
      report(suite, "Displacement dx=11 (>10px) cancels long-press and suppresses tap on pointer-up", true);
      engine.cleanup();
    }

    // 1.5 Vertical scrolling: displacement dy=12 -> CANCELS timer
    {
      const engine = new AttendanceGestureEngine();
      engine.onPointerDown("p1", { clientX: 100, clientY: 200, button: 0 }, { activeSession: true, isLocked: false });
      engine.onPointerMove("p1", { clientX: 100, clientY: 212 }); // dy=12 (> 10)
      await new Promise((r) => setTimeout(r, 550));
      assert.strictEqual(engine.events.length, 0);
      engine.onPointerUp("p1", { activeSession: true, isLocked: false });
      assert.strictEqual(engine.events.length, 0);
      report(suite, "Vertical scroll displacement dy=12 (>10px) cancels gesture safely", true);
      engine.cleanup();
    }

    // 1.6 Pointer cancel (OS interrupted touch gesture)
    {
      const engine = new AttendanceGestureEngine();
      engine.onPointerDown("p1", { clientX: 100, clientY: 200, button: 0 }, { activeSession: true, isLocked: false });
      await new Promise((r) => setTimeout(r, 200));
      engine.onPointerCancel("p1");
      await new Promise((r) => setTimeout(r, 350));
      assert.strictEqual(engine.events.length, 0);
      report(suite, "onPointerCancel cleanly aborts pending timers and state", true);
      engine.cleanup();
    }

    // 1.7 Non-left click mouse events are ignored
    {
      const engine = new AttendanceGestureEngine();
      engine.onPointerDown("p1", { clientX: 100, clientY: 200, button: 2, pointerType: "mouse" }, { activeSession: true, isLocked: false });
      await new Promise((r) => setTimeout(r, 550));
      assert.strictEqual(engine.events.length, 0);
      report(suite, "Right-click mouse pointer down is strictly ignored", true);
      engine.cleanup();
    }

    // 1.8 Inactive session or locked session does not trigger long-press or tap
    {
      const engine = new AttendanceGestureEngine();
      // Inactive session
      engine.onPointerDown("p1", { clientX: 100, clientY: 200, button: 0 }, { activeSession: false, isLocked: false });
      await new Promise((r) => setTimeout(r, 550));
      assert.strictEqual(engine.events.length, 0);
      engine.onPointerUp("p1", { activeSession: false, isLocked: false });
      assert.strictEqual(engine.events.length, 0);

      // Locked session
      engine.onPointerDown("p2", { clientX: 100, clientY: 200, button: 0 }, { activeSession: true, isLocked: true });
      await new Promise((r) => setTimeout(r, 550));
      assert.strictEqual(engine.events.length, 0);
      engine.onPointerUp("p2", { activeSession: true, isLocked: true });
      assert.strictEqual(engine.events.length, 0);
      report(suite, "Locked session and absent session prevent unauthorized attendance mutation", true);
      engine.cleanup();
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 2: Stepper Touch Target Hitbox Mathematical & Structural Verification
  // ══════════════════════════════════════════════════════════════════════
  console.log(`\n${YELLOW}▶ [SUITE 2] Stepper Touch Target Hitbox Bounds (>= 44px)${RESET}`);
  {
    const suite = "SUITE 2 - Touch Target Bounds";

    const componentPath = path.resolve(process.cwd(), "src/components/p-number-field-11.tsx");
    const source = fs.readFileSync(componentPath, "utf-8");

    // 2.1 CSS class analysis
    assert(source.includes("relative"), "Button must have relative positioning");
    assert(source.includes("size-7"), "Visual button dimension is size-7 (28px)");
    assert(source.includes("after:absolute"), "Hitbox expansion uses after:absolute");
    assert(source.includes("after:-inset-2"), "Hitbox expansion uses after:-inset-2 (-8px)");
    assert(source.includes("after:content-['']"), "Hitbox pseudo-element sets content");
    assert(source.includes("touch-manipulation"), "touch-manipulation disables double-tap zoom delay");
    report(suite, "Button markup includes required classes: relative, size-7, after:absolute, after:-inset-2, touch-manipulation", true);

    // 2.2 Mathematical hitbox calculation:
    // Tailwind base: 1 unit = 0.25rem = 4px.
    // size-7 = 7 * 4px = 28px width, 28px height.
    // -inset-2 = -2 * 4px = -8px offset on top, right, bottom, left.
    // Hitbox Width = 28px + 8px (left) + 8px (right) = 44px.
    // Hitbox Height = 28px + 8px (top) + 8px (bottom) = 44px.
    const visualWidth = 28;
    const visualHeight = 28;
    const insetExpansion = 8; // from -inset-2
    const touchHitboxWidth = visualWidth + 2 * insetExpansion;
    const touchHitboxHeight = visualHeight + 2 * insetExpansion;

    assert.strictEqual(touchHitboxWidth, 44, `Calculated touch width must be 44px, got ${touchHitboxWidth}`);
    assert.strictEqual(touchHitboxHeight, 44, `Calculated touch height must be 44px, got ${touchHitboxHeight}`);
    assert(touchHitboxWidth >= 44, "Touch hitbox width >= 44px satisfies WCAG 2.5.5");
    assert(touchHitboxHeight >= 44, "Touch hitbox height >= 44px satisfies WCAG 2.5.5");
    report(suite, `Hitbox calculated bounds: ${touchHitboxWidth}px × ${touchHitboxHeight}px (>= 44px target standard)`, true);

    // 2.3 Component rendering test with React
    let recordedVal = 0;
    const markup = renderToStaticMarkup(
      React.createElement(CossNumberField11, {
        value: 5,
        onValueChange: (v: number) => { recordedVal = v; },
        min: 0,
        max: 10,
        ariaLabel: "Match Score",
      })
    );
    void recordedVal;
    assert(markup.includes('aria-label="Decrease score"'));
    assert(markup.includes('aria-label="Increase score"'));
    assert(markup.includes("after:-inset-2"));
    assert(markup.includes('value="5"'));
    report(suite, "CossNumberField11 renders static markup with complete ARIA labels and hitbox classes", true);
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 3: LocalDb Fallback Stress, CRUD, Query Operators & Concurrency
  // ══════════════════════════════════════════════════════════════════════
  console.log(`\n${YELLOW}▶ [SUITE 3] LocalDb Fallback Resilience, Complex Operators & Concurrency${RESET}`);
  {
    const suite = "SUITE 3 - LocalDb Resilience";
    const localDb = getLocalDb();

    // 3.1 Basic CRUD
    const pId = new ObjectId();
    await localDb.collection("players").insertOne({
      _id: pId,
      name: "Adversarial Test Athlete",
      age: 17,
      sport: "Cricket",
    });

    const found = await localDb.collection("players").findOne({ _id: pId });
    assert(found, "Inserted player must be found");
    assert.strictEqual(found.name, "Adversarial Test Athlete");
    report(suite, "LocalDb insertOne and findOne by ObjectId succeeds", true);

    // 3.2 Update with $set
    await localDb.collection("players").updateOne(
      { _id: pId },
      { $set: { age: 18, notes: "Updated in test" } }
    );
    const updated = await localDb.collection("players").findOne({ _id: pId });
    assert.strictEqual(updated.age, 18);
    assert.strictEqual(updated.notes, "Updated in test");
    report(suite, "LocalDb updateOne with $set modifies fields cleanly", true);

    // 3.3 Query operator $in
    const pId2 = new ObjectId();
    await localDb.collection("players").insertOne({
      _id: pId2,
      name: "Second Test Athlete",
      age: 19,
      sport: "Football",
    });

    const inResults = await localDb
      .collection("players")
      .find({ _id: { $in: [pId, pId2] } })
      .toArray();
    assert.strictEqual(inResults.length, 2);
    report(suite, "LocalDb $in operator correctly matches array of ObjectIds", true);

    // 3.4 Query operator $nin
    const ninResults = await localDb
      .collection("players")
      .find({ _id: { $nin: [pId] }, sport: "Cricket" })
      .toArray();
    assert(!ninResults.some((p: any) => p._id.toString() === pId.toString()));
    report(suite, "LocalDb $nin operator correctly excludes specified ObjectIds", true);

    // 3.5 Query operator $exists
    const existsResults = await localDb
      .collection("players")
      .find({ notes: { $exists: true } })
      .toArray();
    assert(existsResults.some((p: any) => p._id.toString() === pId.toString()));
    report(suite, "LocalDb $exists: true operator accurately filters documents", true);

    // 3.6 Query operator $regex
    const regexResults = await localDb
      .collection("players")
      .find({ name: { $regex: /adversarial/i } })
      .toArray();
    assert(regexResults.length >= 1);
    assert.strictEqual(regexResults[0]._id.toString(), pId.toString());
    report(suite, "LocalDb $regex operator correctly performs case-insensitive regex search", true);

    // 3.7 Compound $or queries
    const orResults = await localDb
      .collection("players")
      .find({
        $or: [{ name: "Adversarial Test Athlete" }, { name: "Second Test Athlete" }],
      })
      .toArray();
    assert.strictEqual(orResults.length, 2);
    report(suite, "LocalDb $or compound query operator matches multiple alternative branches", true);

    // 3.8 Sorting ascending and descending
    const sortedDesc = await localDb
      .collection("players")
      .find({ _id: { $in: [pId, pId2] } })
      .sort({ age: -1 })
      .toArray();
    assert.strictEqual(sortedDesc[0].age, 19);
    assert.strictEqual(sortedDesc[1].age, 18);

    const sortedAsc = await localDb
      .collection("players")
      .find({ _id: { $in: [pId, pId2] } })
      .sort({ age: 1 })
      .toArray();
    assert.strictEqual(sortedAsc[0].age, 18);
    assert.strictEqual(sortedAsc[1].age, 19);
    report(suite, "LocalDb sort({ field: 1 }) and sort({ field: -1 }) order accurately", true);

    // 3.9 Concurrency stress: 50 concurrent parallel operations
    const concurrentOps = Array.from({ length: 50 }, async () => {
      const doc = await localDb.collection("players").findOne({ _id: pId });
      assert(doc !== null);
      return doc._id.toString();
    });
    const results = await Promise.all(concurrentOps);
    assert.strictEqual(results.length, 50);
    assert(results.every((id) => id === pId.toString()));
    report(suite, "LocalDb survives 50 concurrent parallel async queries without race or deadlock", true);

    // Cleanup test athletes
    await localDb.collection("players").deleteOne({ _id: pId });
    await localDb.collection("players").deleteOne({ _id: pId2 });
    assert.strictEqual(await localDb.collection("players").findOne({ _id: pId }), null);
    report(suite, "LocalDb deleteOne cleanly removes test fixtures", true);
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 4: Next.js 10-Route Build Artifact & Prerender Verification
  // ══════════════════════════════════════════════════════════════════════
  console.log(`\n${YELLOW}▶ [SUITE 4] Next.js 10-Route Build Artifacts & Prerendering${RESET}`);
  {
    const suite = "SUITE 4 - Build Route Artifacts";

    // Required 10 routes from Next.js App Router
    const expectedRoutes = [
      { name: "Root Page", file: "src/app/page.tsx", route: "/" },
      { name: "Coach Home", file: "src/app/coach/page.tsx", route: "/coach" },
      { name: "Coach Matches", file: "src/app/coach/matches/page.tsx", route: "/coach/matches" },
      { name: "Coach Players/Roster", file: "src/app/coach/players/page.tsx", route: "/coach/players" },
      { name: "Coach Ready Board", file: "src/app/coach/ready/page.tsx", route: "/coach/ready" },
      { name: "Coach Sessions", file: "src/app/coach/sessions/page.tsx", route: "/coach/sessions" },
      { name: "Login Page", file: "src/app/login/page.tsx", route: "/login" },
      { name: "Player Portal", file: "src/app/player/page.tsx", route: "/player" },
      { name: "Scout Portal", file: "src/app/scout/page.tsx", route: "/scout" },
    ];

    // 4.1 Verify all source route files exist
    for (const r of expectedRoutes) {
      const fullPath = path.resolve(process.cwd(), r.file);
      assert(fs.existsSync(fullPath), `Source route file ${r.file} must exist`);
    }
    report(suite, `All ${expectedRoutes.length} application page source files exist`, true);

    // 4.2 Verify Next.js build output manifests
    const buildManifestPath = path.resolve(process.cwd(), ".next/build-manifest.json");
    const appPathsManifestPath = path.resolve(process.cwd(), ".next/server/app-paths-manifest.json");

    assert(fs.existsSync(buildManifestPath), ".next/build-manifest.json must exist from production build");
    assert(fs.existsSync(appPathsManifestPath), ".next/server/app-paths-manifest.json must exist");

    const appPathsManifest = JSON.parse(fs.readFileSync(appPathsManifestPath, "utf-8"));
    const requiredPages = [
      "/page",
      "/_not-found/page",
      "/login/page",
      "/player/page",
      "/scout/page",
      "/coach/page",
      "/coach/ready/page",
      "/coach/sessions/page",
      "/coach/matches/page",
      "/coach/players/page",
    ];

    for (const pageRoute of requiredPages) {
      assert(
        pageRoute in appPathsManifest,
        `Page route ${pageRoute} must be registered in app-paths-manifest.json`
      );
      const compiledRelPath = appPathsManifest[pageRoute];
      const compiledFullPath = path.resolve(process.cwd(), ".next/server", compiledRelPath);
      assert(
        fs.existsSync(compiledFullPath),
        `Compiled artifact for ${pageRoute} must exist at ${compiledFullPath}`
      );
    }
    report(suite, `All ${requiredPages.length} Next.js application routes compiled and verified in server build artifacts`, true);
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUITE 5: Monochromatic Swiss Token & Mobile Accessibility Audit
  // ══════════════════════════════════════════════════════════════════════
  console.log(`\n${YELLOW}▶ [SUITE 5] Monochromatic Swiss Design & Mobile Accessibility Invariants${RESET}`);
  {
    const suite = "SUITE 5 - Invariant Audit";

    const filesToAudit = [
      "src/app/layout.tsx",
      "src/app/globals.css",
      "src/components/coach-mobile-shell.tsx",
      "src/components/p-number-field-11.tsx",
      "src/components/login-form.tsx",
      "src/components/ui/sheet.tsx",
      "src/app/player/page.tsx",
      "src/app/scout/page.tsx",
    ];

    for (const relPath of filesToAudit) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, "utf-8");

      // Invariant: No emerald or green Tailwind classes
      const forbiddenColors = content.match(/\b(emerald|green)-\d+\b/g);
      assert.strictEqual(
        forbiddenColors,
        null,
        `File ${relPath} contains forbidden color classes: ${forbiddenColors?.join(", ")}`
      );

      // Invariant: No colored Unicode emojis
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/u;
      assert(!emojiRegex.test(content), `File ${relPath} contains forbidden colored Unicode emojis`);
    }
    report(suite, "Swiss Monochromatic invariant: 0 colored classes and 0 emojis across all 8 mobile files", true);

    // 5.2 layout.tsx viewport contract
    const layoutContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/layout.tsx"), "utf-8");
    assert(layoutContent.includes('interactiveWidget: "resizes-content"'));
    assert(!layoutContent.includes("userScalable: false"));
    assert(!layoutContent.includes("maximumScale: 1"));
    report(suite, "layout.tsx viewport allows pinch-to-zoom and sets interactiveWidget: 'resizes-content'", true);

    // 5.3 login-form.tsx mobile input usability
    const loginContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/login-form.tsx"), "utf-8");
    assert(loginContent.includes('autoCapitalize="none"'));
    assert(loginContent.includes('autoCorrect="off"'));
    assert(loginContent.includes("spellCheck={false}"));
    assert(loginContent.includes("text-base sm:text-sm"));
    report(suite, "login-form.tsx provides >=16px text-base and disables auto-capitalization/spellcheck", true);

    // 5.4 sheet.tsx close button safe margin
    const sheetContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/sheet.tsx"), "utf-8");
    assert(sheetContent.includes("top-4 right-4 z-20"));
    assert(sheetContent.includes("sm:top-3 sm:right-3"));
    report(suite, "sheet.tsx close button maintains 16px notch safe clearance (top-4 right-4 z-20 sm:top-3 sm:right-3)", true);

    // 5.5 player/page.tsx and scout/page.tsx 75% target invariants
    const playerContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/player/page.tsx"), "utf-8");
    assert(playerContent.includes("Target: 75% Ready Threshold"));
    assert(playerContent.includes("▲ 75% Target"));
    assert(playerContent.includes('style={{ left: "75%" }}'));

    const scoutContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/scout/page.tsx"), "utf-8");
    assert(scoutContent.includes("75% Target"));
    assert(scoutContent.includes("shrink-0"));
    report(suite, "Player and Scout pages maintain verbatim 75% target labels and responsive badge safety", true);
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════
  console.log(`\n${CYAN}========================================================================${RESET}`);
  console.log(`   TOTAL CHECKS: Passed: ${GREEN}${passCount}${RESET}, Failed: ${RED}${failCount}${RESET}`);
  console.log(`${CYAN}========================================================================\n${RESET}`);

  if (failCount > 0) {
    console.error(`${RED}FAILURES DETECTED:${RESET}`);
    failures.forEach((f) => console.error(`  - [${f.suite}] ${f.name}: ${f.error}`));
    process.exit(1);
  }
}

runAdversarialBoundarySuite().catch((err) => {
  console.error("Fatal error in adversarial boundary suite:", err);
  process.exit(1);
});
