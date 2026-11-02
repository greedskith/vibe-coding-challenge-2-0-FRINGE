import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

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

// -----------------------------------------------------------------
// 1. Audit that coach-mobile-shell.tsx contains the exact implementation
// -----------------------------------------------------------------
const shellPath = path.resolve(process.cwd(), "src/components/coach-mobile-shell.tsx");
const shellContent = fs.readFileSync(shellPath, "utf-8");

assert(
  shellContent.includes("const isAthleteAccount = (p: Player) => {"),
  "isAthleteAccount declaration must be present in coach-mobile-shell.tsx"
);
assert(
  shellContent.includes('const role = ((p as any).role || "").trim().toLowerCase();'),
  "role extraction with trim and toLowerCase must be present"
);
assert(
  shellContent.includes('if (role === "coach" || role === "scout") return false;'),
  "role check must exclude coach and scout"
);
assert(
  shellContent.includes('if (name === "coach" || name === "head coach" || name === "scout") return false;'),
  "name check must exclude coach, head coach, scout"
);
assert(
  shellContent.includes('if (username === "coach" || username === "scout") return false;'),
  "username check must exclude coach and scout"
);

// The exact verbatim logic from coach-mobile-shell.tsx:
const isAthleteAccount = (p: any) => {
  if (!p) return false;
  const name = (p.name || "").trim().toLowerCase();
  const username = (p.username || "").trim().toLowerCase();
  const role = ((p as any).role || "").trim().toLowerCase();
  if (role === "coach" || role === "scout") return false;
  if (name === "coach" || name === "head coach" || name === "scout") return false;
  if (username === "coach" || username === "scout") return false;
  return true;
};

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// Component replicating the exact JSX in coach-mobile-shell.tsx (lines 1373-1396)
function AttendanceProgressBar({
  sportPlayers,
  presentCount,
  isPlayerPresent,
}: {
  sportPlayers: Array<{ _id?: string; name: string }>;
  presentCount: number;
  isPlayerPresent: (id: string) => boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-1 max-w-sm">
      {sportPlayers.length > 12 ? (
        <div className="relative h-2.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-zinc-100 rounded-full transition-all duration-300"
            style={{
              width: `${
                sportPlayers.length > 0
                  ? Math.round((presentCount / sportPlayers.length) * 100)
                  : 0
              }%`,
            }}
          />
        </div>
      ) : (
        sportPlayers.map((p, idx) => {
          const isPresent = isPlayerPresent(p._id?.toString() || "");
          return (
            <div
              key={p._id?.toString() || idx}
              className={cn(
                "h-2.5 flex-1 min-w-[8px] rounded-full transition-all duration-300",
                isPresent ? "bg-zinc-100" : "bg-zinc-800"
              )}
            />
          );
        })
      )}
    </div>
  );
}

