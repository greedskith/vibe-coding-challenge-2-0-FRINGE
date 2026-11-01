# Bugs in Vibe Coding Challenge 2.0 - Fringe

Here is a list of bugs and potential issues identified in the codebase:

## ESLint Warnings
The following files contain unused variables or prefer-const warnings that should be cleaned up:
- `src/app/api/ready/route.ts`: 'ObjectId' is defined but never used.
- `src/components/coach-mobile-shell.tsx`: 'Link' and 'DropdownMenuLabel' are defined but never used. 'matchPlayerIds' is assigned a value but never used.
- `src/lib/db.ts`: 'err' in the catch block is defined but never used.
- `src/lib/local-db.ts`: 'err' and '_cmd' are unused. 'sortedDocs' should be const.
- `src/scripts/adversarial-component-m2.ts`: 'readyHasForbidden' and 'pendingHasForbidden' should be const.
- `src/scripts/adversarial-coverage-m4-2.ts`: Unused variables: 'getSessions', 'getSessionById', 'getMatches', 'getPlayers', 'getPlayerById', 'putPlayerById', 'deletePlayerById'.
- `src/scripts/e2e-test-runner.ts`: Unused variables: 'getSessionById', 'callGetMatches', 'callGetPlayers', 'db'.
- `src/scripts/seed.ts`: 'player2Id' and 'player3Id' are unused.
- `src/scripts/test-adversarial-m2.ts`: 'YELLOW' is unused. 'foundForbiddenUiColors' and 'foundEmojis' should be const.
- `src/scripts/test-phase-3-deep.ts`, `src/scripts/test-phase-4-deep.ts`, `src/scripts/verify-checks.ts`: 'ObjectId' is unused.
- `src/scripts/test-tier5-adversarial.ts`: Unused variables: 'getSessions', 'postSession', 'getMatches', 'origPlayers', 'origSessions', 'origMatches'.
- `src/scripts/verify-checks.ts`: Unused variables: 'getSessions', 'getMatches'.

## Next.js Build Warnings
- **Middleware Deprecation**: The build output indicates: `The "middleware" file convention is deprecated. Please use "proxy" instead.` This implies that `middleware.ts` needs to be migrated to use the new `proxy` convention via `npx @next/codemod@canary middleware-to-proxy .`

## Other Potential Issues
- **Error Handling in `src/lib/db.ts`**: The `catch (err: any)` block in `getDb()` uses `any` and does not log the actual error connecting to the MongoDB database (since `err` is unused), which can make debugging silent failures difficult when the application falls back to the local db.
- **Unused `matchPlayerIds` in `src/components/coach-mobile-shell.tsx`**: Around line 1648, a `Set` of `matchPlayerIds` is created but never utilized in the component's render logic, which uses unnecessary memory.

All main verification test suites (`npm run verify` and `npm run verify:phase*`) are passing successfully, meaning the core logic and hackathon checkpoint requirements are functioning as expected.
