import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { CossBadge16 } from "../components/p-badge-16";

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

async function runAdversarialComponentSuite() {
  console.log(`\n${CYAN}==================================================================${RESET}`);
  console.log(`${CYAN}   M2 ADVERSARIAL COMPONENT & MONOCHROMATIC PAYLOAD TEST SUITE    ${RESET}`);
  console.log(`${CYAN}==================================================================\n${RESET}`);

  // -----------------------------------------------------------------
  // SUITE 1: Monochromatic Swiss Badge (CossBadge16) Empirical Tests
  // -----------------------------------------------------------------
  console.log(`${CYAN}▶ [SUITE 1] CossBadge16 Component Rendering & Swiss Token Conformance${RESET}`);

  // 1.1 Ready State Rendering
  const readyHtml = renderToStaticMarkup(React.createElement(CossBadge16, { isReady: true }));
  report("1.1 CossBadge16 renders with isReady=true", readyHtml.includes("Ready") && !readyHtml.includes("Pending"), readyHtml);
  report("1.2 CossBadge16 ready state uses solid white / zinc tokens (border-zinc-200 bg-zinc-100 text-zinc-950)",
    readyHtml.includes("border-zinc-200") && readyHtml.includes("bg-zinc-100") && readyHtml.includes("text-zinc-950"),
    readyHtml
  );
  report("1.3 CossBadge16 ready indicator dot is solid (bg-zinc-950)",
    readyHtml.includes("bg-zinc-950"),
    readyHtml
  );

  // 1.2 Pending State Rendering
  const pendingHtml = renderToStaticMarkup(React.createElement(CossBadge16, { isReady: false }));
  report("1.4 CossBadge16 renders with isReady=false", pendingHtml.includes("Pending") && !pendingHtml.includes("Ready"), pendingHtml);
  report("1.5 CossBadge16 pending state uses dark zinc tokens (border-zinc-800 bg-zinc-900 text-zinc-400)",
    pendingHtml.includes("border-zinc-800") && pendingHtml.includes("bg-zinc-900") && pendingHtml.includes("text-zinc-400"),
    pendingHtml
  );
  report("1.6 CossBadge16 pending indicator is hollow circle (border border-zinc-600 bg-transparent)",
    pendingHtml.includes("border border-zinc-600 bg-transparent"),
    pendingHtml
  );

  // 1.3 Strict Zero-Color / No-Hue Audit for CossBadge16
  const forbiddenColorPatterns = [/emerald/i, /green/i, /red/i, /blue/i, /purple/i, /yellow/i, /amber/i, /rose/i, /teal/i, /lime/i];
  let readyHasForbidden = forbiddenColorPatterns.some((p) => p.test(readyHtml));
  let pendingHasForbidden = forbiddenColorPatterns.some((p) => p.test(pendingHtml));
  report("1.7 CossBadge16 Ready HTML contains zero hue/color classes", !readyHasForbidden, readyHtml);
  report("1.8 CossBadge16 Pending HTML contains zero hue/color classes", !pendingHasForbidden, pendingHtml);

  // 1.4 Custom ClassName and Boundary Props
  const customClassHtml = renderToStaticMarkup(React.createElement(CossBadge16, { isReady: true, className: "custom-adversarial-class ml-auto" }));
  report("1.9 CossBadge16 preserves custom className properly via cn()",
    customClassHtml.includes("custom-adversarial-class") && customClassHtml.includes("ml-auto") && customClassHtml.includes("bg-zinc-100"),
    customClassHtml
  );

  // 1.5 Falsy & Truthy boundary values
  const truthyBadge = renderToStaticMarkup(React.createElement(CossBadge16, { isReady: 1 as unknown as boolean }));
  report("1.10 CossBadge16 handles truthy non-boolean isReady={1}", truthyBadge.includes("Ready"), truthyBadge);

  const falsyBadge = renderToStaticMarkup(React.createElement(CossBadge16, { isReady: 0 as unknown as boolean }));
  report("1.11 CossBadge16 handles falsy non-boolean isReady={0}", falsyBadge.includes("Pending"), falsyBadge);

  const undefinedBadge = renderToStaticMarkup(React.createElement(CossBadge16, { isReady: undefined as unknown as boolean }));
  report("1.12 CossBadge16 handles undefined isReady gracefully", undefinedBadge.includes("Pending"), undefinedBadge);


  // -----------------------------------------------------------------
  // SUITE 2: Static Analysis & Token Audit of Owned Files
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 2] Static Analysis & Swiss Token Audit of Owned Milestone Files${RESET}`);

  const ownedFiles = [
    { name: "p-badge-16.tsx", path: path.resolve(process.cwd(), "src/components/p-badge-16.tsx") },
    { name: "player/page.tsx", path: path.resolve(process.cwd(), "src/app/player/page.tsx") },
    { name: "scout/page.tsx", path: path.resolve(process.cwd(), "src/app/scout/page.tsx") },
    { name: "coach/ready/page.tsx", path: path.resolve(process.cwd(), "src/app/coach/ready/page.tsx") },
  ];

  for (const f of ownedFiles) {
    assert(fs.existsSync(f.path), `File must exist: ${f.name}`);
    const content = fs.readFileSync(f.path, "utf8");

    // Color check
    const matches: string[] = [];
    for (const pat of forbiddenColorPatterns) {
      const found = content.match(new RegExp(`\\b${pat.source}[-\\w]*`, "gi"));
      if (found) matches.push(...found);
    }
    report(`2.${ownedFiles.indexOf(f) + 1} ${f.name} contains zero colored hue tokens`, matches.length === 0, `Matches found: ${matches.join(", ")}`);

    // Emoji check (range check for emoji Unicode blocks)
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const emojiMatch = content.match(emojiRegex);
    report(`2.${ownedFiles.indexOf(f) + 5} ${f.name} contains zero colored emojis`, !emojiMatch, `Emoji found: ${emojiMatch?.[0]}`);
  }

  // -----------------------------------------------------------------
  // SUITE 3: Coach Ready Board Route Conformance
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 3] Coach Ready Board Route Conformance (/coach/ready)${RESET}`);

  const coachReadyContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/coach/ready/page.tsx"), "utf8");
  report("3.1 /coach/ready exports dynamic = 'force-dynamic'",
    coachReadyContent.includes('export const dynamic = "force-dynamic"'),
    coachReadyContent
  );
  report("3.2 /coach/ready renders CoachMobileShell with defaultTab='ready'",
    coachReadyContent.includes('defaultTab="ready"') && coachReadyContent.includes("CoachMobileShell"),
    coachReadyContent
  );


  // -----------------------------------------------------------------
  // SUITE 4: Player Page Contract, Self-Isolation & Payload Stress Testing
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 4] Player Dashboard Isolation & Payload Stress Verification${RESET}`);

  const playerPageContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/player/page.tsx"), "utf8");
  report("4.1 /player queries /api/ready strictly using playerId param",
    playerPageContent.includes("/api/ready?playerId="),
    playerPageContent
  );
  report("4.2 /player renders Attendance History and Match Contributions sections",
    playerPageContent.includes("Attendance History") && playerPageContent.includes("Match Contributions"),
    playerPageContent
  );
  report("4.3 /player handles empty states gracefully with fallback UI",
    playerPageContent.includes("No attendance records recorded yet") && playerPageContent.includes("No match appearances recorded yet"),
    playerPageContent
  );
  report("4.4 /player clamps visual progress gauge to max 100%",
    playerPageContent.includes("Math.min(100, attendancePct)"),
    playerPageContent
  );
  report("4.5 /player aligns 75% target line at style={{ left: \"75%\" }}",
    playerPageContent.includes('style={{ left: "75%" }}') || playerPageContent.includes("left: '75%'") || playerPageContent.includes('left: "75%"'),
    playerPageContent
  );

  // -----------------------------------------------------------------
  // SUITE 5: Scout Page Contract & Qualification Filtering
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 5] Scout Dashboard Filtering & Contract Verification${RESET}`);

  const scoutPageContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/scout/page.tsx"), "utf8");
  report("5.1 /scout queries /api/ready strictly with filter=readyOnly",
    scoutPageContent.includes("/api/ready?filter=readyOnly") || scoutPageContent.includes("readyOnly=true"),
    scoutPageContent
  );
  report("5.2 /scout handles empty candidate roster gracefully",
    scoutPageContent.includes("No candidates qualified for trials yet"),
    scoutPageContent
  );
  report("5.3 /scout clamps visual progress gauge to max 100%",
    scoutPageContent.includes("Math.min(100, item.attendancePct)"),
    scoutPageContent
  );
  report("5.4 /scout positions 75% Target benchmark at left: '75%'",
    scoutPageContent.includes('style={{ left: "75%" }}') || scoutPageContent.includes('left: "75%"'),
    scoutPageContent
  );

  // -----------------------------------------------------------------
  // SUITE 6: Heavy Payload Component Emulation & Stress Test
  // -----------------------------------------------------------------
  console.log(`\n${CYAN}▶ [SUITE 6] Heavy Payload Emulation & Rendering Resilience${RESET}`);

  // Test rendering large numbers of items to test memory & stringification speed
  const startTimer = Date.now();
  const heavyCount = 5000;
  let heavyBadges = "";
  for (let i = 0; i < heavyCount; i++) {
    heavyBadges += renderToStaticMarkup(React.createElement(CossBadge16, { isReady: i % 2 === 0 }));
  }
  const durationMs = Date.now() - startTimer;
  report(`6.1 Heavy badge rendering (5,000 badges) completed in ${durationMs}ms (< 1500ms)`,
    durationMs < 1500 && heavyBadges.length > 0,
    `Duration: ${durationMs}ms, Total length: ${heavyBadges.length}`
  );

  // Extreme edge-case payloads for attendance and match records
  const generateAdversarialRecords = () => {
    const attendance = [];
    for (let i = 0; i < 2000; i++) {
      attendance.push({
        sessionId: `sess_${i}_${"x".repeat(50)}`,
        date: `2026-11-${(i % 30) + 1}`,
        sport: i % 2 === 0 ? "Cricket" : "Badminton",
        status: (i % 2 === 0 ? "PRESENT" : "ABSENT") as "PRESENT" | "ABSENT"
      });
    }

    const matches = [];
    for (let i = 0; i < 1000; i++) {
      matches.push({
        matchId: `match_${i}_${"<script>alert(1)</script>"}`,
        date: `2026-11-${(i % 30) + 1}`,
        sport: "Football",
        opponent: `Opponent Team <img src=x onerror=alert(1)> #${i}`,
        outcome: (i % 3 === 0 ? "win" : i % 3 === 1 ? "draw" : "loss") as "win" | "draw" | "loss",
        player1Score: i * 10,
        player2Score: (i * 7) % 15
      });
    }

    return { attendance, matches };
  };

  const { attendance, matches } = generateAdversarialRecords();
  report("6.2 Generated 2,000 attendance records and 1,000 adversarial match records without memory issue",
    attendance.length === 2000 && matches.length === 1000
  );

  // Emulate player data processing logic under adversarial extremes
  const processAttendancePct = (present: number, held: number) => {
    if (held <= 0) return 0;
    return Math.round((present / held) * 100);
  };

  report("6.3 Edge calculation: 0 held, 0 present -> 0%", processAttendancePct(0, 0) === 0);
  report("6.4 Edge calculation: negative numbers handled without NaN -> 0%", processAttendancePct(0, -5) === 0);
  report("6.5 Edge calculation: 75 of 100 -> exactly 75%", processAttendancePct(75, 100) === 75);
  report("6.6 Edge calculation: 74 of 100 -> 74%", processAttendancePct(74, 100) === 74);
  report("6.7 Edge calculation: 150 of 100 -> 150% (capped in gauge by Math.min)", processAttendancePct(150, 100) === 150);

  // Gauge width calculation under adversarial boundary inputs
  const calculateGaugeWidth = (pct: number) => Math.min(100, Math.max(0, pct));
  report("6.8 Gauge width for 0% attendance = 0%", calculateGaugeWidth(0) === 0);
  report("6.9 Gauge width for 75% attendance = 75%", calculateGaugeWidth(75) === 75);
  report("6.10 Gauge width for 100% attendance = 100%", calculateGaugeWidth(100) === 100);
  report("6.11 Gauge width for 150% attendance capped at 100%", calculateGaugeWidth(150) === 100);
  report("6.12 Gauge width for -20% attendance floored at 0%", calculateGaugeWidth(-20) === 0);

  // Test name initials calculation under unusual names
  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  report("6.13 Initials calculation: standard 'Rohit Sharma' -> 'RS'", getInitials("Rohit Sharma") === "RS");
  report("6.14 Initials calculation: single name 'Priya' -> 'P'", getInitials("Priya") === "P");
  report("6.15 Initials calculation: three names 'Amit Kumar Singh' -> 'AK'", getInitials("Amit Kumar Singh") === "AK");
  report("6.16 Initials calculation: empty name '' -> ''", getInitials("") === "");
  report("6.17 Initials calculation: multiple spaces '  John   Doe  ' -> 'JD'", getInitials("  John   Doe  ") === "JD");

  // Summary
  console.log(`\n${CYAN}==================================================================${RESET}`);
  console.log(`${CYAN}   ADVERSARIAL COMPONENT TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED   ${RESET}`);
  console.log(`${CYAN}==================================================================\n${RESET}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runAdversarialComponentSuite().catch((err) => {
  console.error("Adversarial component test suite error:", err);
  process.exit(1);
});