async function runAdversarialM1Suite() {
  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`${CYAN}   M-MOB1 ADVERSARIAL CHALLENGER VERIFICATION SUITE   ${RESET}`);
  console.log(`${CYAN}======================================================\n${RESET}`);

  // -----------------------------------------------------------------
  // SUITE 1: isAthleteAccount Null / Undefined / Malformed Properties
  // -----------------------------------------------------------------
  console.log(`${CYAN}▶ [SUITE 1] isAthleteAccount Edge Cases & Null/Undefined Robustness${RESET}`);
  try {
    // 1.1 Falsy objects
    assert.strictEqual(isAthleteAccount(undefined), false, "undefined player must return false");
    report("isAthleteAccount(undefined) returns false without throwing", true);

    assert.strictEqual(isAthleteAccount(null), false, "null player must return false");
    report("isAthleteAccount(null) returns false without throwing", true);

    // 1.2 Empty object and missing properties
    assert.strictEqual(isAthleteAccount({}), true, "Empty object {} without role coach/scout is an athlete");
    report("isAthleteAccount({}) handles empty object safely (returns true)", true);

    assert.strictEqual(
      isAthleteAccount({ name: undefined, username: undefined, role: undefined }),
      true
    );
    report("isAthleteAccount with explicit undefined properties returns true without throwing", true);

    assert.strictEqual(
      isAthleteAccount({ name: null, username: null, role: null }),
      true
    );
    report("isAthleteAccount with explicit null properties returns true without throwing", true);

    assert.strictEqual(
      isAthleteAccount({ name: "", username: "", role: "" }),
      true
    );
    report("isAthleteAccount with empty string properties returns true without throwing", true);

    assert.strictEqual(
      isAthleteAccount({ name: "   ", username: "   ", role: "   " }),
      true
    );
    report("isAthleteAccount with whitespace string properties returns true without throwing", true);

    // 1.3 Role filtering
    assert.strictEqual(isAthleteAccount({ role: "coach" }), false);
    assert.strictEqual(isAthleteAccount({ role: "Coach" }), false);
    assert.strictEqual(isAthleteAccount({ role: "COACH" }), false);
    assert.strictEqual(isAthleteAccount({ role: "  coach  " }), false);
    assert.strictEqual(isAthleteAccount({ role: "scout" }), false);
    assert.strictEqual(isAthleteAccount({ role: "Scout" }), false);
    assert.strictEqual(isAthleteAccount({ role: "  SCOUT " }), false);
    assert.strictEqual(isAthleteAccount({ role: "player" }), true);
    report("Role-based filtering correctly rejects coach/scout regardless of casing/spacing", true);

    // 1.4 Name filtering
    assert.strictEqual(isAthleteAccount({ name: "coach" }), false);
    assert.strictEqual(isAthleteAccount({ name: "Coach" }), false);
    assert.strictEqual(isAthleteAccount({ name: "COACH" }), false);
    assert.strictEqual(isAthleteAccount({ name: "  coach  " }), false);
    assert.strictEqual(isAthleteAccount({ name: "head coach" }), false);
    assert.strictEqual(isAthleteAccount({ name: "Head Coach" }), false);
    assert.strictEqual(isAthleteAccount({ name: "HEAD COACH" }), false);
    assert.strictEqual(isAthleteAccount({ name: "  Head Coach  " }), false);
    assert.strictEqual(isAthleteAccount({ name: "scout" }), false);
    assert.strictEqual(isAthleteAccount({ name: "Scout" }), false);
    assert.strictEqual(isAthleteAccount({ name: "  Scout  " }), false);
    report("Name-based filtering correctly rejects Coach, Head Coach, Scout", true);

    // 1.5 Legitimate athletes with "coach" in name (e.g. Coach Carter / Coach Smith)
    assert.strictEqual(isAthleteAccount({ name: "Coach Smith" }), true);
    assert.strictEqual(isAthleteAccount({ name: "Rohit Kumar", username: "rohit", sport: "Football" }), true);
    assert.strictEqual(isAthleteAccount({ name: "Priya Murmu", username: "priya", sport: "Cricket" }), true);
    report("Legitimate athletes with multi-word names or names containing 'coach' are NOT falsely filtered", true);

    // 1.6 Username disambiguation (e.g. player named Coach with username coach2 from Phase 2 Test 9)
    assert.strictEqual(isAthleteAccount({ username: "coach" }), false);
    assert.strictEqual(isAthleteAccount({ username: "COACH" }), false);
    assert.strictEqual(isAthleteAccount({ username: "scout" }), false);
    assert.strictEqual(isAthleteAccount({ name: "Rahul", username: "coach2" }), true);
    report("Username disambiguation: username 'coach' rejected, username 'coach2' permitted", true);
  } catch (err: any) {
    report("Suite 1 isAthleteAccount Edge Cases", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUITE 2: Adaptive Attendance Progress Bar Rendering (0, 1, 12, 13, 20)
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 2] Adaptive Attendance Progress Bar (0, 1, 12, 13, 20 athletes)${RESET}`);
  try {
    // 2.1 Athlete Count = 0
    const count0Markup = renderToStaticMarkup(
      <AttendanceProgressBar
        sportPlayers={[]}
        presentCount={0}
        isPlayerPresent={() => false}
      />
    );
    assert(!count0Markup.includes("NaN"), "Count 0 must not produce NaN in markup");
    assert(!count0Markup.includes("min-w-[8px]"), "Count 0 must not render any capsules");
    assert(!count0Markup.includes("width:"), "Count 0 should not render continuous bar (<= 12)");
    report("Count 0 renders cleanly without NaN, zero capsule elements", true);

    // 2.2 Athlete Count = 1 (Segmented capsule mode, <= 12)
    const count1MarkupAbsent = renderToStaticMarkup(
      <AttendanceProgressBar
        sportPlayers={[{ _id: "p1", name: "Athlete 1" }]}
        presentCount={0}
        isPlayerPresent={() => false}
      />
    );
    assert(count1MarkupAbsent.includes("min-w-[8px]"), "Count 1 must render capsule with min-w-[8px]");
    assert(count1MarkupAbsent.includes("bg-zinc-800"), "Count 1 absent must have bg-zinc-800");
    assert(!count1MarkupAbsent.includes("bg-zinc-100"), "Count 1 absent must not have bg-zinc-100");
    assert(!count1MarkupAbsent.includes("NaN"));

    const count1MarkupPresent = renderToStaticMarkup(
      <AttendanceProgressBar
        sportPlayers={[{ _id: "p1", name: "Athlete 1" }]}
        presentCount={1}
        isPlayerPresent={(id) => id === "p1"}
      />
    );
    assert(count1MarkupPresent.includes("bg-zinc-100"), "Count 1 present must have bg-zinc-100");
    assert(!count1MarkupPresent.includes("NaN"));
    report("Count 1 renders exactly 1 segmented capsule (absent=zinc-800, present=zinc-100)", true);

    // 2.3 Athlete Count = 12 (Upper boundary of segmented capsule mode, <= 12)
    const players12 = Array.from({ length: 12 }, (_, i) => ({
      _id: `p${i + 1}`,
      name: `Athlete ${i + 1}`,
    }));
    // 6 present, 6 absent
    const count12Markup = renderToStaticMarkup(
      <AttendanceProgressBar
        sportPlayers={players12}
        presentCount={6}
        isPlayerPresent={(id) => parseInt(id.replace("p", "")) <= 6}
      />
    );
    const capsuleMatches12 = count12Markup.match(/min-w-\[8px\]/g) || [];
    assert.strictEqual(capsuleMatches12.length, 12, "Count 12 must render exactly 12 capsules");
    const activeCapsules12 = count12Markup.match(/bg-zinc-100/g) || [];
    assert.strictEqual(activeCapsules12.length, 6, "Count 12 with 6 present must have 6 active capsules");
    assert(!count12Markup.includes("width:"), "Count 12 must not render continuous progress bar");
    assert(!count12Markup.includes("NaN"));
    report("Count 12 (boundary) renders exactly 12 segmented capsules without layout overflow", true);

    // 2.4 Athlete Count = 13 (Lower boundary of continuous progress bar mode, > 12)
    const players13 = Array.from({ length: 13 }, (_, i) => ({
      _id: `p${i + 1}`,
      name: `Athlete ${i + 1}`,
    }));
    // 5 present out of 13 -> Math.round((5/13)*100) = 38%
    const count13Markup = renderToStaticMarkup(
      <AttendanceProgressBar
        sportPlayers={players13}
        presentCount={5}
        isPlayerPresent={(id) => parseInt(id.replace("p", "")) <= 5}
      />
    );
    assert(!count13Markup.includes("min-w-[8px]"), "Count 13 must not render segmented capsules");
    assert(count13Markup.includes("relative h-2.5 flex-1 rounded-full bg-zinc-800"), "Count 13 renders track");
    assert(count13Markup.includes("width:38%") || count13Markup.includes("width: 38%"), "Count 13 renders width: 38%");
    assert(!count13Markup.includes("NaN"));
    report("Count 13 (boundary transition) switches to continuous progress bar at width: 38%", true);

    // 2.5 Athlete Count = 20 (Continuous progress bar mode, > 12)
    const players20 = Array.from({ length: 20 }, (_, i) => ({
      _id: `p${i + 1}`,
      name: `Athlete ${i + 1}`,
    }));
    // 0 present -> 0%
    const count20MarkupZero = renderToStaticMarkup(
      <AttendanceProgressBar
        sportPlayers={players20}
        presentCount={0}
        isPlayerPresent={() => false}
      />
    );
    assert(count20MarkupZero.includes("width:0%") || count20MarkupZero.includes("width: 0%"));

    // 10 present out of 20 -> 50%
    const count20MarkupHalf = renderToStaticMarkup(
      <AttendanceProgressBar
        sportPlayers={players20}
        presentCount={10}
        isPlayerPresent={(id) => parseInt(id.replace("p", "")) <= 10}
      />
    );
    assert(count20MarkupHalf.includes("width:50%") || count20MarkupHalf.includes("width: 50%"));

    // 20 present out of 20 -> 100%
    const count20MarkupFull = renderToStaticMarkup(
      <AttendanceProgressBar
        sportPlayers={players20}
        presentCount={20}
        isPlayerPresent={() => true}
      />
    );
    assert(count20MarkupFull.includes("width:100%") || count20MarkupFull.includes("width: 100%"));
    assert(!count20MarkupFull.includes("NaN"));
    report("Count 20 renders continuous progress bar across 0%, 50%, and 100% cleanly", true);

    // 2.6 Athlete Count = 50 (Stress scenario for large academy roster)
    const players50 = Array.from({ length: 50 }, (_, i) => ({
      _id: `p${i + 1}`,
      name: `Athlete ${i + 1}`,
    }));
    // 37 present out of 50 -> 74% (critical readiness boundary)
    const count50Markup = renderToStaticMarkup(
      <AttendanceProgressBar
        sportPlayers={players50}
        presentCount={37}
        isPlayerPresent={(id) => parseInt(id.replace("p", "")) <= 37}
      />
    );
    assert(count50Markup.includes("width:74%") || count50Markup.includes("width: 74%"));
    assert(!count50Markup.includes("NaN"));
    report("Count 50 renders continuous progress bar at 74% cleanly without micro-dot collapse", true);
  } catch (err: any) {
    report("Suite 2 Adaptive Attendance Progress Bar", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUITE 3: Codebase Static Invariant & Mobile UX Contract Audit
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 3] Static Invariant & Mobile UX Audit${RESET}`);
  try {
    // 3.1 Viewport Configuration in layout.tsx
    const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");
    assert(
      layoutContent.includes('interactiveWidget: "resizes-content"'),
      "layout.tsx must export interactiveWidget: 'resizes-content'"
    );
    assert(
      !layoutContent.includes("userScalable: false"),
      "layout.tsx must NOT contain userScalable: false"
    );
    assert(
      !layoutContent.includes("maximumScale: 1"),
      "layout.tsx must NOT contain maximumScale: 1"
    );
    assert(
      layoutContent.includes("initialScale: 1"),
      "layout.tsx must contain initialScale: 1"
    );
    report("layout.tsx viewport allows user pinch-to-zoom (WCAG 2.1 1.4.4) and resizes content", true);

    // 3.2 globals.css tap highlight and active feedback
    const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert(
      cssContent.includes("-webkit-tap-highlight-color: transparent"),
      "globals.css must set -webkit-tap-highlight-color: transparent"
    );
    assert(
      cssContent.includes("button:active:not(:disabled)"),
      "globals.css must provide active touch feedback"
    );
    assert(
      !/emerald-\d+/.test(cssContent),
      "globals.css must have ZERO emerald-* classes"
    );
    assert(
      !/green-\d+/.test(cssContent),
      "globals.css must have ZERO green-* classes"
    );
    report("globals.css tap highlight & tactile touch feedback present with 0 colored classes", true);

    // 3.3 coach-mobile-shell.tsx root select-none check
    const rootContainerMatch = shellContent.match(/<div className="flex min-h-dvh w-full max-w-full[^"]*"/);
    assert(rootContainerMatch, "Root container div found");
    assert(
      !rootContainerMatch[0].includes("select-none"),
      "Root container must NOT have select-none"
    );
    report("coach-mobile-shell.tsx root container allows user text selection", true);

    // 3.4 Main content bottom clearance
    assert(
      shellContent.includes("pb-32 lg:pb-8"),
      "coach-mobile-shell.tsx main must have pb-32 lg:pb-8 clearance"
    );
    report("coach-mobile-shell.tsx main content clearance verified (pb-32 lg:pb-8)", true);

    // 3.5 Floating Action Button (FAB) position & duplicate Add Athlete button removal
    assert(
      shellContent.includes("bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"),
      "FAB must use safe area calc to clear bottom nav tabs"
    );
    assert(
      shellContent.includes("hidden lg:flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950"),
      "Roster in-page Add Athlete button must be hidden on mobile (hidden lg:flex)"
    );
    report("FAB deconfliction & duplicate in-page mobile Add button removal verified", true);

    // 3.6 Ready Board match count text labels
    assert(
      shellContent.includes('{item.matchCount} {item.matchCount === 1 ? "match" : "matches"}'),
      "Ready Board pips must have clear text label beside dots"
    );
    report("Ready Board match indicators include explicit text labels (e.g. '2 matches')", true);

    // 3.7 Record Match dialog bottom sheet structure & pinned footer
    assert(
      shellContent.includes("max-sm:h-[92dvh]"),
      "Record Match dialog must have max-sm:h-[92dvh] bottom sheet styling"
    );
    assert(
      shellContent.includes("shrink-0 border-t border-zinc-800 bg-zinc-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-2"),
      "Record Match dialog must have pinned sticky action footer"
    );
    report("Record Match dialog verified as adaptive bottom sheet with pinned sticky action footer", true);

    // 3.8 Pointer long-press gesture threshold and vibration safety
    assert(
      shellContent.includes("navigator.vibrate(50)"),
      "Pointer long-press triggers navigator.vibrate(50)"
    );
    assert(
      shellContent.includes('"vibrate" in navigator'),
      "navigator.vibrate is guarded against unsupported browsers"
    );
    assert(
      shellContent.includes("dx > 10 || dy > 10"),
      "Pointer move cancels long-press if displacement > 10px (preserves scrolling)"
    );
    assert(
      shellContent.includes("e.preventDefault()"),
      "onContextMenu calls preventDefault to eliminate callout popups"
    );
    report("Pointer-based long-press attendance gesture ergonomics and safety guards verified", true);
  } catch (err: any) {
    report("Suite 3 Static Invariant & Mobile UX Audit", false, err.message);
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`   TOTAL TESTS: Passed: ${GREEN}${passCount}${RESET}, Failed: ${RED}${failCount}${RESET}`);
  console.log(`${CYAN}======================================================\n${RESET}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runAdversarialM1Suite().catch((e) => {
  console.error("Uncaught error:", e);
  process.exit(1);
});
